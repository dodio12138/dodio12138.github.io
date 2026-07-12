//缓存空间名称
var CACHE_VERSION = 'sw_v4';
//需缓存的文件
var CACHE_FILES = [
  '/',
  '/index.html',
  '/src/css/index.css',
  '/src/css/windows.css',
  '/src/css/instagram.css',
  '/src/js/main.js',
  '/src/js/window.js',
  '/src/js/instagram.js',
  '/res/img/instagram/avatar.jpg',
  '/res/img/instagram/post-01.jpg',
  '/res/img/instagram/post-02.jpg',
  '/res/img/instagram/post-03.jpg',
  '/res/img/instagram/post-04.jpg',
  '/res/img/instagram/post-05.jpg',
  '/res/img/instagram/post-06.jpg',
  '/res/img/instagram/post-07.jpg',
  '/res/img/instagram/post-08.jpg',
  '/res/img/instagram/post-09.jpg'
];

//监听安装事件
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_VERSION)
    .then(cache => cache.addAll(CACHE_FILES)
      .then(() => self.skipWaiting())
    ));
});

//监听激活事件
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (key, i) {
        if (key !== CACHE_VERSION) {
          return caches.delete(keys[i]);
        }
      }));
    })
  );
});

//不缓存策略
self.addEventListener('fetch', function(event) {});
