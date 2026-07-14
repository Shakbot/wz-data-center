import { ensureSchema, isAdmin, json, readMatchCatalog, readState, readSyncContext, userFromRequest, writeMatchCatalog, writeMatchDetail, writeState, writeSyncContext } from "./_utils.js";

const FIVE_E_BASE = "https://ya-api-app.5eplay.com";
const SYNC_VERSION = "10.0 Alpha";
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

function unixSeconds(value) {
  const stamp = toNumber(value);
  if (!stamp) return 0;
  return stamp > 10_000_000_000 ? Math.floor(stamp / 1000) : Math.floor(stamp);
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

async function fetch5eJson(path, attempts = 1, referer = "https://csgo.5eplay.com/fwap/") {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(`${FIVE_E_BASE}${path}`, {
        headers: {
          "accept": "application/json,text/plain,*/*",
          "user-agent": "Mozilla/5.0",
          referer,
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

function uniqueStrings(...groups) {
  return [...new Set(groups.flat().map((value) => String(value || "").trim()).filter(Boolean))];
}

function buildSummaryRecord(state, listItem, seed) {
  const date = dateFromUnix(listItem.end_time || listItem.start_time);
  const season = findSeasonForDate(state, date);
  const group1Score = firstNumber(listItem, ["group1_all_score", "group1_score", "team1_score", "score1", "a_score"], NaN);
  const group2Score = firstNumber(listItem, ["group2_all_score", "group2_score", "team2_score", "score2", "b_score"], NaN);
  const matchId = String(listItem.match_id || "").trim();
  const record = {
    id: `match-${compactKey(matchId)}`,
    matchId,
    date,
    endTime: String(listItem.end_time || ""),
    map: String(listItem.map || ""),
    mapName: String(listItem.map_name || listItem.map_desc || ""),
    matchName: String(listItem.match_name || ""),
    matchType: String(listItem.match_type || ""),
    scoreA: Number.isFinite(group2Score) ? group2Score : "",
    scoreB: Number.isFinite(group1Score) ? group1Score : "",
    seasonId: season ? season.id : "",
    recognizedMemberCodes: [seed.user.identityCode],
    discoveredByMemberCodes: [seed.user.identityCode],
    discoveredByDomains: [seed.profile.domain],
    isTrainingCandidate: false,
    isTrainingConfirmed: false,
    players: [],
    ctPlayers: [],
    tPlayers: [],
    detailStatus: "pending",
    detailPlayerCount: 0,
    detailUrl: `https://arena.5eplay.com/data/match/${encodeURIComponent(matchId)}`,
    discoveredAt: new Date().toISOString(),
  };
  record.fingerprint = matchFingerprint(record);
  return record;
}

function mergeSummaryRecord(existing, summary) {
  // Rediscovery is additive only. Existing summary data, details, and status
  // remain authoritative until the record is explicitly deleted.
  existing.recognizedMemberCodes = uniqueStrings(existing.recognizedMemberCodes || [], summary.recognizedMemberCodes || []);
  existing.discoveredByMemberCodes = uniqueStrings(existing.discoveredByMemberCodes || [], summary.discoveredByMemberCodes || []);
  existing.discoveredByDomains = uniqueStrings(existing.discoveredByDomains || [], summary.discoveredByDomains || []);
  existing.discoveredAt = existing.discoveredAt || summary.discoveredAt;
  return existing;
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
  const ctRows = rowsWithTeam(detail.ct_user_match_data);
  const tRows = rowsWithTeam(detail.t_user_match_data);
  const players = dedupePlayers(sourceRows.map((row) => buildPlayer(row, indexes)));
  const ctPlayers = dedupePlayers(ctRows.map((row) => buildPlayer(row, indexes)));
  const tPlayers = dedupePlayers(tRows.map((row) => buildPlayer(row, indexes)));
  const expectedPlayers = Math.min(sourceRows.length, 10);
  if (!players.length || players.length < expectedPlayers) throw new Error("详情接口返回的选手数据不完整");
  if (!ctRows.length || !tRows.length || !ctPlayers.length || !tPlayers.length) throw new Error("详情接口未返回完整的 CT/T 半场数据");
  const recognizedMemberCodes = uniqueStrings(
    listItem.recognizedMemberCodes || [],
    players.filter((player) => player.memberCode).map((player) => player.memberCode),
  );
  const trainingMemberCodes = recognizedMemberCodes.filter((code) => isTrainingEligible(state, code));
  const group1Score = firstNumber(main, ["group1_all_score", "group1_score", "team1_score", "score1", "a_score"], firstNumber(listItem, ["group1_all_score", "group1_score", "team1_score", "score1", "a_score"]));
  const group2Score = firstNumber(main, ["group2_all_score", "group2_score", "team2_score", "score2", "b_score"], firstNumber(listItem, ["group2_all_score", "group2_score", "team2_score", "score2", "b_score"]));
  const record = {
    id: listItem.id,
    matchId: listItem.match_id || listItem.matchId,
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
    ctPlayers,
    tPlayers,
    detailStatus: "complete",
    hasSideDetails: true,
    detailPlayerCount: sourceRows.length,
    detailUrl: listItem.detailUrl || `https://arena.5eplay.com/data/match/${encodeURIComponent(listItem.match_id || listItem.matchId)}`,
    detailSyncedAt: new Date().toISOString(),
    discoveredByMemberCodes: uniqueStrings(listItem.discoveredByMemberCodes || [], seedUser?.identityCode || ""),
    discoveredByDomains: uniqueStrings(listItem.discoveredByDomains || [], resolve5eProfile(seedUser).domain),
    syncedFromMemberCode: seedUser?.identityCode || "",
    syncedAt: new Date().toISOString(),
  };
  record.fingerprint = matchFingerprint(record);
  record.id = record.id || `match-${compactKey(record.matchId)}`;
  return record;
}

function hasCompleteDetail(record) {
  const hasSideData = Boolean(record?.hasSideDetails)
    || (Array.isArray(record?.ctPlayers) && record.ctPlayers.length > 0
      && Array.isArray(record?.tPlayers) && record.tPlayers.length > 0);
  return record?.detailStatus === "complete"
    && Number(record.detailPlayerCount || 0) > 0
    && Array.isArray(record.players)
    && record.players.length > 0
    && hasSideData;
}

function summaryForClient(record) {
  const { players, ctPlayers, tPlayers, ...summary } = record;
  return { ...summary, catalogStored: true };
}

function personalRecordsForMatch(state, matchRecord) {
  const keys = new Set([matchRecord.matchId, matchRecord.id, matchRecord.fingerprint].filter(Boolean));
  return (state.records || []).filter((record) => {
    return [record.fiveE?.matchId, record.fiveE?.matchRecordId, record.fiveE?.fingerprint]
      .filter(Boolean)
      .some((key) => keys.has(key));
  });
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

function replacePersonalRecordsForMatch(state, matchRecord, previousMatchKeys = []) {
  const matchKeys = new Set([matchRecord.matchId, matchRecord.id, matchRecord.fingerprint, ...previousMatchKeys].filter(Boolean));
  const preservedTraining = new Map();
  state.records = (state.records || []).filter((record) => {
    const recordKeys = [record.fiveE?.matchId, record.fiveE?.matchRecordId, record.fiveE?.fingerprint, record.trainingMatchId].filter(Boolean);
    const belongsToMatch = recordKeys.some((key) => matchKeys.has(key));
    const isAutoRecord = record.source === "5e-match-sync" || record.createdBy === "5e-sync";
    if (!belongsToMatch || !isAutoRecord) return true;
    if (record.trainingIncluded && record.userIdentityCode) {
      preservedTraining.set(record.userIdentityCode, {
        trainingIncluded: true,
        trainingMatchId: record.trainingMatchId,
        trainingPromotedAt: record.trainingPromotedAt,
      });
    }
    return false;
  });
  upsertPersonalRecords(state, matchRecord);
  for (const record of state.records) {
    const preserved = preservedTraining.get(record.userIdentityCode);
    if (!preserved || record.fiveE?.matchId !== matchRecord.matchId) continue;
    Object.assign(record, preserved);
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
    if (!current) {
      byMatch.set(key, record);
      continue;
    }
    const preferred = (record.players || []).length > (current.players || []).length ? record : current;
    const secondary = preferred === record ? current : record;
    preferred.recognizedMemberCodes = uniqueStrings(preferred.recognizedMemberCodes || [], secondary.recognizedMemberCodes || []);
    preferred.discoveredByMemberCodes = uniqueStrings(preferred.discoveredByMemberCodes || [], secondary.discoveredByMemberCodes || []);
    preferred.discoveredByDomains = uniqueStrings(preferred.discoveredByDomains || [], secondary.discoveredByDomains || []);
    preferred.hasSideDetails = Boolean(preferred.hasSideDetails || secondary.hasSideDetails);
    if (!(preferred.ctPlayers || []).length && (secondary.ctPlayers || []).length) preferred.ctPlayers = secondary.ctPlayers;
    if (!(preferred.tPlayers || []).length && (secondary.tPlayers || []).length) preferred.tPlayers = secondary.tPlayers;
    if (hasCompleteDetail(secondary) && !hasCompleteDetail(preferred)) {
      preferred.detailStatus = secondary.detailStatus;
      preferred.detailPlayerCount = secondary.detailPlayerCount;
    }
    byMatch.set(key, preferred);
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

async function syncSingleMatch(state, matchId) {
  const match = (state.matchRecords || []).find((record) => record.matchId === matchId || record.id === matchId);
  if (!match) return { error: "没有找到这场对局。", status: 404 };

  const usersByDomain = new Map();
  for (const user of state.users || []) {
    const profile = resolve5eProfile(user);
    if (profile.domain) usersByDomain.set(profile.domain, { user, profile });
  }
  const sourceMemberCodes = uniqueStrings(
    match.recognizedMemberCodes || [],
    match.discoveredByMemberCodes || [],
    match.syncedFromMemberCode || "",
  );
  const memberDomains = sourceMemberCodes
    .map((code) => state.users.find((user) => user.identityCode === code))
    .filter(Boolean)
    .map((user) => resolve5eProfile(user).domain);
  let domains = uniqueStrings(
    match.discoveredByDomains || [],
    match.syncedFromDomain || "",
    memberDomains,
  );
  if (!domains.length) domains = [...usersByDomain.keys()];
  if (!domains.length) return { error: "该对局没有可用于读取详情的 5E 用户域名，请先重新执行一键同步。", status: 400 };

  let lastError;
  for (const domain of domains) {
    try {
      const previousMatchKeys = [match.matchId, match.id, match.fingerprint].filter(Boolean);
      const detailPath = `/v0/mars/api/csgo/data/player_match_info/${encodeURIComponent(match.matchId)}/${encodeURIComponent(domain)}`;
      const detailUrl = `https://arena.5eplay.com/data/match/${encodeURIComponent(match.matchId)}`;
      const detail = await fetch5eJson(detailPath, 3, detailUrl);
      const source = usersByDomain.get(domain) || { user: null, profile: { domain } };
      const indexes = buildMemberIndexes(state.users || []);
      const next = buildMatchRecord(
        state,
        { ...match, match_id: match.matchId, discoveredByDomains: domains },
        detail,
        indexes,
        source.user,
      );
      next.discoveredByDomains = domains;
      next.syncedFromDomain = domain;
      next.isTrainingConfirmed = Boolean(match.isTrainingConfirmed);
      Object.assign(match, next);
      replacePersonalRecordsForMatch(state, match, previousMatchKeys);
      normalizeTrainingIncludedRecords(state);
      normalizeExistingPersonalRecords(state);
      return { match, domain };
    } catch (error) {
      lastError = error;
    }
  }

  match.detailStatus = "pending";
  match.detailLastAttemptAt = new Date().toISOString();
  match.detailLastError = lastError?.message || "5E 详情暂时无法读取。";
  return { error: match.detailLastError, status: 502, match };
}

async function syncCatalogPage(body, env, session) {
  let state = await readSyncContext(env.DB);
  if (!state) {
    const fullState = await readState(env.DB);
    if (!fullState) return json({ error: "数据库尚未初始化，请先登录一次。" }, 404);
    normalizeUserAliases(fullState);
    await writeMatchCatalog(env.DB, (fullState.matchRecords || []).map(summaryForClient));
    await writeSyncContext(env.DB, fullState);
    state = { users: fullState.users || [], seasons: fullState.seasons || [] };
  }

  normalizeUserAliases(state);
  state.matchRecords = [];
  state.records = [];
  const actor = state.users.find((user) => user.identityCode === session.identity_code);
  if (!isAdmin(actor)) return json({ error: "只有管理员可以建立全量对局目录。" }, 403);

  const requestedCursor = body.cursor && typeof body.cursor === "object" ? body.cursor : {};
  const syncMode = (body.syncMode || requestedCursor.syncMode) === "recent24h" ? "recent24h" : "all";
  const requestedCutoff = Number(requestedCursor.cutoffEpoch || body.cutoffEpoch || 0);
  const cutoffEpoch = syncMode === "recent24h"
    ? Math.max(0, Math.floor(requestedCutoff || (Date.now() / 1000) - 24 * 60 * 60))
    : 0;
  const cursorMeta = syncMode === "recent24h" ? { syncMode, cutoffEpoch } : {};
  const memberIndex = Math.max(0, Math.floor(Number(requestedCursor.memberIndex || 0)));
  const page = Math.max(1, Math.floor(Number(requestedCursor.page || 1)));
  const seeds = state.users
    .map((user) => ({ user, profile: resolve5eProfile(user) }))
    .filter((item) => SYNC_ROLES.has(String(item.user.role || "").trim()) && item.profile.domain);
  if (!seeds.length) return json({ error: "指定角色中尚无成员绑定 5E 个人主页。" }, 400);
  if (memberIndex >= seeds.length) {
    return json({ ok: true, done: true, seedMembers: seeds.length, matches: [], syncVersion: SYNC_VERSION });
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
      scannedMatches: 0,
      memberFailures: [{
        memberCode: seed.user.identityCode,
        memberName: seed.user.gameId || seed.user.name || seed.user.identityCode,
        domain: seed.profile.domain,
        error: error.message || String(error),
      }],
      nextCursor: { memberIndex: memberIndex + 1, page: 1, ...cursorMeta },
      created: 0,
      merged: 0,
      pending: 0,
      matches: [],
    });
  }

  const rawPageItems = [...new Map((Array.isArray(listData?.match_list) ? listData.match_list : [])
    .filter((item) => item?.match_id)
    .map((item) => [String(item.match_id), item])).values()];
  const pageItems = syncMode === "recent24h"
    ? rawPageItems.filter((item) => unixSeconds(item.end_time || item.start_time) >= cutoffEpoch)
    : rawPageItems;
  const pageSignature = rawPageItems.map((item) => item.match_id).join(",");
  const repeatedPage = Boolean(rawPageItems.length && requestedCursor.previousPageSignature === pageSignature);
  const reachedWindowBoundary = syncMode === "recent24h" && rawPageItems.some((item) => {
    const stamp = unixSeconds(item.end_time || item.start_time);
    return stamp > 0 && stamp < cutoffEpoch;
  });
  const memberFinished = rawPageItems.length === 0 || repeatedPage || reachedWindowBoundary;
  const catalogMatches = await readMatchCatalog(env.DB, pageItems.map((item) => String(item.match_id)));
  const existingByMatchId = new Map();
  for (const catalogMatch of catalogMatches) {
    existingByMatchId.set(String(catalogMatch.matchId), { players: [], ctPlayers: [], tPlayers: [], ...catalogMatch });
  }

  let created = 0;
  let merged = 0;
  const changedMatches = [];
  for (const item of pageItems) {
    const summary = buildSummaryRecord(state, item, seed);
    const existing = existingByMatchId.get(summary.matchId);
    if (existing) {
      mergeSummaryRecord(existing, summary);
      existing.isTrainingCandidate = existing.recognizedMemberCodes.filter((code) => isTrainingEligible(state, code)).length >= 3;
      changedMatches.push(summaryForClient(existing));
      merged += 1;
    } else {
      existingByMatchId.set(summary.matchId, summary);
      changedMatches.push(summaryForClient(summary));
      created += 1;
    }
  }

  const nextCursor = memberFinished
    ? { memberIndex: memberIndex + 1, page: 1, ...cursorMeta }
    : { memberIndex, page: page + 1, previousPageSignature: pageSignature, ...cursorMeta };
  const done = nextCursor.memberIndex >= seeds.length;
  await writeMatchCatalog(env.DB, changedMatches);
  return json({
    ok: true,
    done,
    seedMembers: seeds.length,
    syncVersion: SYNC_VERSION,
    syncMode,
    windowStartAt: cutoffEpoch ? new Date(cutoffEpoch * 1000).toISOString() : "",
    memberIndex,
    memberCode: seed.user.identityCode,
    memberName: seed.user.gameId || seed.user.name || seed.user.identityCode,
    page,
    scannedMatches: repeatedPage ? 0 : pageItems.length,
    memberFailures: [],
    nextCursor,
    created,
    merged,
    pending: pageItems.filter((item) => !hasCompleteDetail(existingByMatchId.get(String(item.match_id)))).length,
    matches: pageItems.map((item) => summaryForClient(existingByMatchId.get(String(item.match_id)))),
  });
}

export async function onRequestPost({ request, env }) {
  try {
    if (!env.DB) return json({ error: "D1 数据库没有绑定到 DB。" }, 500);
    await ensureSchema(env.DB);

    const session = await userFromRequest(request, env.DB);
    const body = await request.json().catch(() => ({}));
    if (!session) return json({ error: "请重新登录。" }, 401);
    if (!body.matchId) return await syncCatalogPage(body, env, session);
    const state = await readState(env.DB);
    if (!state) return json({ error: "数据库还没有初始化，请先登录一次。" }, 404);
    const actor = state.users.find((user) => user.identityCode === session.identity_code);
    if (!body.matchId && !isAdmin(actor)) return json({ error: "只有管理员可以建立全量对局目录。" }, 403);
    normalizeUserAliases(state);
    state.matchRecords = state.matchRecords || [];
    state.records = state.records || [];

    if (body.matchId) {
      if (!state.matchRecords.some((match) => match.matchId === String(body.matchId) || match.id === String(body.matchId))) {
        const catalogMatch = (await readMatchCatalog(env.DB, [String(body.matchId)]))[0];
        if (catalogMatch) state.matchRecords.push({ players: [], ctPlayers: [], tPlayers: [], ...catalogMatch });
      }
      const result = await syncSingleMatch(state, String(body.matchId));
      if (result.error) {
        await writeState(env.DB, state);
        return json({ error: result.error, matchId: body.matchId, syncVersion: SYNC_VERSION }, result.status || 500);
      }
      const clientMatch = JSON.parse(JSON.stringify(result.match));
      await writeMatchDetail(env.DB, result.match.matchId, {
        players: clientMatch.players,
        ctPlayers: clientMatch.ctPlayers,
        tPlayers: clientMatch.tPlayers,
        detailSyncedAt: clientMatch.detailSyncedAt,
      });
      result.match.hasSideDetails = true;
      result.match.ctPlayers = [];
      result.match.tPlayers = [];
      await writeMatchCatalog(env.DB, [summaryForClient(result.match)]);
      await writeState(env.DB, state);
      return json({
        ok: true,
        matchId: result.match.matchId,
        detailStatus: result.match.detailStatus,
        fullPlayers: clientMatch.players.length,
        ctPlayers: clientMatch.ctPlayers.length,
        tPlayers: clientMatch.tPlayers.length,
        match: clientMatch,
        records: personalRecordsForMatch(state, result.match),
        syncVersion: SYNC_VERSION,
      });
    }

    const requestedCursor = body.cursor && typeof body.cursor === "object" ? body.cursor : {};
    const memberIndex = Math.max(0, Math.floor(Number(requestedCursor.memberIndex || 0)));
    const page = Math.max(1, Math.floor(Number(requestedCursor.page || 1)));
    const seeds = state.users
      .map((user) => ({ user, profile: resolve5eProfile(user) }))
      .filter((item) => SYNC_ROLES.has(String(item.user.role || "").trim()) && item.profile.domain);
    if (!seeds.length) return json({ error: "指定角色中还没有成员绑定 5E 个人主页链接。" }, 400);
    if (memberIndex >= seeds.length) {
      return json({ ok: true, done: true, seedMembers: seeds.length, matches: [], syncVersion: SYNC_VERSION });
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
        scannedMatches: 0,
        memberFailures: [{
          memberCode: seed.user.identityCode,
          memberName: seed.user.gameId || seed.user.name || seed.user.identityCode,
          domain: seed.profile.domain,
          error: error.message || String(error),
        }],
        nextCursor: { memberIndex: memberIndex + 1, page: 1 },
        created: 0,
        merged: 0,
        pending: 0,
        matches: [],
      });
    }

    const pageItems = [...new Map((Array.isArray(listData?.match_list) ? listData.match_list : [])
      .filter((item) => item?.match_id)
      .map((item) => [String(item.match_id), item])).values()];
    const pageSignature = pageItems.map((item) => item.match_id).join(",");
    const repeatedPage = Boolean(pageItems.length && requestedCursor.previousPageSignature === pageSignature);
    const memberFinished = pageItems.length === 0 || repeatedPage;

    seed.user.fiveEDomain = seed.profile.domain;
    if (seed.profile.uuid) seed.user.fiveEUuid = seed.profile.uuid;
    if (seed.profile.profileUrl) seed.user.fiveEProfileUrl = seed.profile.profileUrl;

    const catalogMatches = await readMatchCatalog(env.DB, pageItems.map((item) => String(item.match_id)));
    const existingByMatchId = new Map(state.matchRecords.map((record) => [String(record.matchId || ""), record]).filter(([id]) => id));
    for (const catalogMatch of catalogMatches) {
      const existing = existingByMatchId.get(String(catalogMatch.matchId));
      if (existing) Object.assign(existing, catalogMatch);
      else existingByMatchId.set(String(catalogMatch.matchId), { players: [], ctPlayers: [], tPlayers: [], ...catalogMatch });
    }
    let created = 0;
    let merged = 0;
    const changedMatches = [];
    for (const item of pageItems) {
      const summary = buildSummaryRecord(state, item, seed);
      const existing = existingByMatchId.get(summary.matchId);
      if (existing) {
        mergeSummaryRecord(existing, summary);
        existing.isTrainingCandidate = existing.recognizedMemberCodes.filter((code) => isTrainingEligible(state, code)).length >= 3;
        changedMatches.push(summaryForClient(existing));
        merged += 1;
      } else {
        existingByMatchId.set(summary.matchId, summary);
        changedMatches.push(summaryForClient(summary));
        created += 1;
      }
    }

    const nextCursor = memberFinished
      ? { memberIndex: memberIndex + 1, page: 1 }
      : { memberIndex, page: page + 1, previousPageSignature: pageSignature };
    const done = nextCursor.memberIndex >= seeds.length;
    await writeMatchCatalog(env.DB, changedMatches);
    return json({
      ok: true,
      done,
      seedMembers: seeds.length,
      syncVersion: SYNC_VERSION,
      memberIndex,
      memberCode: seed.user.identityCode,
      memberName: seed.user.gameId || seed.user.name || seed.user.identityCode,
      page,
      scannedMatches: repeatedPage ? 0 : pageItems.length,
      memberFailures: [],
      nextCursor,
      created,
      merged,
      pending: pageItems.filter((item) => !hasCompleteDetail(existingByMatchId.get(String(item.match_id)))).length,
      matches: pageItems.map((item) => summaryForClient(existingByMatchId.get(String(item.match_id)))),
    });
  } catch (error) {
    return json({ error: error.message || String(error), syncVersion: SYNC_VERSION }, 500);
  }
}
