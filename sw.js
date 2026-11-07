// 缓存空间名称：只有修改 CACHE_FILES 列表时才需要改版本号（替换图片不需要）
const CACHE_VERSION = 'sw_v15';
//首页需预缓存的文件
const CACHE_FILES = [
    '/',
    '/index.html',
    '/manifest.json',
    '/projects.json',
    '/src/css/base.css',
    '/src/css/index.css',
    '/src/css/windows.css',
    '/src/css/menu.css',
    '/src/css/instagram.css',
    '/src/css/browser.css',
    '/src/css/apps.css',
    '/src/css/startmenu.css',
    '/src/js/main.js',
    '/src/js/menu.js',
    '/src/js/window.js',
    '/src/js/desktop.js',
    '/src/js/deskbunny.js',
    '/src/js/projects.js',
    '/src/js/notepad.js',
    '/src/js/meterminal.js',
    '/src/js/instagram.js',
    '/src/js/browser.js',
    '/src/js/github.js',
    '/src/js/itch.js',
    '/src/js/bilibili.js',
    '/src/js/startmenu.js',
    '/src/js/clock.js',
    '/res/fonts/w95fa.woff',
    '/res/fonts/fusion-pixel-zh.woff2'
];

// 只处理本仓库的路径；同域名下的其他项目（/blog/、/fun-pages/、/MeTerminal/ 等）不拦截
const OWN_PATHS = /^\/($|index\.html$|404\.html$|favicon\.ico$|manifest\.json$|projects\.json$|src\/|res\/|data\/)/;

// 页面、脚本、样式、数据：网络优先，离线时退回缓存，保证部署后立即看到新版本
const NETWORK_FIRST = /\.(html|js|css|json|txt|md)$|\/$/;

//监听安装事件
self.addEventListener('install', function (event) {
    event.waitUntil(
        caches.open(CACHE_VERSION)
            // cache: 'reload' 绕过浏览器 HTTP 缓存，确保预缓存的是服务器上的最新文件
            .then(function (cache) {
                return cache.addAll(CACHE_FILES.map(function (url) {
                    return new Request(url, { cache: 'reload' });
                }));
            })
            .then(function () { return self.skipWaiting(); })
    );
});

//监听激活事件：清理旧版本缓存
self.addEventListener('activate', function (event) {
    event.waitUntil(
        caches.keys().then(function (keys) {
            return Promise.all(keys.map(function (key) {
                if (key !== CACHE_VERSION) {
                    return caches.delete(key);
                }
            }));
        }).then(function () { return self.clients.claim(); })
    );
});

function putInCache(request, response) {
    if (response && response.ok) {
        const copy = response.clone();
        caches.open(CACHE_VERSION).then(function (cache) { cache.put(request, copy); });
    }
    return response;
}

// cache: 'no-cache' 让浏览器每次都向服务器确认（未变化时只返回 304），
// 避免 HTTP 缓存里的旧 CSS/JS 和新 HTML 混用
function networkFirst(request) {
    return fetch(request, { cache: 'no-cache' })
        .then(function (response) { return putInCache(request, response); })
        .catch(function () {
            return caches.match(request).then(function (cached) {
                return cached || (request.mode === 'navigate' ? caches.match('/index.html') : Response.error());
            });
        });
}

// 图片、字体、光标等静态资源：先用缓存（秒开），同时在后台重新请求并更新缓存。
// 同名替换图片后，下次访问就会看到新图，不需要手动改 CACHE_VERSION
function staleWhileRevalidate(request) {
    return caches.match(request).then(function (cached) {
        const network = fetch(request)
            .then(function (response) { return putInCache(request, response); })
            .catch(function () { return cached || Response.error(); });
        return cached || network;
    });
}

self.addEventListener('fetch', function (event) {
    const request = event.request;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);
    if (url.origin !== self.location.origin || !OWN_PATHS.test(url.pathname)) return;

    event.respondWith(NETWORK_FIRST.test(url.pathname) ? networkFirst(request) : staleWhileRevalidate(request));
});
