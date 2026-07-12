import { ensureSchema, isAdmin, json, readState, userFromRequest, writeState } from "./_utils.js";

const FIVE_E_BASE = "https://ya-api-app.5eplay.com";

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
    const value = row?.[key];
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

function extractSwingScore(...sources) {
  for (const row of sources.filter(Boolean)) {
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
  }
  return 0;
}

function dateFromUnix(value) {
  const stamp = toNumber(value);
  if (!stamp) return new Date().toISOString().slice(0, 10);
  return new Date(stamp * 1000).toISOString().slice(0, 10);
}

function findSeasonForDate(state, date) {
  const stamp = new Date(`${date}T00:00:00`).getTime();
  return state.seasons.find((season) => {
    return new Date(`${season.start}T00:00:00`).getTime() <= stamp && stamp <= new Date(`${season.end}T00:00:00`).getTime();
  });
}

function matchOrderForDate(records, identityCode, date) {
  const existing = records
    .filter((record) => record.userIdentityCode === identityCode && record.date === date)
    .map((record) => Number(record.matchOrder) || 0);
  return existing.length ? Math.max(...existing) + 1 : 1;
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

async function fetchMatchDetail(matchId, domain) {
  const detail = await fetch5eJson(`/v0/mars/api/csgo/data/player_match_info/${encodeURIComponent(matchId)}/${encodeURIComponent(domain)}`);
  const rowsWithTeam = (rows, fallbackTeam = "") => (Array.isArray(rows) ? rows : []).map((row) => ({ ...row, _fallbackTeam: fallbackTeam }));
  const scoreboardRows = [
    ...rowsWithTeam(detail.group1_user_match_data, "1"),
    ...rowsWithTeam(detail.group2_user_match_data, "2"),
    ...rowsWithTeam(detail.ct_user_match_data, "1"),
    ...rowsWithTeam(detail.t_user_match_data, "2"),
    ...rowsWithTeam(detail.user_match_data),
    ...rowsWithTeam(detail.players),
  ];
  const domainOf = (row) => String(readField(row, ["domain", "user.domain", "user_info.domain", "player.domain", "player_info.domain"]) || "").trim();
  const exact = scoreboardRows.find((row) => domainOf(row) === domain);
  if (exact) return exact;

  const directRows = rowsWithTeam(detail.user_match_data);
  return directRows.length === 1 ? directRows[0] : null;
}

function buildRecord(state, listItem, detail, identityCode) {
  const date = dateFromUnix(listItem.end_time || listItem.start_time);
  const season = findSeasonForDate(state, date);
  const kda = parseKda(detail) || parseKda(listItem);
  const kills = kda?.kill ?? firstNumber(detail, ["kill", "kills", "kill_num", "killCount", "kill_count", "total_kill", "enemy_kill", "frags", "k"], firstNumber(listItem, ["kill", "kills", "kill_num", "k"]));
  const deaths = kda?.death ?? firstNumber(detail, ["death", "deaths", "death_num", "deathCount", "death_count", "d"], firstNumber(listItem, ["death", "deaths", "death_num", "d"]));
  const assists = kda?.assist ?? firstNumber(detail, ["assist", "assists", "assist_num", "assistCount", "assist_count", "a"], firstNumber(listItem, ["assist", "assists", "assist_num", "a"]));
  const headshots = firstNumber(detail, ["headshot", "headshots", "headshot_num", "hs", "hs_num"]);
  const parsedHeadshotRate = firstNumber(detail, ["per_headshot", "headshotRate", "headshot_rate", "hsRate", "hs_rate"], NaN);
  const headshotRate = Number.isFinite(parsedHeadshotRate) ? parsedHeadshotRate : kills > 0 ? (headshots / kills) * 100 : 0;
  const rating = firstNumber(detail, ["rating", "Rating", "rating_score", "score_rating"], firstNumber(listItem, ["rating", "Rating", "rating_score", "score_rating"]));
  const rws = firstNumber(detail, ["rws", "RWS", "rws_score"], firstNumber(listItem, ["rws", "RWS", "rws_score"]));

  return {
    id: `5e-${listItem.match_id}-${identityCode}`,
    userIdentityCode: identityCode,
    date,
    matchOrder: matchOrderForDate(state.records, identityCode, date),
    rating,
    rws,
    adr: firstNumber(detail, ["adr", "ADR", "avg_damage", "average_damage", "damage_per_round", "per_damage"]),
    kast: firstNumber(detail, ["kast", "KAST", "per_kast", "kast_rate"]),
    headshotRate,
    seasonId: season ? season.id : "",
    createdBy: identityCode,
    createdAt: new Date().toISOString(),
    source: "5e-sync",
    fiveE: {
      matchId: listItem.match_id,
      matchName: listItem.match_name,
      matchType: listItem.match_type,
      map: listItem.map,
      mapName: listItem.map_name || listItem.map_desc,
      isWin: String(listItem.is_win) === "1",
      swingScore: extractSwingScore(detail, listItem),
      kill: kills,
      death: deaths,
      assist: assists,
      endTime: listItem.end_time || "",
    },
  };
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
    const body = await request.json().catch(() => ({}));
    const identityCode = String(body.identityCode || session.identity_code);
    if (identityCode !== session.identity_code && !isAdmin(actor)) {
      return json({ error: "只有管理员可以同步其他成员。" }, 403);
    }

    const member = state.users.find((user) => user.identityCode === identityCode);
    if (!member) return json({ error: "找不到要同步的成员。" }, 404);

    const profile = parse5eProfile(body.profileUrl || body.domain || member.fiveEProfileUrl || member.fiveEDomain);
    const domain = profile.domain;
    if (!domain) return json({ error: "请先在资料里填写 5E 个人主页链接。" }, 400);

    const page = Math.max(1, Math.min(5, Number(body.page || 1)));
    const listData = await fetch5eJson(`/v0/mars/api/csgo/match_data/match_list?domain=${encodeURIComponent(domain)}&match_type=&time=&date_time=0&map_name=&page=${page}`);
    const matches = listData.match_list || [];
    const existingByMatchId = new Map(state.records.map((record) => [
      record.fiveE?.matchId || (String(record.id).startsWith("5e-") ? record.id.split("-").slice(1, -1).join("-") : ""),
      record,
    ]));
    const imported = [];
    let updated = 0;

    for (const item of matches.slice(0, 20)) {
      if (!item.match_id) continue;
      const existing = existingByMatchId.get(item.match_id);
      if (existing) {
        existing.fiveE = {
          ...(existing.fiveE || {}),
          swingScore: extractSwingScore(item, existing.fiveE),
          matchName: item.match_name,
          matchType: item.match_type,
          map: item.map,
          mapName: item.map_name || item.map_desc,
          isWin: String(item.is_win) === "1",
          endTime: item.end_time || existing.fiveE?.endTime || "",
        };
        updated += 1;
        continue;
      }
      const detail = await fetchMatchDetail(item.match_id, domain).catch(() => null);
      const record = buildRecord(state, item, detail, identityCode);
      state.records.push(record);
      existingByMatchId.set(item.match_id, record);
      imported.push(record);
    }

    member.fiveEDomain = domain;
    if (profile.uuid) member.fiveEUuid = profile.uuid;
    if (profile.profileUrl) member.fiveEProfileUrl = profile.profileUrl;
    member.fiveELastSyncAt = new Date().toISOString();
    await writeState(env.DB, state);

    return json({ ok: true, imported: imported.length, updated, scanned: matches.length, state });
  } catch (error) {
    return json({ error: error.message || String(error) }, 500);
  }
}
