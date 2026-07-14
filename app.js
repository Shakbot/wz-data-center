const STORE_KEY = "og-esports-club-v2";
const SESSION_KEY = "og-esports-session-v2";
const TOKEN_KEY = "og-esports-token-v2";
const PREF_KEY = "og-esports-preferences-v2";
const APP_VERSION = "8.2";

const IMPORTED_RECORDS = Array.isArray(window.IMPORTED_TRAINING_RECORDS)
  ? window.IMPORTED_TRAINING_RECORDS
  : [];

const INITIAL_USERS = [
  { identityCode: "00", name: "Dr. Wen L.Z.", gameId: "OG_electroNic", role: "总教练", password: "0000", avatar: "" },
  { identityCode: "01", name: "Dr. Liu Z.", gameId: "OG_Elfie", role: "常务副总教练", password: "0000", avatar: "", fiveEProfileUrl: "https://csgo.5eplay.com/app/share_loding_type7?domain=0211hq6dkzhe&tab=77&uuid=e33020f7-c8d9-11ee-9ce2-ec0d9a495494", fiveEDomain: "0211hq6dkzhe" },
  { identityCode: "02", name: "Dr. Kang H.R.", gameId: "OG_ECOK", role: "特级运动员", password: "0000", avatar: "" },
  { identityCode: "03", name: "Dr. Wang J.Q.", gameId: "OG_765", role: "一般运动员", password: "0000", avatar: "" },
  { identityCode: "04", name: "Dr. Li S.L.", gameId: "OG_WiFi", role: "一般运动员", password: "0000", avatar: "" },
  { identityCode: "05", name: "Dr. Yin Y.B.", gameId: "OG_BoGang", role: "一般运动员", password: "0000", avatar: "" },
  { identityCode: "06", name: "Dr. Zhang J.", gameId: "OG_SliverBullet", role: "一般运动员", password: "0000", avatar: "", fiveEAliases: ["OG_SilverBullet_ZJ", "OG_SliverBullet_ZJ", "OG_SilverBullet"] },
  { identityCode: "07", name: "Dr. Jiao Z.Y.", gameId: "OG_Jiaozi", role: "一般运动员", password: "0000", avatar: "" },
  { identityCode: "08", name: "Dr. Zhou F.Q.", gameId: "OG_Borchy", role: "一般运动员", password: "0000", avatar: "" },
  { identityCode: "T0", name: "Dr. Yao N.C.", gameId: "OG_cny", role: "特邀运动员", password: "0000", avatar: "" },
  { identityCode: "T1", name: "Dr. Zhang X.C.", gameId: "OG_NKcell", role: "特邀运动员", password: "0000", avatar: "" },
  { identityCode: "T2", name: "Dr. Ding Y.", gameId: "OG_Tang", role: "特邀运动员", password: "0000", avatar: "" },
  { identityCode: "T3", name: "（未知）", gameId: "Jili Gulu", role: "特邀运动员", password: "0000", avatar: "" },
];

const INITIAL_DATA = {
  users: INITIAL_USERS,
  seasons: [
    { id: "season-2026-winter-training", name: "2026年度冬季集训", shortName: "26WT", start: "2026-01-26", end: "2026-02-23" },
    { id: "season-2026-normal", name: "2026年度常规赛季", shortName: "26NS", start: "2026-01-26", end: "2026-12-31" },
  ],
  records: IMPORTED_RECORDS,
  matchRecords: [],
  medals: [],
  networkLinks: [],
  announcements: [
    {
      id: cryptoId(),
      title: "OG电子竞技数据服务中心启用",
      body: `已导入 2026年度冬季集训训练数据 ${IMPORTED_RECORDS.length} 条。所有成员可使用统一身份识别码和默认密码 0000 登录。`,
      createdAt: new Date().toISOString(),
      createdBy: "00",
    },
  ],
};

const TEXT = {
  zh: {
    appName: "OG电子竞技数据服务中心",
    loginSubtitle: "以统一身份识别码进入俱乐部内部系统，录入训练数据、查看排名、管理赛季、公告、成员与荣誉。",
    login: "登录数据中心",
    identityCode: "统一身份识别码",
    password: "密码",
    defaultPassword: "使用统一身份识别码登入",
    exportData: "导出平台数据",
    themeSwitch: "明暗风格",
    languageSwitch: "语言切换",
    dashboard: "数据总览",
    team: "团队总览",
    matches: "对局记录",
    records: "训练填报",
    seasons: "赛季设置",
    register: "新成员注册",
    users: "用户管理",
    medals: "勋章系统",
    announcements: "公告栏",
    network: "网络矩阵",
    logout: "退出登录",
    reset: "重置云端数据",
    theme: "明色",
    dark: "暗色",
    language: "EN",
    currentId: "当前 ID",
    name: "姓名",
    role: "身份组",
    code: "识别码",
    admin: "全体管理权限",
    noMedal: "暂无勋章",
    memberTotal: "成员总数",
    recordTotal: "训练记录",
    currentSeason: "当前赛季",
    countRank: "场次数排名",
    historyCount: "历史场次数",
    seasonCount: "本赛季场次数",
    recentCount: "近 2 周场次数",
    historyAvg: "历史平均",
    seasonAvg: "本赛季平均",
    last10Avg: "近十场平均",
    emptyData: "暂无可展示的数据。",
    addRecord: "新增训练数据",
    autoSeason: "赛季自动匹配日期区间",
    memberId: "成员 ID",
    date: "日期",
    matchOrder: "当日场次序",
    submitRecord: "提交训练数据",
    allRecords: "全体训练记录",
    myRecords: "我的训练记录",
    save: "保存",
    delete: "删除",
    edit: "修改",
    teamIntro: "点击成员卡片进入个人主页，查看资料、勋章、战绩和训练记录。",
    memberHome: "成员主页",
    profile: "个人信息",
    stats: "战绩概览",
    backTeam: "返回团队总览",
    grantMedal: "授予勋章",
    publish: "发布公告",
    noAccess: "当前账号无权进入该模块。",
  },
  en: {
    appName: "OG Esports Data Center",
    loginSubtitle: "Sign in with the unified identity code to record practice data, review rankings, manage seasons, announcements, members, and honors.",
    login: "Sign In",
    identityCode: "Identity Code",
    password: "Password",
    defaultPassword: "Sign in with unified identity code",
    exportData: "Export Platform Data",
    themeSwitch: "Theme",
    languageSwitch: "Language",
    dashboard: "Dashboard",
    team: "Team",
    matches: "Matches",
    records: "Training",
    seasons: "Seasons",
    register: "Register",
    users: "Users",
    medals: "Medals",
    announcements: "Announcements",
    logout: "Sign Out",
    reset: "Reset Cloud Data",
    theme: "Light",
    dark: "Dark",
    language: "中文",
    currentId: "Current ID",
    name: "Name",
    role: "Role",
    code: "Code",
    admin: "Full Admin",
    noMedal: "No medals",
    memberTotal: "Members",
    recordTotal: "Records",
    currentSeason: "Current Season",
    countRank: "Match Count Ranking",
    historyCount: "All-Time Matches",
    seasonCount: "Season Matches",
    recentCount: "Last 2 Weeks",
    historyAvg: "All-Time Avg",
    seasonAvg: "Season Avg",
    last10Avg: "Last 10 Avg",
    emptyData: "No data to display.",
    addRecord: "Add Training Record",
    autoSeason: "Season is matched by date range",
    memberId: "Member ID",
    date: "Date",
    matchOrder: "Match No.",
    submitRecord: "Submit Record",
    allRecords: "All Training Records",
    myRecords: "My Training Records",
    save: "Save",
    delete: "Delete",
    edit: "Edit",
    teamIntro: "Open a member homepage to review profile, medals, performance, and training records.",
    memberHome: "Member Home",
    profile: "Profile",
    stats: "Stats",
    backTeam: "Back to Team",
    grantMedal: "Grant Medal",
    publish: "Publish",
    noAccess: "You do not have access to this module.",
  },
};

let data = structuredClone(INITIAL_DATA);
let session = localStorage.getItem(SESSION_KEY) || "";
let authToken = localStorage.getItem(TOKEN_KEY) || "";
let preferences = loadPreferences();
let view = "dashboard";
let sidebarOpen = false;
let booting = true;
let syncStatus = "";
let selectedMatchId = "";
let selectedMatchScope = "full";
let selectedMatchIds = new Set();
let selectedRecordIds = new Set();
let savingData = false;
let saveQueue = Promise.resolve();
let loginBusy = false;
let busyTask = null;
let busyLineIndex = 0;
let busyLineTimer = null;

const SYNC_BUSY_LINES = [
  "OG_Elfie 正在把数据从战场上拎回来。",
  "OG_765 正在清点弹壳，顺便核对比分。",
  "OG_WiFi 正在努力保持连接稳定。",
  "OG_SilverBullet_ZJ 正在校准 Swing Score。",
  "OG_Borchy 正在把地图名摆正。",
  "OG_NKcell 正在检查有没有漏掉的队友。",
  "OG_Tang 正在给赛季时间线做糖衣校准。",
  "rotepower 没带 OG 前缀，但这次也不会被落下。",
  "教练组正在确认：这场够不够三个人。",
  "数据正在排队入库，别急，橙汁还没撒。",
];

const tabs = {
  count: "history",
  rating: "history",
  rws: "history",
  adr: "history",
  manageUser: session || "00",
  medalUser: session || "00",
  teamUser: session || "00",
  matchMember: "",
  teamGroup: "active",
  countRankExpanded: false,
  trainingSeason: "",
  manualRecordOpen: false,
  autoTrainingOpen: false,
  seasonSettingsOpen: false,
  fiveEAdminOpen: false,
  radarScope: "history",
  radarSeason: "",
};

const app = document.querySelector("#app");

function cryptoId() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function t(key) {
  return TEXT[preferences.lang][key] || TEXT.zh[key] || key;
}

function loadPreferences() {
  try {
    return { theme: "dark", ...JSON.parse(localStorage.getItem(PREF_KEY) || "{}"), lang: "zh" };
  } catch {
    return { lang: "zh", theme: "dark" };
  }
}

function savePreferences() {
  localStorage.setItem(PREF_KEY, JSON.stringify(preferences));
}

function applyTheme() {
  document.body.dataset.theme = preferences.theme;
  document.documentElement.lang = preferences.lang === "zh" ? "zh-CN" : "en";
}

async function api(path, options = {}) {
  const headers = { "content-type": "application/json", ...(options.headers || {}) };
  if (authToken) headers.authorization = `Bearer ${authToken}`;
  const response = await fetch(path, { ...options, headers });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "请求失败，请稍后再试。");
  return body;
}

async function loadCloudData() {
  if (!authToken) return;
  try {
    const body = await api("/api/state");
    data = normalizeData(body.state);
    session = body.identityCode || session;
    localStorage.setItem(SESSION_KEY, session);
    syncStatus = "";
  } catch {
    authToken = "";
    session = "";
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(SESSION_KEY);
  }
}

function normalizeData(next) {
  const bao = next.users.find((user) => user.identityCode === "T1");
  const tang = next.users.find((user) => user.identityCode === "T2");
  const sliver = next.users.find((user) => user.identityCode === "06");
  if (bao) bao.gameId = "OG_NKcell";
  if (tang) tang.gameId = "OG_Tang";
  next.networkLinks = Array.isArray(next.networkLinks) ? next.networkLinks : [];
  next.announcements = (next.announcements || []).map((item) => ({ readBy: [], ...item }));
  next.medals = (next.medals || []).map((item, index) => ({ order: index + 1, memberOrder: index + 1, ...item }));
  for (const user of next.users) {
    user.fiveEAliases = Array.isArray(user.fiveEAliases)
      ? user.fiveEAliases
      : String(user.fiveEAliases || "").split(/[,，\n]/).map((item) => item.trim()).filter(Boolean);
  }
  if (sliver) {
    const aliases = new Set(sliver.fiveEAliases || []);
    ["OG_SilverBullet_ZJ", "OG_SliverBullet_ZJ", "OG_SilverBullet"].forEach((alias) => aliases.add(alias));
    sliver.fiveEAliases = [...aliases];
  }
  next.matchRecords = next.matchRecords || [];
  const liveMatchIds = new Set(next.matchRecords.map((match) => match.id || match.matchId).filter(Boolean));
  selectedMatchIds = new Set([...selectedMatchIds].filter((id) => liveMatchIds.has(id)));
  return next;
}

function saveData() {
  if (!authToken) return Promise.resolve();
  const payload = JSON.stringify({ state: data });
  savingData = true;
  syncStatus = "正在保存到云端...";
  render();
  saveQueue = saveQueue
    .catch(() => {})
    .then(() => api("/api/state", {
      method: "PUT",
      body: payload,
    }))
    .then((body) => {
      if (body.state) data = normalizeData(body.state);
      savingData = false;
      syncStatus = `已保存 ${new Date().toLocaleTimeString("zh-CN", { hour12: false })}`;
      render();
    })
    .catch((error) => {
      savingData = false;
      syncStatus = `保存失败：${error.message}`;
      render();
    });
  return saveQueue;
}

function renderBusyOverlay() {
  if (!savingData && !busyTask) return "";
  const title = busyTask?.title || "正在保存";
  const line = busyTask?.line || "正在写入云端，完成后会自动关闭";
  return `
    <div class="busy-overlay" role="status" aria-live="polite">
      <div class="busy-dialog">
        <span class="busy-spinner"></span>
        <strong>${escapeHtml(title)}</strong>
        <span>${escapeHtml(line)}</span>
      </div>
    </div>
  `;
}

function startBusyTask(title, lines = SYNC_BUSY_LINES) {
  stopBusyTask(false);
  busyLineIndex = 0;
  busyTask = { title, lines, line: lines[0] || "正在处理..." };
  busyLineTimer = window.setInterval(() => {
    if (!busyTask?.lines?.length) return;
    busyLineIndex = (busyLineIndex + 1) % busyTask.lines.length;
    busyTask.line = busyTask.lines[busyLineIndex];
    render();
  }, 1400);
  render();
}

function stopBusyTask(shouldRender = true) {
  if (busyLineTimer) window.clearInterval(busyLineTimer);
  busyLineTimer = null;
  busyTask = null;
  if (shouldRender) render();
}

function currentUser() {
  return data.users.find((user) => user.identityCode === session) || null;
}

function isAdmin(user = currentUser()) {
  if (!user) return false;
  return ["总教练", "常务副总教练", "特级运动员"].includes(user.role) || user.identityCode === "03";
}

function isObserver(user) {
  return user?.role === "观察员";
}

function isTrainingEligible(user) {
  return !!user && !isObserver(user);
}

function activeMembers() {
  return data.users.filter(isTrainingEligible);
}

function observerMembers() {
  return data.users.filter(isObserver);
}

function sortMembersForTeam(members) {
  const roleOrder = { 总教练: 0, 常务副总教练: 1, 特级运动员: 2, 一般运动员: 3, 特邀运动员: 4, 观察员: 5 };
  return [...members].sort((a, b) => (roleOrder[a.role] ?? 9) - (roleOrder[b.role] ?? 9) || a.identityCode.localeCompare(b.identityCode, "zh-CN", { numeric: true }));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function todayText() {
  return new Date().toISOString().slice(0, 10);
}

function dateValue(date) {
  return new Date(`${date}T00:00:00`).getTime();
}

function findSeasonForDate(date) {
  const stamp = dateValue(date);
  return data.seasons.find((season) => dateValue(season.start) <= stamp && stamp <= dateValue(season.end)) || null;
}

function getCurrentSeason() {
  return findSeasonForDate(todayText()) || data.seasons.at(-1) || null;
}

function formatDateTime(iso) {
  return new Date(iso).toLocaleString(preferences.lang === "zh" ? "zh-CN" : "en-US", { hour12: false });
}

function userByCode(code) {
  return data.users.find((user) => user.identityCode === code);
}

function userRecords(code) {
  return data.records.filter((record) => record.userIdentityCode === code);
}

function isFiveERecord(record) {
  const source = String(record.source || "");
  return source.startsWith("5e")
    || Boolean(record.fiveE)
    || String(record.createdBy || "").startsWith("5e")
    || String(record.id || "").startsWith("5e-");
}

function isTrainingStatRecord(record) {
  const member = userByCode(record.userIdentityCode);
  if (!isTrainingEligible(member)) return false;
  return record.trainingIncluded === true || !isFiveERecord(record);
}

function trainingRecordKey(record) {
  if (record.fiveE?.matchId) return `5e:${record.fiveE.matchId}:${record.userIdentityCode}`;
  if (record.trainingMatchId) return `training:${record.trainingMatchId}:${record.userIdentityCode}`;
  return `manual:${record.id || `${record.userIdentityCode}:${record.date}:${record.matchOrder}`}`;
}

function newerRecord(a, b) {
  return String(a.updatedAt || a.createdAt || "") >= String(b.updatedAt || b.createdAt || "") ? a : b;
}

function mergeTrainingFlags(target, source) {
  if (source.trainingIncluded) target.trainingIncluded = true;
  if (source.trainingMatchId && !target.trainingMatchId) target.trainingMatchId = source.trainingMatchId;
  if (source.trainingPromotedAt && !target.trainingPromotedAt) target.trainingPromotedAt = source.trainingPromotedAt;
  return target;
}

function trainingStatRecords(records = data.records) {
  const byKey = new Map();
  for (const record of records.filter(isTrainingStatRecord)) {
    const key = trainingRecordKey(record);
    const current = byKey.get(key);
    if (!current) {
      byKey.set(key, { ...record });
      continue;
    }
    const next = { ...newerRecord(current, record) };
    mergeTrainingFlags(next, current);
    mergeTrainingFlags(next, record);
    byKey.set(key, next);
  }
  return [...byKey.values()];
}

function userTrainingRecords(code) {
  return trainingStatRecords().filter((record) => record.userIdentityCode === code);
}

function unreadAnnouncements(user = currentUser()) {
  if (!user) return [];
  return (data.announcements || []).filter((item) => !(item.readBy || []).includes(user.identityCode));
}

function avatarMarkup(user, sizeClass = "") {
  const label = escapeHtml((user.gameId || user.identityCode).slice(0, 2).toUpperCase());
  const image = user.avatar ? `<img src="${user.avatar}" alt="${escapeHtml(user.gameId)}" />` : label;
  return `<div class="avatar ${sizeClass}">${image}</div>`;
}

function parse5eProfile(value) {
  const raw = String(value || "").trim();
  if (!raw) return { domain: "", uuid: "", label: "" };
  try {
    const url = new URL(raw);
    return {
      domain: url.searchParams.get("domain") || "",
      uuid: url.searchParams.get("uuid") || "",
      label: raw,
    };
  } catch {
    return { domain: raw, uuid: "", label: raw };
  }
}

function render() {
  if (booting) {
    document.body.dataset.theme = "dark";
    document.body.dataset.login = "true";
    app.innerHTML = `
      <section class="login-page">
        <div class="login-panel">
          <div class="brand-lockup"><img src="./assets/og-logo.jpg" alt="" /><div><strong>${t("appName")}</strong><span>Loading · v${APP_VERSION}</span></div></div>
        </div>
      </section>
    `;
    return;
  }
  const user = currentUser();
  if (!user) {
    document.body.dataset.theme = "dark";
    document.body.dataset.login = "true";
    renderLogin();
    return;
  }
  delete document.body.dataset.login;
  applyTheme();

  app.innerHTML = `
    <div class="workspace">
      <aside class="sidebar ${sidebarOpen ? "open" : ""}">
        <div class="user-card sidebar-profile">
          ${avatarMarkup(user)}
          <div>
            <span class="identity">${escapeHtml(user.gameId)}</span>
            <div class="meta profile-lines">
              <span>${escapeHtml(user.name)}</span>
              <span>${escapeHtml(user.role)}</span>
              <span>${t("code")} ${escapeHtml(user.identityCode)}</span>
            </div>
            <div class="sidebar-medals">${renderMemberMedals(user.identityCode, false, 1)}</div>
          </div>
        </div>
        <nav class="nav">
          ${navButton("dashboard", "dashboard", t("dashboard"))}
          ${navButton("team", "team", t("team"))}
          ${navButton("matches", "matches", t("matches"))}
          ${navButton("records", "records", t("records"))}
          ${navButton("users", "users", t("users"))}
          ${navButton("medals", "medals", t("medals"))}
          ${navButton("announcements", "announcements", t("announcements"), true, unreadAnnouncements(user).length)}
          ${navButton("network", "network", t("network"))}
        </nav>
        <div class="sidebar-footer">
          ${toggleControl("toggle-theme", t("themeSwitch"), preferences.theme === "dark" ? t("theme") : t("dark"), "theme", preferences.theme === "light")}
          <button class="ghost export-button" data-action="export-data">${navIcon("records")}<span>${t("exportData")}</span></button>
          <button class="danger" data-action="logout">${t("logout")}</button>
        </div>
      </aside>
      <section class="content">
        <div class="topbar">
          <button class="icon-button mobile-nav-toggle" data-action="toggle-nav" aria-label="Menu">☰</button>
          <div>
            <h2>${escapeHtml(viewTitle())}</h2>
            <div class="chips">
              <span class="chip">${t("currentId")} <b>${escapeHtml(user.gameId)}</b></span>
              <span class="chip">${t("name")} ${escapeHtml(user.name)}</span>
              <span class="chip">${t("role")} ${escapeHtml(user.role)}</span>
              <span class="chip">${t("code")} ${escapeHtml(user.identityCode)}</span>
              <span class="chip version-chip">v${APP_VERSION}</span>
              ${isAdmin(user) ? `<span class="chip"><b>${t("admin")}</b></span>` : ""}
            </div>
          </div>
          <div class="top-actions">
            ${syncStatus ? `<span class="sync-error">${escapeHtml(syncStatus)}</span>` : ""}
            ${toggleControl("toggle-theme", t("themeSwitch"), preferences.theme === "dark" ? t("theme") : t("dark"), "theme", preferences.theme === "light")}
          </div>
        </div>
        ${renderView(user)}
      </section>
    </div>
    ${selectedMatchId ? renderMatchDetail(selectedMatchId) : ""}
    ${renderBusyOverlay()}
  `;
}

function navButton(id, icon, label, enabled = true, badge = 0) {
  if (!enabled) return "";
  return `<button class="${view === id ? "active" : ""}" data-action="nav" data-view="${id}">${navIcon(icon)}<span>${label}</span>${badge ? `<b class="nav-badge">${badge}</b>` : ""}</button>`;
}

function navIcon(icon) {
  const paths = {
    dashboard: '<path d="M4 13h6V4H4v9Zm10 7h6V4h-6v16ZM4 20h6v-4H4v4Z"/>',
    team: '<path d="M8 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm8 0a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM3 20c0-3 2.2-5 5-5s5 2 5 5H3Zm10 0c.2-2 1.2-3.6 2.8-4.5 2.6.2 4.2 2 4.2 4.5h-7Z"/>',
    matches: '<path d="M4 5h16v14H4V5Zm4 4h8M8 13h5M17 13h.01"/>',
    records: '<path d="M6 3h12v18H6V3Zm3 4h6M9 11h6M9 15h4"/>',
    seasons: '<path d="M7 3v3M17 3v3M4 8h16M5 5h14v16H5V5Zm4 7h3v3H9v-3Z"/>',
    register: '<path d="M12 5a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM5 21c0-4 3-6 7-6 1 0 2 .1 3 .4M18 15v6M15 18h6"/>',
    users: '<path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21c0-4.2 3.4-7 8-7s8 2.8 8 7"/>',
    medals: '<path d="M8 3h8l-2 6H10L8 3Zm2 6 2 3 2-3m-2 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"/>',
    announcements: '<path d="M4 10v4h4l8 4V6L8 10H4Zm12 0 4-3v10l-4-3"/>',
    network: '<path d="M7 7a3 3 0 1 0 0.1 0M17 7a3 3 0 1 0 0.1 0M12 17a3 3 0 1 0 0.1 0M9.5 8.3l5 0M8.7 9.5l2.4 5M15.3 9.5l-2.4 5"/>',
  };
  return `<svg class="nav-svg" viewBox="0 0 24 24" aria-hidden="true">${paths[icon] || paths.dashboard}</svg>`;
}

function toggleControl(action, label, value, icon, active) {
  const icons = {
    lang: '<path d="M4 5h10M9 3v2m-3 0c.5 3.8 3.2 6.8 7 8.5M13 5c-.7 3.1-2.7 5.8-6 8m8 8 4-10 4 10m-6.8-3h5.6"/>',
    theme: '<path d="M12 3a9 9 0 1 0 9 9c-4 1.2-8.2-2.4-9-9Z"/>',
  };
  return `
    <button class="toggle-control ${active ? "active" : ""}" data-action="${action}" type="button">
      <span class="toggle-copy">
        <svg class="toggle-icon" viewBox="0 0 24 24" aria-hidden="true">${icons[icon] || icons.lang}</svg>
        <span>${escapeHtml(label)}</span>
      </span>
      <span class="toggle-track"><span class="toggle-knob">${escapeHtml(value)}</span></span>
    </button>
  `;
}

function viewTitle() {
  return {
    dashboard: t("dashboard"),
    team: t("team"),
    member: t("memberHome"),
    matches: t("matches"),
    records: t("records"),
    seasons: t("seasons"),
    register: t("register"),
    users: t("users"),
    medals: t("medals"),
    announcements: t("announcements"),
    network: t("network"),
  }[view] || t("dashboard");
}

function renderLogin() {
  app.innerHTML = `
    <section class="login-page">
      <div class="login-visual">
        <img class="login-bg-image" src="./assets/login-bg.png" alt="" loading="eager" />
        <div class="login-copy">
          <p class="eyebrow">OrangeJuice International Holding Group Esports Gaming Club</p>
          <h1>${t("appName")}</h1>
          <p>${t("loginSubtitle")}</p>
        </div>
      </div>
      <div class="login-panel">
        <form class="login-box ${loginBusy ? "is-loading" : ""}" data-form="login">
          <div class="brand-line">
            <div class="logo-mark"></div>
            <div>
              <strong>OG Club Console</strong>
              <span>${t("defaultPassword")}</span>
            </div>
          </div>
          <div class="form-grid">
            <div class="field">
              <label for="identityCode">${t("identityCode")}</label>
              <input id="identityCode" name="identityCode" autocomplete="username" ${loginBusy ? "disabled" : ""} required />
            </div>
            <div class="field">
              <label for="password">${t("password")}</label>
              <input id="password" name="password" type="password" autocomplete="current-password" ${loginBusy ? "disabled" : ""} required />
            </div>
            <button class="primary login-submit" type="submit" ${loginBusy ? "disabled" : ""}>${loginBusy ? `<span class="button-spinner"></span>正在登录` : t("login")}</button>
            <div class="inline-actions">
            </div>
          </div>
          <p class="error-text" id="login-error"></p>
        </form>
      </div>
    </section>
  `;
}

function renderView(user) {
  if (view === "team") return renderTeam(user);
  if (view === "member") return renderMemberPage(user);
  if (view === "matches") return renderMatches();
  if (view === "records") return renderRecords(user);
  if (view === "seasons") return isAdmin(user) ? renderRecords(user) : noAccess();
  if (view === "register") return isAdmin(user) ? renderRegister() : noAccess();
  if (view === "users") return renderUsers(user);
  if (view === "medals") return renderMedals(user);
  if (view === "announcements") return renderAnnouncements(user);
  if (view === "network") return renderNetwork(user);
  return renderDashboard();
}

function noAccess() {
  return `<div class="panel"><div class="panel-body empty">${t("noAccess")}</div></div>`;
}

function renderMatches() {
  const selectedMember = tabs.matchMember ? userByCode(tabs.matchMember) : null;
  const admin = isAdmin();
  const matches = [...(data.matchRecords || [])]
    .filter((match) => !tabs.matchMember || (match.recognizedMemberCodes || []).includes(tabs.matchMember))
    .sort((a, b) => {
    return `${b.date}-${b.endTime || ""}`.localeCompare(`${a.date}-${a.endTime || ""}`);
  });
  const visibleMatchIds = matches.map((match) => match.id || match.matchId).filter(Boolean);
  const selectedVisibleCount = visibleMatchIds.filter((id) => selectedMatchIds.has(id)).length;
  const allVisibleSelected = visibleMatchIds.length > 0 && selectedVisibleCount === visibleMatchIds.length;
  const rows = matches.length
    ? matches.map((match) => renderMatchCard(match)).join("")
    : `<div class="empty">${selectedMember ? `暂无包含 ${escapeHtml(selectedMember.gameId)} 的对局记录。` : "暂无对局记录。请先给成员填写 5E 个人主页链接，然后点击一键同步。"}</div>`;
  return `
    <div class="section">
      <div class="panel">
        <div class="panel-head">
          <h3>对局记录</h3>
          <span class="chip">唯一 matchId · 全员种子同步</span>
        </div>
        <div class="panel-body">
          <div class="sync-row">
            <div>
              <strong>一键同步所有成员参与的 5E 对局</strong>
              <div class="date-line">遍历所有已绑定 5E 链接的成员，按 matchId 去重保存整场比赛。</div>
            </div>
            <button class="primary" data-action="sync-all-matches">一键同步对局</button>
          </div>
          ${admin ? `
            <div class="match-bulk-row">
              <label class="match-select-all">
                <input type="checkbox" data-action="toggle-match-select-all" ${allVisibleSelected ? "checked" : ""} ${visibleMatchIds.length ? "" : "disabled"} />
                <span>选择当前列表</span>
              </label>
              <button class="danger" data-action="delete-selected-matches" ${selectedMatchIds.size ? "" : "disabled"}>批量删除已选对局</button>
              <span class="chip">已选 ${selectedMatchIds.size} 场</span>
            </div>
          ` : ""}
          <div class="match-filter-row">
            <div class="field">
              <label>按成员筛选</label>
              <select data-action="pick-match-member">
                <option value="">全部成员</option>
                ${data.users.map((member) => `<option value="${escapeHtml(member.identityCode)}" ${tabs.matchMember === member.identityCode ? "selected" : ""}>${escapeHtml(member.gameId)} · ${escapeHtml(member.name)} · ${escapeHtml(member.identityCode)}</option>`).join("")}
              </select>
            </div>
            <span class="chip">${selectedMember ? `${escapeHtml(selectedMember.gameId)} · ${matches.length} 场` : `全部 · ${matches.length} 场`}</span>
          </div>
        </div>
      </div>
      <div class="match-grid">${rows}</div>
    </div>
  `;
}

function renderMatchCard(match) {
  const members = match.recognizedMemberCodes || [];
  const season = data.seasons.find((item) => item.id === match.seasonId);
  const outcome = matchOutcome(match);
  const admin = isAdmin();
  const matchKey = match.id || match.matchId;
  return `
    <article class="panel match-card ${outcome.className}">
      <div class="panel-body">
        <div class="match-info">
          ${admin ? `<label class="match-select-control"><input type="checkbox" data-action="toggle-match-select" data-id="${escapeHtml(matchKey)}" ${selectedMatchIds.has(matchKey) ? "checked" : ""} /><span>选择</span></label>` : ""}
          <div class="match-card-head">
            <strong class="match-map-name">${escapeHtml(match.mapName || match.map || "Unknown Map")}</strong>
            <div class="date-line">${escapeHtml(match.date || "")} · ${escapeHtml(match.matchName || "5E 对局")} · ${season ? escapeHtml(season.shortName) : "未归属赛季"}</div>
          </div>
          <div class="match-members">
            ${members.length ? members.map((code) => {
              const member = userByCode(code);
              return member ? `<span class="member-pill">${avatarMarkup(member, "tiny")}<span>${escapeHtml(member.gameId)}</span></span>` : "";
            }).join("") : `<span class="date-line">未识别到俱乐部成员</span>`}
          </div>
          <div class="inline-actions">
            <span class="chip">${members.length} 名成员</span>
            ${match.isTrainingCandidate ? `<span class="mini-badge">赛训候选</span>` : ""}
            ${match.isTrainingConfirmed ? `<span class="mini-badge">已确认赛训</span>` : ""}
            <button class="ghost" data-action="open-match-detail" data-id="${escapeHtml(match.id || match.matchId)}">查看详情</button>
            ${admin ? `<button class="danger" data-action="delete-synced-match" data-id="${escapeHtml(match.id || match.matchId)}">删除对局</button>` : ""}
          </div>
        </div>
        <div class="match-scoreboard">
          <span class="match-result-badge">${escapeHtml(outcome.label)}</span>
          <div class="score-stack">
            <span class="score-tag">我方</span>
            <div class="match-score">
              <strong>${escapeHtml(outcome.ourScore)}</strong>
              <span>:</span>
              <em>${escapeHtml(outcome.theirScore)}</em>
            </div>
            <span class="score-side">${escapeHtml(outcome.sideText)}</span>
          </div>
        </div>
      </div>
    </article>
  `;
}

function matchOutcome(match) {
  const players = match.players || [];
  const clubPlayers = players.filter((player) => player.memberCode);
  const teamCounts = clubPlayers.reduce((acc, player) => {
    const team = String(player.team || "");
    if (!team) return acc;
    acc[team] = (acc[team] || 0) + 1;
    return acc;
  }, {});
  const ourTeam = Object.entries(teamCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "";
  const scoreA = Number(match.scoreA);
  const scoreB = Number(match.scoreB);
  const hasScores = Number.isFinite(scoreA) && Number.isFinite(scoreB);
  const ourScore = ourTeam === "2" ? scoreA : scoreB;
  const theirScore = ourTeam === "2" ? scoreB : scoreA;
  if (!ourTeam || !hasScores) {
    return { label: "待确认", className: "match-unknown", ourScore: match.scoreA ?? "-", theirScore: match.scoreB ?? "-", sideText: "阵营未识别" };
  }
  const win = ourScore > theirScore;
  const tie = ourScore === theirScore;
  return {
    label: tie ? "平局" : win ? "胜利" : "失败",
    className: tie ? "match-draw" : win ? "match-win" : "match-loss",
    ourScore,
    theirScore,
    sideText: ourTeam === "1" ? "Team A" : "Team B",
  };
}

function renderMatchDetail(matchId) {
  const match = (data.matchRecords || []).find((item) => item.id === matchId || item.matchId === matchId);
  if (!match) return "";
  const scope = matchDetailScope(match);
  const players = matchDetailPlayers(matchPlayersForScope(match, scope));
  const rwsRatings = matchRwsRatings(players);
  const scopeTabs = renderMatchScopeTabs(match, scope);
  const rows = players.map((player) => {
    const member = player.memberCode ? userByCode(player.memberCode) : null;
    const rating = rwsRatings.get(player);
    return `
      <tr class="${player.memberCode ? "club-player-row" : ""}">
        <td>
          <strong>${escapeHtml(player.nickname)}</strong>
          ${member ? `<br><span class="date-line">${escapeHtml(member.gameId)} · ${escapeHtml(member.identityCode)}</span>` : player.isOgCandidate ? `<br><span class="date-line">OG 候选</span>` : ""}
        </td>
        <td>${escapeHtml(teamLabel(player.team))}</td>
        <td>${player.kill}/${player.assist}/${player.death}</td>
        <td>${Number(player.adr || 0).toFixed(1)}</td>
        <td>${Number(player.kast || 0).toFixed(2)}</td>
        <td>${Number(player.rws || 0).toFixed(2)}</td>
        <td>${Number(player.rating || 0).toFixed(2)}</td>
        <td><span class="rws-rank-badge ${rating.className}">${escapeHtml(rating.label)}</span><br><span class="date-line">RWS 第 ${rating.rank} 名</span></td>
      </tr>
    `;
  }).join("");
  return `
    <div class="modal-backdrop" data-action="close-match-detail">
      <div class="match-detail-modal" role="dialog" aria-modal="true">
        <div class="panel-head">
          <div>
            <h3>${escapeHtml(match.mapName || match.map || "5E 对局")} · ${escapeHtml(match.scoreA ?? "-")} : ${escapeHtml(match.scoreB ?? "-")}</h3>
            <div class="date-line">${escapeHtml(match.date || "")} · ${escapeHtml(match.matchName || "")} · Match ${escapeHtml(match.matchId)} · ${escapeHtml(matchScopeLabel(scope))}</div>
          </div>
          <button class="icon-button" data-action="close-match-detail" aria-label="Close">×</button>
        </div>
        <div class="match-detail-body">
          <div class="table-wrap match-detail-table">
            <table>
              <thead><tr><th>玩家</th><th>阵营</th><th>杀/助/死</th><th>ADR</th><th>KAST</th><th>RWS</th><th>Rating</th><th>评价</th></tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
          ${scopeTabs}
        </div>
      </div>
    </div>
  `;
}

function matchDetailScope(match) {
  const scopes = matchAvailableScopes(match);
  return scopes.includes(selectedMatchScope) ? selectedMatchScope : "full";
}

function matchAvailableScopes(match) {
  return ["full", "ct", "t"].filter((scope) => matchPlayersForScope(match, scope).length);
}

function matchPlayersForScope(match, scope) {
  if (scope === "full") return match.playerViews?.full?.length ? match.playerViews.full : (match.players || []);
  return match.playerViews?.[scope] || [];
}

function matchScopeLabel(scope) {
  if (scope === "ct") return "CT 半场";
  if (scope === "t") return "T 半场";
  return "全场";
}

function renderMatchScopeTabs(match, activeScope) {
  const scopes = [
    ["full", "全场", "ALL"],
    ["ct", "CT 半场", "CT"],
    ["t", "T 半场", "T"],
  ];
  return `
    <aside class="match-scope-switcher" aria-label="对局数据视图">
      ${scopes.map(([scope, label, mark]) => {
        const count = matchPlayersForScope(match, scope).length;
        return `
          <button class="${activeScope === scope ? "active" : ""}" data-action="match-detail-scope" data-scope="${scope}" ${count ? "" : "disabled"} type="button">
            <span>${escapeHtml(mark)}</span>
            <strong>${escapeHtml(label)}</strong>
            <em>${count ? `${count} 人` : "暂无"}</em>
          </button>
        `;
      }).join("")}
    </aside>
  `;
}

function matchRwsRatings(players) {
  const labels = [
    { label: "伯乐", className: "rws-rank-1" },
    { label: "上等马", className: "rws-rank-2" },
    { label: "中等马", className: "rws-rank-3" },
    { label: "下等马", className: "rws-rank-4" },
    { label: "二维马", className: "rws-rank-5" },
  ];
  const result = new Map();
  const groups = players.reduce((acc, player) => {
    const team = String(player.team || "unknown");
    if (!acc.has(team)) acc.set(team, []);
    acc.get(team).push(player);
    return acc;
  }, new Map());
  groups.forEach((group) => {
    const ranked = [...group].sort((a, b) => Number(b.rws || 0) - Number(a.rws || 0));
    ranked.forEach((player, index) => {
      const bucket = Math.min(labels.length - 1, Math.floor((index * labels.length) / Math.max(1, ranked.length)));
      result.set(player, { ...labels[bucket], rank: index + 1 });
    });
  });
  return result;
}

function matchDetailPlayers(players) {
  const chosen = new Map();
  for (const player of players) {
    const key = player.domain || player.uuid || `${String(player.nickname || "").toLowerCase()}-${player.team || ""}`;
    const current = chosen.get(key);
    if (!current || Number(player.rating || 0) > Number(current.rating || 0)) chosen.set(key, player);
  }
  const order = (team) => String(team) === "2" ? 1 : String(team) === "1" ? 2 : 3;
  const deduped = [...chosen.values()].sort((a, b) => order(a.team) - order(b.team) || Number(b.rating || 0) - Number(a.rating || 0));
  const teamA = deduped.filter((player) => String(player.team) === "2").slice(0, 5);
  const teamB = deduped.filter((player) => String(player.team) === "1").slice(0, 5);
  const other = deduped.filter((player) => String(player.team) !== "1" && String(player.team) !== "2").slice(0, Math.max(0, 10 - teamA.length - teamB.length));
  return [...teamA, ...teamB, ...other].slice(0, 10);
}

function teamLabel(team) {
  if (String(team) === "2") return "Team A";
  if (String(team) === "1") return "Team B";
  return team || "-";
}

function renderDashboard() {
  const season = getCurrentSeason();
  const metricCards = ["rating", "rws", "adr"].map((metric) => renderMetricPanel(metric)).join("");
  return `
    <div class="section">
      <div class="grid three">
        ${summaryCard(t("memberTotal"), activeMembers().length)}
        ${summaryCard(t("recordTotal"), trainingStatRecords().length)}
        ${summaryCard(t("currentSeason"), season ? `${escapeHtml(season.shortName)} · ${escapeHtml(season.name)}` : "N/A")}
      </div>
      <div class="panel">
        <div class="panel-head">
          <h3>${t("countRank")}</h3>
          ${renderTabs("count", [
            ["history", t("historyCount")],
            ["season", t("seasonCount")],
            ["recent", t("recentCount")],
          ])}
        </div>
        <div class="panel-body">${renderRanking("count", tabs.count)}</div>
      </div>
      <div class="grid three">${metricCards}</div>
    </div>
  `;
}

function summaryCard(label, value) {
  return `
    <div class="panel">
      <div class="panel-body">
        <span class="stat-label">${escapeHtml(label)}</span>
        <span class="stat-value">${value}</span>
      </div>
    </div>
  `;
}

function renderMetricPanel(metric) {
  const label = metric.toUpperCase();
  return `
    <div class="panel">
      <div class="panel-head">
        <h3>${label}</h3>
        ${renderTabs(metric, [
          ["history", t("historyAvg")],
          ["season", t("seasonAvg")],
          ["last10", t("last10Avg")],
        ])}
      </div>
      <div class="panel-body">${renderRanking(metric, tabs[metric])}</div>
    </div>
  `;
}

function renderTabs(group, items) {
  return `
    <div class="tabs">
      ${items.map(([key, label]) => `<button class="${tabs[group] === key ? "active" : ""}" data-action="tab" data-group="${group}" data-tab="${key}">${label}</button>`).join("")}
    </div>
  `;
}

function renderRanking(metric, scope) {
  const rows = rankingRows(metric, scope);
  if (!rows.length) return `<div class="empty">${t("emptyData")}</div>`;
  if (metric === "count") return renderCountRanking(rows);
  const max = Math.max(...rows.map((row) => row.value), 0.01);
  return `
    <div class="ranking-list">
      ${rows
        .map((row, index) => {
          const user = row.user;
          const width = Math.max((row.value / max) * 100, row.value ? 4 : 1);
          const topClass = index < 3 ? `rank-top rank-top-${index + 1}` : "";
          return `
            <button class="rank-row ${topClass}" data-action="open-member" data-code="${user.identityCode}">
              <div class="rank-no">#${index + 1}</div>
              <div class="rank-main">
                <div class="rank-name"><b>${escapeHtml(user.gameId)}</b><span>${escapeHtml(user.name)} · ${escapeHtml(user.role)}</span></div>
                <div class="bar"><span style="width:${width}%"></span></div>
              </div>
              <div class="rank-value">${formatRankValue(metric, row.value)}</div>
            </button>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderCountRanking(rows) {
  const topRows = rows.slice(0, 3);
  const restRows = rows.slice(3);
  const orderedTop = [topRows[1], topRows[0], topRows[2]].filter(Boolean);
  const podium = orderedTop.map((row) => {
    const actualIndex = rows.indexOf(row);
    const place = actualIndex + 1;
    const rankLabel = place === 1 ? "1st" : place === 2 ? "2nd" : "3rd";
    return `
      <button class="count-podium-card count-podium-${place}" data-action="open-member" data-code="${row.user.identityCode}">
        <span class="rank-watermark">${rankLabel}</span>
        <div class="cup-shell">
          <span class="cup-glow"></span>
          <span class="cup-medal"></span>
          <span class="cup-avatar">${avatarMarkup(row.user, "tiny")}</span>
        </div>
        <span class="podium-copy">
          <strong>${escapeHtml(row.user.gameId)}</strong>
          <span class="date-line">${escapeHtml(row.user.name)}</span>
        </span>
        <b>${formatRankValue("count", row.value)}</b>
      </button>
    `;
  }).join("");
  const max = Math.max(...rows.map((row) => row.value), 0.01);
  const rest = restRows.map((row, index) => {
    const width = Math.max((row.value / max) * 100, row.value ? 4 : 1);
    const rank = index + 4;
    return `
      <button class="rank-row" data-action="open-member" data-code="${row.user.identityCode}">
        <div class="rank-no">#${rank}</div>
        <div class="rank-main">
          <div class="rank-name"><b>${escapeHtml(row.user.gameId)}</b><span>${escapeHtml(row.user.name)} · ${escapeHtml(row.user.role)}</span></div>
          <div class="bar"><span style="width:${width}%"></span></div>
        </div>
        <div class="rank-value">${formatRankValue("count", row.value)}</div>
      </button>
    `;
  }).join("");
  return `
    <div class="count-ranking">
      <div class="count-podium">${podium}</div>
      ${restRows.length ? `
        <button class="ghost count-rank-toggle" data-action="toggle-count-rank" type="button">${tabs.countRankExpanded ? "收起第 4 名以后" : `展开第 4 名以后（${restRows.length} 人）`}</button>
        ${tabs.countRankExpanded ? `<div class="ranking-list count-rest-list">${rest}</div>` : ""}
      ` : ""}
    </div>
  `;
}

function rankingRows(metric, scope) {
  const season = getCurrentSeason();
  const since = new Date();
  since.setDate(since.getDate() - 13);
  const sinceStamp = dateValue(since.toISOString().slice(0, 10));
  const rows = activeMembers().map((user) => {
    let records = userTrainingRecords(user.identityCode);
    if (metric === "count") {
      if (scope === "season" && season) records = records.filter((record) => record.seasonId === season.id);
      if (scope === "recent") records = records.filter((record) => dateValue(record.date) >= sinceStamp);
      return { user, value: records.length };
    }
    if (scope === "season" && season) records = records.filter((record) => record.seasonId === season.id);
    if (scope === "last10") {
      records = [...records].sort(compareRecordDesc).slice(0, 10);
    }
    const values = records.map((record) => Number(record[metric])).filter((value) => Number.isFinite(value));
    const average = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
    return { user, value: average };
  });
  return rows.sort((a, b) => b.value - a.value || a.user.identityCode.localeCompare(b.user.identityCode));
}

function compareRecordDesc(a, b) {
  return `${b.date}-${String(b.matchOrder).padStart(3, "0")}`.localeCompare(`${a.date}-${String(a.matchOrder).padStart(3, "0")}`);
}

function formatRankValue(metric, value) {
  if (metric === "count") return `${value} ${preferences.lang === "zh" ? "场" : "matches"}`;
  if (metric === "adr") return value.toFixed(1);
  return value.toFixed(2);
}

function renderTeam(user) {
  const showingObservers = tabs.teamGroup === "observers";
  const members = showingObservers ? sortMembersForTeam(observerMembers()) : sortMembersForTeam(activeMembers());
  return `
    <div class="section">
      <div class="panel">
        <div class="panel-head">
          <h3>${t("team")}</h3>
          <span class="chip">${t("teamIntro")}</span>
        </div>
        <div class="panel-body team-tabs">
          <div class="tabs">
            <button class="${!showingObservers ? "active" : ""}" data-action="team-group" data-group="active" type="button">教练员及运动员</button>
            <button class="${showingObservers ? "active" : ""}" data-action="team-group" data-group="observers" type="button">观察员</button>
          </div>
        </div>
        <div class="panel-body team-grid">
          ${members.length ? members.map((member) => renderTeamCard(member, "")).join("") : `<div class="empty">暂无${showingObservers ? "观察员" : "成员"}。</div>`}
        </div>
      </div>
    </div>
  `;
}

function renderTeamCard(member, selectedCode) {
  const stats = memberStats(member.identityCode);
  return `
    <button class="member-card ${member.identityCode === selectedCode ? "active" : ""} ${isObserver(member) ? "is-observer" : ""}" ${isObserver(member) ? "" : `data-action="open-member" data-code="${member.identityCode}"`}>
      ${avatarMarkup(member)}
      <span class="identity">${escapeHtml(member.gameId)}</span>
      <span class="meta">${escapeHtml(member.name)} · ${escapeHtml(member.role)} · ${escapeHtml(member.identityCode)}</span>
      <span class="mini-stat">Rating ${stats.rating.toFixed(2)} · ADR ${stats.adr.toFixed(1)} · ${stats.count} 场</span>
      <span class="sidebar-medals">${renderMemberMedals(member.identityCode, false, 1)}</span>
    </button>
  `;
}

function renderMemberHome(member, viewer) {
  const admin = isAdmin(viewer);
  const canManage = admin || member.identityCode === viewer.identityCode;
  const records = userRecords(member.identityCode);
  const stats = memberStats(member.identityCode);
  return `
    <div class="panel member-home">
      <div class="panel-head">
        <div class="home-title">
          ${avatarMarkup(member)}
          <div>
            <h3>${t("memberHome")} · ${escapeHtml(member.gameId)}</h3>
            <div class="meta">${escapeHtml(member.name)} · ${escapeHtml(member.role)} · ${t("code")} ${escapeHtml(member.identityCode)}</div>
            <div class="sidebar-medals">${renderMemberMedals(member.identityCode, false, 1)}</div>
          </div>
        </div>
      </div>
      <div class="panel-body">
        <div class="grid three">
          ${summaryCard("Rating", stats.rating.toFixed(2))}
          ${summaryCard("RWS", stats.rws.toFixed(2))}
          ${summaryCard("ADR", stats.adr.toFixed(1))}
        </div>
        <div class="grid three member-stat-row">
          ${summaryCard(t("historyCount"), stats.count)}
          ${summaryCard(t("seasonCount"), memberSeasonCount(member.identityCode))}
          ${summaryCard(t("recentCount"), memberRecentCount(member.identityCode))}
        </div>
        ${renderPerformanceVisuals(member.identityCode)}
        ${render5ePanel(member, canManage)}
        ${canManage ? `<div class="subsection-title">${t("addRecord")}</div>${renderRecordForm(member.identityCode, true)}` : ""}
        <div class="subsection-title">${t("recordTotal")}</div>
        <div class="table-wrap">${renderRecordsTable(records, canManage, viewer)}</div>
      </div>
    </div>
  `;
}

function renderMemberPage(viewer) {
  const member = userByCode(tabs.teamUser) || viewer;
  if (isObserver(member)) return renderTeam(viewer);
  return `
    <div class="section">
      <div class="panel">
        <div class="panel-body">
          <button class="ghost" data-action="back-team" type="button">← 返回团队总览</button>
        </div>
      </div>
      ${renderMemberHome(member, viewer)}
    </div>
  `;
}

function render5ePanel(member, canManage) {
  const fiveEIdentity = member.fiveEProfileUrl || member.fiveEDomain || "";
  const fiveEProfile = parse5eProfile(fiveEIdentity);
  const recent5e = userRecords(member.identityCode)
    .filter((record) => record.source === "5e-sync" || record.fiveE)
    .sort(compareRecordDesc)
    .slice(0, 8);
  const rows = recent5e.length
    ? recent5e.map((record) => {
        const meta = record.fiveE || {};
        const horse = recordHorseRating(record);
        return `
          <tr>
            <td>${escapeHtml(record.date)}<br><span class="date-line">${escapeHtml(meta.mapName || meta.map || "5E")}</span></td>
            <td>${Number(record.rating).toFixed(2)}</td>
            <td>${Number(record.rws).toFixed(2)}</td>
            <td>${Number(record.adr).toFixed(1)}</td>
            <td>${record.kast != null ? Number(record.kast).toFixed(2) : "N/A"}</td>
            <td>${meta.kill ?? "N/A"} / ${meta.assist ?? "N/A"} / ${meta.death ?? "N/A"}</td>
            <td>${meta.isWin ? "胜" : "负"}</td>
            <td><span class="rws-rank-badge ${horse.className}">${escapeHtml(horse.label)}</span><br><span class="date-line">${escapeHtml(horse.detail)}</span></td>
          </tr>
        `;
      }).join("")
    : `<tr><td colspan="8"><div class="empty">暂无 5E 同步战绩</div></td></tr>`;
  return `
    <div class="fivee-panel">
      <div class="subsection-title">5E 最近战绩</div>
      <div class="sync-row">
        <div>
          <strong>${escapeHtml(fiveEIdentity || "未绑定 5E 个人主页链接")}</strong>
          <div class="date-line">${fiveEProfile.domain ? `Domain ${escapeHtml(fiveEProfile.domain)} · ` : ""}${member.fiveELastSyncAt ? `对局记录已同步到 ${formatDateTime(member.fiveELastSyncAt)}` : "填写 5E 个人主页链接后，由“对局记录”一键同步并自动汇总到个人主页"}</div>
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>日期 / 地图</th><th>Rating</th><th>RWS</th><th>ADR</th><th>KAST</th><th>杀/助/死</th><th>结果</th><th>评价</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>
  `;
}

function recordHorseRating(record) {
  const meta = record.fiveE || {};
  const match = (data.matchRecords || []).find((item) => {
    return item.id === meta.matchRecordId || item.matchId === meta.matchId || item.fingerprint === meta.fingerprint;
  });
  if (!match) {
    return { label: "中等马", className: "rws-rank-3", detail: "暂无同队排名" };
  }
  const players = matchDetailPlayers(match.players || []);
  const player = players.find((item) => item.memberCode === record.userIdentityCode);
  const ratings = matchRwsRatings(players);
  const rating = player ? ratings.get(player) : null;
  return rating
    ? { ...rating, detail: `${teamLabel(player.team)} RWS 第 ${rating.rank} 名` }
    : { label: "中等马", className: "rws-rank-3", detail: "暂无同队排名" };
}

function fiveESwing(value) {
  const score = Number(value);
  if (!Number.isFinite(score)) return { label: "N/A", value: "无分数", className: "neutral" };
  if (score >= 10) return { label: "奈爆了", value: `+${score.toFixed(0)}`, className: "hot" };
  if (score >= 5) return { label: "夯", value: `+${score.toFixed(0)}`, className: "good" };
  if (score >= 2) return { label: "顶级", value: `+${score.toFixed(0)}`, className: "solid" };
  if (score >= -2) return { label: "人上人", value: `${score >= 0 ? "+" : ""}${score.toFixed(0)}`, className: "neutral" };
  if (score >= -5) return { label: "NPC", value: score.toFixed(0), className: "npc" };
  if (score >= -10) return { label: "拉", value: score.toFixed(0), className: "bad" };
  return { label: "拉完了", value: score.toFixed(0), className: "awful" };
}

function memberStats(code) {
  const records = userTrainingRecords(code);
  return statsFromRecords(records);
}

function statsFromRecords(records) {
  const average = (field) => {
    const values = records.map((record) => Number(record[field])).filter((value) => Number.isFinite(value));
    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  };
  const averageMeta = (field) => {
    const values = records
      .map((record) => Number(record.fiveE?.[field] ?? record[field]))
      .filter((value) => Number.isFinite(value));
    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  };
  return {
    count: records.length,
    trainingCount: records.filter((record) => record.type === "training").length,
    rating: average("rating"),
    rws: average("rws"),
    adr: average("adr"),
    kast: averageMeta("kast"),
    headshotRate: averageMeta("headshotRate") || averageMeta("hsRate") || averageMeta("headshot"),
    swingScore: averageMeta("swingScore") || averageMeta("changeElo"),
  };
}

function memberSeasonCount(code) {
  const season = getCurrentSeason();
  return userTrainingRecords(code).filter((record) => season && record.seasonId === season.id).length;
}

function memberRecentCount(code) {
  const since = new Date();
  since.setDate(since.getDate() - 13);
  const sinceStamp = dateValue(since.toISOString().slice(0, 10));
  return userTrainingRecords(code).filter((record) => dateValue(record.date) >= sinceStamp).length;
}

function scopedRecords(code) {
  const records = userTrainingRecords(code);
  if (tabs.radarScope === "current") {
    const season = getCurrentSeason();
    return season ? records.filter((record) => record.seasonId === season.id) : [];
  }
  if (tabs.radarScope === "season" && tabs.radarSeason) {
    return records.filter((record) => record.seasonId === tabs.radarSeason);
  }
  return records;
}

function renderPerformanceVisuals(code) {
  const records = scopedRecords(code);
  const seasonOptions = data.seasons
    .map((season) => `<option value="${escapeHtml(season.id)}" ${season.id === tabs.radarSeason ? "selected" : ""}>${escapeHtml(season.name)}</option>`)
    .join("");
  return `
    <div class="performance-panel">
      <div class="performance-head">
        <div class="subsection-title">${preferences.lang === "zh" ? "表现图谱" : "Performance Map"}</div>
        <div class="scope-controls">
          <button class="chip-button ${tabs.radarScope === "history" ? "active" : ""}" data-action="radar-scope" data-scope="history" type="button">总数据</button>
          <button class="chip-button ${tabs.radarScope === "current" ? "active" : ""}" data-action="radar-scope" data-scope="current" type="button">当前赛季</button>
          <button class="chip-button ${tabs.radarScope === "season" ? "active" : ""}" data-action="radar-scope" data-scope="season" type="button">指定赛季</button>
          <select class="compact-select" data-action="pick-radar-season" ${tabs.radarScope === "season" ? "" : "disabled"}>
            <option value="">选择赛季</option>
            ${seasonOptions}
          </select>
        </div>
      </div>
      <div class="performance-grid">
        ${renderRadarChart(code, records)}
        ${renderAbilityBars(code, records)}
      </div>
    </div>
  `;
}

function renderRadarChart(code, records = userRecords(code)) {
  const stats = statsFromRecords(records);
  const axes = [
    ["Rating", Math.min(stats.rating / 1.6, 1)],
    ["ADR", Math.min(stats.adr / 130, 1)],
    ["RWS", Math.min(stats.rws / 15, 1)],
    ["KAST", Math.min(normalPercent(stats.kast) / 100, 1)],
    ["HS%", Math.min(normalPercent(stats.headshotRate) / 100, 1)],
    [preferences.lang === "zh" ? "场次" : "Matches", Math.min(stats.count / 20, 1)],
  ];
  const center = 120;
  const radius = 82;
  const points = axes.map((axis, index) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / axes.length;
    const ratio = Math.max(0.08, Math.min(1, Number(axis[1]) || 0));
    return {
      label: axis[0],
      value: axis[1],
      x: center + Math.cos(angle) * radius * ratio,
      y: center + Math.sin(angle) * radius * ratio,
      lx: center + Math.cos(angle) * (radius + 26),
      ly: center + Math.sin(angle) * (radius + 26),
      ax: center + Math.cos(angle) * radius,
      ay: center + Math.sin(angle) * radius,
    };
  });
  const polygon = points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
  const grid = [0.25, 0.5, 0.75, 1]
    .map((ratio) => {
      const gridPoints = axes
        .map((_, index) => {
          const angle = -Math.PI / 2 + (Math.PI * 2 * index) / axes.length;
          return `${(center + Math.cos(angle) * radius * ratio).toFixed(1)},${(center + Math.sin(angle) * radius * ratio).toFixed(1)}`;
        })
        .join(" ");
      return `<polygon points="${gridPoints}" class="radar-grid" />`;
    })
    .join("");
  return `
    <div class="radar-panel">
      <div class="subsection-title">${preferences.lang === "zh" ? "能力雷达" : "Performance Radar"}</div>
      <svg class="radar-chart" viewBox="0 0 240 240" role="img" aria-label="Performance radar">
        ${grid}
        ${points.map((point) => `<line class="radar-axis" x1="${center}" y1="${center}" x2="${point.ax.toFixed(1)}" y2="${point.ay.toFixed(1)}" />`).join("")}
        <polygon class="radar-area" points="${polygon}" />
        ${points.map((point) => `<circle class="radar-dot" cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="4" />`).join("")}
        ${points.map((point) => `<text class="radar-label" x="${point.lx.toFixed(1)}" y="${point.ly.toFixed(1)}">${escapeHtml(point.label)}</text>`).join("")}
      </svg>
    </div>
  `;
}

function renderAbilityBars(code, records = userRecords(code)) {
  const stats = statsFromRecords(records);
  const swingRatio = Math.max(0, Math.min(1, (stats.swingScore + 10) / 25));
  const rows = [
    { label: "火力", hint: `Rating ${stats.rating.toFixed(2)} / ADR ${stats.adr.toFixed(1)}`, value: ((Math.min(stats.rating / 1.6, 1) * 0.48) + (Math.min(stats.adr / 130, 1) * 0.52)) * 100 },
    { label: "稳定", hint: `KAST ${formatPercent(stats.kast)}`, value: normalPercent(stats.kast) },
    { label: "影响力", hint: `RWS ${stats.rws.toFixed(2)} / SS ${stats.swingScore.toFixed(1)}`, value: ((Math.min(stats.rws / 15, 1) * 0.55) + (swingRatio * 0.45)) * 100 },
    { label: "出勤", hint: `${stats.count} 场`, value: Math.min(stats.count / 20, 1) * 100 },
    { label: "爆头", hint: `HS% ${formatPercent(stats.headshotRate)}`, value: normalPercent(stats.headshotRate) },
  ];
  return `
    <div class="ability-panel">
      <div class="subsection-title">横向能力条</div>
      <div class="ability-bars">
        ${rows.map((row) => `
          <div class="ability-row">
            <div class="ability-copy">
              <strong>${escapeHtml(row.label)}</strong>
              <span>${escapeHtml(row.hint)}</span>
            </div>
            <div class="ability-track"><span class="ability-fill" style="width: ${Math.max(3, Math.min(100, row.value)).toFixed(1)}%"></span></div>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

function normalPercent(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return numeric <= 1 ? numeric * 100 : numeric;
}

function formatPercent(value) {
  const percent = normalPercent(value);
  return `${percent.toFixed(1)}%`;
}

function renderRecords(user) {
  if (isObserver(user)) return noAccess();
  const admin = isAdmin(user);
  const season = selectedTrainingSeason();
  const visibleRecords = trainingRecordsForSeason(user, season);
  return `
    <div class="section">
      ${renderSeasonWorkspaceHeader(admin, season)}
      <div class="training-action-row">
        ${renderManualRecordPanel(user, season)}
        ${admin && season ? renderTrainingAutoFill(season) : ""}
      </div>
      <div class="panel">
        <div class="panel-head"><h3>${season ? `${season.name} · 赛训记录` : (admin ? t("allRecords") : t("myRecords"))}</h3><span class="chip">${visibleRecords.length} 条</span></div>
        <div class="panel-body table-wrap">${renderRecordsTable(visibleRecords, true, user)}</div>
      </div>
    </div>
  `;
}

function selectedTrainingSeason() {
  if (!tabs.trainingSeason) tabs.trainingSeason = getCurrentSeason()?.id || data.seasons[0]?.id || "";
  return data.seasons.find((season) => season.id === tabs.trainingSeason) || getCurrentSeason() || data.seasons[0] || null;
}

function trainingRecordsForSeason(user, season) {
  const records = isAdmin(user) ? trainingStatRecords() : userTrainingRecords(user.identityCode);
  if (!season) return records;
  return records.filter((record) => {
    const inSeason = record.seasonId === season.id || (dateValue(season.start) <= dateValue(record.date) && dateValue(record.date) <= dateValue(season.end));
    return inSeason;
  });
}

function renderSeasonWorkspaceHeader(admin, season) {
  const buttons = data.seasons.map((item) => `
    <button class="season-choice ${season?.id === item.id ? "active" : ""}" data-action="pick-training-season" data-id="${escapeHtml(item.id)}" type="button">
      <strong>${escapeHtml(item.name)}</strong>
      <span>${escapeHtml(item.shortName)} · ${escapeHtml(item.start)} 至 ${escapeHtml(item.end)}</span>
    </button>
  `).join("");
  return `
    <div class="panel">
      <div class="panel-head">
        <div>
          <h3>赛季训练工作台</h3>
          <div class="date-line">选择赛季后，只查看和填报该赛季范围内的赛训记录。对局记录同步不会直接进入这里，需要在赛季内执行自动赛训填报。</div>
        </div>
        ${season ? `<span class="chip">${escapeHtml(season.name)}</span>` : ""}
      </div>
      <div class="panel-body">
        <div class="season-choice-grid">${buttons || `<div class="empty">尚未设置赛季。</div>`}</div>
        ${admin ? `
          <div class="season-settings-toggle">
            <button class="ghost" data-action="toggle-season-settings" type="button">${tabs.seasonSettingsOpen ? "收起赛季设置" : "展开赛季设置"}</button>
          </div>
          ${tabs.seasonSettingsOpen ? renderSeasonSettingsPanel(true) : ""}
        ` : ""}
      </div>
    </div>
  `;
}

function renderManualRecordPanel(user, season) {
  return `
    <div class="panel compact-work-panel">
      <div class="panel-head">
        <h3>${season ? `${season.name} · 手动填报` : t("addRecord")}</h3>
        <button class="ghost" data-action="toggle-manual-record" type="button">${tabs.manualRecordOpen ? "收起" : "展开手动填报"}</button>
      </div>
      ${tabs.manualRecordOpen ? `<div class="panel-body">${renderRecordForm(user.identityCode, false)}</div>` : ""}
    </div>
  `;
}

function renderTrainingAutoFill(season) {
  return `
    <div class="panel compact-work-panel">
      <div class="panel-head">
        <h3>${escapeHtml(season.name)} · 自动填报</h3>
        <div class="inline-actions">
          <button class="primary" data-action="quick-promote-training" type="button">同步</button>
          <button class="ghost" data-action="toggle-auto-training" type="button">${tabs.autoTrainingOpen ? "收起" : "展开设置"}</button>
        </div>
      </div>
      ${tabs.autoTrainingOpen ? `<div class="panel-body">
        <form class="form-grid" data-form="promote-training">
          <input type="hidden" name="seasonId" value="${escapeHtml(season.id)}" />
          <div class="grid three">
            <div class="field"><label>开始日期</label><input name="start" type="date" value="${escapeHtml(season.start)}" required /></div>
            <div class="field"><label>结束日期</label><input name="end" type="date" value="${escapeHtml(season.end)}" required /></div>
            <div class="field"><label>最少成员数</label><input name="minMembers" type="number" min="3" step="1" value="3" required /></div>
          </div>
          <button class="primary" type="submit">从本赛季对局记录自动填报赛训</button>
        </form>
      </div>` : ""}
    </div>
  `;
}

function renderRecordForm(targetCode, lockTarget) {
  const user = currentUser();
  const admin = isAdmin(user);
  const options = data.users
    .filter(isTrainingEligible)
    .map((member) => `<option value="${member.identityCode}" ${member.identityCode === targetCode ? "selected" : ""}>${escapeHtml(member.gameId)} · ${escapeHtml(member.name)} · ${escapeHtml(member.identityCode)}</option>`)
    .join("");
  return `
    <form class="form-grid" data-form="record" data-target="${targetCode}">
      <div class="grid two">
        <div class="field">
          <label>${t("memberId")}</label>
          <select name="userIdentityCode" ${admin && !lockTarget ? "" : "disabled"}>${options}</select>
        </div>
        <div class="field"><label>${t("date")}</label><input name="date" type="date" value="${todayText()}" required /></div>
        <div class="field"><label>${t("matchOrder")}</label><input name="matchOrder" type="number" min="1" step="1" value="1" required /></div>
        <div class="field"><label>Rating</label><input name="rating" type="number" min="0" step="0.01" required /></div>
        <div class="field"><label>RWS</label><input name="rws" type="number" min="0" step="0.01" required /></div>
        <div class="field"><label>ADR</label><input name="adr" type="number" min="0" step="0.1" required /></div>
      </div>
      <button class="primary" type="submit">${t("submitRecord")}</button>
    </form>
  `;
}

function renderRecordsTable(records, editable, viewer) {
  if (!records.length) return `<div class="empty">${t("emptyData")}</div>`;
  const visibleIds = records.map((record) => record.id);
  const hasEditableRows = records.some((record) => editable && (isAdmin(viewer) || record.userIdentityCode === viewer.identityCode));
  const selectedVisibleCount = visibleIds.filter((id) => selectedRecordIds.has(id)).length;
  const allSelected = visibleIds.length > 0 && selectedVisibleCount === visibleIds.length;
  const rows = [...records]
    .sort(compareRecordDesc)
    .map((record) => {
      const member = userByCode(record.userIdentityCode) || { gameId: record.userIdentityCode, name: "", role: "" };
      const season = data.seasons.find((item) => item.id === record.seasonId);
      const canEdit = editable && (isAdmin(viewer) || record.userIdentityCode === viewer.identityCode);
      return `
        <tr data-record-row="${record.id}">
          <td>${canEdit ? `<input class="record-checkbox" type="checkbox" data-action="toggle-record-select" data-id="${escapeHtml(record.id)}" ${selectedRecordIds.has(record.id) ? "checked" : ""} />` : ""}</td>
          <td><strong>${escapeHtml(member.gameId)}</strong><br><span class="date-line">${escapeHtml(member.name)} · ${escapeHtml(member.role)}</span></td>
          <td>${canEdit ? recordInput(record, "date", "date", record.date) : escapeHtml(record.date)}${record.trainingIncluded ? `<br><span class="mini-badge">赛训</span>` : ""}</td>
          <td>${canEdit ? recordInput(record, "matchOrder", "number", record.matchOrder, "1") : escapeHtml(record.matchOrder)}</td>
          <td>${canEdit ? recordInput(record, "rating", "number", Number(record.rating).toFixed(2), "0.01") : Number(record.rating).toFixed(2)}</td>
          <td>${canEdit ? recordInput(record, "rws", "number", Number(record.rws).toFixed(2), "0.01") : Number(record.rws).toFixed(2)}</td>
          <td>${canEdit ? recordInput(record, "adr", "number", Number(record.adr).toFixed(1), "0.1") : Number(record.adr).toFixed(1)}</td>
          <td>${season ? escapeHtml(season.name) : "N/A"}</td>
          <td><span class="date-line">${formatDateTime(record.createdAt)}<br>${escapeHtml(record.createdBy)}</span></td>
          <td>${canEdit ? `<div class="inline-actions"><button class="ghost" data-action="save-record" data-id="${record.id}">${t("save")}</button><button class="danger" data-action="delete-record" data-id="${record.id}">${t("delete")}</button></div>` : ""}</td>
        </tr>
      `;
    })
    .join("");
  return `
    ${hasEditableRows ? `<div class="bulk-actions">
      <label class="checkline">
        <input type="checkbox" data-action="toggle-record-select-all" ${allSelected ? "checked" : ""} />
        <span>全选当前列表</span>
      </label>
      <span class="chip">已选择 ${selectedVisibleCount} 条</span>
      <button class="danger" data-action="delete-selected-records" ${selectedVisibleCount ? "" : "disabled"}>删除所选</button>
    </div>` : ""}
    <table>
      <thead><tr><th></th><th>ID / ${t("name")}</th><th>${t("date")}</th><th>${t("matchOrder")}</th><th>Rating</th><th>RWS</th><th>ADR</th><th>${t("seasons")}</th><th>${t("edit")}</th><th></th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function recordInput(record, field, type, value, step = "") {
  const stepAttr = step ? ` step="${step}"` : "";
  return `<input class="table-input" data-record-field="${field}" data-id="${record.id}" type="${type}" value="${escapeHtml(value)}"${stepAttr} />`;
}

function renderSeasons() {
  return renderSeasonSettingsPanel();
}

function renderSeasonSettingsPanel(compact = false) {
  return `
    <div class="${compact ? "season-settings-inline" : "panel"}">
      <div class="panel-head">
        <h3>新增 / 调整赛季</h3>
        <button class="danger" data-action="restore-initial-training" type="button">恢复初始训练数据</button>
      </div>
      <div class="${compact ? "" : "panel-body"}">
        <form class="form-grid" data-form="season">
          <div class="grid two">
            <div class="field"><label>赛季名称</label><input name="name" required /></div>
            <div class="field"><label>简称</label><input name="shortName" required /></div>
            <div class="field"><label>开始日期</label><input name="start" type="date" required /></div>
            <div class="field"><label>结束日期</label><input name="end" type="date" required /></div>
          </div>
          <button class="primary" type="submit">新增赛季</button>
        </form>
      </div>
    </div>
    <div class="${compact ? "season-settings-inline" : "panel"}">
      <div class="panel-head"><h3>赛季列表</h3></div>
      <div class="${compact ? "table-wrap" : "panel-body table-wrap"}">${renderSeasonTable()}</div>
    </div>
  `;
}

function renderSeasonTable() {
  if (!data.seasons.length) return `<div class="empty">尚未设置赛季。</div>`;
  return `
    <table>
      <thead><tr><th>名称</th><th>简称</th><th>开始</th><th>结束</th><th>操作</th></tr></thead>
      <tbody>
        ${data.seasons
          .map(
            (season) => `
          <tr>
            <td><input data-season-field="name" data-id="${season.id}" value="${escapeHtml(season.name)}" /></td>
            <td><input data-season-field="shortName" data-id="${season.id}" value="${escapeHtml(season.shortName)}" /></td>
            <td><input data-season-field="start" data-id="${season.id}" type="date" value="${escapeHtml(season.start)}" /></td>
            <td><input data-season-field="end" data-id="${season.id}" type="date" value="${escapeHtml(season.end)}" /></td>
            <td class="inline-actions">
              <button class="ghost" data-action="save-season" data-id="${season.id}">${t("save")}</button>
              <button class="danger" data-action="delete-season" data-id="${season.id}">${t("delete")}</button>
            </td>
          </tr>
        `,
          )
          .join("")}
      </tbody>
    </table>
  `;
}

function renderRegister() {
  return `
    <div class="panel">
      <div class="panel-head"><h3>${t("register")}</h3><span class="chip">${t("defaultPassword")}</span></div>
      <div class="panel-body">${renderRegisterForm()}</div>
    </div>
  `;
}

function renderRegisterForm() {
  return `
    <form class="form-grid" data-form="register">
      <div class="grid two">
        <div class="field"><label>${t("identityCode")}</label><input name="identityCode" placeholder="注册后不可更改" required /></div>
        <div class="field"><label>ID</label><input name="gameId" required /></div>
        <div class="field"><label>${t("name")}</label><input name="name" required /></div>
        <div class="field"><label>${t("role")}</label>${roleSelect()}</div>
      </div>
      <button class="primary" type="submit">${t("register")}</button>
    </form>
  `;
}

function roleSelect(value = "一般运动员") {
  const roles = ["总教练", "常务副总教练", "特级运动员", "一般运动员", "特邀运动员", "观察员"];
  return `<select name="role">${roles.map((role) => `<option value="${role}" ${role === value ? "selected" : ""}>${role}</option>`).join("")}</select>`;
}

function renderUsers(user) {
  const admin = isAdmin(user);
  const selectedCode = admin ? tabs.manageUser : user.identityCode;
  const member = userByCode(selectedCode) || user;
  return `
    <div class="section">
      ${admin ? renderMemberPicker("manageUser", selectedCode) : ""}
      ${admin ? renderRegisterModule() : ""}
      ${admin ? renderFiveEAdminPanel() : ""}
      <div class="panel">
        <div class="panel-head"><h3>${t("profile")}</h3><span class="chip">${t("code")} ${escapeHtml(member.identityCode)}</span></div>
        <div class="panel-body">
          <form class="form-grid" data-form="profile" data-code="${member.identityCode}">
            <div class="user-card wide">
              ${avatarMarkup(member)}
              <div><span class="identity">${escapeHtml(member.gameId)}</span><div class="meta">${escapeHtml(member.name)} · ${escapeHtml(member.role)}</div>${renderMemberMedals(member.identityCode, false, 1)}</div>
            </div>
            <div class="grid two">
              <div class="field"><label>上传头像</label><input name="avatar" type="file" accept="image/*" /></div>
              <div class="field"><label>新密码</label><input name="password" type="password" placeholder="留空则不修改" /></div>
              <div class="field"><label>${t("name")}</label><input name="name" value="${escapeHtml(member.name)}" ${admin ? "" : "disabled"} /></div>
              <div class="field"><label>ID</label><input name="gameId" value="${escapeHtml(member.gameId)}" ${admin ? "" : "disabled"} /></div>
              <div class="field"><label>5E 个人主页链接</label><input name="fiveEProfileUrl" value="${escapeHtml(member.fiveEProfileUrl || member.fiveEDomain || "")}" placeholder="粘贴 5E 分享主页完整链接" /></div>
              <div class="field"><label>${t("role")}</label>${admin ? roleSelect(member.role) : `<input value="${escapeHtml(member.role)}" disabled />`}</div>
              <div class="field"><label>${t("identityCode")}</label><input value="${escapeHtml(member.identityCode)}" disabled /></div>
            </div>
            <button class="primary" type="submit">${t("save")}</button>
          </form>
        </div>
      </div>
    </div>
  `;
}

function renderRegisterModule() {
  return `
    <div class="panel">
      <div class="panel-head"><h3>新成员注册</h3><span class="chip">${t("defaultPassword")}</span></div>
      <div class="panel-body">${renderRegisterForm()}</div>
    </div>
  `;
}

function renderFiveEAdminPanel() {
  const rows = data.users
    .map((member) => {
      const value = member.fiveEProfileUrl || member.fiveEDomain || "";
      const profile = parse5eProfile(value);
      const aliases = Array.isArray(member.fiveEAliases) ? member.fiveEAliases.join(", ") : (member.fiveEAliases || "");
      return `
        <tr>
          <td>
            <strong>${escapeHtml(member.gameId)}</strong><br>
            <span class="date-line">${escapeHtml(member.name)} · ${escapeHtml(member.role)} · ${escapeHtml(member.identityCode)}</span>
          </td>
          <td>
            <form class="fivee-admin-form" data-form="fivee-link" data-code="${escapeHtml(member.identityCode)}">
              <input name="fiveEProfileUrl" value="${escapeHtml(value)}" placeholder="粘贴 5E 个人主页完整链接" />
              <input name="fiveEAliases" value="${escapeHtml(aliases)}" placeholder="5E 昵称别名，多个用逗号分隔" />
              <button class="ghost" type="submit">${t("save")}</button>
            </form>
          </td>
          <td>${profile.domain ? `<span class="mini-badge">${escapeHtml(profile.domain)}</span>` : `<span class="date-line">未绑定</span>`}</td>
          <td>${member.fiveELastSyncAt ? `<span class="date-line">${formatDateTime(member.fiveELastSyncAt)}</span>` : `<span class="date-line">未同步</span>`}</td>
        </tr>
      `;
    })
    .join("");
  return `
    <div class="panel">
      <div class="panel-head">
        <div>
          <h3>5E 链接后台</h3>
          <div class="date-line">管理员可统一维护所有成员的 5E 个人主页链接，对局记录同步会自动读取这里的链接。</div>
        </div>
        <div class="inline-actions">
          <span class="chip">${data.users.length} 名成员</span>
          <button class="ghost" data-action="toggle-fivee-admin" type="button">${tabs.fiveEAdminOpen ? "收起" : "展开"}</button>
        </div>
      </div>
      ${tabs.fiveEAdminOpen ? `<div class="panel-body table-wrap">
        <table>
          <thead><tr><th>成员</th><th>5E 主页 / 昵称别名</th><th>Domain</th><th>最近同步</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>` : ""}
    </div>
  `;
}

function renderMemberPicker(tabKey, selectedCode) {
  return `
    <div class="panel">
      <div class="panel-body">
        <div class="field">
          <label>选择成员</label>
          <select data-action="pick-member" data-tab-key="${tabKey}">
            ${data.users.map((member) => `<option value="${member.identityCode}" ${member.identityCode === selectedCode ? "selected" : ""}>${escapeHtml(member.gameId)} · ${escapeHtml(member.name)} · ${escapeHtml(member.role)} · ${escapeHtml(member.identityCode)}</option>`).join("")}
          </select>
        </div>
      </div>
    </div>
  `;
}

function renderMedals(user) {
  const admin = isAdmin(user);
  const selectedCode = admin ? tabs.medalUser : user.identityCode;
  const member = userByCode(selectedCode) || user;
  return `
    <div class="section">
      ${admin ? renderMemberPicker("medalUser", selectedCode) : ""}
      <div class="panel">
        <div class="panel-head"><h3>${escapeHtml(member.gameId)} · ${t("medals")}</h3><span class="chip">${escapeHtml(member.name)} · ${escapeHtml(member.role)}</span></div>
        <div class="panel-body">${renderMemberMedals(member.identityCode, admin, 100)}</div>
      </div>
      ${
        admin
          ? `<div class="panel">
              <div class="panel-head"><h3>${t("grantMedal")}</h3></div>
              <div class="panel-body">
                <form class="form-grid" data-form="medal" data-code="${member.identityCode}">
                  <div class="grid two">
                    <div class="field"><label>勋章文字</label><input name="text" required /></div>
                    <div class="field"><label>等级</label><select name="level"><option value="gold">金</option><option value="silver">银</option><option value="bronze">铜</option></select></div>
                  </div>
                  <button class="primary" type="submit">${t("grantMedal")}</button>
                </form>
              </div>
            </div>`
          : ""
      }
    </div>
  `;
}

function renderMemberMedals(code, admin, limit) {
  const viewer = currentUser();
  const canReorder = admin || viewer?.identityCode === code;
  const medals = data.medals
    .filter((medal) => medal.userIdentityCode === code)
    .sort((a, b) => Number(a.memberOrder ?? a.order ?? 9999) - Number(b.memberOrder ?? b.order ?? 9999) || String(a.createdAt || "").localeCompare(String(b.createdAt || "")))
    .slice(0, limit);
  if (!medals.length) return `<span class="chip medal-empty">${t("noMedal")}</span>`;
  return `<div class="medal-list" data-medal-owner="${escapeHtml(code)}">${medals.map((medal) => renderMedal(medal, admin, canReorder)).join("")}</div>`;
}

function renderMedal(medal, admin, canReorder = false) {
  return `
    <span class="medal ${escapeHtml(medal.level)}" ${canReorder ? `draggable="true" data-drag-medal="${escapeHtml(medal.id)}"` : ""}>
      ${escapeHtml(medal.text)}
      ${admin ? `<button class="medal-delete" data-action="delete-medal" data-id="${medal.id}" title="${t("delete")}">×</button>` : ""}
    </span>
  `;
}

function renderAnnouncements(user) {
  const admin = isAdmin(user);
  return `
    <div class="section">
      <div class="panel">
        <div class="panel-head"><h3>${t("announcements")}</h3><span class="chip">${data.announcements.length} 条</span></div>
        <div class="panel-body">${renderAnnouncementList(admin, user)}</div>
      </div>
      ${
        admin
          ? `<div class="panel">
              <div class="panel-head"><h3>${t("publish")}</h3></div>
              <div class="panel-body">
                <form class="form-grid" data-form="announcement">
                  <div class="field"><label>标题</label><input name="title" required /></div>
                  <div class="field"><label>正文</label><textarea name="body" required></textarea></div>
                  <button class="primary" type="submit">${t("publish")}</button>
                </form>
              </div>
            </div>`
          : ""
      }
    </div>
  `;
}

function renderNetwork(user) {
  const admin = isAdmin(user);
  const cards = (data.networkLinks || []).length
    ? data.networkLinks.map((link) => `
        <article class="network-card">
          <a href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer">
            <span class="network-icon">${link.icon ? `<img src="${escapeHtml(link.icon)}" alt="" />` : navIcon("network")}</span>
            <strong>${escapeHtml(link.name)}</strong>
            <span>${escapeHtml(link.url)}</span>
          </a>
          ${admin ? `<button class="danger" data-action="delete-network-link" data-id="${escapeHtml(link.id)}">删除</button>` : ""}
        </article>
      `).join("")
    : `<div class="empty">暂无网络矩阵链接。</div>`;
  return `
    <div class="section">
      <div class="panel">
        <div class="panel-head"><h3>网络矩阵</h3><span class="chip">${(data.networkLinks || []).length} 个链接</span></div>
        <div class="panel-body network-grid">${cards}</div>
      </div>
      ${admin ? `
        <div class="panel">
          <div class="panel-head"><h3>添加链接卡片</h3></div>
          <div class="panel-body">
            <form class="form-grid" data-form="network-link">
              <div class="grid three">
                <div class="field"><label>链接名称</label><input name="name" required /></div>
                <div class="field"><label>链接地址</label><input name="url" type="url" placeholder="https://..." required /></div>
                <div class="field"><label>图标图片</label><input name="icon" type="file" accept="image/*" /></div>
              </div>
              <button class="primary" type="submit">添加链接</button>
            </form>
          </div>
        </div>
      ` : ""}
    </div>
  `;
}

function renderAnnouncementList(admin, viewer = currentUser()) {
  if (!data.announcements.length) return `<div class="empty">${t("emptyData")}</div>`;
  return data.announcements
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((item) => {
      const author = userByCode(item.createdBy);
      const readBy = item.readBy || [];
      const isRead = viewer ? readBy.includes(viewer.identityCode) : false;
      const unreadUsers = data.users.filter((user) => !readBy.includes(user.identityCode));
      return `
        <article class="announcement">
          <div class="panel-head" style="padding:0 0 8px;border:0">
            <div>
              <h4>${escapeHtml(item.title)}</h4>
              <div class="date-line">${formatDateTime(item.createdAt)} · ${author ? escapeHtml(author.gameId) : escapeHtml(item.createdBy)}</div>
            </div>
            ${admin ? `<button class="danger" data-action="delete-announcement" data-id="${item.id}">${t("delete")}</button>` : ""}
          </div>
          <p>${escapeHtml(item.body).replaceAll("\n", "<br>")}</p>
          <label class="checkline announcement-read">
            <input type="checkbox" data-action="toggle-announcement-read" data-id="${escapeHtml(item.id)}" ${isRead ? "checked" : ""} />
            <span>已读</span>
          </label>
          ${admin ? `<div class="announcement-unread"><strong>未读名单：</strong>${unreadUsers.length ? unreadUsers.map((user) => `<span class="mini-badge">${escapeHtml(user.gameId)}</span>`).join("") : `<span class="date-line">全部已读</span>`}</div>` : ""}
        </article>
      `;
    })
    .join("");
}

document.addEventListener("submit", async (event) => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) return;
  event.preventDefault();
  const name = form.dataset.form;
  if (name === "login") await handleLogin(form);
  if (name === "record") await handleRecord(form);
  if (name === "promote-training") await promoteTraining(form);
  if (name === "season") await handleSeason(form);
  if (name === "register") await handleRegister(form);
  if (name === "profile") await handleProfile(form);
  if (name === "fivee-link") await handleFiveELink(form);
  if (name === "medal") await handleMedal(form);
  if (name === "announcement") await handleAnnouncement(form);
  if (name === "network-link") await handleNetworkLink(form);
});

document.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const action = button.dataset.action;
  if (action === "nav") {
    view = button.dataset.view;
    sidebarOpen = false;
    selectedMatchId = "";
    render();
  }
  if (action === "toggle-nav") {
    sidebarOpen = !sidebarOpen;
    render();
  }
  if (action === "logout") {
    api("/api/logout", { method: "POST" }).catch(() => {});
    session = "";
    authToken = "";
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(TOKEN_KEY);
    render();
  }
  if (action === "toggle-theme") {
    preferences.theme = preferences.theme === "dark" ? "light" : "dark";
    savePreferences();
    render();
  }
  if (action === "toggle-lang") {
    return;
  }
  if (action === "tab") {
    tabs[button.dataset.group] = button.dataset.tab;
    render();
  }
  if (action === "toggle-count-rank") {
    tabs.countRankExpanded = !tabs.countRankExpanded;
    render();
  }
  if (action === "team-group") {
    tabs.teamGroup = button.dataset.group || "active";
    render();
  }
  if (action === "open-member") {
    const member = userByCode(button.dataset.code);
    if (!member || isObserver(member)) return;
    tabs.teamUser = button.dataset.code;
    view = "member";
    selectedMatchId = "";
    render();
  }
  if (action === "back-team") {
    view = "team";
    selectedMatchId = "";
    render();
  }
  if (action === "radar-scope") {
    tabs.radarScope = button.dataset.scope || "history";
    if (tabs.radarScope === "season" && !tabs.radarSeason) tabs.radarSeason = data.seasons[0]?.id || "";
    render();
  }
  if (action === "pick-training-season") {
    tabs.trainingSeason = button.dataset.id;
    selectedRecordIds = new Set();
    render();
  }
  if (action === "toggle-manual-record") {
    tabs.manualRecordOpen = !tabs.manualRecordOpen;
    render();
  }
  if (action === "toggle-auto-training") {
    tabs.autoTrainingOpen = !tabs.autoTrainingOpen;
    render();
  }
  if (action === "toggle-season-settings") {
    tabs.seasonSettingsOpen = !tabs.seasonSettingsOpen;
    render();
  }
  if (action === "toggle-fivee-admin") {
    tabs.fiveEAdminOpen = !tabs.fiveEAdminOpen;
    render();
  }
  if (action === "quick-promote-training") {
    const season = selectedTrainingSeason();
    if (season) await promoteTraining(null, season);
  }
  if (action === "sync-all-matches") await syncAllMatches();
  if (action === "delete-synced-match") await deleteSyncedMatch(button.dataset.id);
  if (action === "delete-selected-matches") await deleteSelectedMatches();
  if (action === "open-match-detail") {
    selectedMatchId = button.dataset.id;
    selectedMatchScope = "full";
    render();
  }
  if (action === "match-detail-scope") {
    selectedMatchScope = button.dataset.scope || "full";
    render();
  }
  if (action === "close-match-detail") {
    if (button.classList.contains("modal-backdrop") && event.target !== button) return;
    selectedMatchId = "";
    selectedMatchScope = "full";
    render();
  }
  if (action === "save-record") await saveRecord(button.dataset.id);
  if (action === "delete-record") await deleteRecord(button.dataset.id);
  if (action === "toggle-record-select") {
    const id = button.dataset.id;
    if (button.checked) selectedRecordIds.add(id);
    else selectedRecordIds.delete(id);
    render();
  }
  if (action === "toggle-announcement-read") {
    toggleAnnouncementRead(button.dataset.id, button.checked);
  }
  if (action === "toggle-record-select-all") {
    const ids = [...document.querySelectorAll("[data-record-row]")].map((row) => row.dataset.recordRow);
    if (button.checked) ids.forEach((id) => selectedRecordIds.add(id));
    else ids.forEach((id) => selectedRecordIds.delete(id));
    render();
  }
  if (action === "delete-selected-records") await deleteSelectedRecords();
  if (action === "save-season") await saveSeason(button.dataset.id);
  if (action === "delete-season") await deleteSeason(button.dataset.id);
  if (action === "restore-initial-training") await restoreInitialTrainingData();
  if (action === "delete-medal") deleteMedal(button.dataset.id);
  if (action === "delete-announcement") deleteAnnouncement(button.dataset.id);
  if (action === "delete-network-link") deleteNetworkLink(button.dataset.id);
  if (action === "sync-5e") await sync5e(button.dataset.code);
  if (action === "export-data") exportPlatformData();
});

document.addEventListener("change", (event) => {
  const target = event.target;
  if (target.dataset.action === "pick-member") {
    tabs[target.dataset.tabKey] = target.value;
    render();
  }
  if (target.dataset.action === "pick-radar-season") {
    tabs.radarSeason = target.value;
    tabs.radarScope = "season";
    render();
  }
  if (target.dataset.action === "pick-match-member") {
    tabs.matchMember = target.value;
    render();
  }
  if (target.dataset.action === "toggle-match-select") {
    const id = target.dataset.id;
    if (target.checked) selectedMatchIds.add(id);
    else selectedMatchIds.delete(id);
    render();
  }
  if (target.dataset.action === "toggle-match-select-all") {
    const ids = [...document.querySelectorAll("[data-action='toggle-match-select']")].map((input) => input.dataset.id).filter(Boolean);
    if (target.checked) ids.forEach((id) => selectedMatchIds.add(id));
    else ids.forEach((id) => selectedMatchIds.delete(id));
    render();
  }
});

document.addEventListener("dragstart", (event) => {
  const medal = event.target.closest("[data-drag-medal]");
  if (!medal) return;
  event.dataTransfer.setData("text/plain", medal.dataset.dragMedal);
  event.dataTransfer.effectAllowed = "move";
});

document.addEventListener("dragover", (event) => {
  if (event.target.closest("[data-drag-medal]")) event.preventDefault();
});

document.addEventListener("drop", (event) => {
  const target = event.target.closest("[data-drag-medal]");
  if (!target) return;
  event.preventDefault();
  const sourceId = event.dataTransfer.getData("text/plain");
  reorderMedal(sourceId, target.dataset.dragMedal);
});

window.addEventListener("beforeunload", (event) => {
  if (!savingData) return;
  event.preventDefault();
  event.returnValue = "";
});

async function handleLogin(form) {
  const formData = new FormData(form);
  const identityCode = String(formData.get("identityCode")).trim();
  const password = String(formData.get("password"));
  loginBusy = true;
  renderLogin();
  try {
    const body = await api("/api/login", {
      method: "POST",
      body: JSON.stringify({ identityCode, password, initialData: INITIAL_DATA }),
    });
    authToken = body.token;
    session = body.identityCode;
    data = normalizeData(body.state);
  } catch (error) {
    loginBusy = false;
    renderLogin();
    document.querySelector("#login-error").textContent = preferences.lang === "zh" ? "统一身份识别码或密码不正确。" : "Invalid identity code or password.";
    return;
  }
  loginBusy = false;
  tabs.manageUser = session;
  tabs.medalUser = session;
  tabs.teamUser = session;
  localStorage.setItem(SESSION_KEY, session);
  localStorage.setItem(TOKEN_KEY, authToken);
  render();
}

async function handleRecord(form) {
  const formData = new FormData(form);
  const user = currentUser();
  const target = isAdmin(user) && formData.get("userIdentityCode")
    ? String(formData.get("userIdentityCode"))
    : form.dataset.target || user.identityCode;
  if (!isTrainingEligible(userByCode(target))) return alert("观察员不可以填报至训练填报。");
  const date = String(formData.get("date"));
  const season = findSeasonForDate(date);
  data.records.push({
    id: cryptoId(),
    userIdentityCode: target,
    date,
    matchOrder: Number(formData.get("matchOrder")),
    rating: Number(formData.get("rating")),
    rws: Number(formData.get("rws")),
    adr: Number(formData.get("adr")),
    seasonId: season ? season.id : "",
    createdBy: user.identityCode,
    createdAt: new Date().toISOString(),
  });
  await saveData();
  render();
}

async function promoteTraining(form, seasonOverride = null) {
  const formData = form ? new FormData(form) : null;
  const season = seasonOverride || (formData?.get("seasonId") ? data.seasons.find((item) => item.id === String(formData.get("seasonId"))) : selectedTrainingSeason());
  startBusyTask("正在自动填报赛训", [
    `正在检查 ${season?.name || "当前赛季"} 的时间范围。`,
    "OG_Elfie 正在判断这场算不算集体行动。",
    "OG_765 正在数人头：够三个人才算赛训。",
    "OG_WiFi 正在把同场队友串起来。",
    "SilverBullet 正在把重复记录一发带走。",
    "Borchy 正在确认地图和比分没有串台。",
  ]);
  syncStatus = "正在筛选共同 5E 对局并自动匹配赛季...";
  render();
  try {
    const body = await api("/api/promote-training", {
      method: "POST",
      body: JSON.stringify({
        start: String(formData?.get("start") || season?.start || todayText()),
        end: String(formData?.get("end") || season?.end || todayText()),
        seasonId: String(formData?.get("seasonId") || season?.id || ""),
        minMembers: Number(formData?.get("minMembers") || 3),
      }),
    });
    data = normalizeData(body.state);
    syncStatus = "";
    stopBusyTask(false);
    alert(`赛训自动填报完成：找到 ${body.promotedMatches} 场共同对局，标记 ${body.promotedRecords} 条成员记录。`);
  } catch (error) {
    syncStatus = error.message;
    stopBusyTask(false);
    alert(`赛训自动填报失败：${error.message}`);
  }
  render();
}

async function saveRecord(id) {
  const user = currentUser();
  const record = data.records.find((item) => item.id === id);
  if (!record || (!isAdmin(user) && record.userIdentityCode !== user.identityCode)) return;
  const fields = [...document.querySelectorAll(`[data-record-field][data-id="${CSS.escape(id)}"]`)];
  const next = Object.fromEntries(fields.map((input) => [input.dataset.recordField, input.value]));
  record.date = next.date;
  record.matchOrder = Number(next.matchOrder);
  record.rating = Number(next.rating);
  record.rws = Number(next.rws);
  record.adr = Number(next.adr);
  const season = findSeasonForDate(record.date);
  record.seasonId = season ? season.id : "";
  record.updatedBy = user.identityCode;
  record.updatedAt = new Date().toISOString();
  await saveData();
  render();
}

async function deleteRecord(id) {
  const user = currentUser();
  const record = data.records.find((item) => item.id === id);
  if (!record || (!isAdmin(user) && record.userIdentityCode !== user.identityCode)) return;
  data.records = data.records.filter((item) => item.id !== id);
  selectedRecordIds.delete(id);
  await saveData();
  render();
}

async function deleteSelectedRecords() {
  const user = currentUser();
  const selected = [...selectedRecordIds];
  const allowed = new Set(
    data.records
      .filter((record) => selected.includes(record.id) && (isAdmin(user) || record.userIdentityCode === user.identityCode))
      .map((record) => record.id),
  );
  if (!allowed.size) return;
  if (!confirm(`确定删除选中的 ${allowed.size} 条记录吗？`)) return;
  data.records = data.records.filter((record) => !allowed.has(record.id));
  selectedRecordIds = new Set([...selectedRecordIds].filter((id) => !allowed.has(id)));
  await saveData();
  render();
}

async function restoreInitialTrainingData() {
  const user = currentUser();
  if (!isAdmin(user)) return alert("只有管理员可以恢复初始训练数据。");
  if (!confirm("这会删除 2026 年 3 月及之后的训练记录、清空对局记录，并恢复最初两个赛季。成员账号、头像、5E 链接和勋章会保留。确定继续？")) return;
  const cutoff = dateValue("2026-03-01");
  data.seasons = structuredClone(INITIAL_DATA.seasons);
  data.records = structuredClone(IMPORTED_RECORDS).filter((record) => dateValue(record.date) < cutoff);
  data.matchRecords = [];
  selectedRecordIds = new Set();
  tabs.trainingSeason = data.seasons[0]?.id || "";
  tabs.manualRecordOpen = false;
  refreshRecordSeasons();
  await saveData();
  render();
}

async function handleSeason(form) {
  const formData = new FormData(form);
  const start = String(formData.get("start"));
  const end = String(formData.get("end"));
  if (dateValue(start) > dateValue(end)) return alert("赛季开始日期不能晚于结束日期。");
  const season = {
    id: cryptoId(),
    name: String(formData.get("name")).trim(),
    shortName: String(formData.get("shortName")).trim(),
    start,
    end,
  };
  data.seasons.push(season);
  tabs.trainingSeason = season.id;
  refreshRecordSeasons();
  await saveData();
  render();
}

async function saveSeason(id) {
  const season = data.seasons.find((item) => item.id === id);
  if (!season) return;
  const fields = [...document.querySelectorAll(`[data-season-field][data-id="${CSS.escape(id)}"]`)];
  const next = Object.fromEntries(fields.map((input) => [input.dataset.seasonField, input.value.trim()]));
  if (dateValue(next.start) > dateValue(next.end)) return alert("赛季开始日期不能晚于结束日期。");
  Object.assign(season, next);
  refreshRecordSeasons();
  await saveData();
  render();
}

async function deleteSeason(id) {
  if (!confirm("删除赛季后，相关比赛会变为未归属赛季。确定删除？")) return;
  data.seasons = data.seasons.filter((item) => item.id !== id);
  if (tabs.trainingSeason === id) tabs.trainingSeason = getCurrentSeason()?.id || data.seasons[0]?.id || "";
  refreshRecordSeasons();
  await saveData();
  render();
}

function refreshRecordSeasons() {
  data.records = data.records.map((record) => {
    const season = findSeasonForDate(record.date);
    return { ...record, seasonId: season ? season.id : "" };
  });
}

async function handleRegister(form) {
  const formData = new FormData(form);
  const identityCode = String(formData.get("identityCode")).trim();
  if (data.users.some((user) => user.identityCode === identityCode)) return alert("该统一身份识别码已存在。");
  data.users.push({
    identityCode,
    name: String(formData.get("name")).trim(),
    gameId: String(formData.get("gameId")).trim(),
    role: String(formData.get("role")),
    password: "0000",
    avatar: "",
    fiveEProfileUrl: "",
    fiveEDomain: "",
    fiveEAliases: [],
  });
  await saveData();
  view = "users";
  tabs.manageUser = identityCode;
  tabs.medalUser = identityCode;
  tabs.teamUser = identityCode;
  render();
}

async function handleProfile(form) {
  const code = form.dataset.code;
  const user = currentUser();
  const member = userByCode(code);
  if (!member || (!isAdmin(user) && member.identityCode !== user.identityCode)) return;
  const formData = new FormData(form);
  const password = String(formData.get("password") || "");
  if (password) member.password = password;
  if (isAdmin(user)) {
    member.name = String(formData.get("name")).trim();
    member.gameId = String(formData.get("gameId")).trim();
    member.role = String(formData.get("role"));
  }
  member.fiveEProfileUrl = String(formData.get("fiveEProfileUrl") || "").trim();
  const file = formData.get("avatar");
  if (file && file.size) member.avatar = await fileToDataUrl(file);
  await saveData();
  render();
}

async function handleFiveELink(form) {
  const user = currentUser();
  if (!isAdmin(user)) return alert("只有管理员可以维护全员 5E 链接。");
  const member = userByCode(form.dataset.code);
  if (!member) return alert("找不到该成员。");
  const formData = new FormData(form);
  const raw = String(formData.get("fiveEProfileUrl") || "").trim();
  const aliases = String(formData.get("fiveEAliases") || "")
    .split(/[,，\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
  const profile = parse5eProfile(raw);
  member.fiveEProfileUrl = raw;
  member.fiveEDomain = profile.domain || raw;
  member.fiveEAliases = aliases;
  if (profile.uuid) member.fiveEUuid = profile.uuid;
  await saveData();
  render();
}

async function sync5e(identityCode) {
  const member = userByCode(identityCode);
  if (!member) return;
  const fiveEProfileUrl = member.fiveEProfileUrl || member.fiveEDomain || "";
  if (!fiveEProfileUrl) {
    alert("请先到用户资料里填写 5E 个人主页链接。");
    view = "users";
    tabs.manageUser = identityCode;
    render();
    return;
  }
  startBusyTask(`正在同步 ${member.gameId}`, [
    `${member.gameId} 的 5E 战绩正在路上。`,
    "正在找最近战绩，别让 Rating 偷跑。",
    "ADR 正在排队，RWS 正在补票。",
    "Swing Score 正在从表格里探头。",
    "头像和昵称正在互相认亲。",
  ]);
  syncStatus = "正在同步 5E 最近战绩...";
  render();
  try {
    const body = await api("/api/sync-5e", {
      method: "POST",
      body: JSON.stringify({ identityCode, profileUrl: fiveEProfileUrl }),
    });
    data = normalizeData(body.state);
    syncStatus = "";
    stopBusyTask(false);
    alert(`5E 最近战绩同步完成：新增 ${body.imported} 场，更新 ${body.updated || 0} 场，扫描 ${body.scanned} 场。`);
  } catch (error) {
    syncStatus = error.message;
    stopBusyTask(false);
    alert(`5E 最近战绩同步失败：${error.message}`);
  }
  render();
}

async function syncAllMatches() {
  startBusyTask("正在同步全员对局", SYNC_BUSY_LINES);
  syncStatus = "正在遍历所有已绑定成员并同步 5E 对局...";
  render();
  try {
    const body = await api("/api/sync-matches", {
      method: "POST",
      body: JSON.stringify({ maxPages: 100 }),
    });
    data = normalizeData(body.state);
    syncStatus = "";
    stopBusyTask(false);
    const failureText = (body.listFailures || body.detailFailures)
      ? `，列表失败 ${body.listFailures || 0} 项，详情失败 ${body.detailFailures || 0} 场`
      : "";
    alert(`对局同步完成：种子成员 ${body.seedMembers} 人，最多扫描 ${body.scannedPages || 1} 页，发现 ${body.scannedMatches} 场，新增 ${body.created} 场，更新 ${body.updated} 场；arena 访问 ${body.arenaVisited || 0} 场，WAF ${body.arenaBlocked || 0} 场，arena 直接解析 ${body.arenaParsed || 0} 场${failureText}。`);
  } catch (error) {
    syncStatus = error.message;
    stopBusyTask(false);
    alert(`对局同步失败：${error.message}`);
  }
  render();
}

async function deleteSyncedMatch(id) {
  const user = currentUser();
  if (!isAdmin(user)) return alert("只有拥有全体管理权限的用户可以删除已同步对局。");
  const match = (data.matchRecords || []).find((item) => item.id === id || item.matchId === id);
  if (!match) return alert("没有找到要删除的对局。");
  const label = `${match.mapName || match.map || "5E 对局"} · ${match.date || ""} · ${match.matchId || ""}`;
  if (!confirm(`确定删除这场已同步对局吗？\n${label}\n\n该操作会同时删除这场对局生成的 5E 同步记录，并从统计中移除。`)) return;
  syncStatus = "正在删除已同步对局...";
  render();
  try {
    const body = await api("/api/delete-match", {
      method: "POST",
      body: JSON.stringify({ matchId: match.matchId || "", id: match.id || "" }),
    });
    data = normalizeData(body.state);
    if (selectedMatchId === id || selectedMatchId === match.id || selectedMatchId === match.matchId) {
      selectedMatchId = "";
      selectedMatchScope = "full";
    }
    selectedMatchIds.delete(match.id || match.matchId);
    syncStatus = `已删除 ${body.removedMatches || 1} 场对局，清理 ${body.removedRecords || 0} 条同步记录`;
  } catch (error) {
    syncStatus = error.message;
    alert(`删除对局失败：${error.message}`);
  }
  render();
}

async function deleteSelectedMatches() {
  const user = currentUser();
  if (!isAdmin(user)) return alert("只有拥有全体管理权限的用户可以批量删除已同步对局。");
  const ids = [...selectedMatchIds].filter(Boolean);
  if (!ids.length) return alert("请先选择要删除的对局。");
  if (!confirm(`确定批量删除已选的 ${ids.length} 场已同步对局吗？\n\n该操作会同时删除这些对局生成的 5E 同步记录，并从统计中移除。`)) return;
  syncStatus = "正在批量删除已同步对局...";
  render();
  try {
    const body = await api("/api/delete-match", {
      method: "POST",
      body: JSON.stringify({ ids }),
    });
    data = normalizeData(body.state);
    selectedMatchIds = new Set();
    if (selectedMatchId && !(data.matchRecords || []).some((match) => match.id === selectedMatchId || match.matchId === selectedMatchId)) {
      selectedMatchId = "";
      selectedMatchScope = "full";
    }
    syncStatus = `已删除 ${body.removedMatches || ids.length} 场对局，清理 ${body.removedRecords || 0} 条同步记录`;
  } catch (error) {
    syncStatus = error.message;
    alert(`批量删除对局失败：${error.message}`);
  }
  render();
}
function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function handleMedal(form) {
  const formData = new FormData(form);
  const ownerMedals = data.medals.filter((item) => item.userIdentityCode === form.dataset.code);
  data.medals.push({
    id: cryptoId(),
    userIdentityCode: form.dataset.code,
    text: String(formData.get("text")).trim(),
    level: String(formData.get("level")),
    order: data.medals.length + 1,
    memberOrder: ownerMedals.length + 1,
    createdAt: new Date().toISOString(),
    createdBy: currentUser().identityCode,
  });
  await saveData();
  render();
}

function deleteMedal(id) {
  data.medals = data.medals.filter((item) => item.id !== id);
  saveData();
  render();
}

function reorderMedal(sourceId, targetId) {
  if (!sourceId || !targetId || sourceId === targetId) return;
  const source = data.medals.find((item) => item.id === sourceId);
  const target = data.medals.find((item) => item.id === targetId);
  const user = currentUser();
  if (!source || !target || source.userIdentityCode !== target.userIdentityCode) return;
  if (!isAdmin(user) && source.userIdentityCode !== user?.identityCode) return;
  const owner = source.userIdentityCode;
  const ordered = data.medals
    .filter((item) => item.userIdentityCode === owner)
    .sort((a, b) => Number(a.memberOrder ?? a.order ?? 9999) - Number(b.memberOrder ?? b.order ?? 9999));
  const sourceIndex = ordered.findIndex((item) => item.id === sourceId);
  const targetIndex = ordered.findIndex((item) => item.id === targetId);
  if (sourceIndex < 0 || targetIndex < 0) return;
  const [moved] = ordered.splice(sourceIndex, 1);
  ordered.splice(targetIndex, 0, moved);
  ordered.forEach((medal, index) => {
    medal.memberOrder = index + 1;
    medal.order = index + 1;
  });
  saveData();
  render();
}

async function handleAnnouncement(form) {
  const formData = new FormData(form);
  data.announcements.push({
    id: cryptoId(),
    title: String(formData.get("title")).trim(),
    body: String(formData.get("body")).trim(),
    createdAt: new Date().toISOString(),
    createdBy: currentUser().identityCode,
    readBy: [],
  });
  await saveData();
  render();
}

function deleteAnnouncement(id) {
  data.announcements = data.announcements.filter((item) => item.id !== id);
  saveData();
  render();
}

function toggleAnnouncementRead(id, checked) {
  const user = currentUser();
  const announcement = data.announcements.find((item) => item.id === id);
  if (!user || !announcement) return;
  const readBy = new Set(announcement.readBy || []);
  if (checked) readBy.add(user.identityCode);
  else readBy.delete(user.identityCode);
  announcement.readBy = [...readBy];
  saveData();
  render();
}

async function handleNetworkLink(form) {
  if (!isAdmin()) return alert("只有管理员可以添加网络矩阵链接。");
  const formData = new FormData(form);
  const iconFile = formData.get("icon");
  data.networkLinks = data.networkLinks || [];
  data.networkLinks.push({
    id: cryptoId(),
    name: String(formData.get("name")).trim(),
    url: String(formData.get("url")).trim(),
    icon: iconFile && iconFile.size ? await fileToDataUrl(iconFile) : "",
    createdAt: new Date().toISOString(),
    createdBy: currentUser().identityCode,
  });
  saveData();
  render();
}

function deleteNetworkLink(id) {
  if (!isAdmin()) return alert("只有管理员可以删除网络矩阵链接。");
  data.networkLinks = (data.networkLinks || []).filter((item) => item.id !== id);
  saveData();
  render();
}

function exportPlatformData() {
  const sheets = [
    {
      name: "Users",
      rows: [
        ["统一身份识别码", "姓名", "ID", "身份组", "密码", "头像", "5E主页", "5E Domain", "5E UUID", "5E别名", "最近5E同步"],
        ...data.users.map((user) => [user.identityCode, user.name, user.gameId, user.role, user.password || "", user.avatar || "", user.fiveEProfileUrl || "", user.fiveEDomain || "", user.fiveEUuid || "", (user.fiveEAliases || []).join(", "), user.fiveELastSyncAt || ""]),
      ],
    },
    {
      name: "Seasons",
      rows: [
        ["赛季名称", "简称", "开始日期", "结束日期"],
        ...data.seasons.map((season) => [season.name, season.shortName, season.start, season.end]),
      ],
    },
    {
      name: "Records",
      rows: [
        ["记录ID", "统一身份识别码", "ID", "姓名", "日期", "场次序", "Rating", "RWS", "ADR", "KAST", "爆头率", "赛季", "填报人", "填报时间", "修改人", "修改时间", "来源"],
        ...data.records.map((record) => {
          const user = userByCode(record.userIdentityCode) || {};
          const season = data.seasons.find((item) => item.id === record.seasonId) || {};
          return [
            record.id,
            record.userIdentityCode,
            user.gameId || "",
            user.name || "",
            record.date,
            record.matchOrder,
            record.rating,
            record.rws,
            record.adr,
            record.kast ?? "",
            record.headshotRate ?? "",
            season.shortName || "",
            record.createdBy || "",
            record.createdAt || "",
            record.updatedBy || "",
            record.updatedAt || "",
            record.source || "",
          ];
        }),
      ],
    },
    {
      name: "Medals",
      rows: [
        ["勋章ID", "统一身份识别码", "ID", "勋章文字", "等级", "全局顺序", "成员顺序", "授予人", "授予时间"],
        ...data.medals.map((medal) => {
          const user = userByCode(medal.userIdentityCode) || {};
          return [medal.id, medal.userIdentityCode, user.gameId || "", medal.text, medal.level, medal.order || "", medal.memberOrder || "", medal.createdBy || "", medal.createdAt || ""];
        }),
      ],
    },
    {
      name: "Announcements",
      rows: [
        ["公告ID", "标题", "正文", "发布人", "发布时间", "已读识别码", "未读用户名单"],
        ...data.announcements.map((item) => [item.id, item.title, item.body, item.createdBy, item.createdAt, (item.readBy || []).join(", "), data.users.filter((user) => !(item.readBy || []).includes(user.identityCode)).map((user) => user.gameId).join(", ")]),
      ],
    },
    {
      name: "MatchRecords",
      rows: [
        ["记录ID", "MatchID", "日期", "结束时间", "地图", "比分A", "比分B", "比赛名", "赛季", "识别成员", "指纹", "赛训候选", "已确认赛训"],
        ...(data.matchRecords || []).map((match) => [match.id || "", match.matchId || "", match.date || "", match.endTime || "", match.mapName || match.map || "", match.scoreA ?? "", match.scoreB ?? "", match.matchName || "", match.seasonId || "", (match.recognizedMemberCodes || []).join(", "), match.fingerprint || "", match.isTrainingCandidate ? "是" : "否", match.isTrainingConfirmed ? "是" : "否"]),
      ],
    },
    {
      name: "MatchPlayers",
      rows: [
        ["Match记录ID", "MatchID", "玩家昵称", "成员识别码", "阵营", "K", "D", "A", "ADR", "KAST", "RWS", "Rating", "SwingScore", "Domain", "UUID"],
        ...(data.matchRecords || []).flatMap((match) => (match.players || []).map((player) => [match.id || "", match.matchId || "", player.nickname || player.name || "", player.memberCode || "", player.team || "", player.kill ?? "", player.death ?? "", player.assist ?? "", player.adr ?? "", player.kast ?? "", player.rws ?? "", player.rating ?? "", player.swingScore ?? "", player.domain || "", player.uuid || ""])),
      ],
    },
    {
      name: "NetworkLinks",
      rows: [
        ["链接ID", "名称", "地址", "图标", "创建人", "创建时间"],
        ...(data.networkLinks || []).map((link) => [link.id, link.name, link.url, link.icon || "", link.createdBy || "", link.createdAt || ""]),
      ],
    },
    {
      name: "FullJSON",
      rows: [["完整平台数据JSON"], [JSON.stringify(data)]],
    },
  ];
  const blob = buildXlsxBlob(sheets);
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `OG平台数据导出-${todayText()}.xlsx`;
  document.body.appendChild(link);
  link.click();
  URL.revokeObjectURL(link.href);
  link.remove();
}

function buildXlsxBlob(sheets) {
  const worksheetFiles = sheets.map((sheet, index) => [`xl/worksheets/sheet${index + 1}.xml`, worksheetXml(sheet.rows)]);
  const workbookSheets = sheets
    .map((sheet, index) => `<sheet name="${xmlEscape(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`)
    .join("");
  const workbookRels = sheets
    .map((_, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`)
    .join("");
  const overrides = sheets
    .map((_, index) => `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`)
    .join("");
  const files = [
    [
      "[Content_Types].xml",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${overrides}</Types>`,
    ],
    [
      "_rels/.rels",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    ],
    [
      "xl/workbook.xml",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${workbookSheets}</sheets></workbook>`,
    ],
    [
      "xl/_rels/workbook.xml.rels",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${workbookRels}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    ],
    [
      "xl/styles.xml",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="1"><font><sz val="11"/><name val="Microsoft YaHei"/></font></fonts><fills count="1"><fill><patternFill patternType="none"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs></styleSheet>`,
    ],
    ...worksheetFiles,
  ];
  return new Blob([zipStore(files)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

function worksheetXml(rows) {
  const body = rows
    .map((row, rowIndex) => {
      const cells = row.map((value, colIndex) => cellXml(value, `${columnName(colIndex + 1)}${rowIndex + 1}`)).join("");
      return `<row r="${rowIndex + 1}">${cells}</row>`;
    })
    .join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${body}</sheetData></worksheet>`;
}

function cellXml(value, ref) {
  if (typeof value === "number" && Number.isFinite(value)) return `<c r="${ref}"><v>${value}</v></c>`;
  return `<c r="${ref}" t="inlineStr"><is><t>${xmlEscape(value ?? "")}</t></is></c>`;
}

function columnName(index) {
  let name = "";
  while (index > 0) {
    const mod = (index - 1) % 26;
    name = String.fromCharCode(65 + mod) + name;
    index = Math.floor((index - 1) / 26);
  }
  return name;
}

function xmlEscape(value) {
  return String(value)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function zipStore(files) {
  const encoder = new TextEncoder();
  const chunks = [];
  const central = [];
  let offset = 0;
  files.forEach(([name, content]) => {
    const nameBytes = encoder.encode(name);
    const dataBytes = encoder.encode(content);
    const crc = crc32(dataBytes);
    const local = zipHeader(0x04034b50, nameBytes, dataBytes.length, crc, offset);
    chunks.push(local, nameBytes, dataBytes);
    central.push(zipHeader(0x02014b50, nameBytes, dataBytes.length, crc, offset));
    offset += local.length + nameBytes.length + dataBytes.length;
  });
  const centralOffset = offset;
  central.forEach((entry, index) => {
    const nameBytes = encoder.encode(files[index][0]);
    chunks.push(entry, nameBytes);
    offset += entry.length + nameBytes.length;
  });
  const end = new Uint8Array(22);
  const view = new DataView(end.buffer);
  view.setUint32(0, 0x06054b50, true);
  view.setUint16(8, files.length, true);
  view.setUint16(10, files.length, true);
  view.setUint32(12, offset - centralOffset, true);
  view.setUint32(16, centralOffset, true);
  chunks.push(end);
  return new Blob(chunks);
}

function zipHeader(signature, nameBytes, size, crc, localOffset) {
  const isCentral = signature === 0x02014b50;
  const bytes = new Uint8Array(isCentral ? 46 : 30);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, signature, true);
  if (isCentral) view.setUint16(4, 20, true);
  view.setUint16(isCentral ? 6 : 4, 20, true);
  view.setUint16(isCentral ? 10 : 8, 0, true);
  view.setUint16(isCentral ? 12 : 10, 0, true);
  view.setUint32(isCentral ? 16 : 14, crc, true);
  view.setUint32(isCentral ? 20 : 18, size, true);
  view.setUint32(isCentral ? 24 : 22, size, true);
  view.setUint16(isCentral ? 28 : 26, nameBytes.length, true);
  if (isCentral) view.setUint32(42, localOffset, true);
  return bytes;
}

function crc32(bytes) {
  let crc = -1;
  for (const byte of bytes) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ byte) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

const CRC_TABLE = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});

function resetLocalData() {
  if (!confirm("这会清空云端共享数据，并恢复初始成员表和导入数据。确定继续？")) return;
  data = structuredClone(INITIAL_DATA);
  session = "";
  saveData();
  localStorage.removeItem(SESSION_KEY);
  render();
}

async function boot() {
  await loadCloudData();
  booting = false;
  render();
}

render();
boot();
