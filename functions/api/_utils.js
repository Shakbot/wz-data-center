const STATE_KEY = "platform";
const CHUNK_SIZE = 180_000;

export function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

export async function ensureSchema(db) {
  await db
    .prepare("CREATE TABLE IF NOT EXISTS app_state (id TEXT PRIMARY KEY, payload TEXT NOT NULL, updated_at TEXT NOT NULL)")
    .run();
  await db
    .prepare("CREATE TABLE IF NOT EXISTS app_state_chunks (state_id TEXT NOT NULL, chunk_index INTEGER NOT NULL, payload TEXT NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY (state_id, chunk_index))")
    .run();
  await db
    .prepare("CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, identity_code TEXT NOT NULL, created_at TEXT NOT NULL)")
    .run();
  await db
    .prepare("CREATE TABLE IF NOT EXISTS match_details (match_id TEXT PRIMARY KEY, payload TEXT NOT NULL, updated_at TEXT NOT NULL)")
    .run();
}

export async function readMatchDetail(db, matchId) {
  const row = await db
    .prepare("SELECT payload FROM match_details WHERE match_id = ?")
    .bind(String(matchId || ""))
    .first();
  return row?.payload ? JSON.parse(row.payload) : null;
}

export async function writeMatchDetail(db, matchId, detail) {
  const updatedAt = new Date().toISOString();
  await db.prepare(`
    INSERT INTO match_details (match_id, payload, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(match_id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at
  `)
    .bind(String(matchId || ""), JSON.stringify(detail), updatedAt)
    .run();
}

export async function deleteMatchDetails(db, matchIds) {
  const ids = [...new Set((matchIds || []).map(String).filter(Boolean))];
  for (let offset = 0; offset < ids.length; offset += 50) {
    const batch = ids.slice(offset, offset + 50);
    const placeholders = batch.map(() => "?").join(",");
    await db.prepare(`DELETE FROM match_details WHERE match_id IN (${placeholders})`).bind(...batch).run();
  }
}

export async function readState(db) {
  const chunks = await db
    .prepare("SELECT payload FROM app_state_chunks WHERE state_id = ? ORDER BY chunk_index")
    .bind(STATE_KEY)
    .all();
  if (chunks.results?.length) {
    return JSON.parse(chunks.results.map((row) => row.payload).join(""));
  }

  const row = await db.prepare("SELECT payload FROM app_state WHERE id = ?").bind(STATE_KEY).first();
  return row ? JSON.parse(row.payload) : null;
}

export async function writeState(db, state) {
  const payload = JSON.stringify(state);
  const updatedAt = new Date().toISOString();
  const chunks = [];
  for (let index = 0; index < payload.length; index += CHUNK_SIZE) {
    chunks.push(payload.slice(index, index + CHUNK_SIZE));
  }

  const statements = [
    db.prepare("DELETE FROM app_state_chunks WHERE state_id = ?").bind(STATE_KEY),
    ...chunks.map((chunk, index) => db
      .prepare("INSERT INTO app_state_chunks (state_id, chunk_index, payload, updated_at) VALUES (?, ?, ?, ?)")
      .bind(STATE_KEY, index, chunk, updatedAt)),
    db.prepare(`
      INSERT INTO app_state (id, payload, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at
    `)
    .bind(STATE_KEY, JSON.stringify({ chunked: true, chunks: chunks.length }), updatedAt)
  ];

  if (typeof db.batch === "function") {
    await db.batch(statements);
    return;
  }

  for (const statement of statements) {
    await statement.run();
  }
}

export async function userFromRequest(request, db) {
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return null;
  return db.prepare("SELECT identity_code FROM sessions WHERE token = ?").bind(token).first();
}

export function isAdmin(user) {
  if (!user) return false;
  return ["总教练", "常务副总教练", "特级运动员"].includes(user.role) || user.identityCode === "03";
}

export function createToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
