import { ensureSchema, isAdmin, json, readState, userFromRequest, writeState } from "../_utils.js";

function dateValue(date) {
  return new Date(`${date}T00:00:00`).getTime();
}

function isTrainingEligible(state, code) {
  const user = state.users.find((item) => item.identityCode === code);
  return !!user;
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
    const selectedSeason = state.seasons.find((season) => season.id === body.seasonId);
    if (!selectedSeason) return json({ error: "请先选择有效赛季。" }, 400);
    const range = { start: selectedSeason.start, end: selectedSeason.end };
    const startStamp = dateValue(range.start);
    const endStamp = dateValue(range.end);
    const matches = (state.matchRecords || []).filter((match) => {
      const stamp = dateValue(match.date);
      return stamp >= startStamp && stamp <= endStamp
        && match.isTrainingCandidate === true
        && match.detailStatus === "complete"
        && Boolean(match.hasSideDetails || ((match.ctPlayers || []).length && (match.tPlayers || []).length))
        && Number(match.detailPlayerCount || (match.players || []).length) > 0;
    });

    const promotedMatches = [];
    let promotedRecords = 0;

    for (const match of matches) {
      const uniqueMembers = new Set((match.recognizedMemberCodes || []).filter((code) => isTrainingEligible(state, code)));
      const matchRecordId = match.id || "";
      const matchId = match.matchId || "";
      const records = state.records.filter((record) => {
        if (!record.fiveE) return false;
        return (matchRecordId && record.fiveE.matchRecordId === matchRecordId)
          || (match.fingerprint && record.fiveE.fingerprint === match.fingerprint)
          || (matchId && record.fiveE.matchId === matchId);
      });
      if (!records.length) continue;

      for (const record of records) {
        if (!isTrainingEligible(state, record.userIdentityCode)) continue;
        record.seasonId = selectedSeason.id;
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
      promotedMatches: promotedMatches.length,
      promotedRecords,
      matches: promotedMatches,
      state,
    });
  } catch (error) {
    return json({ error: error.message || String(error) }, 500);
  }
}
