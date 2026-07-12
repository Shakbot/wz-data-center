import { ensureSchema, isAdmin, json, readState, userFromRequest, writeState } from "./_utils.js";

export async function onRequestGet({ request, env }) {
  try {
    if (!env.DB) return json({ error: "D1 数据库没有绑定到 DB。" }, 500);
    await ensureSchema(env.DB);

    const session = await userFromRequest(request, env.DB);
    if (!session) return json({ error: "请重新登录。" }, 401);

    const state = await readState(env.DB);
    if (!state) return json({ error: "数据库还没有初始化，请先登录一次。" }, 404);
    return json({ state, identityCode: session.identity_code });
  } catch (error) {
    return json({ error: error.message || String(error) }, 500);
  }
}

export async function onRequestPut({ request, env }) {
  try {
    if (!env.DB) return json({ error: "D1 数据库没有绑定到 DB。" }, 500);
    await ensureSchema(env.DB);

    const session = await userFromRequest(request, env.DB);
    if (!session) return json({ error: "请重新登录。" }, 401);

    const state = await readState(env.DB);
    const actor = state?.users?.find((item) => item.identityCode === session.identity_code);
    const body = await request.json().catch(() => ({}));
    if (!body.state) return json({ error: "缺少要保存的数据。" }, 400);

    const nextActor = body.state.users?.find((item) => item.identityCode === session.identity_code);
    if (!isAdmin(actor) && JSON.stringify(nextActor) !== JSON.stringify(actor)) {
      return json({ error: "普通成员不能修改自己的身份或权限信息。" }, 403);
    }

    await writeState(env.DB, body.state);
    return json({ ok: true, state: body.state });
  } catch (error) {
    return json({ error: error.message || String(error) }, 500);
  }
}
