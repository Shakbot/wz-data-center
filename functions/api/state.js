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

function sameValue(a, b) {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

function hasOnlySelfServiceProfileChanges(previous, next) {
  if (!previous || !next) return false;
  const editableFields = new Set([
    "avatar",
    "password",
    "fiveEProfileUrl",
    "fiveEDomain",
    "fiveEUuid",
    "fiveEAliases",
    "fiveELastSyncAt",
  ]);
  const keys = new Set([...Object.keys(previous), ...Object.keys(next)]);
  for (const key of keys) {
    if (editableFields.has(key)) continue;
    if (!sameValue(previous[key], next[key])) return false;
  }
  return true;
}

function hasOnlyAllowedUserChanges(previousUsers = [], nextUsers = [], identityCode = "") {
  if (!Array.isArray(previousUsers) || !Array.isArray(nextUsers)) return false;
  if (previousUsers.length !== nextUsers.length) return false;

  const previousByCode = new Map(previousUsers.map((user) => [String(user.identityCode || ""), user]));
  const seenCodes = new Set();
  for (const nextUser of nextUsers) {
    const code = String(nextUser?.identityCode || "");
    if (!code || seenCodes.has(code)) return false;
    seenCodes.add(code);
    const previousUser = previousByCode.get(code);
    if (!previousUser) return false;
    if (code === identityCode) {
      if (!hasOnlySelfServiceProfileChanges(previousUser, nextUser)) return false;
    } else if (!sameValue(previousUser, nextUser)) {
      return false;
    }
  }
  return seenCodes.has(identityCode) && seenCodes.size === previousByCode.size;
}

function hasOnlyOwnAnnouncementReadChanges(previousItems = [], nextItems = [], identityCode = "") {
  if (!Array.isArray(previousItems) || !Array.isArray(nextItems) || previousItems.length !== nextItems.length) return false;
  const previousById = new Map(previousItems.map((item) => [String(item.id || ""), item]));
  for (const next of nextItems) {
    const previous = previousById.get(String(next?.id || ""));
    if (!previous) return false;
    const previousReadBy = (previous.readBy || []).filter((code) => code !== identityCode).sort();
    const nextReadBy = (next.readBy || []).filter((code) => code !== identityCode).sort();
    if (!sameValue(previousReadBy, nextReadBy)) return false;
    const { readBy: previousReads, ...previousContent } = previous;
    const { readBy: nextReads, ...nextContent } = next;
    if (!sameValue({ pinned: false, ...previousContent }, { pinned: false, ...nextContent })) return false;
  }
  return true;
}

function hasOnlyOwnMedalOrderChanges(previousItems = [], nextItems = [], identityCode = "") {
  if (!Array.isArray(previousItems) || !Array.isArray(nextItems) || previousItems.length !== nextItems.length) return false;
  const previousById = new Map(previousItems.map((item) => [String(item.id || ""), item]));
  for (const next of nextItems) {
    const previous = previousById.get(String(next?.id || ""));
    if (!previous) return false;
    if (previous.userIdentityCode !== identityCode) {
      if (!sameValue(previous, next)) return false;
      continue;
    }
    const { order: previousOrder, memberOrder: previousMemberOrder, ...previousContent } = previous;
    const { order: nextOrder, memberOrder: nextMemberOrder, ...nextContent } = next;
    if (!sameValue(previousContent, nextContent)) return false;
  }
  return true;
}

function hasOnlyOwnRecordChanges(previousItems = [], nextItems = [], identityCode = "") {
  if (!Array.isArray(previousItems) || !Array.isArray(nextItems)) return false;
  const previousById = new Map(previousItems.map((item) => [String(item.id || ""), item]));
  const nextById = new Map(nextItems.map((item) => [String(item.id || ""), item]));
  if (previousById.size !== previousItems.length || nextById.size !== nextItems.length) return false;
  for (const previous of previousItems) {
    if (previous.userIdentityCode === identityCode) continue;
    if (!sameValue(previous, nextById.get(String(previous.id || "")))) return false;
  }
  for (const next of nextItems) {
    const previous = previousById.get(String(next.id || ""));
    if (next.userIdentityCode !== identityCode && !sameValue(previous, next)) return false;
  }
  return true;
}

function hasOnlyAllowedNonAdminChanges(previousState, nextState, identityCode) {
  return hasOnlyAllowedUserChanges(previousState?.users, nextState?.users, identityCode)
    && sameValue(previousState?.seasons || [], nextState?.seasons || [])
    && sameValue(previousState?.matchRecords || [], nextState?.matchRecords || [])
    && sameValue(previousState?.medalAnnouncements || [], nextState?.medalAnnouncements || [])
    && sameValue(previousState?.networkLinks || [], nextState?.networkLinks || [])
    && hasOnlyOwnRecordChanges(previousState?.records || [], nextState?.records || [], identityCode)
    && hasOnlyOwnMedalOrderChanges(previousState?.medals || [], nextState?.medals || [], identityCode)
    && hasOnlyOwnAnnouncementReadChanges(previousState?.announcements || [], nextState?.announcements || [], identityCode);
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
    mergeCatalog(state, await readMatchCatalog(env.DB));
    const actor = state?.users?.find((item) => item.identityCode === session.identity_code);
    const body = await request.json().catch(() => ({}));
    if (!body.state) return json({ error: "缺少要保存的数据。" }, 400);

    if (!isAdmin(actor) && !hasOnlyAllowedNonAdminChanges(state, body.state, session.identity_code)) {
      return json({ error: "普通成员只能修改自己的资料与训练记录，并标记公告已读。" }, 403);
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
