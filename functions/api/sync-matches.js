import { ensureSchema, isAdmin, json, readState, userFromRequest, writeState } from "./_utils.js";

const FIVE_E_BASE = "https://ya-api-app.5eplay.com";
const ARENA_BASE = "https://arena.5eplay.com/data/match";
const SYNC_VERSION = "8.2";

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
    if (parsed.explicitDomain) return parsed;
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
    const explicitDomain = url.searchParams.get("domain") || hashParams.get("domain") || "";
    const uuid = url.searchParams.get("uuid") || hashParams.get("uuid") || "";
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
    const profile = parse5eProfile(user.fiveEProfileUrl, user.fiveEDomain);
    if (profile.domain) user.fiveEDomain = profile.domain;
    if (profile.uuid && !user.fiveEUuid) user.fiveEUuid = profile.uuid;
    if (profile.profileUrl && !user.fiveEProfileUrl) user.fiveEProfileUrl = profile.profileUrl;
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
  return (state.seasons || []).find((season) => {
    return new Date(`${season.start}T00:00:00`).getTime() <= stamp && stamp <= new Date(`${season.end}T00:00:00`).getTime();
  }) || null;
}

function isTrainingEligible(state, code) {
  const user = (state.users || []).find((item) => item.identityCode === code);
  return !!user && user.role !== "观察员";
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
      byName.set(normalized, user);
      names.push({ normalized, user });
    }
  };
  for (const user of users || []) {
    const profile = parse5eProfile(user.fiveEProfileUrl, user.fiveEDomain);
    if (profile.domain) byDomain.set(profile.domain, user);
    if (profile.uuid) byUuid.set(profile.uuid, user);
    if (user.fiveEDomain) byDomain.set(String(user.fiveEDomain), user);
    if (user.fiveEUuid) byUuid.set(String(user.fiveEUuid), user);
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
    "username", "user_name", "player_name", "name", "nickname", "nick_name",
    "user.username", "user.name", "user.nickname",
    "user_info.username", "user_info.name", "user_info.nickname",
    "player.username", "player.name", "player.nickname",
    "player_info.username", "player_info.name", "player_info.nickname",
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
    row.swing_score, row.swingScore, row.swing_score_value, row.swingScoreValue,
    row.swing, row.swing_value, row.swingValue, row.ss, row.five_swing_score,
    row.score_value, row.score, row.change_elo,
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
    "username", "user_name", "player_name", "name", "nickname", "nick_name",
    "user.username", "user.name", "user.nickname",
    "user_info.username", "user_info.name", "user_info.nickname",
    "player.username", "player.name", "player.nickname",
    "player_info.username", "player_info.name", "player_info.nickname",
    "domain",
  ]) || "Unknown");
  return {
    nickname,
    domain: String(readField(row, ["domain", "user.domain", "user_info.domain", "player.domain", "player_info.domain"]) || ""),
    uuid: String(readField(row, ["uuid", "user.uuid", "user_info.uuid", "player.uuid", "player_info.uuid"]) || ""),
    memberCode: member?.identityCode || "",
    isClubMember: Boolean(member),
    isOgCandidate: normalizeName(nickname).startsWith("og"),
    team: sideOf(row),
    kill: kills,
    death: deaths,
    assist: assists,
    adr: firstNumber(row, ["adr", "ADR", "avg_damage", "average_damage", "damage_per_round", "per_damage"]),
    kast: firstNumber(row, ["kast", "KAST", "per_kast", "kast_rate"]),
    rws: firstNumber(row, ["rws", "RWS", "rws_score"]),
    rating: firstNumber(row, ["rating", "Rating", "rating_score", "score_rating", "rating_plus"]),
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
    if (!current || playerCompleteness(player) > playerCompleteness(current) || (playerCompleteness(player) === playerCompleteness(current) && Number(player.rating || 0) > Number(current.rating || 0))) {
      chosen.set(key, player);
    }
  }
  const deduped = [...chosen.values()].sort((a, b) => Number(a.team || 0) - Number(b.team || 0) || Number(b.rating || 0) - Number(a.rating || 0));
  const teamA = deduped.filter((player) => String(player.team) === "1").slice(0, 5);
  const teamB = deduped.filter((player) => String(player.team) === "2").slice(0, 5);
  const other = deduped.filter((player) => String(player.team) !== "1" && String(player.team) !== "2").slice(0, Math.max(0, 10 - teamA.length - teamB.length));
  return [...teamA, ...teamB, ...other].slice(0, 10);
}

function rowsWithTeam(rows, fallbackTeam = "") {
  return (Array.isArray(rows) ? rows : []).map((row) => ({ ...row, _fallbackTeam: sideOf(row, fallbackTeam) || fallbackTeam }));
}

function rowIdentity(row) {
  return String(readField(row, ["domain", "uuid", "username", "user_name", "player_name", "nickname", "name"]) || "").toLowerCase();
}

function attachTeams(rows, fullRows) {
  const fullByIdentity = new Map();
  for (const row of fullRows) fullByIdentity.set(rowIdentity(row), sideOf(row));
  return rows.map((row) => {
    const fallback = sideOf(row) || fullByIdentity.get(rowIdentity(row)) || "";
    return { ...row, _fallbackTeam: fallback };
  });
}

function readFullRows(detail) {
  const direct = rowsWithTeam(detail.user_match_data);
  if (direct.length) return direct;
  const grouped = [
    ...rowsWithTeam(detail.group1_user_match_data, "1"),
    ...rowsWithTeam(detail.group2_user_match_data, "2"),
  ];
  if (grouped.length) return grouped;
  return rowsWithTeam(detail.players || detail.player_list || detail.scoreboard);
}

function readPlayerViewRows(detail) {
  const full = readFullRows(detail);
  return {
    full,
    ct: attachTeams(rowsWithTeam(detail.ct_user_match_data || detail.ct_player_data || detail.ct_players), full),
    t: attachTeams(rowsWithTeam(detail.t_user_match_data || detail.t_player_data || detail.t_players), full),
  };
}

function buildPlayerViews(detail, indexes) {
  const rows = readPlayerViewRows(detail);
  return Object.fromEntries(Object.entries(rows).map(([scope, scopeRows]) => {
    return [scope, dedupePlayers(scopeRows.map((row) => buildPlayer(row, indexes)))];
  }));
}

function normalizeDetailObject(value, seen = new Set()) {
  if (!value || typeof value !== "object" || seen.has(value)) return null;
  seen.add(value);
  if (
    Array.isArray(value.user_match_data)
    || Array.isArray(value.ct_user_match_data)
    || Array.isArray(value.t_user_match_data)
    || Array.isArray(value.group1_user_match_data)
    || Array.isArray(value.group2_user_match_data)
  ) {
    return value;
  }
  for (const child of Object.values(value)) {
    const found = normalizeDetailObject(child, seen);
    if (found) return found;
  }
  return null;
}

function decodeHtml(value) {
  return String(value || "")
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function parseArenaDetailHtml(html) {
  if (!html || /aliyun_waf|acw_sc__v2|renderData|aliyunwaf/i.test(html)) return null;
  const candidates = [];
  for (const match of html.matchAll(/<script[^>]*type=["']application\/json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    candidates.push(decodeHtml(match[1]));
  }
  for (const match of html.matchAll(/(?:window\.__INITIAL_STATE__|window\.__NUXT__|__NEXT_DATA__)\s*=\s*({[\s\S]*?})\s*;?\s*<\/script>/gi)) {
    candidates.push(decodeHtml(match[1]));
  }
  if (html.includes("user_match_data")) {
    const start = Math.max(0, html.indexOf("user_match_data") - 20000);
    const end = Math.min(html.length, html.indexOf("user_match_data") + 80000);
    const slice = decodeHtml(html.slice(start, end));
    const objectStart = slice.indexOf("{");
    const objectEnd = slice.lastIndexOf("}");
    if (objectStart >= 0 && objectEnd > objectStart) candidates.push(slice.slice(objectStart, objectEnd + 1));
  }
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate.trim());
      const detail = normalizeDetailObject(parsed);
      if (detail) return detail;
    } catch {
      // Ignore non-JSON scripts; arena often serves framework chunks here.
    }
  }
  return null;
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "user-agent": "Mozilla/5.0",
      "referer": "https://arena.5eplay.com/",
    },
  });
  return response.text();
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
  if (!response.ok || !body?.success) throw new Error(body?.message || `5E API request failed: ${response.status}`);
  return body.data;
}

async function discoverHistoryForProfile(seed, maxPages, failures) {
  const found = [];
  const seen = new Set();
  let emptyPages = 0;
  for (let page = 1; page <= maxPages; page += 1) {
    const listData = await fetch5eJson(`/v0/mars/api/csgo/match_data/match_list?domain=${encodeURIComponent(seed.profile.domain)}&match_type=&time=&date_time=0&map_name=&page=${page}`).catch((error) => {
      failures.push({ domain: seed.profile.domain, page, error: error.message || String(error) });
      return null;
    });
    const matches = Array.isArray(listData?.match_list) ? listData.match_list : [];
    if (!matches.length) {
      emptyPages += 1;
      if (emptyPages >= 2) break;
      continue;
    }
    emptyPages = 0;
    for (const item of matches) {
      if (!item?.match_id || seen.has(item.match_id)) continue;
      seen.add(item.match_id);
      found.push(item);
    }
    if (matches.length < 20) break;
  }
  return found;
}

function addMatchSeed(matchSeeds, item, domain, memberCode) {
  const matchId = String(item?.match_id || "").trim();
  if (!matchId || !domain) return;
  const current = matchSeeds.get(matchId);
  if (current) {
    if (!current.domains.includes(domain)) current.domains.push(domain);
    if (memberCode && !current.memberCodes.includes(memberCode)) current.memberCodes.push(memberCode);
    current.items.push(item);
    return;
  }
  matchSeeds.set(matchId, {
    matchId,
    arenaUrl: `${ARENA_BASE}/${encodeURIComponent(matchId)}`,
    item,
    items: [item],
    domains: [domain],
    memberCodes: memberCode ? [memberCode] : [],
  });
}

async function fetchMatchDetail(seed, failures) {
  let arenaVisited = false;
  let arenaBlocked = false;
  let arenaParsed = false;
  try {
    arenaVisited = true;
    const html = await fetchText(seed.arenaUrl);
    arenaBlocked = /aliyun_waf|acw_sc__v2|renderData|aliyunwaf/i.test(html);
    const arenaDetail = parseArenaDetailHtml(html);
    if (arenaDetail) {
      arenaParsed = true;
      return { detail: arenaDetail, source: "arena-html", arenaVisited, arenaBlocked, arenaParsed, domain: seed.domains[0] || "" };
    }
  } catch (error) {
    failures.push({ matchId: seed.matchId, source: "arena", error: error.message || String(error) });
  }
  const errors = [];
  for (const domain of seed.domains) {
    try {
      const detail = await fetch5eJson(`/v0/mars/api/csgo/data/player_match_info/${encodeURIComponent(seed.matchId)}/${encodeURIComponent(domain)}`);
      if (readFullRows(detail).length) {
        return { detail, source: "5e-json", arenaVisited, arenaBlocked, arenaParsed, domain };
      }
      errors.push(`${domain}: empty detail`);
    } catch (error) {
      errors.push(`${domain}: ${error.message || String(error)}`);
    }
  }
  failures.push({ matchId: seed.matchId, source: "5e-json", error: errors.join("; ") || "no available domain" });
  return { detail: null, source: "", arenaVisited, arenaBlocked, arenaParsed, domain: "" };
}

function bestListItem(seed, detail) {
  const main = detail?.main || detail?.match || {};
  return {
    ...seed.item,
    ...main,
    match_id: seed.matchId,
  };
}

function buildMatchRecord(state, seed, detail, indexes, detailMeta) {
  const main = detail.main || detail.match || {};
  const item = bestListItem(seed, detail);
  const date = dateFromUnix(main.end_time || main.start_time || item.end_time || item.start_time);
  const season = findSeasonForDate(state, date);
  const playerViews = buildPlayerViews(detail, indexes);
  const players = playerViews.full || [];
  const recognizedMemberCodes = [...new Set(players.filter((player) => player.memberCode).map((player) => player.memberCode))];
  const trainingMemberCodes = recognizedMemberCodes.filter((code) => isTrainingEligible(state, code));
  const group1Score = firstNumber(main, ["group1_all_score", "group1_score", "team1_score", "score1", "a_score"], firstNumber(item, ["group1_all_score", "group1_score", "team1_score", "score1", "a_score"]));
  const group2Score = firstNumber(main, ["group2_all_score", "group2_score", "team2_score", "score2", "b_score"], firstNumber(item, ["group2_all_score", "group2_score", "team2_score", "score2", "b_score"]));
  const record = {
    matchId: seed.matchId,
    arenaUrl: seed.arenaUrl,
    date,
    endTime: String(main.end_time || item.end_time || ""),
    startTime: String(main.start_time || item.start_time || ""),
    map: String(main.map || item.map || ""),
    mapName: String(main.map_name || main.map_desc || item.map_name || item.map_desc || ""),
    matchName: String(main.match_name || item.match_name || ""),
    matchType: String(main.match_type || item.match_type || ""),
    scoreA: group2Score,
    scoreB: group1Score,
    seasonId: season ? season.id : "",
    recognizedMemberCodes,
    isTrainingCandidate: trainingMemberCodes.length >= 3,
    isTrainingConfirmed: false,
    players,
    playerViews: { ...playerViews, full: players },
    syncSource: detailMeta.source,
    arenaVisited: detailMeta.arenaVisited,
    arenaBlocked: detailMeta.arenaBlocked,
    arenaParsed: detailMeta.arenaParsed,
    detailDomain: detailMeta.domain,
    syncedAt: new Date().toISOString(),
  };
  record.fingerprint = matchFingerprint(record);
  record.id = `match-${record.fingerprint}`;
  return record;
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
  const viewCount = Object.values(record.playerViews || {}).reduce((total, players) => total + (Array.isArray(players) ? players.length : 0), 0);
  return ((record.players || []).length * 10) + Math.min(viewCount, 30);
}

function normalizeExistingMatches(state, indexes) {
  const byMatch = new Map();
  for (const record of state.matchRecords || []) {
    record.players = normalizeStoredPlayers(record.players, indexes);
    if (record.playerViews && typeof record.playerViews === "object") {
      record.playerViews = Object.fromEntries(Object.entries(record.playerViews).map(([scope, players]) => [scope, normalizeStoredPlayers(players, indexes)]));
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
    if (!current || matchRecordCompleteness(record) > matchRecordCompleteness(current)) byMatch.set(key, record);
  }
  state.matchRecords = [...byMatch.values()];
}

function recordMatchKeys(record) {
  return [record.fiveE?.matchRecordId, record.fiveE?.fingerprint, record.fiveE?.matchId, record.trainingMatchId].filter(Boolean);
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
    const matchKey = recordMatchKeys(record)[0] || "";
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
    const next = String(record.updatedAt || record.createdAt || "") > String(current.updatedAt || current.createdAt || "") ? record : current;
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
    for (const matchKey of recordMatchKeys(record)) byMatchAndUser.set(`${matchKey}:${record.userIdentityCode}`, record);
  }
  for (const record of state.records || []) {
    if (!record.userIdentityCode) continue;
    const promoted = recordMatchKeys(record).map((matchKey) => byMatchAndUser.get(`${matchKey}:${record.userIdentityCode}`)).find(Boolean);
    if (promoted?.trainingIncluded) {
      record.trainingIncluded = true;
      record.trainingMatchId = record.trainingMatchId || promoted.trainingMatchId;
      record.trainingPromotedAt = record.trainingPromotedAt || promoted.trainingPromotedAt;
    }
  }
}

function upsertPersonalRecords(state, matchRecord) {
  const existing = new Map();
  for (const record of state.records || []) {
    for (const matchKey of recordMatchKeys(record)) existing.set(`${matchKey}:${record.userIdentityCode}`, record);
  }
  for (const player of matchRecord.players || []) {
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
      arenaUrl: matchRecord.arenaUrl,
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
    state.records.push({
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
    });
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

    const actor = state.users?.find((user) => user.identityCode === session.identity_code);
    if (!isAdmin(actor)) return json({ error: "只有管理员可以一键同步全员对局。" }, 403);

    const body = await request.json().catch(() => ({}));
    const maxPages = Math.max(1, Math.min(100, Number(body.maxPages || body.pages || 100)));
    normalizeUserAliases(state);
    normalizeFiveEProfiles(state);

    const seeds = (state.users || [])
      .map((user) => ({ user, profile: parse5eProfile(user.fiveEProfileUrl, user.fiveEDomain) }))
      .filter((item) => item.profile.domain);
    if (!seeds.length) return json({ error: "还没有成员绑定 5E 个人主页链接。" }, 400);

    const matchSeeds = new Map();
    const listFailures = [];
    for (const seed of seeds) {
      const items = await discoverHistoryForProfile(seed, maxPages, listFailures);
      for (const item of items) addMatchSeed(matchSeeds, item, seed.profile.domain, seed.user.identityCode);
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
    normalizeTrainingIncludedRecords(state);

    const existingByFingerprint = new Map(state.matchRecords.map((record) => [record.fingerprint || matchFingerprint(record), record]));
    const existingByMatchId = new Map(state.matchRecords.map((record) => [record.matchId, record]).filter(([matchId]) => matchId));
    let created = 0;
    let updated = 0;
    let arenaVisited = 0;
    let arenaBlocked = 0;
    let arenaParsed = 0;
    let detailFailures = 0;
    const detailFailureSamples = [];

    for (const seed of matchSeeds.values()) {
      const detailMeta = await fetchMatchDetail(seed, detailFailureSamples);
      if (detailMeta.arenaVisited) arenaVisited += 1;
      if (detailMeta.arenaBlocked) arenaBlocked += 1;
      if (detailMeta.arenaParsed) arenaParsed += 1;
      if (!detailMeta.detail) {
        detailFailures += 1;
        continue;
      }
      const next = buildMatchRecord(state, seed, detailMeta.detail, indexes, detailMeta);
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

    await writeState(env.DB, state);
    return json({
      ok: true,
      syncVersion: SYNC_VERSION,
      seedMembers: seeds.length,
      scannedPages: maxPages,
      scannedMatches: matchSeeds.size,
      created,
      updated,
      listFailures: listFailures.length,
      detailFailures,
      detailFailureSamples: detailFailureSamples.slice(0, 8),
      arenaVisited,
      arenaBlocked,
      arenaParsed,
      state,
    });
  } catch (error) {
    return json({ error: error.message || String(error) }, 500);
  }
}
