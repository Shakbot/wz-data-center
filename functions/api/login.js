import { createToken, ensureSchema, json, readState, writeState, writeSyncContext } from "./_utils.js";

export async function onRequestPost({ request, env }) {
  try {
    if (!env.DB) return json({ error: "D1 数据库没有绑定到 DB。" }, 500);
    await ensureSchema(env.DB);

    const body = await request.json().catch(() => ({}));
    const identityCode = String(body.identityCode || "").trim();
    const password = String(body.password || "");
    let state = await readState(env.DB);

    if (!state && body.initialData) {
      state = body.initialData;
      await writeSyncContext(env.DB, state);
      await writeState(env.DB, state);
    }

    const user = state?.users?.find((item) => item.identityCode === identityCode);
    if (!user || user.password !== password) {
      return json({ error: "统一身份识别码或密码不正确。" }, 401);
    }

    const token = createToken();
    await env.DB
      .prepare("INSERT INTO sessions (token, identity_code, created_at) VALUES (?, ?, ?)")
      .bind(token, user.identityCode, new Date().toISOString())
      .run();

    return json({ token, identityCode: user.identityCode, state });
  } catch (error) {
    return json({ error: error.message || String(error) }, 500);
  }
}
