import { ensureSchema, isAdmin, json, readState, userFromRequest, writeState } from "./_utils.js";

const SYNC_VERSION = "8.3 Gamma";

function collectRequestKeys(body) {
  const keys = new Set();
  for (const value of [body.id, body.matchId, body.fingerprint]) {
    if (value) keys.add(String(value));
  }
  for (const value of body.ids || []) {
    if (value) keys.add(String(value));
  }
  for (const value of body.matchIds || []) {
    if (value) keys.add(String(value));
  }
  return keys;
}

function collectMatchKeys(match) {
  return new Set([match?.id, match?.matchId, match?.fingerprint].filter(Boolean).map(String));
}

function isFiveEMatchRecord(record) {
  return String(record?.source || "").startsWith("5e")
    || String(record?.createdBy || "").startsWith("5e")
    || Boolean(record?.fiveE);
}

function recordBelongsToDeletedMatch(record, deletedKeys) {
  const keys = [
    record?.fiveE?.matchRecordId,
    record?.fiveE?.matchId,
    record?.fiveE?.fingerprint,
    record?.trainingMatchId,
  ].filter(Boolean).map(String);
  return keys.some((key) => deletedKeys.has(key));
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
    const requestedKeys = collectRequestKeys(body);
    if (!requestedKeys.size) return json({ error: "缺少要删除的对局标识。" }, 400);

    const keptMatches = [];
    const deletedKeys = new Set();
    let removedMatches = 0;

    for (const match of state.matchRecords || []) {
      const matchKeys = collectMatchKeys(match);
      const shouldDelete = [...matchKeys].some((key) => requestedKeys.has(key));
      if (!shouldDelete) {
        keptMatches.push(match);
        continue;
      }
      removedMatches += 1;
      for (const key of matchKeys) deletedKeys.add(key);
    }

    if (!removedMatches) return json({ error: "没有找到要删除的对局。" }, 404);

    const beforeRecords = Array.isArray(state.records) ? state.records.length : 0;
    state.matchRecords = keptMatches;
    state.records = (state.records || []).filter((record) => {
      return !(isFiveEMatchRecord(record) && recordBelongsToDeletedMatch(record, deletedKeys));
    });
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
