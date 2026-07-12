import { ensureSchema, json } from "./_utils.js";

export async function onRequestPost({ request, env }) {
  try {
    if (!env.DB) return json({ ok: true });
    await ensureSchema(env.DB);
    const header = request.headers.get("authorization") || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    if (token) await env.DB.prepare("DELETE FROM sessions WHERE token = ?").bind(token).run();
    return json({ ok: true });
  } catch (error) {
    return json({ error: error.message || String(error) }, 500);
  }
}
