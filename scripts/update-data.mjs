// 自动更新桌面应用的数据：GitHub 仓库、itch.io 游戏、Bilibili 视频、Instagram 照片，并把新的 GitHub Pages 项目补进 sitemap.xml。
//
// 用法：node scripts/update-data.mjs        （需要 Node 20+，工作流里用 Node 24；无第三方依赖）
// 由 .github/workflows/update-data.yml 每天自动运行；也可以在 Actions 页面手动运行。
//
// 规则：
// - 只有内容变化时才重写 data/*.json（不会因为时间戳产生无意义的提交）
// - 某个来源失败时保留它上一次的数据，其余来源照常更新
// - sitemap.xml 只增不减
// - itch.io 在 GitHub 服务器上需要环境变量 ITCH_API_KEY（见 scripts/ITCH_SETUP.md），本地可不设置
// - Instagram 需要环境变量 INSTAGRAM_TOKEN（存放在 GitHub Secrets，设置方法见 scripts/INSTAGRAM_SETUP.md）；
//   没有配置时跳过，窗口继续显示 instagram.js 里的内置照片

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ACCOUNTS = {
    github: 'dodio12138',
    itch: 'dodio12138',
    bilibili: 12027943
};
const SITE = 'https://dodio12138.github.io';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA_DIR = path.join(ROOT, 'data');
// 如实标明身份；每个来源每天只请求一次，被拒绝时保留旧数据，不做任何绕过
const UA = 'dodio12138.github.io-data-updater (+https://github.com/dodio12138/dodio12138.github.io)';

let failures = 0;
let attempts = 0;

function warn(message) {
    // 在 GitHub Actions 里显示为黄色警告
    console.log(process.env.GITHUB_ACTIONS ? `::warning::${message}` : `WARN ${message}`);
}

function readJson(file, fallback) {
    try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}

// 播放量、星标等每天都会变的数字：只有它们变化时，最多每周写一次，避免每天都产生提交
// pushed（仓库最近推送时间）也算易变：机器人自己的提交每天都会改变本仓库的推送时间
const VOLATILE = new Set(['plays', 'comments', 'stars', 'forks', 'followers', 'following', 'publicRepos', 'pushed', 'updated']);  // Instagram 粉丝数同理
const WEEK = 7 * 24 * 3600 * 1000;

// 比较“结构”时去掉易变字段，并忽略列表顺序（排序依据往往就是易变字段）
function stable(data) {
    const strip = (value) => JSON.stringify(value, (key, v) => (VOLATILE.has(key) ? undefined : v));
    return JSON.stringify({
        ...JSON.parse(strip(data)),
        items: (data.items || []).map(strip).sort()
    });
}

// 内容没变就不写；新视频、新游戏、新仓库等结构变化立即写入
function writeData(name, payload) {
    const file = path.join(DATA_DIR, name + '.json');
    const old = readJson(file, null);
    const full = (data) => JSON.stringify({ ...data, updated: undefined });
    const fresh = old && Date.now() - Date.parse(old.updated) < WEEK;
    if (old && (full(old) === full(payload) || (stable(old) === stable(payload) && fresh))) {
        console.log(`[${name}] unchanged`);
        return;
    }
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(file, JSON.stringify({ updated: new Date().toISOString(), ...payload }, null, 4) + '\n');
    console.log(`[${name}] updated (${payload.items.length} items)`);
}

async function source(name, fetcher) {
    attempts++;
    try {
        const payload = await fetcher();
        if (!payload.items.length) throw new Error('no items returned');
        writeData(name, payload);
        return payload;
    } catch (error) {
        failures++;
        warn(`[${name}] kept previous data: ${error.message}`);
        return readJson(path.join(DATA_DIR, name + '.json'), null);
    }
}

async function getJson(url, headers = {}) {
    const res = await fetch(url, { headers: { 'User-Agent': UA, ...headers } });
    if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
    return res.json();
}

// ---------- GitHub ----------

async function fetchGithub() {
    const headers = { Accept: 'application/vnd.github+json' };
    if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    const user = await getJson(`https://api.github.com/users/${ACCOUNTS.github}`, headers);
    const repos = [];
    for (let page = 1; page <= 10; page++) {
        const batch = await getJson(`https://api.github.com/users/${ACCOUNTS.github}/repos?per_page=100&page=${page}&sort=pushed`, headers);
        repos.push(...batch);
        if (batch.length < 100) break;
    }
    return {
        profile: {
            login: user.login,
            name: user.name || user.login,
            bio: user.bio || '',
            avatar: user.avatar_url,
            url: user.html_url,
            followers: user.followers,
            following: user.following,
            publicRepos: user.public_repos
        },
        items: repos
            .filter((repo) => !repo.fork && !repo.archived)
            .sort((a, b) => b.pushed_at.localeCompare(a.pushed_at))
            .map((repo) => ({
                name: repo.name,
                description: repo.description || '',
                language: repo.language || '',
                stars: repo.stargazers_count,
                forks: repo.forks_count,
                topics: repo.topics || [],
                url: repo.html_url,
                homepage: repo.homepage || (repo.has_pages ? `${SITE}/${repo.name}/` : ''),
                pushed: repo.pushed_at,
                created: repo.created_at
            }))
    };
}

// ---------- itch.io ----------
// 配置了 ITCH_API_KEY 时用官方 API（https://api.itch.io/profile/games），否则解析个人主页。
// itch.io 会拦截来自 GitHub 服务器的主页请求，所以自动更新需要 API 密钥（见 scripts/ITCH_SETUP.md）。

const ITCH_PLATFORMS = { p_windows: 'Windows', p_linux: 'Linux', p_osx: 'macOS', p_android: 'Android' };

// 平台信息可能是列表（文档示例）、对象（{ p_windows: true }）或旧版的 p_windows 等独立字段，三种都兼容
function itchPlatforms(game) {
    const traits = game.traits;
    let keys = [];
    if (Array.isArray(traits)) keys = traits;
    else if (traits && typeof traits === 'object') keys = Object.keys(traits).filter((k) => traits[k]);
    Object.keys(ITCH_PLATFORMS).forEach((k) => { if (game[k] && keys.indexOf(k) === -1) keys.push(k); });
    return Object.keys(ITCH_PLATFORMS).filter((k) => keys.indexOf(k) !== -1).map((k) => ITCH_PLATFORMS[k]);
}

async function fetchItchApi(key) {
    const res = await fetch('https://api.itch.io/profile/games', {
        headers: { 'User-Agent': UA, Authorization: `Bearer ${key}` }
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.errors) {
        const message = json.errors ? [].concat(json.errors).join('; ') : `HTTP ${res.status}`;
        throw new Error(`api.itch.io/profile/games → ${message.split(key).join('***')}`);
    }
    // API 没有“类型”字段：沿用上一次数据里同一游戏的类型
    const previous = readJson(path.join(DATA_DIR, 'itch.json'), { items: [] }).items || [];
    const genreById = new Map(previous.map((g) => [String(g.id), g.genre]));
    const games = (json.games || [])
        .filter((g) => g.published)
        .sort((a, b) => String(b.published_at).localeCompare(String(a.published_at)))
        .map((g) => ({
            id: String(g.id),
            title: g.title,
            url: String(g.url).replace(/^http:/, 'https:'),
            text: g.short_text || '',
            cover: String(g.cover_url || '').replace(/^http:/, 'https:'),
            genre: genreById.get(String(g.id)) || '',
            web: g.type === 'html',
            platforms: itchPlatforms(g)
        }));
    // API 只返回自己上传或可编辑的游戏；之前从主页收录的合作游戏（API 里完全没有的）继续保留
    const known = new Set((json.games || []).map((g) => String(g.id)));
    const extra = previous.filter((g) => !known.has(String(g.id)));
    return { profile: { url: `https://${ACCOUNTS.itch}.itch.io/` }, items: games.concat(extra) };
}

async function fetchItch() {
    if (process.env.ITCH_API_KEY) return fetchItchApi(process.env.ITCH_API_KEY);
    return fetchItchPage();
}

// 解析个人主页的游戏格子（本地运行时可用）

function decodeEntities(text) {
    return text
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x27;/g, "'");
}

async function fetchItchPage() {
    const url = `https://${ACCOUNTS.itch}.itch.io/`;
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
    const html = await res.text();
    // 只按游戏格子切分（class="game_cell ..."），不能匹配到里面的 game_cell_data
    const cells = html.split(/<div class="game_cell(?:\s[^"]*)?"/).slice(1);
    const pick = (cell, re) => { const m = cell.match(re); return m ? decodeEntities(m[1].trim()) : ''; };
    return {
        profile: { url },
        items: cells.map((cell) => ({
            id: pick(cell, /data-game_id="(\d+)"/),
            title: pick(cell, /class="title game_link"[^>]*>([^<]+)</),
            url: pick(cell, /class="title game_link"[^>]*href="([^"]+)"/) || pick(cell, /href="([^"]+)"[^>]*class="title game_link"/),
            text: pick(cell, /class="game_text"[^>]*>([^<]*)</),
            cover: pick(cell, /data-lazy_src="([^"]+)"/),
            genre: pick(cell, /class="game_genre">([^<]+)</),
            web: /class="web_flag"/.test(cell),
            platforms: ['windows8', 'tux', 'apple', 'android'].filter((p) => cell.includes(`icon-${p}`))
                .map((p) => ({ windows8: 'Windows', tux: 'Linux', apple: 'macOS', android: 'Android' })[p])
        })).filter((game) => game.id && game.title && game.url)
    };
}

// ---------- Bilibili（公开的投稿列表接口） ----------

function formatLength(seconds) {
    const m = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return (m < 10 ? '0' + m : m) + ':' + (sec < 10 ? '0' + sec : sec);
}

async function fetchBilibili() {
    const mid = ACCOUNTS.bilibili;
    const videos = [];
    for (let pn = 1; pn <= 20; pn++) {
        const json = await getJson(`https://api.bilibili.com/x/series/recArchivesByKeywords?mid=${mid}&keywords=&ps=30&pn=${pn}`);
        if (json.code !== 0) throw new Error(`code ${json.code} ${json.message}`);
        const list = json.data.archives || [];
        videos.push(...list);
        if (videos.length >= json.data.page.total || !list.length) break;
    }
    return {
        profile: { mid, url: `https://space.bilibili.com/${mid}` },
        items: videos.map((v) => ({
            bvid: v.bvid,
            title: v.title,
            description: v.desc || '',
            cover: String(v.pic).replace(/^http:/, 'https:'),
            length: formatLength(v.duration || 0),
            plays: v.stat ? v.stat.view : 0,
            comments: v.stat ? v.stat.reply : 0,
            created: new Date(v.pubdate * 1000).toISOString(),
            url: `https://www.bilibili.com/video/${v.bvid}/`
        }))
    };
}

// ---------- Instagram（官方 Instagram API，需要令牌） ----------
// 图片链接会过期，所以下载到 res/img/instagram/ig-<id>.jpg；只保留最新 INSTAGRAM_LIMIT 条，旧的下载文件会被删除。

const INSTAGRAM_GRAPH = 'https://graph.instagram.com';
const INSTAGRAM_LIMIT = 12;
const INSTAGRAM_DIR = path.join(ROOT, 'res', 'img', 'instagram');

// 所有请求都经过这里：错误信息里绝不带上令牌
async function instagramGet(pathAndQuery, token) {
    const sep = pathAndQuery.includes('?') ? '&' : '?';
    const res = await fetch(`${INSTAGRAM_GRAPH}${pathAndQuery}${sep}access_token=${encodeURIComponent(token)}`, { headers: { 'User-Agent': UA } });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.error) {
        const message = json.error ? `${json.error.type || 'Error'}: ${json.error.message}` : `HTTP ${res.status}`;
        throw new Error(`${pathAndQuery.split('?')[0]} → ${message.split(token).join('***')}`);
    }
    return json;
}

async function download(url, file) {
    if (fs.existsSync(file)) return;
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!res.ok) throw new Error(`image download → HTTP ${res.status}`);
    fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
}

// 续期：长期令牌有效期 60 天，每次运行都换一个新的；工作流会把它写回 GitHub Secrets（需要 GH_PAT）
async function refreshInstagramToken(token) {
    const out = process.env.INSTAGRAM_TOKEN_FILE;
    if (!out) return;
    try {
        const json = await instagramGet('/refresh_access_token?grant_type=ig_refresh_token', token);
        if (process.env.GITHUB_ACTIONS) console.log(`::add-mask::${json.access_token}`);
        fs.writeFileSync(out, json.access_token);
        console.log(`[instagram] token refreshed, valid for ${Math.round(json.expires_in / 86400)} more days`);
    } catch (error) {
        warn(`[instagram] token refresh failed: ${error.message}`);
    }
}

function firstLine(text, max) {
    const line = String(text || '').split('\n').map((l) => l.trim()).find(Boolean) || '';
    return line.length > max ? line.slice(0, max - 1) + '…' : line;
}

async function fetchInstagram() {
    const token = process.env.INSTAGRAM_TOKEN;
    const me = await instagramGet('/me?fields=user_id,username,name,profile_picture_url,followers_count,follows_count,media_count', token);
    const media = await instagramGet(`/me/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp&limit=${INSTAGRAM_LIMIT}`, token);

    fs.mkdirSync(INSTAGRAM_DIR, { recursive: true });
    const items = [];
    for (const post of (media.data || []).slice(0, INSTAGRAM_LIMIT)) {
        // 视频用封面图；图集的 media_url 就是第一张
        const source = post.media_type === 'VIDEO' ? post.thumbnail_url : post.media_url;
        if (!source) continue;
        const name = `ig-${post.id}.jpg`;
        await download(source, path.join(INSTAGRAM_DIR, name));
        items.push({
            id: post.id,
            image: `res/img/instagram/${name}`,
            url: post.permalink,
            alt: firstLine(post.caption, 80) || 'Instagram post',
            caption: post.caption || '',
            type: post.media_type,
            created: post.timestamp
        });
    }

    let avatar = '';
    if (me.profile_picture_url) {
        // 头像链接同样会过期：下载到固定文件名，内容变化时覆盖
        const file = path.join(INSTAGRAM_DIR, 'avatar-ig.jpg');
        try {
            const res = await fetch(me.profile_picture_url, { headers: { 'User-Agent': UA } });
            if (res.ok) {
                const data = Buffer.from(await res.arrayBuffer());
                if (!fs.existsSync(file) || !fs.readFileSync(file).equals(data)) fs.writeFileSync(file, data);
                avatar = 'res/img/instagram/avatar-ig.jpg';
            }
        } catch (error) {
            warn(`[instagram] avatar download failed: ${error.message}`);
        }
    }

    // 删除不再使用的旧下载文件（只删 ig-*.jpg，不碰手动放的图片）
    const keep = new Set(items.map((item) => path.basename(item.image)));
    for (const file of fs.readdirSync(INSTAGRAM_DIR)) {
        if (/^ig-.+\.jpg$/.test(file) && !keep.has(file)) fs.unlinkSync(path.join(INSTAGRAM_DIR, file));
    }

    await refreshInstagramToken(token);

    return {
        profile: {
            username: me.username,
            name: me.name || me.username,
            avatar,
            url: `https://www.instagram.com/${me.username}/`,
            posts: me.media_count,
            followers: me.followers_count,
            following: me.follows_count
        },
        items
    };
}

// ---------- sitemap.xml：补上新的 GitHub Pages 项目（只增不减） ----------

function updateSitemap(github) {
    const file = path.join(ROOT, 'sitemap.xml');
    const xml = fs.readFileSync(file, 'utf8');
    const norm = (u) => u.trim().replace(/^http:/, 'https:').replace(/\/+$/, '').toLowerCase();
    const existing = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
    const seen = new Set(existing.map(norm));
    const added = (github ? github.items : [])
        .map((repo) => repo.homepage)
        .filter((url) => url && url.startsWith(SITE + '/') && !seen.has(norm(url)));
    if (!added.length) {
        console.log('[sitemap] unchanged');
        return;
    }
    const urls = existing.concat(added);
    const out = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
        urls.map((u) => `<url>\n  <loc>${u}</loc>\n</url>`).join('\n') + '\n</urlset>\n';
    fs.writeFileSync(file, out);
    console.log(`[sitemap] added ${added.length}: ${added.join(', ')}`);
}

// ---------- 运行 ----------

const github = await source('github', fetchGithub);
await source('itch', fetchItch);
await source('bilibili', fetchBilibili);
if (process.env.INSTAGRAM_TOKEN) {
    await source('instagram', fetchInstagram);
} else {
    console.log('[instagram] skipped: INSTAGRAM_TOKEN is not set (see scripts/INSTAGRAM_SETUP.md)');
}
updateSitemap(github);

// 只有所有来源都失败时才让工作流报错（部分成功时照常提交成功的部分）
if (failures === attempts) {
    console.error('All sources failed.');
    process.exit(1);
}
