// 桌面外壳：公共工具、应用注册表、Service Worker 注册

const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// ---------- 公共工具 ----------

// 桌面资源路径（index.html 位于站点根目录）
function asset(path) {
    return 'res/' + path;
}

// 图标：所有图标按原始尺寸 1:1 显示，保持像素密度一致（见 AGENTS.md）
function icon16(name) {
    return 'res/icon/16/' + name + '.png';
}

function icon32(name) {
    return 'res/icon/32/' + name + '.png';
}

// 创建元素的简写：createEl('div', 'class-name', '文字')
function createEl(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// 有专属应用的网址：不进浏览器，直接打开对应应用（值为 DesktopActions 的键）
const URL_APPS = [
    { pattern: /^https?:\/\/dodio12138\.github\.io\/MeTerminal\//i, action: 'meterminal' },
    { pattern: /^https?:\/\/(www\.)?github\.com\/dodio12138(\/|$)/i, action: 'github' },
    { pattern: /^https?:\/\/dodio12138\.itch\.io(\/|$)/i, action: 'itch' },
    { pattern: /^https?:\/\/(space\.bilibili\.com\/12027943|(www\.)?bilibili\.com\/video\/|b23\.tv\/)/i, action: 'bilibili' }
];

function appForUrl(url) {
    const hit = URL_APPS.find(function (route) { return route.pattern.test(url); });
    return hit ? hit.action : null;
}

// 站内统一入口：属于某个应用的网址交给该应用（应用会收到这个网址，可定位到具体项目/视频），
// 其余在 Levy Browser 窗口中打开
function openUrl(url) {
    const app = appForUrl(url);
    if (app) {
        DesktopActions[app](url);
    } else {
        browserwin(url);
    }
}

// 真正打开浏览器新标签页（仅用于无法嵌入的网站）
function openExternal(url) {
    window.open(url, '_blank', 'noopener');
}

// data/*.json：由 GitHub Action 每天自动更新（scripts/update-data.mjs），每个文件只请求一次
const dataCache = {};

function loadData(name) {
    if (!dataCache[name]) {
        dataCache[name] = fetch('data/' + name + '.json')
            .then(function (response) {
                if (!response.ok) throw new Error('data/' + name + '.json: HTTP ' + response.status);
                return response.json();
            })
            .catch(function (error) {
                delete dataCache[name];
                throw error;
            });
    }
    return dataCache[name];
}

function formatDate(iso) {
    const d = new Date(iso);
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
}

function formatCount(n) {
    return Number(n || 0).toLocaleString('en-US');
}

// ---------- 我的项目（projects.json，手动维护） ----------
// My Projects 窗口、开始菜单、浏览器主页和收藏夹共用这一份数据。

let projectsPromise = null;

function loadProjects() {
    if (!projectsPromise) {
        projectsPromise = fetch('projects.json')
            .then(function (response) {
                if (!response.ok) throw new Error('projects.json: HTTP ' + response.status);
                return response.json();
            })
            .then(function (data) { return data.projects; })
            .catch(function (error) {
                projectsPromise = null; // 失败后允许重试
                throw error;
            });
    }
    return projectsPromise;
}

// 项目类型由链接决定：属于桌面应用的网址 → 应用；GitHub 仓库 → 仓库；其余 → 网页
function projectKind(project) {
    const app = appForUrl(project.url);
    if (app && app !== 'github') return { type: 'Application', icon: app === 'meterminal' ? 'console' : app };
    if (/github\.com\//i.test(project.url)) return { type: 'GitHub Repository', icon: 'github' };
    return { type: 'Web Page', icon: 'web-file' };
}

function projectIcon(project, size) {
    const name = projectKind(project).icon;
    return size === 32 ? icon32(name) : icon16(name);
}

// ---------- 应用注册表 ----------
// 桌面图标、开始菜单通过 data-action 调用；新应用在这里登记

const DesktopActions = {
    browser: function () { browserwin(); },
    github: function (url) { githubwin(url); },
    itch: function (url) { itchwin(url); },
    bilibili: function (url) { bilibiliwin(url); },
    projects: function () { projectswin(); },
    notepad: function () { notepadwin(); },
    aboutme: function () { notepadwin('AboutMe.md'); },
    meterminal: function () { meterminalwin(); },
    instagram: function () { instagramwin(); }
};

// 执行带 data-action 或 href / data-href 的元素
function runDesktopItem(element) {
    const href = element.getAttribute('data-href') || (element.tagName === 'A' ? element.href : null);
    const action = element.getAttribute('data-action');
    if (href) {
        openUrl(href);
    } else if (action && DesktopActions[action]) {
        DesktopActions[action]();
    }
}

// ---------- 全局：链接与右键 ----------
// 桌面图标的选择、框选、右键菜单见 desktop.js

(function () {
    // 窗口里的普通链接（Instagram、浏览器主页等）也交给 Levy Browser
    document.getElementById('windows').addEventListener('click', function (event) {
        const link = event.target.closest('a[href]');
        if (!link || event.defaultPrevented) return;
        event.preventDefault();
        openUrl(link.href);
    });

    // 屏蔽浏览器自带右键菜单（输入框除外，保留复制粘贴）；各处的右键菜单由 openPopupMenu 提供
    document.addEventListener('contextmenu', function (event) {
        if (!event.target.closest('input, textarea')) event.preventDefault();
    });
})();

// ---------- 公共：两位数补零（时钟见 clock.js） ----------

function pad2(n) {
    return n < 10 ? '0' + n : String(n);
}

// ---------- Service Worker ----------

if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
        navigator.serviceWorker.register('/sw.js', { scope: '/' })
            .catch(function (error) {
                console.log('ServiceWorker registration failed:', error);
            });
    });
}
