import { ensureSchema, isAdmin, json, readState, userFromRequest, writeState } from "./_utils.js";

function matchKeys(match) {
  return new Set([match?.id, match?.matchId, match?.fingerprint].filter(Boolean).map(String));
}

function isFiveERecord(record) {
  const source = String(record?.source || "");
  return source.startsWith("5e")
    || Boolean(record?.fiveE)
    || String(record?.createdBy || "").startsWith("5e")
    || String(record?.id || "").startsWith("5e-");
}

function recordBelongsToMatch(record, keys) {
  const candidates = [
    record?.fiveE?.matchRecordId,
    record?.fiveE?.matchId,
    record?.fiveE?.fingerprint,
    record?.trainingMatchId,
  ].filter(Boolean).map(String);
  return candidates.some((key) => keys.has(key));
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
    const requested = [body.id, body.matchId, body.fingerprint].filter(Boolean).map(String);
    if (!requested.length) return json({ error: "缺少要删除的对局标识。" }, 400);

    const matches = Array.isArray(state.matchRecords) ? state.matchRecords : [];
    const match = matches.find((item) => requested.includes(String(item.id || "")) || requested.includes(String(item.matchId || "")) || requested.includes(String(item.fingerprint || "")));
    if (!match) return json({ error: "没有找到要删除的对局。" }, 404);

    const keys = matchKeys(match);
    state.matchRecords = matches.filter((item) => !matchKeys(item).size || ![...matchKeys(item)].some((key) => keys.has(key)));

    const beforeRecords = Array.isArray(state.records) ? state.records.length : 0;
    state.records = (state.records || []).filter((record) => !(isFiveERecord(record) && recordBelongsToMatch(record, keys)));
    const removedRecords = beforeRecords - state.records.length;

    await writeState(env.DB, state);
    return json({
      ok: true,
      syncVersion: "8.1",
      removedMatches: 1,
      removedRecords,
      state,
    });
  } catch (error) {
    return json({ error: error.message || String(error) }, 500);
  }
}
