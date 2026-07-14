import { ensureSchema, isAdmin, json, readState, userFromRequest, writeState } from "./_utils.js";

const SYNC_VERSION = "8.2";

function matchKeys(match) {
  return new Set([match?.id, match?.matchId, match?.fingerprint].filter(Boolean).map(String));
}

function requestKeys(body) {
  const keys = new Set([body.id, body.matchId, body.fingerprint].filter(Boolean).map(String));
  for (const id of body.ids || []) if (id) keys.add(String(id));
  for (const matchId of body.matchIds || []) if (matchId) keys.add(String(matchId));
  for (const match of body.matches || []) {
    for (const value of [match?.id, match?.matchId, match?.fingerprint]) {
      if (value) keys.add(String(value));
    }
  }
  return keys;
}

function isFiveERecord(record) {
  const source = String(record?.source || "");
  return source.startsWith("5e")
    || Boolean(record?.fiveE)
    || String(record?.createdBy || "").startsWith("5e")
    || String(record?.id || "").startsWith("5e-");
}

function recordBelongsToDeletedMatch(record, deletedKeys) {
  const candidates = [
    record?.fiveE?.matchRecordId,
    record?.fiveE?.matchId,
    record?.fiveE?.fingerprint,
    record?.trainingMatchId,
  ].filter(Boolean).map(String);
  return candidates.some((key) => deletedKeys.has(key));
}

export async function onRequestPost({ request, env }) {
  try {
    if (!env.DB) return json({ error: "D1 数据库没有绑定到 DB。" }, 500);
    await ensureSchema(env.DB);

    const session = await userFromRequest(request, env.DB);
    if (!session) return json({ error: "请重新登录。" }, 401);

    const state = await readState(env.DB);
    if (!state) return json({ error: "数据库还没有初始化，请先登录一次。" }, 404);

    const actor = state.users?.find((user) => user.identityCode === session.identity_code);
    if (!isAdmin(actor)) return json({ error: "只有拥有全体管理权限的用户可以删除已同步对局。" }, 403);

    const body = await request.json().catch(() => ({}));
    const requested = requestKeys(body);
    if (!requested.size) return json({ error: "缺少要删除的对局标识。" }, 400);

    const matches = Array.isArray(state.matchRecords) ? state.matchRecords : [];
    const deletedKeys = new Set();
    let removedMatches = 0;
    const keptMatches = [];
    for (const match of matches) {
      const keys = matchKeys(match);
      const shouldDelete = [...keys].some((key) => requested.has(key));
      if (!shouldDelete) {
        keptMatches.push(match);
        continue;
      }
      for (const key of keys) deletedKeys.add(key);
      removedMatches += 1;
    }
    if (!deletedKeys.size) return json({ error: "没有找到要删除的对局。" }, 404);

    state.matchRecords = keptMatches;
    const beforeRecords = Array.isArray(state.records) ? state.records.length : 0;
    state.records = (state.records || []).filter((record) => !(isFiveERecord(record) && recordBelongsToDeletedMatch(record, deletedKeys)));
    const removedRecords = beforeRecords - state.records.length;

    await writeState(env.DB, state);
    return json({
      ok: true,
      syncVersion: SYNC_VERSION,
      removedMatches,
      removedRecords,
      state,
    });
  } catch (error) {
    return json({ error: error.message || String(error) }, 500);
  }
}
