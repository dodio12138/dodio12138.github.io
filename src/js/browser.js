// Levy Browser：站内所有链接都在这个窗口里打开（见 main.js 的 openUrl）

const BROWSER_NAME = 'Levy Browser';
const BROWSER_VERSION = '1.0';
const BROWSER_HOME = 'about:home';
const BROWSER_ABOUT = 'about:levy';
const BROWSER_ICON = icon16('browser');
// 工具栏 20px，其余 16px / 32px，全部按原始尺寸显示
const BROWSER_ICONS = {
    back: 'res/icon/20/back.png',
    forward: 'res/icon/20/forward.png',
    stop: 'res/icon/20/stop.png',
    refresh: 'res/icon/20/refresh.png',
    toolHome: 'res/icon/20/home.png',
    home: icon16('home'),
    globe: icon16('globe'),
    globeLarge: icon32('globe'),
    star: icon16('star'),
    page: icon16('web-file')
};

// 允许在 iframe 里显示的站点。GitHub Pages 不禁止被嵌入；
// 大部分其他网站（instagram.com、github.com 等）会拒绝，改为显示提示页
const EMBEDDABLE_HOSTS = [location.hostname, 'dodio12138.github.io'];

// 收藏夹：首页、Links 栏、Favorites 菜单共用
const BROWSER_FAVORITES = [
    { title: 'FunPages', url: 'https://dodio12138.github.io/fun-pages/', icon: icon16('web-files'), desc: 'Some interesting HTML stuffs.' },
    { title: "Dodio's Blog", url: 'https://dodio12138.github.io/blog/', icon: icon16('blog'), desc: 'Notes and articles.' },
    { title: 'MeTerminal', url: 'https://dodio12138.github.io/MeTerminal/src/MePC.html', icon: icon16('console'), desc: 'A web page that simulates terminal.' },
    { title: 'BunnyGame', url: 'src/page/BunnyGame.html', icon: icon16('bunny'), desc: 'Click to feed the bunny.' },
    { title: 'GitHub', url: 'https://github.com/dodio12138', icon: icon16('github'), desc: 'Repositories and open-source projects.' },
    { title: 'itch.io', url: 'https://dodio12138.itch.io/', icon: icon16('itch'), desc: 'Games made by Levy.' },
    { title: 'Bilibili', url: 'https://space.bilibili.com/12027943', icon: icon16('bilibili'), desc: 'Dev logs, photography and videos.' }
];

const BROWSER_PAGES = [BROWSER_HOME, BROWSER_ABOUT];

let browserInstance = null;

// 把地址栏输入转成完整 URL；无法识别时返回 null
function normalizeBrowserUrl(input) {
    const text = String(input || '').trim();
    if (!text) return BROWSER_HOME;
    if (/^about:/i.test(text)) return BROWSER_PAGES.indexOf(text.toLowerCase()) !== -1 ? text.toLowerCase() : null;
    try {
        if (/^[a-z][a-z0-9+.-]*:/i.test(text)) return new URL(text).href;
        if (/^(\/|\.\.?\/)/.test(text) || /^src\//.test(text)) return new URL(text, location.href).href;
        if (/^[^\s/]+\.[^\s/]{2,}(\/.*)?$/.test(text)) return new URL('https://' + text).href;
    } catch (error) {
        return null;
    }
    return null;
}

function isInternalPage(url) {
    return BROWSER_PAGES.indexOf(url) !== -1;
}

function canEmbed(url) {
    const parsed = new URL(url);
    return (parsed.protocol === 'https:' || parsed.protocol === 'http:') &&
        EMBEDDABLE_HOSTS.indexOf(parsed.hostname) !== -1;
}

function iconImg(src, className) {
    const img = createEl('img', className);
    img.src = src;
    img.alt = '';
    return img;
}

function linkItem(link) {
    const a = createEl('a');
    a.href = link.url;
    const text = createEl('span');
    text.appendChild(createEl('span', 'link-title', link.title));
    if (link.desc) text.appendChild(createEl('small', '', link.desc));
    a.append(iconImg(link.icon), text);
    return a;
}

function createBrowser() {
    const narrow = window.innerWidth <= 520; // 手机：铺满屏幕
    const width = Math.min(820, window.innerWidth - 14);
    const height = Math.min(narrow ? Infinity : 560, window.innerHeight - taskbarHeight() - 34);
    const win = createWindow('browserwin', width, height, BROWSER_NAME, BROWSER_ICON, { minWidth: 340, minHeight: 220 });
    const content = win.querySelector('.wincontent');
    content.classList.add('browser-wincontent');

    const history = [];      // 前进/后退记录
    const typed = [];        // 地址栏下拉：最近访问（去重，最新在前）
    let index = -1;
    let loading = false;
    let idleStatus = 'Done';
    let progressTimer = null;
    let projectList = null;  // Favorites 菜单用，提前加载好
    loadProjects().then(function (list) { projectList = list; }).catch(function () {});

    // ---------- 工具栏 ----------
    const toolbar = createEl('div', 'browser-band browser-toolbar');
    function tool(icon, label, title) {
        const button = createEl('button', 'browser-tool');
        button.type = 'button';
        button.title = title;
        button.append(iconImg(icon), createEl('span', 'text', label));
        toolbar.appendChild(button);
        return button;
    }
    const backButton = tool(BROWSER_ICONS.back, 'Back', 'Back (Alt+Left)');
    const forwardButton = tool(BROWSER_ICONS.forward, 'Forward', 'Forward (Alt+Right)');
    const stopButton = tool(BROWSER_ICONS.stop, 'Stop', 'Stop (Esc)');
    const refreshButton = tool(BROWSER_ICONS.refresh, 'Refresh', 'Refresh (F5)');
    const homeButton = tool(BROWSER_ICONS.toolHome, 'Home', 'Home (Alt+Home)');
    toolbar.insertBefore(createEl('span', 'browser-tool-separator'), homeButton.nextSibling);

    const throbber = createEl('div', 'browser-throbber');
    throbber.title = BROWSER_NAME;
    throbber.appendChild(iconImg(BROWSER_ICONS.globeLarge));

    // ---------- 地址栏 ----------
    const addressBand = createEl('form', 'browser-band browser-address');
    const input = createEl('input');
    input.type = 'text';
    input.spellcheck = false;
    input.autocomplete = 'off';
    input.id = 'browser-address-input';
    const addressLabel = createEl('label', '', '');
    addressLabel.htmlFor = input.id;
    addressLabel.appendChild(menuLabel('A&ddress'));
    const combo = createEl('div', 'browser-combo');
    const pageIcon = iconImg(BROWSER_ICONS.globe, 'browser-page-icon');
    const dropButton = createEl('button', 'browser-combo-drop');
    dropButton.type = 'button';
    dropButton.title = 'Recent pages';
    dropButton.tabIndex = -1;
    combo.append(pageIcon, input, dropButton);
    const goButton = createEl('button', 'browser-go');
    goButton.type = 'submit';
    goButton.append(createEl('span', 'browser-go-arrow'), createEl('span', '', 'Go'));
    addressBand.append(addressLabel, combo, goButton);

    // ---------- Links 栏 ----------
    const linksBand = createEl('div', 'browser-band browser-linksbar');
    linksBand.appendChild(createEl('span', 'browser-band-title', 'Links'));
    BROWSER_FAVORITES.forEach(function (link) {
        const a = createEl('a', 'browser-quicklink');
        a.href = link.url;
        a.append(iconImg(link.icon), createEl('span', '', link.title));
        linksBand.appendChild(a);
    });

    const bands = createEl('div', 'browser-bands');
    bands.append(toolbar, addressBand, linksBand);

    // ---------- 页面区：iframe 显示网页，page 显示内置页面 ----------
    const view = createEl('div', 'browser-view');
    const frame = createEl('iframe', 'browser-frame');
    frame.title = BROWSER_NAME + ' page';
    frame.hidden = true;
    const page = createEl('div', 'browser-page');
    page.tabIndex = -1;
    view.append(frame, page);

    // ---------- 状态栏 ----------
    const status = createEl('div', 'browser-status');
    const statusText = createEl('span', 'browser-status-text', 'Done');
    const progress = createEl('span', 'browser-progress');
    const progressBar = createEl('span', 'browser-progress-bar');
    progress.appendChild(progressBar);
    progress.hidden = true;
    const zone = createEl('span', 'browser-zone');
    zone.append(iconImg(BROWSER_ICONS.globe), createEl('span', '', 'Internet'));
    status.append(statusText, progress, zone, createEl('span', 'size-grip'));

    // ---------- 菜单栏 ----------
    const menubarRow = createEl('div', 'browser-menubar-row');
    const menubar = createMenuBar([
        { label: '&File', items: fileMenu },
        { label: '&Edit', items: editMenu },
        { label: '&View', items: viewMenu },
        { label: '&Go', items: goMenu },
        { label: 'F&avorites', items: favoritesMenu },
        { label: '&Help', items: helpMenu }
    ]);
    menubarRow.append(menubar, throbber);

    content.append(menubarRow, bands, view, status);

    // ---------- 状态 ----------

    function currentUrl() {
        return history[index];
    }

    function setStatus(text) {
        idleStatus = text;
        statusText.textContent = text;
    }

    function updateButtons() {
        backButton.disabled = index <= 0;
        forwardButton.disabled = index >= history.length - 1;
        stopButton.disabled = !loading;
    }

    function startLoading(url) {
        loading = true;
        content.classList.add('browser-loading');
        setStatus('Opening page ' + url + '...');
        clearTimeout(progressTimer);
        progress.hidden = false;
        progressBar.style.transition = 'none';
        progressBar.style.width = '0%';
        void progressBar.offsetWidth; // 重新开始过渡
        progressBar.style.transition = 'width 4s cubic-bezier(0.1, 0.7, 0.3, 1)';
        progressBar.style.width = '90%';
        updateButtons();
    }

    function finishLoading(text) {
        const wasLoading = loading;
        loading = false;
        content.classList.remove('browser-loading');
        setStatus(text || 'Done');
        if (wasLoading) {
            progressBar.style.transition = 'width 0.2s';
            progressBar.style.width = '100%';
            progressTimer = setTimeout(function () { progress.hidden = true; }, 400);
        } else {
            progress.hidden = true;
        }
        updateButtons();
    }

    function remember(url) {
        const at = typed.indexOf(url);
        if (at !== -1) typed.splice(at, 1);
        typed.unshift(url);
        typed.length = Math.min(typed.length, 10);
    }

    // ---------- 内置页面 ----------

    function showPage(nodes, title, icon) {
        frame.hidden = true;
        frame.removeAttribute('src');
        page.hidden = false;
        page.replaceChildren(...nodes);
        page.scrollTop = 0;
        pageIcon.src = icon || BROWSER_ICONS.page;
        setWindowTitle(win, title + ' - ' + BROWSER_NAME);
    }

    function homePage() {
        const banner = createEl('div', 'browser-banner');
        const bannerText = createEl('div');
        bannerText.append(
            createEl('h1', '', 'Welcome to ' + BROWSER_NAME),
            createEl('p', '', new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }))
        );
        banner.append(iconImg(BROWSER_ICONS.globeLarge, 'browser-banner-globe'), bannerText);

        const favorites = createEl('div', 'browser-links');
        BROWSER_FAVORITES.forEach(function (link) { favorites.appendChild(linkItem(link)); });

        const projects = createEl('div', 'browser-links');
        projects.appendChild(createEl('p', 'browser-muted', 'Loading projects...'));
        loadProjects()
            .then(function (list) {
                projects.replaceChildren(...list.map(function (project) {
                    return linkItem({ title: project.name, url: project.url, icon: projectIcon(project, 16), desc: project.description });
                }));
            })
            .catch(function () {
                projects.replaceChildren(createEl('p', 'browser-muted', 'Projects are unavailable right now.'));
            });

        const panel = createEl('div', 'browser-panel');
        panel.append(
            createEl('p', '', 'Every link on this desktop opens here. Type an address above, or pick a page below.'),
            createEl('h2', '', 'Favorites'),
            favorites,
            createEl('h2', '', 'My Projects'),
            projects
        );

        showPage([banner, panel, createEl('p', 'browser-footer', 'Best viewed at 800 × 600 in ' + BROWSER_NAME + ' ' + BROWSER_VERSION)], 'Home', BROWSER_ICONS.home);
    }

    function aboutPage() {
        const box = createEl('div', 'browser-about');
        box.append(
            iconImg(BROWSER_ICONS.globeLarge, 'browser-about-globe'),
            createEl('h1', '', BROWSER_NAME),
            createEl('p', '', 'Version ' + BROWSER_VERSION),
            createEl('hr'),
            createEl('p', '', 'A tiny browser that lives on Levy\'s desktop.'),
            createEl('p', '', 'Pages from dodio12138.github.io open right here. Sites that refuse to be shown inside other pages can be opened in a new tab.'),
            createEl('p', 'browser-muted', '© ' + new Date().getFullYear() + ' Levy. All rights reserved.')
        );
        showPage([box], 'About ' + BROWSER_NAME);
    }

    // IE 风格的错误页：标题、说明、建议列表、按钮
    function errorPage(options) {
        const box = createEl('div', 'browser-error');
        const body = createEl('div');
        body.append(createEl('h1', '', options.heading), createEl('p', '', options.message), createEl('hr'));
        if (options.tips) {
            body.appendChild(createEl('p', '', 'Please try the following:'));
            const list = createEl('ul');
            options.tips.forEach(function (tip) { list.appendChild(createEl('li', '', tip)); });
            body.appendChild(list);
        }
        const actions = createEl('div', 'browser-error-actions');
        (options.buttons || []).forEach(function (spec) {
            const button = createEl('button', '', spec.label);
            button.type = 'button';
            button.addEventListener('click', spec.action);
            actions.appendChild(button);
        });
        body.appendChild(actions);
        if (options.detail) body.appendChild(createEl('p', 'browser-muted browser-detail', options.detail));
        box.append(iconImg(icon32('computer')), body);
        showPage([box], options.title || options.heading);
    }

    function blockedPage(url) {
        const host = new URL(url).hostname;
        errorPage({
            heading: 'This page cannot be displayed here',
            message: host + ' does not allow other websites to show it inside a window.',
            tips: [
                'Click Open in New Tab to view the page in a real browser tab.',
                'Click the Back button to return to the previous page.'
            ],
            buttons: [
                { label: 'Open in New Tab', action: function () { openExternal(url); } },
                { label: 'Back', action: goBack }
            ],
            detail: url
        });
    }

    // ---------- 导航 ----------

    function render() {
        const url = currentUrl();
        input.value = url;
        clearTimeout(progressTimer);

        if (url === BROWSER_HOME) {
            homePage();
            finishLoading();
        } else if (url === BROWSER_ABOUT) {
            aboutPage();
            finishLoading();
        } else if (canEmbed(url)) {
            page.hidden = true;
            frame.hidden = false;
            pageIcon.src = BROWSER_ICONS.page;
            setWindowTitle(win, new URL(url).hostname + ' - ' + BROWSER_NAME);
            startLoading(url);
            frame.src = url;
        } else {
            blockedPage(url);
            finishLoading('Done, but the page cannot be displayed here');
        }
    }

    function navigate(target) {
        const url = normalizeBrowserUrl(target);
        if (!url) {
            input.value = target;
            errorPage({
                heading: 'Cannot find server',
                title: 'Cannot find server',
                message: 'The page "' + target + '" could not be found.',
                tips: [
                    'Check the address for typing errors.',
                    'Addresses look like dodio12138.github.io/blog/.',
                    'Click the Home button to see a list of pages.'
                ],
                buttons: [{ label: 'Home', action: goHome }]
            });
            finishLoading('Cannot find server');
            return;
        }
        // 属于某个应用的网址（如 MeTerminal）：打开应用窗口，浏览器停留在当前页
        const app = appForUrl(url);
        if (app) {
            DesktopActions[app](url);
            if (index < 0) navigate(BROWSER_HOME); // 浏览器刚打开时显示主页，避免空白
            else input.value = currentUrl();
            return;
        }
        history.splice(index + 1);
        history.push(url);
        index = history.length - 1;
        remember(url);
        render();
    }

    function goBack() { if (index > 0) { index--; render(); } }
    function goForward() { if (index < history.length - 1) { index++; render(); } }
    function goHome() { navigate(BROWSER_HOME); }
    function refresh() { if (index >= 0) render(); }

    function stop() {
        if (!loading) return;
        const url = currentUrl();
        errorPage({
            heading: 'Navigation canceled',
            message: 'You stopped loading this page.',
            tips: ['Click Refresh to try loading the page again.'],
            buttons: [{ label: 'Refresh', action: refresh }],
            detail: url
        });
        input.value = url;
        finishLoading('Navigation canceled');
    }

    // 同源页面加载完成后读取真实地址和标题（跨域页面读不到，保持当前地址）
    frame.addEventListener('load', function () {
        if (frame.hidden || !loading) return;
        finishLoading();
        try {
            const href = frame.contentWindow.location.href;
            if (href && href !== 'about:blank' && href !== currentUrl()) {
                history.splice(index + 1);
                history.push(href);
                index = history.length - 1;
                remember(href);
                input.value = href;
                updateButtons();
            }
            const title = frame.contentDocument.title;
            if (title) setWindowTitle(win, title + ' - ' + BROWSER_NAME);
        } catch (error) {
            // 跨域页面：无法读取，忽略
        }
    });

    // ---------- 菜单 ----------

    function favoritesItems() {
        return BROWSER_FAVORITES.map(function (link) {
            return { label: link.title, icon: link.icon, action: function () { navigate(link.url); } };
        });
    }

    function fileMenu() {
        const url = currentUrl();
        return [
            { label: '&Open...', shortcut: 'Ctrl+L', action: focusAddress },
            { label: 'Open in &New Tab', disabled: !url || isInternalPage(url), action: function () { openExternal(url); } },
            '-',
            { label: '&Close', action: function () { closeWindow(win); } }
        ];
    }

    function editMenu() {
        return [
            { label: '&Copy Address', disabled: !currentUrl() || !navigator.clipboard, action: copyAddress },
            { label: 'Select &All', action: focusAddress }
        ];
    }

    function viewMenu() {
        return [
            { label: '&Links Bar', checked: !linksBand.hidden, action: function () { linksBand.hidden = !linksBand.hidden; } },
            { label: '&Status Bar', checked: !status.hidden, action: function () { status.hidden = !status.hidden; } },
            '-',
            { label: 'Sto&p', shortcut: 'Esc', disabled: !loading, action: stop },
            { label: '&Refresh', shortcut: 'F5', disabled: index < 0, action: refresh }
        ];
    }

    function goMenu() {
        const recent = history.slice(-8).map(function (url, i, list) {
            const at = history.length - list.length + i;
            return {
                label: url === BROWSER_HOME ? 'Home' : url,
                checked: at === index,
                radio: true,
                action: function () { index = at; render(); }
            };
        });
        return [
            { label: '&Back', shortcut: 'Alt+←', disabled: index <= 0, action: goBack },
            { label: '&Forward', shortcut: 'Alt+→', disabled: index >= history.length - 1, action: goForward },
            '-',
            { label: '&Home Page', shortcut: 'Alt+Home', action: goHome },
            '-'
        ].concat(recent);
    }

    function favoritesMenu() {
        const projectItems = projectList ? projectList.map(function (project) {
            return { label: project.name, icon: projectIcon(project, 16), action: function () { navigate(project.url); } };
        }) : [{ label: '(Unavailable)', disabled: true }];
        return favoritesItems().concat(['-', { label: '&My Projects', icon: icon16('folder'), items: projectItems }]);
    }

    function helpMenu() {
        return [{ label: '&About ' + BROWSER_NAME, action: function () { navigate(BROWSER_ABOUT); } }];
    }

    function focusAddress() {
        input.focus();
        input.select();
    }

    function copyAddress() {
        navigator.clipboard.writeText(currentUrl())
            .then(function () { setStatus('Address copied to clipboard'); })
            .catch(function () { setStatus('Could not copy the address'); });
    }

    // ---------- 事件 ----------

    addressBand.addEventListener('submit', function (event) {
        event.preventDefault();
        closePopupMenu();
        navigate(input.value);
    });
    input.addEventListener('focus', function () { input.select(); });

    dropButton.addEventListener('mousedown', function (event) {
        event.preventDefault();
        if (isMenuOpen()) { closePopupMenu(); return; }
        const rect = combo.getBoundingClientRect();
        const items = typed.length ? typed.map(function (url) {
            return {
                label: url === BROWSER_HOME ? 'about:home' : url,
                icon: isInternalPage(url) ? BROWSER_ICONS.home : BROWSER_ICONS.globe,
                action: function () { navigate(url); }
            };
        }) : [{ label: '(No recent pages)', disabled: true }];
        openPopupMenu(items, rect.left, rect.bottom, { owner: dropButton, className: 'listbox', width: rect.width });
    });

    backButton.addEventListener('click', goBack);
    forwardButton.addEventListener('click', goForward);
    stopButton.addEventListener('click', stop);
    refreshButton.addEventListener('click', refresh);
    homeButton.addEventListener('click', goHome);

    // 悬停链接时状态栏显示地址
    content.addEventListener('mouseover', function (event) {
        const link = event.target.closest('a[href]');
        if (link) statusText.textContent = 'Shortcut to ' + link.href;
    });
    content.addEventListener('mouseout', function (event) {
        if (event.target.closest('a[href]')) statusText.textContent = idleStatus;
    });

    // 快捷键（焦点在浏览器窗口内时）
    win.addEventListener('keydown', function (event) {
        const key = event.key;
        if (event.altKey && key === 'ArrowLeft') { event.preventDefault(); goBack(); }
        else if (event.altKey && key === 'ArrowRight') { event.preventDefault(); goForward(); }
        else if (event.altKey && key === 'Home') { event.preventDefault(); goHome(); }
        else if (key === 'F5') { event.preventDefault(); refresh(); }
        else if (key === 'Escape' && loading) { event.preventDefault(); stop(); }
        else if ((event.ctrlKey || event.metaKey) && key.toLowerCase() === 'l') { event.preventDefault(); focusAddress(); }
    });

    openWindow(win);
    if (narrow) {
        win.style.left = '4px';
        win.style.top = '4px';
    }

    return { win: win, navigate: navigate };
}

// 打开浏览器窗口；已打开时复用同一个窗口
function browserwin(url) {
    if (!browserInstance || !browserInstance.win.isConnected) {
        browserInstance = createBrowser();
    } else {
        focusWindow(browserInstance.win);
    }
    browserInstance.navigate(url || BROWSER_HOME);
}
