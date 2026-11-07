# itch.io 自动更新设置

itch.io 会拦截来自 GitHub 服务器的网页请求，所以每日自动更新需要用 itch.io **官方 API** 读取你的游戏列表。设置只要两步：

## 1. 生成 API 密钥

登录 itch.io → 右上角头像 → **Settings** → 左侧 **API keys**（<https://itch.io/user/settings/api-keys>）→ **Generate new API key**，复制生成的密钥。

密钥能读取你账号下的游戏信息（包括销售数据），**不要写进代码、不要提交到仓库、不要发给别人**。脚本只保存网站需要的字段：标题、简介、链接、封面、平台。

## 2. 存进 GitHub Secrets

仓库页面 → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**：

| Name | Secret |
|---|---|
| `ITCH_API_KEY` | 上一步复制的密钥 |

然后在 **Actions** → **Update profile data** → **Run workflow** 手动运行一次，日志里看到 `[itch] updated` 或 `[itch] unchanged` 就成功了。

## 说明

- 用的是 `https://api.itch.io/profile/games`，只收录**已发布**的游戏，按发布时间从新到旧排列。
- API 不提供游戏类型（Puzzle、Strategy……），会沿用之前数据里的类型；新游戏的类型为空。
- 你参与但不是自己上传的合作游戏（例如 DamJam），API 里没有，会保留之前收录的那一条。
- 本地运行 `node scripts/update-data.mjs` 时可以不设密钥，脚本会改为读取个人主页。
- 密钥失效（被撤销）时，Actions 里会出现黄色警告，游戏列表保持上一次的数据。
