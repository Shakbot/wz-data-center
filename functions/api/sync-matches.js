import { ensureSchema, isAdmin, json, readState, userFromRequest, writeState } from "./_utils.js";

const FIVE_E_BASE = "https://ya-api-app.5eplay.com";

function isLikely5eDomain(value) {
  return /^[a-z0-9][a-z0-9_-]{2,}$/i.test(String(value || "").trim());
}

function isBlockedPathDomain(value) {
  return /^(app|fwap|profile|player|user|csgo|share_loding_type\d*|share_loading_type\d*|data|match_data)$/i.test(String(value || "").trim());
}

function isUsable5eDomain(value) {
  return isLikely5eDomain(value) && !isBlockedPathDomain(value);
}

function parse5eProfile(...values) {
  const candidates = values.flat().map((value) => String(value || "").trim()).filter(Boolean);
  let fallback = { domain: "", uuid: "", profileUrl: "" };
  for (const raw of candidates) {
    const parsed = parse5eProfileValue(raw);
    if (parsed.explicitDomain) return { domain: parsed.domain, uuid: parsed.uuid, profileUrl: parsed.profileUrl };
    fallback = {
      domain: fallback.domain || parsed.domain,
      uuid: fallback.uuid || parsed.uuid,
      profileUrl: fallback.profileUrl || parsed.profileUrl,
    };
  }
  return fallback;
}

function parse5eProfileValue(value) {
  const raw = String(value || "").trim();
  if (!raw) return { domain: "", uuid: "", profileUrl: "" };
  const domainMatch = raw.match(/[?&#]domain=([^&#]+)/i);
  const uuidMatch = raw.match(/[?&#]uuid=([^&#]+)/i);
  if (domainMatch) {
    return {
      domain: decodeURIComponent(domainMatch[1]).trim(),
      uuid: uuidMatch ? decodeURIComponent(uuidMatch[1]).trim() : "",
      profileUrl: raw,
      explicitDomain: true,
    };
  }
  try {
    const url = new URL(raw);
    const hashParams = new URLSearchParams(String(url.hash || "").replace(/^#\??/, ""));
    const uuid = url.searchParams.get("uuid") || hashParams.get("uuid") || "";
    const explicitDomain = url.searchParams.get("domain") || hashParams.get("domain") || "";
    const pathDomain = url.pathname
      .split("/")
      .map((part) => decodeURIComponent(part).trim())
      .reverse()
      .find(isUsable5eDomain);
    return {
      domain: explicitDomain || pathDomain || "",
      uuid,
      profileUrl: raw,
      explicitDomain: Boolean(explicitDomain),
    };
  } catch {
    return { domain: isUsable5eDomain(raw) ? raw : "", uuid: "", profileUrl: "", explicitDomain: isUsable5eDomain(raw) };
  }
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

function normalizeFiveEProfiles(state) {
  for (const user of state.users || []) {
    const rawDomain = String(user.fiveEDomain || "").trim();
    if (rawDomain && !parse5eProfile(rawDomain).domain) user.fiveEDomain = "";
    const profile = parse5eProfile(user.fiveEProfileUrl, user.fiveEDomain);
    if (profile.domain) user.fiveEDomain = profile.domain;
    if (profile.uuid && !user.fiveEUuid) user.fiveEUuid = profile.uuid;
  }
}

async function fetch5eJson(path) {
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

function readPlayerViewRows(detail) {
  return {
    full: rowsWithTeam(detail.user_match_data).length ? rowsWithTeam(detail.user_match_data) : readScoreboardRows(detail),
    ct: rowsWithTeam(detail.ct_user_match_data),
    t: rowsWithTeam(detail.t_user_match_data),
  };
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
    const profile = parse5eProfile(user.fiveEProfileUrl, user.fiveEDomain);
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

function buildPlayerViews(detail, indexes) {
  const rows = readPlayerViewRows(detail);
  return Object.fromEntries(Object.entries(rows).map(([scope, scopeRows]) => {
    return [scope, dedupePlayers(scopeRows.map((row) => buildPlayer(row, indexes)))];
  }));
}

function buildMatchRecord(state, listItem, detail, indexes) {
  const main = detail.main || detail.match || {};
  const date = dateFromUnix(main.end_time || main.start_time || listItem.end_time || listItem.start_time);
  const season = findSeasonForDate(state, date);
  const playerViews = buildPlayerViews(detail, indexes);
  const players = playerViews.full?.length ? playerViews.full : dedupePlayers(readScoreboardRows(detail).map((row) => buildPlayer(row, indexes)));
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
    playerViews: { ...playerViews, full: players },
    syncedAt: new Date().toISOString(),
  };
  record.fingerprint = matchFingerprint(record);
  record.id = `match-${record.fingerprint}`;
  return record;
}

function buildPendingMatchRecord(state, listItem, domains = []) {
  const date = dateFromUnix(listItem.end_time || listItem.start_time);
  const season = findSeasonForDate(state, date);
  const record = {
    matchId: listItem.match_id,
    date,
    endTime: String(listItem.end_time || ""),
    startTime: String(listItem.start_time || ""),
    map: String(listItem.map || ""),
    mapName: String(listItem.map_name || listItem.map_desc || ""),
    matchName: String(listItem.match_name || ""),
    matchType: String(listItem.match_type || ""),
    scoreA: firstNumber(listItem, ["group2_all_score", "group2_score", "team2_score", "score2", "b_score"]),
    scoreB: firstNumber(listItem, ["group1_all_score", "group1_score", "team1_score", "score1", "a_score"]),
    seasonId: season ? season.id : "",
    recognizedMemberCodes: [],
    isTrainingCandidate: false,
    isTrainingConfirmed: false,
    players: [],
    playerViews: { full: [] },
    pendingDetail: true,
    detailDomains: [...new Set(domains.filter(Boolean))],
    syncedAt: new Date().toISOString(),
  };
  record.fingerprint = matchFingerprint(record);
  record.id = `match-${record.fingerprint}`;
  return record;
}

function matchSeedFromRecord(matchRecord, seeds) {
  const memberSeed = seeds.find((seed) => (matchRecord.recognizedMemberCodes || []).includes(seed.user.identityCode));
  const playerDomain = (matchRecord.players || []).find((player) => player.domain)?.domain || "";
  const storedDomain = (matchRecord.detailDomains || []).find(Boolean) || "";
  const domain = memberSeed?.profile?.domain || playerDomain || storedDomain || seeds[0]?.profile?.domain || "";
  if (!matchRecord.matchId || !domain) return null;
  return {
    domain,
    item: {
      match_id: matchRecord.matchId,
      end_time: matchRecord.endTime || "",
      start_time: matchRecord.startTime || "",
      map: matchRecord.map || "",
      map_name: matchRecord.mapName || "",
      map_desc: matchRecord.mapName || "",
      match_name: matchRecord.matchName || "",
      match_type: matchRecord.matchType || "",
    },
    existing: true,
    domains: [domain, ...(matchRecord.detailDomains || [])],
  };
}

function addMatchSeed(matchSeeds, matchId, item, domain, extra = {}) {
  if (!matchId || !domain) return;
  const current = matchSeeds.get(matchId);
  if (current) {
    if (!current.domains.includes(domain)) current.domains.push(domain);
    current.existing = current.existing || Boolean(extra.existing);
    return;
  }
  matchSeeds.set(matchId, {
    item,
    domain,
    domains: [domain],
    ...extra,
  });
}

async function fetchMatchDetailWithFallback(matchId, domains) {
  const errors = [];
  for (const domain of [...new Set(domains.filter(Boolean))]) {
    try {
      const detail = await fetch5eJson(`/v0/mars/api/csgo/data/player_match_info/${encodeURIComponent(matchId)}/${encodeURIComponent(domain)}`);
      return { detail, domain, errors };
    } catch (error) {
      errors.push(`${domain}: ${error.message || String(error)}`);
    }
  }
  return { detail: null, domain: "", errors };
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

function normalizeStoredPlayer(player, indexes) {
  if (player.memberCode) return player;
  const member = recognizeMember({
    domain: player.domain,
    uuid: player.uuid,
    username: player.nickname || player.name,
    player_name: player.nickname || player.name,
  }, indexes);
  return member ? { ...player, memberCode: member.identityCode, isClubMember: true } : player;
}

function normalizeStoredPlayers(players, indexes) {
  return dedupePlayers((Array.isArray(players) ? players : []).map((player) => normalizeStoredPlayer(player, indexes)));
}

function matchRecordCompleteness(record) {
  const viewCount = Object.values(record.playerViews || {}).reduce((total, players) => {
    return total + (Array.isArray(players) ? players.length : 0);
  }, 0);
  return ((record.players || []).length * 10) + Math.min(viewCount, 30);
}

function normalizeExistingMatches(state, indexes) {
  const byMatch = new Map();
  for (const record of state.matchRecords || []) {
    record.players = normalizeStoredPlayers(record.players, indexes);
    if (record.playerViews && typeof record.playerViews === "object") {
      record.playerViews = Object.fromEntries(Object.entries(record.playerViews).map(([scope, players]) => {
        return [scope, normalizeStoredPlayers(players, indexes)];
      }));
      if (!record.playerViews.full?.length && record.players.length) record.playerViews.full = record.players;
    } else if (record.players.length) {
      record.playerViews = { full: record.players };
    }
    record.recognizedMemberCodes = [...new Set(record.players.filter((player) => player.memberCode).map((player) => player.memberCode))];
    record.isTrainingCandidate = record.recognizedMemberCodes.filter((code) => isTrainingEligible(state, code)).length >= 3;
    record.fingerprint = record.fingerprint || matchFingerprint(record);
    record.id = record.id || `match-${record.fingerprint}`;
    const key = record.matchId || record.fingerprint;
    const current = byMatch.get(key);
    if (!current || matchRecordCompleteness(record) > matchRecordCompleteness(current)) {
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
    const pages = Math.max(1, Math.min(5, Number(body.pages || body.page || 5)));
    normalizeUserAliases(state);
    normalizeFiveEProfiles(state);
    const seeds = state.users
      .map((user) => ({ user, profile: parse5eProfile(user.fiveEProfileUrl, user.fiveEDomain) }))
      .filter((item) => item.profile.domain);
    if (!seeds.length) return json({ error: "还没有成员绑定 5E 个人主页链接。" }, 400);

    const matchSeeds = new Map();
    const listFailures = [];
    for (const seed of seeds) {
      for (let page = 1; page <= pages; page += 1) {
        const listData = await fetch5eJson(`/v0/mars/api/csgo/match_data/match_list?domain=${encodeURIComponent(seed.profile.domain)}&match_type=&time=&date_time=0&map_name=&page=${page}`).catch((error) => {
          listFailures.push({ domain: seed.profile.domain, page, error: error.message || String(error) });
          return null;
        });
        if (!listData) continue;
        for (const item of (listData.match_list || []).slice(0, 20)) {
          addMatchSeed(matchSeeds, item.match_id, item, seed.profile.domain);
        }
      }
      seed.user.fiveEDomain = seed.profile.domain;
      if (seed.profile.uuid) seed.user.fiveEUuid = seed.profile.uuid;
      if (seed.profile.profileUrl) seed.user.fiveEProfileUrl = seed.profile.profileUrl;
      seed.user.fiveELastSyncAt = new Date().toISOString();
    }

    state.matchRecords = state.matchRecords || [];
    state.records = state.records || [];
    const indexes = buildMemberIndexes(state.users);
    normalizeExistingMatches(state, indexes);
    normalizeExistingPersonalRecords(state);
    for (const matchRecord of state.matchRecords) {
      const existingSeed = matchSeedFromRecord(matchRecord, seeds);
      if (existingSeed) addMatchSeed(matchSeeds, matchRecord.matchId, existingSeed.item, existingSeed.domain, { existing: true });
    }
    normalizeTrainingIncludedRecords(state);
    const existingByFingerprint = new Map(state.matchRecords.map((record) => [record.fingerprint || matchFingerprint(record), record]));
    const existingByMatchId = new Map(state.matchRecords.map((record) => [record.matchId, record]).filter(([matchId]) => matchId));
    let created = 0;
    let updated = 0;
    let refreshedExisting = 0;
    let detailFailures = 0;
    let pendingCreated = 0;
    const detailFailureSamples = [];

    for (const [matchId, seed] of matchSeeds.entries()) {
      const { detail, domain, errors } = await fetchMatchDetailWithFallback(matchId, seed.domains || [seed.domain]);
      if (!detail) {
        detailFailures += 1;
        if (detailFailureSamples.length < 8) detailFailureSamples.push({ matchId, errors });
        const current = existingByMatchId.get(matchId);
        if (!current) {
          const pending = buildPendingMatchRecord(state, seed.item, seed.domains || [seed.domain]);
          state.matchRecords.push(pending);
          existingByFingerprint.set(pending.fingerprint, pending);
          existingByMatchId.set(pending.matchId, pending);
          pendingCreated += 1;
        } else {
          current.pendingDetail = true;
          current.detailDomains = [...new Set([...(current.detailDomains || []), ...(seed.domains || [seed.domain])].filter(Boolean))];
          current.syncedAt = new Date().toISOString();
        }
        continue;
      }
      seed.domain = domain || seed.domain;
      const next = buildMatchRecord(state, seed.item, detail, indexes);
      const existing = existingByMatchId.get(next.matchId) || existingByFingerprint.get(next.fingerprint);
      if (existing) {
        Object.assign(existing, next, { isTrainingConfirmed: existing.isTrainingConfirmed || false });
        delete existing.pendingDetail;
        existingByFingerprint.set(existing.fingerprint, existing);
        existingByMatchId.set(existing.matchId, existing);
        updated += 1;
        if (seed.existing) refreshedExisting += 1;
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

    await writeState(env.DB, state);
    return json({
      ok: true,
      seedMembers: seeds.length,
      scannedPages: pages,
      scannedMatches: matchSeeds.size,
      listFailures: listFailures.length,
      detailFailures,
      detailFailureSamples,
      pendingCreated,
      refreshedExisting,
      created,
      updated,
      state,
    });
  } catch (error) {
    return json({ error: error.message || String(error) }, 500);
  }
}
