import { ensureSchema, json, readMatchDetail, userFromRequest } from "./_utils.js";

export async function onRequestGet({ request, env }) {
  try {
    if (!env.DB) return json({ error: "D1 数据库没有绑定到 DB。" }, 500);
    await ensureSchema(env.DB);
    const session = await userFromRequest(request, env.DB);
    if (!session) return json({ error: "请重新登录。" }, 401);

    const matchId = new URL(request.url).searchParams.get("matchId") || "";
    if (!matchId) return json({ error: "缺少 matchID。" }, 400);
    const detail = await readMatchDetail(env.DB, matchId);
    if (!detail) return json({ error: "该场对局尚未同步详细数据。" }, 404);
    return json({ ok: true, matchId, detail, syncVersion: "8.4" });
  } catch (error) {
    return json({ error: error.message || String(error), syncVersion: "8.4" }, 500);
  }
}
