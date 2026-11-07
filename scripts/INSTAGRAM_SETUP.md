# Instagram 自动更新设置

配置完成后，GitHub Action 每天会读取你最新的 12 条 Instagram 帖子和主页数据（帖子数、粉丝数、关注数、头像），把图片下载到 `res/img/instagram/`，并写入 `data/instagram.json`。桌面上的 Instagram 窗口会自动显示新照片。

没有配置时一切照旧：窗口显示 `src/js/instagram.js` 里的内置照片。

> Meta 后台的菜单名称偶尔会调整，下面写的是目前的叫法；找不到时按意思找相近的入口即可。

## 1. 把 Instagram 账号切换成专业账号

Meta 只允许通过官方接口读取**专业账号**（创作者或商家）的帖子，个人账号用的旧接口已在 2024 年底停用。切换免费，随时可以切回。

Instagram App → 个人主页右上角 ☰ → **设置和动态** → **账号类型和工具** → **切换为专业账号** → 选 **创作者**（或商家）。

## 2. 创建 Meta 开发者应用

1. 打开 <https://developers.facebook.com/>，用 Facebook 账号登录并注册为开发者。
2. **我的应用** → **创建应用**。
3. 用例选择 **管理 Instagram 上的消息和内容**（Manage messaging & content on Instagram），应用类型选 **商家**，名称随意（例如 `levy-desktop`）。
4. 应用保持**开发模式**即可，不需要提交审核：它只读取你自己的账号。

## 3. 生成访问令牌

1. 在应用后台左侧找到 **Instagram** → **使用 Instagram 登录设置 API**（API setup with Instagram login）。
2. 在 **生成访问令牌**（Generate access tokens）一步点 **添加账号**，登录你的 Instagram 并授权。只需要 `instagram_business_basic` 这一项权限。
   - 如果提示需要测试人员：在 **应用角色 → 角色** 里把你的 Instagram 账号加为 **Instagram 测试人员**，然后在 Instagram App 的 **设置 → 应用和网站 → 测试人员邀请** 里接受邀请，再回来生成。
3. 复制生成的**长期访问令牌**（有效期 60 天）。

令牌等同于账号的读取权限：**不要写进代码、不要提交到仓库、不要发给别人**，只放在下一步的 GitHub Secrets 里。

## 4. 把令牌存进 GitHub Secrets

仓库页面 → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**：

| Name | Secret |
|---|---|
| `INSTAGRAM_TOKEN` | 上一步复制的令牌 |

## 5.（建议）让令牌自动续期

令牌 60 天过期。脚本每次运行都会换一个新令牌，但要把新令牌写回 Secrets，工作流需要一个有权限的 GitHub 令牌：

1. 打开 <https://github.com/settings/personal-access-tokens/new>（Fine-grained token）。
2. **Repository access** 选 **Only select repositories** → `dodio12138.github.io`。
3. **Permissions → Repository permissions → Secrets** 选 **Read and write**，其他都不用开。
4. 有效期按需选择（到期前记得换新的），生成后复制。
5. 回到第 4 步的页面，再新建一个 Secret：Name 填 `GH_PAT`，值填刚才的令牌。

不设置 `GH_PAT` 也能用，只是每 60 天要回到第 3 步重新生成一次 `INSTAGRAM_TOKEN`。到时 Actions 日志里会提示。

## 6. 运行一次

仓库页面 → **Actions** → **Update profile data** → **Run workflow**。

日志里看到 `[instagram] updated (12 items)` 就成功了，网站会在几分钟后更新。之后每天北京时间 11:17 自动运行。

## 常见问题

- **`[instagram] skipped: INSTAGRAM_TOKEN is not set`**：Secret 名称写错了，必须是 `INSTAGRAM_TOKEN`。
- **`OAuthException` / `Invalid OAuth access token`**：令牌过期或被撤销，回到第 3 步重新生成并更新 Secret。
- **`Unsupported get request` 或权限错误**：账号还不是专业账号，或令牌不是通过"使用 Instagram 登录"生成的。
- 想在本地试运行：`INSTAGRAM_TOKEN=你的令牌 node scripts/update-data.mjs`（令牌会留在终端历史里，用完可以清掉）。
