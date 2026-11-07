// Instagram 窗口：个人主页 + 照片（网格 / 列表），双击照片在窗口内查看大图。
// 配置了 Instagram 令牌后，照片和粉丝数来自 data/instagram.json（每天自动更新，见 scripts/INSTAGRAM_SETUP.md）；
// 没有该文件时使用下面的内置数据。

const INSTAGRAM_PROFILE = {
    username: 'dodio_12138',
    displayName: 'Levy',
    avatar: asset('img/instagram/avatar-round.png'),
    url: 'https://www.instagram.com/dodio_12138/',
    stats: {
        posts: 13,
        followers: 24,
        following: 326
    },
    bio: [
        '🖥️Indie Developer | 💡Creative Worker',
        '🎮Game 🎥Graphic 🗺️Map 🤖Robot 🔧Cybernetic'
    ]
};

const INSTAGRAM_POSTS = [
    {
        image: asset('img/instagram/post-2026-10-05.jpg'),
        url: 'https://www.instagram.com/dodio_12138/p/DeIgo6PCq8U/',
        alt: '#麦麦 #为牛牛发声 #麦门永存'
    },
    {
        image: asset('img/instagram/post-2026-08-14.jpg'),
        url: 'https://www.instagram.com/dodio_12138/p/DcBo6oRjLn7/',
        alt: '#cockfosters'
    },
    {
        image: asset('img/instagram/post-01.jpg'),
        url: 'https://www.instagram.com/dodio_12138/reel/DUM2qwrDHGh/',
        alt: '哭死我了'
    },
    {
        image: asset('img/instagram/post-02.jpg'),
        url: 'https://www.instagram.com/dodio_12138/p/CNB-EHIhHS2/',
        alt: 'photo by'
    },
    {
        image: asset('img/instagram/post-03.jpg'),
        url: 'https://www.instagram.com/dodio_12138/p/CM_aWZFhvWP/',
        alt: 'The Falling Stars'
    },
    {
        image: asset('img/instagram/post-04.jpg'),
        url: 'https://www.instagram.com/dodio_12138/p/CI8QtEhHjLc/',
        alt: '公交车撞倒了电线杆'
    },
    {
        image: asset('img/instagram/post-05.jpg'),
        url: 'https://www.instagram.com/dodio_12138/p/CHXkKF2nUsS/',
        alt: 'photograph'
    },
    {
        image: asset('img/instagram/post-06.jpg'),
        url: 'https://www.instagram.com/dodio_12138/p/CFI1rbCHSz8/',
        alt: 'F1'
    },
    {
        image: asset('img/instagram/post-07.jpg'),
        url: 'https://www.instagram.com/dodio_12138/p/B-7PrFGndMf/',
        alt: 'elhoyo by dodio'
    },
    {
        image: asset('img/instagram/post-08.jpg'),
        url: 'https://www.instagram.com/dodio_12138/p/Btm--rCFaJv/',
        alt: '烧香'
    },
    {
        image: asset('img/instagram/post-09.jpg'),
        url: 'https://www.instagram.com/dodio_12138/p/BsMfcOwltZe/',
        alt: 'Instagram post'
    },
    {
        image: asset('img/instagram/post-2018-10-28.jpg'),
        url: 'https://www.instagram.com/dodio_12138/p/Bpf3ayXFOFY/',
        alt: 'F'
    }
];

let instagramInstance = null;

function instagramwin() {
    if (instagramInstance && instagramInstance.isConnected) {
        focusWindow(instagramInstance);
        return;
    }
    instagramInstance = createInstagram();
}

function createInstagram() {
    // 先用内置数据显示，data/instagram.json 加载成功后替换
    const P = Object.assign({}, INSTAGRAM_PROFILE, { stats: Object.assign({}, INSTAGRAM_PROFILE.stats) });
    let posts = INSTAGRAM_POSTS.slice();
    const narrow = window.innerWidth <= 520;
    const height = Math.min(narrow ? Infinity : 560, window.innerHeight - taskbarHeight() - 34);
    const win = createWindow('instagramwin', Math.min(480, window.innerWidth - 14), height, 'Instagram - @' + P.username, icon16('instagram'), { minWidth: 300, minHeight: 320 });
    const content = win.querySelector('.wincontent');
    content.classList.add('app-wincontent');

    let view = 'grid';
    let selected = null;
    let viewing = null;

    // ---------- 个人信息条 ----------
    const header = createEl('div', 'app-header instagram-header');
    const follow = createEl('button', 'btn', '+ Follow');
    follow.type = 'button';
    follow.addEventListener('click', function () { openExternal(P.url); });

    function renderHeader() {
        const avatar = createEl('img', 'instagram-avatar');
        avatar.src = P.avatar;
        avatar.alt = '';
        const text = createEl('div', 'app-header-text');
        text.appendChild(createEl('strong', '', P.displayName + ' (@' + P.username + ')'));
        P.bio.forEach(function (line) { text.appendChild(createEl('span', 'instagram-bio', line)); });
        text.appendChild(createEl('span', '', formatCount(P.stats.posts) + ' posts  ·  ' + formatCount(P.stats.followers) + ' followers  ·  ' + formatCount(P.stats.following) + ' following'));
        follow.title = 'Open @' + P.username + ' on instagram.com';
        header.replaceChildren(avatar, text, follow);
    }
    renderHeader();

    // ---------- 选项卡：Grid / List ----------
    const tabs = createEl('div', 'tabs');
    const tabStrip = createEl('div', 'tab-strip');
    tabStrip.setAttribute('role', 'tablist');
    const tabButtons = {};
    [['grid', 'Grid'], ['list', 'List']].forEach(function (spec) {
        const tab = createEl('button', 'tab');
        tab.type = 'button';
        tab.setAttribute('role', 'tab');
        tab.appendChild(menuLabel('&' + spec[1]));
        tab.addEventListener('click', function () { setView(spec[0]); });
        tabButtons[spec[0]] = tab;
        tabStrip.appendChild(tab);
    });
    const panel = createEl('div', 'tab-panel');
    const pane = createEl('div', 'app-pane white');
    panel.appendChild(pane);
    tabs.append(tabStrip, panel);

    // ---------- 照片查看器（默认隐藏） ----------
    const viewer = createEl('div', 'player instagram-viewer');
    viewer.hidden = true;
    const bar = createEl('div', 'player-bar');
    const back = createEl('button', 'btn', '◀ Back');
    back.type = 'button';
    const caption = createEl('span', 'player-title');
    const openSite = createEl('button', 'btn', 'Open on Instagram');
    openSite.type = 'button';
    bar.append(back, caption, openSite);
    const photoFrame = createEl('div', 'instagram-photo');
    const photo = createEl('img');
    photo.alt = '';
    photoFrame.appendChild(photo);
    viewer.append(bar, photoFrame);

    // ---------- 状态栏 ----------
    const status = createEl('div', 'statusbar');
    const statusMain = createEl('span', 'status-main');
    status.append(statusMain, createEl('span', '', '@' + P.username), createEl('span', 'size-grip'));

    const menubar = createMenuBar([
        { label: '&File', items: function () {
            const post = viewing || selected;
            return [
                { label: '&View Photo', bold: true, disabled: !selected || !!viewing, action: function () { show(selected); } },
                { label: '&Open on Instagram', disabled: !post, action: function () { openExternal(post.url); } },
                { label: 'Open &Profile on Instagram', action: function () { openExternal(P.url); } },
                '-',
                { label: '&Close', action: function () { closeWindow(win); } }
            ];
        } },
        { label: '&Edit', items: function () {
            const post = viewing || selected;
            return [
                { label: '&Copy Link', disabled: !post || !navigator.clipboard, action: function () { navigator.clipboard.writeText(post.url); } },
                { label: 'Copy &Profile Link', disabled: !navigator.clipboard, action: function () { navigator.clipboard.writeText(P.url); } }
            ];
        } },
        { label: '&View', items: function () {
            return [
                { label: '&Grid', checked: view === 'grid', radio: true, action: function () { setView('grid'); } },
                { label: '&List', checked: view === 'list', radio: true, action: function () { setView('list'); } },
                '-',
                { label: '&Back to Photos', shortcut: 'Esc', disabled: !viewing, action: hide }
            ];
        } },
        { label: '&Help', items: function () {
            return [{ label: '&About Instagram', action: instagramAbout }];
        } }
    ]);

    content.append(menubar, header, tabs, viewer, status);

    function select(post, el) {
        selected = post;
        pane.querySelectorAll('.selected').forEach(function (node) { node.classList.remove('selected'); });
        if (el) el.classList.add('selected');
        statusMain.textContent = post ? post.alt : posts.length + ' photo(s)';
    }

    function show(post) {
        viewing = post;
        photo.src = post.image;
        caption.textContent = post.alt;
        tabs.hidden = true;
        viewer.hidden = false;
        statusMain.textContent = 'Viewing: ' + post.alt;
    }

    function hide() {
        viewing = null;
        viewer.hidden = true;
        tabs.hidden = false;
        select(selected, selected ? pane.querySelector('[data-index="' + posts.indexOf(selected) + '"]') : null);
    }

    function postMenu(post) {
        return [
            { label: '&View Photo', bold: true, action: function () { show(post); } },
            { label: '&Open on Instagram', action: function () { openExternal(post.url); } },
            '-',
            { label: '&Copy Link', disabled: !navigator.clipboard, action: function () { navigator.clipboard.writeText(post.url); } }
        ];
    }

    function render() {
        const list = createEl('div', view === 'grid' ? 'instagram-grid' : 'instagram-list');
        posts.forEach(function (post, index) {
            const item = createEl('div', 'instagram-item');
            item.dataset.index = index;
            item.title = post.alt;
            const img = createEl('img');
            img.src = post.image;
            img.alt = post.alt;
            img.loading = 'lazy';
            item.appendChild(img);
            if (view === 'list') {
                const info = createEl('div', 'instagram-item-text');
                info.append(createEl('strong', '', post.alt), createEl('span', '', post.url.replace(/^https:\/\/www\./, '')));
                item.appendChild(info);
            }
            if (post === selected) item.classList.add('selected');
            item.addEventListener('mousedown', function () { select(post, item); });
            item.addEventListener('dblclick', function () { show(post); });
            item.addEventListener('contextmenu', function (event) {
                select(post, item);
                openPopupMenu(postMenu(post), event.clientX, event.clientY);
            });
            list.appendChild(item);
        });
        pane.replaceChildren(list);
    }

    function setView(next) {
        view = next;
        Object.keys(tabButtons).forEach(function (key) {
            tabButtons[key].classList.toggle('active', key === view);
            tabButtons[key].setAttribute('aria-selected', String(key === view));
        });
        render();
        pane.scrollTop = 0;
    }

    back.addEventListener('click', hide);
    openSite.addEventListener('click', function () { if (viewing) openExternal(viewing.url); });
    photoFrame.addEventListener('dblclick', hide);
    win.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' && viewing && !isMenuOpen()) hide();
    });
    pane.addEventListener('mousedown', function (event) {
        if (!event.target.closest('.instagram-item')) select(null);
    });

    setView('grid');
    select(null);
    openWindow(win);

    // 自动更新的数据（未配置令牌时文件不存在，保留内置数据）
    loadData('instagram')
        .then(function (data) {
            if (!data.items || !data.items.length) return;
            const p = data.profile || {};
            if (p.username) P.username = p.username;
            if (p.name) P.displayName = p.name;
            if (p.avatar) P.avatar = p.avatar;
            if (p.url) P.url = p.url;
            P.stats = { posts: p.posts, followers: p.followers, following: p.following };
            posts = data.items;
            selected = null;
            renderHeader();
            setWindowTitle(win, 'Instagram - @' + P.username);
            if (!viewing) {
                render();
                select(null);
            }
        })
        .catch(function () { /* 没有 data/instagram.json：继续使用内置数据 */ });
    if (narrow) {
        win.style.left = '4px';
        win.style.top = '4px';
    }
    return win;
}

function instagramAbout() {
    aboutDialog('instagramabout', 'Instagram', icon32('instagram'), [
        'Photos by @' + INSTAGRAM_PROFILE.username + '.',
        'Double-click a photo to view it here.'
    ]);
}
