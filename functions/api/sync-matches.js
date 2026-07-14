import { ensureSchema, isAdmin, json, readState, userFromRequest, writeState } from "./_utils.js";

const FIVE_E_BASE = "https://ya-api-app.5eplay.com";
const DETAIL_CONCURRENCY = 4;
const DETAIL_BATCH_SIZE = 5;
const SYNC_VERSION = "8.3 Gamma";
const SYNC_ROLES = new Set([
  "总教练",
  "常务副总教练",
  "一般运动员",
  "特级运动员",
  "特邀运动员",
  "观察员",
]);

function parse5eProfile(value) {
  const raw = String(value || "").trim();
  if (!raw) return { domain: "", uuid: "", profileUrl: "" };
  try {
    const url = new URL(raw);
    return {
      domain: url.searchParams.get("domain") || "",
      uuid: url.searchParams.get("uuid") || "",
      profileUrl: raw,
    };
  } catch {
    return { domain: raw, uuid: "", profileUrl: "" };
  }
}

function resolve5eProfile(user) {
  const fromUrl = parse5eProfile(user?.fiveEProfileUrl);
  const fromDomain = parse5eProfile(user?.fiveEDomain);
  return {
    domain: fromUrl.domain || fromDomain.domain,
    uuid: fromUrl.uuid || String(user?.fiveEUuid || "") || fromDomain.uuid,
    profileUrl: fromUrl.profileUrl || "",
  };
}

function readField(row, keys) {
  for (const key of keys) {
    const path = String(key).split(".");
    let value = row;
    for (const part of path) value = value?.[part];
    if (value !== "" && value != null) return value;
  }
  return "";
}

function toNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function firstNumber(row, keys, fallback = 0) {
  for (const key of keys) {
    const value = readField(row, [key]);
    if (value === "" || value == null) continue;
    const number = Number(value);
    if (Number.isFinite(number)) return number;
  }
  return fallback;
}

function parseKda(row) {
  const text = String(row?.kda || row?.KDA || row?.kill_death_assist || row?.k_d_a || "").trim();
  const match = text.match(/(\d+)\s*[/-]\s*(\d+)\s*[/-]\s*(\d+)/);
  if (!match) return null;
  return { kill: Number(match[1]), death: Number(match[2]), assist: Number(match[3]) };
}

function dateFromUnix(value) {
  const stamp = toNumber(value);
  if (!stamp) return new Date().toISOString().slice(0, 10);
  return new Date(stamp * 1000).toISOString().slice(0, 10);
}

function normalizeName(value) {
  return String(value || "")
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/silver/g, "sliver")
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "");
}

function nameVariants(value) {
  const normalized = normalizeName(value);
  const variants = new Set([normalized]);
  if (normalized.startsWith("og")) variants.add(normalized.slice(2));
  variants.add(normalized.replace(/^og+/, ""));
  variants.add(normalized.replace(/^(og|o9|0g)/, ""));
  variants.add(normalized.replace(/^(og|o9|0g)?r+z+/i, "rzzzz"));
  return [...variants].filter((item) => item.length >= 3);
}

function findSeasonForDate(state, date) {
  const stamp = new Date(`${date}T00:00:00`).getTime();
  return state.seasons.find((season) => {
    return new Date(`${season.start}T00:00:00`).getTime() <= stamp && stamp <= new Date(`${season.end}T00:00:00`).getTime();
  });
}

function isTrainingEligible(state, code) {
  const user = state.users.find((item) => item.identityCode === code);
  return !!user && user.role !== "观察员";
}

function normalizeUserAliases(state) {
  const defaults = {
    "06": ["OG_SilverBullet_ZJ", "OG_SliverBullet_ZJ", "OG_SilverBullet", "OG_SliverBullet"],
  };
  for (const user of state.users || []) {
    user.fiveEAliases = Array.isArray(user.fiveEAliases)
      ? user.fiveEAliases
      : String(user.fiveEAliases || "").split(/[,，\n]/).map((item) => item.trim()).filter(Boolean);
    const aliases = new Set(user.fiveEAliases);
    for (const alias of defaults[user.identityCode] || []) aliases.add(alias);
    user.fiveEAliases = [...aliases];
  }
}

async function fetch5eJson(path, attempts = 1) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(`${FIVE_E_BASE}${path}`, {
        headers: {
          "accept": "application/json,text/plain,*/*",
          "user-agent": "Mozilla/5.0",
          "referer": "https://csgo.5eplay.com/fwap/",
        },
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.success) throw new Error(body?.message || `5E 接口请求失败：${response.status}`);
      return body.data;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, attempt * 250));
    }
  }
  throw lastError || new Error("5E 接口请求失败。");
}

async function mapWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let nextIndex = 0;
  async function run() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await worker(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => run()));
  return results;
}

function rowsWithTeam(rows, fallbackTeam = "") {
  return (Array.isArray(rows) ? rows : []).map((row) => ({ ...row, _fallbackTeam: fallbackTeam }));
}

function readScoreboardRows(detail) {
  const fullRows = rowsWithTeam(detail.user_match_data);
  if (fullRows.length) return fullRows;

  const groupedRows = [
    ...rowsWithTeam(detail.group1_user_match_data, "1"),
    ...rowsWithTeam(detail.group2_user_match_data, "2"),
  ];
  if (groupedRows.length) return groupedRows;

  const sideRows = [
    ...rowsWithTeam(detail.ct_user_match_data, "1"),
    ...rowsWithTeam(detail.t_user_match_data, "2"),
  ];
  if (sideRows.length) return sideRows;

  return rowsWithTeam(detail.players);
}

function compactKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function matchFingerprint(match) {
  return [
    match.matchId,
    match.date,
    match.endTime,
    match.mapName || match.map,
    `${match.scoreA}-${match.scoreB}`,
  ].map(compactKey).join("__");
}

function buildMemberIndexes(users) {
  const byDomain = new Map();
  const byUuid = new Map();
  const byName = new Map();
  const names = [];
  const addName = (name, user) => {
    for (const normalized of nameVariants(name)) {
      if (!normalized) continue;
      byName.set(normalized, user);
      names.push({ normalized, user });
    }
  };
  for (const user of users) {
    const profile = resolve5eProfile(user);
    if (profile.domain) byDomain.set(profile.domain, user);
    if (profile.uuid) byUuid.set(profile.uuid, user);
    if (user.fiveEUuid) byUuid.set(String(user.fiveEUuid), user);
    if (user.fiveEDomain) byDomain.set(String(user.fiveEDomain), user);
    addName(user.gameId, user);
    addName(user.name, user);
    for (const alias of user.fiveEAliases || []) addName(alias, user);
  }
  return { byDomain, byUuid, byName, names };
}

function recognizeMember(row, indexes) {
  const domain = String(readField(row, ["domain", "user.domain", "user_info.domain", "player.domain", "player_info.domain"]) || "").trim();
  const uuid = String(readField(row, ["uuid", "user.uuid", "user_info.uuid", "player.uuid", "player_info.uuid"]) || "").trim();
  const nickname = String(readField(row, [
    "username",
    "user_name",
    "player_name",
    "name",
    "nickname",
    "nick_name",
    "user.username",
    "user.name",
    "user.nickname",
    "user_info.username",
    "user_info.name",
    "user_info.nickname",
    "player.username",
    "player.name",
    "player.nickname",
    "player_info.username",
    "player_info.name",
    "player_info.nickname",
  ]) || "").trim();
  if (domain && indexes.byDomain.has(domain)) return indexes.byDomain.get(domain);
  if (uuid && indexes.byUuid.has(uuid)) return indexes.byUuid.get(uuid);
  const normalized = normalizeName(nickname);
  if (normalized && indexes.byName.has(normalized)) return indexes.byName.get(normalized);
  for (const variant of nameVariants(nickname)) {
    if (indexes.byName.has(variant)) return indexes.byName.get(variant);
  }
  if (normalized) {
    const candidates = indexes.names.filter(({ normalized: name }) => {
      return normalized.length >= 5 && name.length >= 5 && (normalized.includes(name) || name.includes(normalized) || nameVariants(nickname).includes(name));
    });
    if (candidates.length === 1) return candidates[0].user;
  }
  return null;
}

function sideOf(row, fallback = "") {
  return String(readField(row, ["group_id", "side", "team", "team_id", "groupId"]) || row?._fallbackTeam || fallback || "");
}

function extractSwingScore(row) {
  const candidates = [
    row.swing_score,
    row.swingScore,
    row.swing_score_value,
    row.swingScoreValue,
    row.swing,
    row.swing_value,
    row.swingValue,
    row.ss,
    row.five_swing_score,
    row.score_value,
    row.score,
    row.change_elo,
  ];
  for (const value of candidates) {
    const score = Number(value);
    if (Number.isFinite(score)) return score;
  }
  return 0;
}

function buildPlayer(row, indexes) {
  const member = recognizeMember(row, indexes);
  const kda = parseKda(row);
  const kills = kda?.kill ?? firstNumber(row, ["kill", "kills", "kill_num", "killCount", "kill_count", "total_kill", "enemy_kill", "frags", "k"]);
  const deaths = kda?.death ?? firstNumber(row, ["death", "deaths", "death_num", "deathCount", "death_count", "d"]);
  const assists = kda?.assist ?? firstNumber(row, ["assist", "assists", "assist_num", "assistCount", "assist_count", "a"]);
  const headshots = firstNumber(row, ["headshot", "headshots", "headshot_num", "hs", "hs_num"]);
  const headshotRate = firstNumber(row, ["per_headshot", "headshotRate", "headshot_rate", "hsRate", "hs_rate"], NaN);
  const nickname = String(readField(row, [
    "username",
    "user_name",
    "player_name",
    "name",
    "nickname",
    "nick_name",
    "user.username",
    "user.name",
    "user.nickname",
    "user_info.username",
    "user_info.name",
    "user_info.nickname",
    "player.username",
    "player.name",
    "player.nickname",
    "player_info.username",
    "player_info.name",
    "player_info.nickname",
    "domain",
  ]) || "Unknown");
  return {
    nickname,
    domain: String(readField(row, ["domain", "user.domain", "user_info.domain", "player.domain", "player_info.domain"]) || ""),
    uuid: String(readField(row, ["uuid", "user.uuid", "user_info.uuid", "player.uuid", "player_info.uuid"]) || ""),
    memberCode: member?.identityCode || "",
    isClubMember: Boolean(member),
    isOgCandidate: normalizeName(nickname).startsWith("og_"),
    team: sideOf(row),
    kill: kills,
    death: deaths,
    assist: assists,
    adr: firstNumber(row, ["adr", "ADR", "avg_damage", "average_damage", "damage_per_round", "per_damage"]),
    kast: firstNumber(row, ["kast", "KAST", "per_kast", "kast_rate"]),
    rws: firstNumber(row, ["rws", "RWS", "rws_score"]),
    rating: firstNumber(row, ["rating", "Rating", "rating_score", "score_rating"]),
    swingScore: extractSwingScore(row),
    headshotRate: Number.isFinite(headshotRate) ? headshotRate : kills ? (headshots / kills) * 100 : 0,
    rank: String(readField(row, ["level_name", "rank", "rank_name"]) || ""),
    avatar: String(readField(row, ["avatar_url", "avatar", "user.avatar_url", "user.avatar", "user_info.avatar_url", "user_info.avatar"]) || ""),
  };
}

function playerCompleteness(player) {
  return [
    player.nickname && player.nickname !== "Unknown",
    player.kill || player.death || player.assist,
    player.adr,
    player.kast,
    player.rws,
    player.rating,
    player.team,
    player.avatar,
  ].reduce((total, value) => total + (value ? 1 : 0), 0);
}

function dedupePlayers(players) {
  const chosen = new Map();
  for (const player of players) {
    const key = player.domain || player.uuid || `${normalizeName(player.nickname)}-${player.team || ""}`;
    const current = chosen.get(key);
    if (
      !current
      || playerCompleteness(player) > playerCompleteness(current)
      || (playerCompleteness(player) === playerCompleteness(current) && Number(player.rating || 0) > Number(current.rating || 0))
    ) {
      chosen.set(key, player);
    }
  }
  const deduped = [...chosen.values()].sort((a, b) => Number(a.team || 0) - Number(b.team || 0) || Number(b.rating || 0) - Number(a.rating || 0));
  const teamA = deduped.filter((player) => String(player.team) === "1").slice(0, 5);
  const teamB = deduped.filter((player) => String(player.team) === "2").slice(0, 5);
  const other = deduped.filter((player) => String(player.team) !== "1" && String(player.team) !== "2").slice(0, Math.max(0, 10 - teamA.length - teamB.length));
  return [...teamA, ...teamB, ...other].slice(0, 10);
}

function buildMatchRecord(state, listItem, detail, indexes, seedUser) {
  const main = detail.main || detail.match || {};
  const date = dateFromUnix(main.end_time || main.start_time || listItem.end_time || listItem.start_time);
  const season = findSeasonForDate(state, date);
  const sourceRows = readScoreboardRows(detail);
  const players = dedupePlayers(sourceRows.map((row) => buildPlayer(row, indexes)));
  const expectedPlayers = Math.min(sourceRows.length, 10);
  if (!players.length || players.length < expectedPlayers) throw new Error("详情接口返回的选手数据不完整");
  const recognizedMemberCodes = [...new Set(players.filter((player) => player.memberCode).map((player) => player.memberCode))];
  const trainingMemberCodes = recognizedMemberCodes.filter((code) => isTrainingEligible(state, code));
  const group1Score = firstNumber(main, ["group1_all_score", "group1_score", "team1_score", "score1", "a_score"], firstNumber(listItem, ["group1_all_score", "group1_score", "team1_score", "score1", "a_score"]));
  const group2Score = firstNumber(main, ["group2_all_score", "group2_score", "team2_score", "score2", "b_score"], firstNumber(listItem, ["group2_all_score", "group2_score", "team2_score", "score2", "b_score"]));
  const record = {
    matchId: listItem.match_id,
    date,
    endTime: String(main.end_time || listItem.end_time || ""),
    map: String(main.map || listItem.map || ""),
    mapName: String(main.map_name || main.map_desc || listItem.map_name || listItem.map_desc || ""),
    matchName: String(main.match_name || listItem.match_name || ""),
    matchType: String(main.match_type || listItem.match_type || ""),
    scoreA: group2Score,
    scoreB: group1Score,
    seasonId: season ? season.id : "",
    recognizedMemberCodes,
    isTrainingCandidate: trainingMemberCodes.length >= 3,
    isTrainingConfirmed: false,
    players,
    detailStatus: "complete",
    detailPlayerCount: sourceRows.length,
    syncedFromMemberCode: seedUser?.identityCode || "",
    syncedAt: new Date().toISOString(),
  };
  record.fingerprint = matchFingerprint(record);
  record.id = `match-${record.fingerprint}`;
  return record;
}

function hasCompleteDetail(record) {
  return record?.detailStatus === "complete"
    && Number(record.detailPlayerCount || 0) > 0
    && Array.isArray(record.players)
    && record.players.length > 0;
}

function upsertPersonalRecords(state, matchRecord) {
  const existing = new Map();
  for (const record of state.records) {
    for (const matchKey of [record.fiveE?.matchRecordId, record.fiveE?.fingerprint, record.fiveE?.matchId].filter(Boolean)) {
      existing.set(`${matchKey}:${record.userIdentityCode}`, record);
    }
  }
  for (const player of matchRecord.players) {
    if (!player.memberCode) continue;
    const key = `${matchRecord.id}:${player.memberCode}`;
    const matchIdKey = `${matchRecord.matchId}:${player.memberCode}`;
    const fingerprintKey = `${matchRecord.fingerprint}:${player.memberCode}`;
    const nextFiveE = {
      matchRecordId: matchRecord.id,
      matchId: matchRecord.matchId,
      fingerprint: matchRecord.fingerprint,
      matchName: matchRecord.matchName,
      matchType: matchRecord.matchType,
      map: matchRecord.map,
      mapName: matchRecord.mapName,
      isWin: matchRecord.scoreA !== matchRecord.scoreB ? player.team === (matchRecord.scoreA > matchRecord.scoreB ? "2" : "1") : false,
      swingScore: player.swingScore,
      kill: player.kill,
      death: player.death,
      assist: player.assist,
      endTime: matchRecord.endTime,
    };
    const current = existing.get(key) || existing.get(matchIdKey) || existing.get(fingerprintKey);
    if (current) {
      Object.assign(current, {
        date: matchRecord.date,
        rating: player.rating,
        rws: player.rws,
        adr: player.adr,
        kast: player.kast,
        headshotRate: player.headshotRate,
        seasonId: matchRecord.seasonId,
        source: "5e-match-sync",
        fiveE: { ...(current.fiveE || {}), ...nextFiveE },
        updatedBy: "5e-match-sync",
        updatedAt: new Date().toISOString(),
      });
      continue;
    }
    const created = {
      id: `5e-${matchRecord.fingerprint}-${player.memberCode}`,
      userIdentityCode: player.memberCode,
      date: matchRecord.date,
      matchOrder: 1,
      rating: player.rating,
      rws: player.rws,
      adr: player.adr,
      kast: player.kast,
      headshotRate: player.headshotRate,
      seasonId: matchRecord.seasonId,
      createdBy: "5e-sync",
      createdAt: new Date().toISOString(),
      source: "5e-match-sync",
      fiveE: nextFiveE,
    };
    state.records.push(created);
    existing.set(key, created);
    existing.set(matchIdKey, created);
    existing.set(fingerprintKey, created);
  }
}

function normalizeExistingMatches(state, indexes) {
  const byMatch = new Map();
  for (const record of state.matchRecords || []) {
    record.players = dedupePlayers((record.players || []).map((player) => {
      if (player.memberCode) return player;
      const member = recognizeMember({
        domain: player.domain,
        uuid: player.uuid,
        username: player.nickname || player.name,
        player_name: player.nickname || player.name,
      }, indexes);
      return member ? { ...player, memberCode: member.identityCode, isClubMember: true } : player;
    }));
    record.recognizedMemberCodes = [...new Set(record.players.filter((player) => player.memberCode).map((player) => player.memberCode))];
    record.isTrainingCandidate = record.recognizedMemberCodes.filter((code) => isTrainingEligible(state, code)).length >= 3;
    record.fingerprint = record.fingerprint || matchFingerprint(record);
    record.id = record.id || `match-${record.fingerprint}`;
    const key = record.matchId || record.fingerprint;
    const current = byMatch.get(key);
    if (!current || (record.players || []).length > (current.players || []).length) {
      byMatch.set(key, record);
    }
  }
  state.matchRecords = [...byMatch.values()];
}

function normalizeExistingPersonalRecords(state) {
  const byMatchAndUser = new Map();
  const passthrough = [];
  const mergeTrainingFlags = (target, source) => {
    if (source.trainingIncluded) target.trainingIncluded = true;
    if (source.trainingMatchId && !target.trainingMatchId) target.trainingMatchId = source.trainingMatchId;
    if (source.trainingPromotedAt && !target.trainingPromotedAt) target.trainingPromotedAt = source.trainingPromotedAt;
  };
  for (const record of state.records || []) {
    const matchKey = record.fiveE?.matchId || record.fiveE?.matchRecordId || record.fiveE?.fingerprint || "";
    if (!matchKey || !record.userIdentityCode) {
      passthrough.push(record);
      continue;
    }
    const key = `${matchKey}:${record.userIdentityCode}`;
    const current = byMatchAndUser.get(key);
    if (!current) {
      byMatchAndUser.set(key, record);
      continue;
    }
    const next = String(record.updatedAt || record.createdAt || "") > String(current.updatedAt || current.createdAt || "")
      ? record
      : current;
    mergeTrainingFlags(next, current);
    mergeTrainingFlags(next, record);
    byMatchAndUser.set(key, next);
  }
  state.records = [...passthrough, ...byMatchAndUser.values()];
}

function normalizeTrainingIncludedRecords(state) {
  const byMatchAndUser = new Map();
  for (const record of state.records || []) {
    if (!record.trainingIncluded || !record.userIdentityCode) continue;
    const matchKey = record.fiveE?.matchId || record.trainingMatchId || record.fiveE?.matchRecordId || record.fiveE?.fingerprint || "";
    if (!matchKey) continue;
    byMatchAndUser.set(`${matchKey}:${record.userIdentityCode}`, record);
  }
  for (const record of state.records || []) {
    if (!record.userIdentityCode) continue;
    const keys = [
      record.fiveE?.matchId,
      record.trainingMatchId,
      record.fiveE?.matchRecordId,
      record.fiveE?.fingerprint,
    ].filter(Boolean).map((matchKey) => `${matchKey}:${record.userIdentityCode}`);
    const promoted = keys.map((key) => byMatchAndUser.get(key)).find(Boolean);
    if (promoted?.trainingIncluded) {
      record.trainingIncluded = true;
      record.trainingMatchId = record.trainingMatchId || promoted.trainingMatchId;
      record.trainingPromotedAt = record.trainingPromotedAt || promoted.trainingPromotedAt;
    }
  }
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
    if (!isAdmin(actor)) return json({ error: "只有管理员可以一键同步全员对局。" }, 403);

    const body = await request.json().catch(() => ({}));
    const requestedCursor = body.cursor && typeof body.cursor === "object" ? body.cursor : {};
    const memberIndex = Math.max(0, Math.floor(Number(requestedCursor.memberIndex || 0)));
    const page = Math.max(1, Math.floor(Number(requestedCursor.page || 1)));
    const offset = Math.max(0, Math.floor(Number(requestedCursor.offset || 0)));
    normalizeUserAliases(state);
    const seeds = state.users
      .map((user) => ({ user, profile: resolve5eProfile(user) }))
      .filter((item) => SYNC_ROLES.has(String(item.user.role || "").trim()) && item.profile.domain);
    if (!seeds.length) return json({ error: "指定角色中还没有成员绑定 5E 个人主页链接。" }, 400);
    if (memberIndex >= seeds.length) {
      return json({ ok: true, done: true, seedMembers: seeds.length, syncVersion: SYNC_VERSION });
    }

    const seed = seeds[memberIndex];
    const listPath = `/v0/mars/api/csgo/match_data/match_list?domain=${encodeURIComponent(seed.profile.domain)}&match_type=&time=&date_time=0&map_name=&page=${page}`;
    let listData;
    try {
      listData = await fetch5eJson(listPath, 3);
    } catch (error) {
      return json({
        ok: true,
        done: memberIndex + 1 >= seeds.length,
        seedMembers: seeds.length,
        syncVersion: SYNC_VERSION,
        memberIndex,
        memberCode: seed.user.identityCode,
        memberName: seed.user.gameId || seed.user.name || seed.user.identityCode,
        page,
        offset,
        scannedMatches: 0,
        attemptedDetails: 0,
        skippedComplete: 0,
        detailFailures: 0,
        failures: [],
        memberFailures: [{
          memberCode: seed.user.identityCode,
          memberName: seed.user.gameId || seed.user.name || seed.user.identityCode,
          domain: seed.profile.domain,
          error: error.message || String(error),
        }],
        completedMatchIds: [],
        nextCursor: { memberIndex: memberIndex + 1, page: 1, offset: 0 },
        created: 0,
        updated: 0,
      });
    }
    const pageItems = [...new Map((Array.isArray(listData?.match_list) ? listData.match_list : [])
      .filter((item) => item?.match_id)
      .map((item) => [item.match_id, item])).values()];

    seed.user.fiveEDomain = seed.profile.domain;
    if (seed.profile.uuid) seed.user.fiveEUuid = seed.profile.uuid;
    if (seed.profile.profileUrl) seed.user.fiveEProfileUrl = seed.profile.profileUrl;

    state.matchRecords = state.matchRecords || [];
    state.records = state.records || [];
    const indexes = buildMemberIndexes(state.users);
    normalizeExistingMatches(state, indexes);
    normalizeExistingPersonalRecords(state);
    normalizeTrainingIncludedRecords(state);
    const existingByFingerprint = new Map(state.matchRecords.map((record) => [record.fingerprint || matchFingerprint(record), record]));
    const existingByMatchId = new Map(state.matchRecords.map((record) => [record.matchId, record]).filter(([matchId]) => matchId));
    let created = 0;
    let updated = 0;
    let skippedComplete = 0;
    const pageSlice = pageItems.slice(offset, offset + DETAIL_BATCH_SIZE);
    const detailQueue = [];
    for (const item of pageSlice) {
      const existing = existingByMatchId.get(item.match_id);
      if (hasCompleteDetail(existing)) {
        skippedComplete += 1;
        upsertPersonalRecords(state, existing);
      } else {
        detailQueue.push(item);
      }
    }

    const detailResults = await mapWithConcurrency(detailQueue, DETAIL_CONCURRENCY, async (item) => {
      try {
        const detailPath = `/v0/mars/api/csgo/data/player_match_info/${encodeURIComponent(item.match_id)}/${encodeURIComponent(seed.profile.domain)}`;
        const detail = await fetch5eJson(detailPath, 2);
        return { item, next: buildMatchRecord(state, item, detail, indexes, seed.user) };
      } catch (error) {
        return { item, error: error.message || String(error) };
      }
    });

    const failures = [];
    const completedMatchIds = pageSlice
      .filter((item) => hasCompleteDetail(existingByMatchId.get(item.match_id)))
      .map((item) => item.match_id);
    for (const result of detailResults) {
      if (result.error) {
        failures.push({ matchId: result.item.match_id, error: result.error });
        continue;
      }
      const next = result.next;
      completedMatchIds.push(next.matchId);
      const existing = existingByMatchId.get(next.matchId) || existingByFingerprint.get(next.fingerprint);
      if (existing) {
        Object.assign(existing, next, { isTrainingConfirmed: existing.isTrainingConfirmed || false });
        existingByFingerprint.set(existing.fingerprint, existing);
        existingByMatchId.set(existing.matchId, existing);
        updated += 1;
        upsertPersonalRecords(state, existing);
      } else {
        state.matchRecords.push(next);
        existingByFingerprint.set(next.fingerprint, next);
        existingByMatchId.set(next.matchId, next);
        created += 1;
        upsertPersonalRecords(state, next);
      }
    }
    normalizeTrainingIncludedRecords(state);
    normalizeExistingPersonalRecords(state);

    const pageSignature = pageItems.map((item) => item.match_id).join(",");
    const repeatedPage = Boolean(pageItems.length && offset === 0 && requestedCursor.previousPageSignature === pageSignature);
    const pageHasMoreWork = offset + DETAIL_BATCH_SIZE < pageItems.length;
    const memberFinished = pageItems.length === 0 || repeatedPage;
    if (memberFinished) seed.user.fiveELastSyncAt = new Date().toISOString();
    const nextCursor = memberFinished
      ? { memberIndex: memberIndex + 1, page: 1 }
      : pageHasMoreWork
        ? { memberIndex, page, offset: offset + DETAIL_BATCH_SIZE, previousPageSignature: pageSignature }
        : { memberIndex, page: page + 1, offset: 0, previousPageSignature: pageSignature };
    const done = nextCursor.memberIndex >= seeds.length;

    await writeState(env.DB, state);
    return json({
      ok: true,
      done,
      seedMembers: seeds.length,
      syncVersion: SYNC_VERSION,
      memberIndex,
      memberCode: seed.user.identityCode,
      memberName: seed.user.gameId || seed.user.name || seed.user.identityCode,
      page,
      offset,
      remainingPageDetails: Math.max(0, pageItems.length - offset - DETAIL_BATCH_SIZE),
      scannedMatches: offset === 0 ? pageItems.length : 0,
      attemptedDetails: detailQueue.length,
      skippedComplete,
      detailFailures: failures.length,
      failures,
      memberFailures: [],
      completedMatchIds: [...new Set(completedMatchIds)],
      nextCursor,
      created,
      updated,
    });
  } catch (error) {
    return json({ error: error.message || String(error) }, 500);
  }
}
