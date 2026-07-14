import { ensureSchema, isAdmin, json, readMatchCatalog, readState, userFromRequest, writeMatchCatalog, writeMatchDetail, writeState, writeSyncContext } from "./_utils.js";

function catalogSummary(match) {
  const { players, ctPlayers, tPlayers, ...summary } = match;
  return { ...summary, catalogStored: true };
}

function mergeCatalog(state, catalog) {
  state.matchRecords = state.matchRecords || [];
  const byMatchId = new Map(state.matchRecords.map((match) => [String(match.matchId || ""), match]).filter(([id]) => id));
  for (const summary of catalog || []) {
    const key = String(summary.matchId || "");
    const existing = byMatchId.get(key);
    if (existing) {
      Object.assign(existing, summary);
      continue;
    }
    const created = { players: [], ctPlayers: [], tPlayers: [], ...summary };
    state.matchRecords.push(created);
    byMatchId.set(key, created);
  }
}

async function persistAndCompactMatchDetails(db, state) {
  for (const match of state.matchRecords || []) {
    if (!(match.ctPlayers || []).length || !(match.tPlayers || []).length || !match.matchId) continue;
    await writeMatchDetail(db, match.matchId, {
      players: match.players || [],
      ctPlayers: match.ctPlayers,
      tPlayers: match.tPlayers,
      detailSyncedAt: match.detailSyncedAt || new Date().toISOString(),
    });
    match.hasSideDetails = true;
    match.ctPlayers = [];
    match.tPlayers = [];
  }
}

export async function onRequestGet({ request, env }) {
  try {
    if (!env.DB) return json({ error: "D1 数据库没有绑定到 DB。" }, 500);
    await ensureSchema(env.DB);

    const session = await userFromRequest(request, env.DB);
    if (!session) return json({ error: "请重新登录。" }, 401);

    const state = await readState(env.DB);
    if (!state) return json({ error: "数据库还没有初始化，请先登录一次。" }, 404);
    mergeCatalog(state, await readMatchCatalog(env.DB));
    return json({ state, identityCode: session.identity_code });
  } catch (error) {
    return json({ error: error.message || String(error) }, 500);
  }
}

export async function onRequestPut({ request, env }) {
  try {
    if (!env.DB) return json({ error: "D1 数据库没有绑定到 DB。" }, 500);
    await ensureSchema(env.DB);

    const session = await userFromRequest(request, env.DB);
    if (!session) return json({ error: "请重新登录。" }, 401);

    const state = await readState(env.DB);
    const actor = state?.users?.find((item) => item.identityCode === session.identity_code);
    const body = await request.json().catch(() => ({}));
    if (!body.state) return json({ error: "缺少要保存的数据。" }, 400);

    const nextActor = body.state.users?.find((item) => item.identityCode === session.identity_code);
    if (!isAdmin(actor) && JSON.stringify(nextActor) !== JSON.stringify(actor)) {
      return json({ error: "普通成员不能修改自己的身份或权限信息。" }, 403);
    }

    await persistAndCompactMatchDetails(env.DB, body.state);
    await writeMatchCatalog(env.DB, (body.state.matchRecords || []).map(catalogSummary));
    await writeSyncContext(env.DB, body.state);
    await writeState(env.DB, body.state);
    return json({ ok: true, state: body.state });
  } catch (error) {
    return json({ error: error.message || String(error) }, 500);
  }
}
