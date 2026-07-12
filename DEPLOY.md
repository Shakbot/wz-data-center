# Cloudflare Pages + D1 部署说明

这个版本已经从“纯本地数据”改成了“Pages 前端 + Pages Functions 接口 + D1 数据库”。

## 1. 先创建 Pages 项目

```bash
cd WZ-cloud-20260710
npx wrangler login
npx wrangler pages project create wz-data-center
```

生产分支可以填 `main`。

## 2. 创建 D1 数据库

```bash
npx wrangler d1 create wz-data-center-db
```

命令会输出一个 `database_id`。复制它。

## 3. 创建 wrangler.toml

把 `wrangler.example.toml` 复制成 `wrangler.toml`，然后把里面的 `database_id` 换成你刚复制的 ID。

```bash
cp wrangler.example.toml wrangler.toml
```

## 4. 初始化数据库表

```bash
npx wrangler d1 execute wz-data-center-db --remote --file=./schema/schema.sql
```

## 5. 部署

因为这个项目用了 `functions/` 后端接口，不建议用 Cloudflare 网页拖拽上传。请用 Wrangler：

```bash
npx wrangler pages deploy . --project-name=wz-data-center
```

部署成功后会得到一个 `https://你的项目名.pages.dev` 地址。

## 6. 第一次打开

第一次打开网站后，用默认账号登录，例如：

- 识别码：`00`
- 密码：`0000`

第一次成功登录时，系统会把初始成员、赛季、训练记录写入 D1。之后其他人访问同一个网址，就会读写同一份云端数据。

## 7. Cloudflare 后台继续设置

进入 Cloudflare Dashboard：

1. 打开 **Workers & Pages**。
2. 进入你的 Pages 项目 `wz-data-center`。
3. 打开 **Settings**。
4. 找到 **Functions** / **Bindings**。
5. 确认 D1 绑定存在：
   - Variable name: `DB`
   - D1 database: `wz-data-center-db`
6. 如需绑定自己的域名，进入 **Custom domains** 添加域名。

## 注意

这是轻量多人同步版：数据在 D1 里共享，登录通过服务端校验和会话令牌完成。它适合小团队内部使用；如果要公开给大量陌生用户使用，建议继续升级为更严格的权限校验、密码哈希、操作日志和备份机制。
