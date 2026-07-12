import { ensureSchema, isAdmin, json, readState, userFromRequest, writeState } from "../_utils.js";

function dateValue(date) {
  return new Date(`${date}T00:00:00`).getTime();
}

function todayText() {
  return new Date().toISOString().slice(0, 10);
}

function findSeasonForDate(state, date) {
  const stamp = dateValue(date);
  return state.seasons.find((season) => dateValue(season.start) <= stamp && stamp <= dateValue(season.end)) || null;
}

function isTrainingEligible(state, code) {
  const user = state.users.find((item) => item.identityCode === code);
  return !!user && user.role !== "观察员";
}

function normalizeRange(body) {
  const season = body.seasonId ? body.state?.seasons?.find((item) => item.id === body.seasonId) : null;
  const end = String(body.end || season?.end || todayText());
  const start = String(body.start || season?.start || end);
  return dateValue(start) <= dateValue(end) ? { start, end } : { start: end, end: start };
}

export async function onRequestPost({ request, env }) {
  try {
    if (!env.DB) return json({ error: "D1 数据库没有绑定到 DB。" }, 500);
    await ensureSchema(env.DB);

    const session = await userFromRequest(request, env.DB);
    if (!session) return json({ error: "请重新登录。" }, 401);

    const state = await readState(env.DB);
    if (!state) return json({ error: "数据库还没有初始化，请先登录一次。" }, 404);

    const actor = state.users.find((user) => user.identityCode === session.identity_code);
    if (!isAdmin(actor)) return json({ error: "只有管理员可以自动填报赛训记录。" }, 403);

    const body = await request.json().catch(() => ({}));
    body.state = state;
    const range = normalizeRange(body);
    const selectedSeason = body.seasonId ? state.seasons.find((season) => season.id === body.seasonId) : null;
    const minMembers = Math.max(3, Number(body.minMembers || 3));
    const startStamp = dateValue(range.start);
    const endStamp = dateValue(range.end);
    const matches = (state.matchRecords || []).filter((match) => {
      const stamp = dateValue(match.date);
      const members = new Set((match.recognizedMemberCodes || []).filter((code) => isTrainingEligible(state, code)));
      return stamp >= startStamp && stamp <= endStamp && members.size >= minMembers;
    });

    const promotedMatches = [];
    let promotedRecords = 0;

    for (const match of matches) {
      const uniqueMembers = new Set((match.recognizedMemberCodes || []).filter((code) => isTrainingEligible(state, code)));
      const matchRecordId = match.id || "";
      const matchId = match.matchId || "";
      const records = state.records.filter((record) => {
        return record.fiveE?.matchRecordId === matchRecordId || record.fiveE?.fingerprint === match.fingerprint || record.fiveE?.matchId === matchId;
      });
      if (!records.length) continue;

      for (const record of records) {
        if (!isTrainingEligible(state, record.userIdentityCode)) continue;
        const season = selectedSeason || findSeasonForDate(state, record.date);
        if (season) record.seasonId = season.id;
        if (!record.trainingIncluded) promotedRecords += 1;
        record.trainingIncluded = true;
        record.trainingMatchId = matchRecordId || matchId;
        record.trainingPromotedAt = new Date().toISOString();
      }

      promotedMatches.push({
        matchId,
        date: match.date || records[0]?.date || "",
        members: uniqueMembers.size,
        mapName: match.mapName || match.map || records[0]?.fiveE?.mapName || records[0]?.fiveE?.map || "",
      });
    }

    await writeState(env.DB, state);
    return json({
      ok: true,
      range,
      minMembers,
      promotedMatches: promotedMatches.length,
      promotedRecords,
      matches: promotedMatches,
      state,
    });
  } catch (error) {
    return json({ error: error.message || String(error) }, 500);
  }
}
