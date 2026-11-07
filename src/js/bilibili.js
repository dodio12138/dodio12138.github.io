// Bilibili：视频列表 + 窗口内播放（B 站官方外链播放器），数据来自 data/bilibili.json（每天自动更新）

let bilibiliInstance = null;

function bilibiliwin(url) {
    if (bilibiliInstance && bilibiliInstance.win.isConnected) {
        focusWindow(bilibiliInstance.win);
        bilibiliInstance.reveal(url);
        return;
    }
    bilibiliInstance = createBilibili(url);
}

function createBilibili(initialUrl) {
    const win = createWindow('bilibiliwin', 660, 440, 'Bilibili - Levy\'s videos', icon16('bilibili'), { minWidth: 300, minHeight: 240 });
    const content = win.querySelector('.wincontent');
    content.classList.add('app-wincontent');

    let videos = [];
    let spaceUrl = 'https://space.bilibili.com/12027943';
    let order = 'newest';
    let selected = null;
    let playing = null;

    const pane = createEl('div', 'app-pane');
    pane.appendChild(createEl('p', 'app-message', 'Loading videos...'));

    // 播放区（默认隐藏）
    const player = createEl('div', 'player');
    player.hidden = true;
    const bar = createEl('div', 'player-bar');
    const back = createEl('button', 'btn', '◀ Back');
    back.type = 'button';
    const playerTitle = createEl('span', 'player-title');
    const openSite = createEl('button', 'btn', 'Open on Bilibili');
    openSite.type = 'button';
    bar.append(back, playerTitle, openSite);
    const screen = createEl('div', 'player-screen');
    player.append(bar, screen);

    const status = createEl('div', 'statusbar');
    const statusMain = createEl('span', 'status-main', 'Loading...');
    const statusUpdated = createEl('span', '', '');
    status.append(statusMain, statusUpdated, createEl('span', 'size-grip'));

    const menubar = createMenuBar([
        { label: '&File', items: function () {
            return [
                { label: '&Play', bold: true, disabled: !selected, action: function () { play(selected); } },
                { label: 'Open on &Bilibili', disabled: !(playing || selected), action: function () { openExternal((playing || selected).url); } },
                { label: 'Open &Space Page', action: function () { openExternal(spaceUrl); } },
                '-',
                { label: '&Close', action: function () { closeWindow(win); } }
            ];
        } },
        { label: '&View', items: function () {
            return [
                { label: '&Newest First', checked: order === 'newest', radio: true, action: function () { order = 'newest'; render(); } },
                { label: '&Most Played', checked: order === 'plays', radio: true, action: function () { order = 'plays'; render(); } },
                '-',
                { label: '&Back to List', shortcut: 'Esc', disabled: !playing, action: stop }
            ];
        } },
        { label: '&Help', items: function () {
            return [{ label: '&About Bilibili', action: function () {
                aboutDialog('bilibiliabout', 'Bilibili', icon32('bilibili'), [
                    'Videos from space.bilibili.com/12027943.',
                    'The list updates itself every day.'
                ]);
            } }];
        } }
    ]);

    content.append(menubar, pane, player, status);

    function sorted() {
        return videos.slice().sort(function (a, b) {
            return order === 'plays' ? b.plays - a.plays : b.created.localeCompare(a.created);
        });
    }

    function summary() {
        const total = videos.reduce(function (sum, v) { return sum + (v.plays || 0); }, 0);
        return videos.length + ' video(s)  ·  ' + formatCount(total) + ' plays';
    }

    function select(video, card) {
        selected = video;
        pane.querySelectorAll('.card.selected').forEach(function (el) { el.classList.remove('selected'); });
        if (card) card.classList.add('selected');
        statusMain.textContent = video
            ? video.title + '  ·  ' + formatCount(video.plays) + ' plays  ·  ' + formatDate(video.created)
            : summary();
    }

    function play(video) {
        playing = video;
        const frame = createEl('iframe');
        frame.src = 'https://player.bilibili.com/player.html?bvid=' + encodeURIComponent(video.bvid) + '&autoplay=1&high_quality=1&danmaku=0';
        frame.title = video.title;
        frame.allow = 'autoplay; fullscreen; picture-in-picture';
        frame.allowFullscreen = true;
        frame.referrerPolicy = 'no-referrer';
        screen.replaceChildren(frame);
        playerTitle.textContent = video.title;
        pane.hidden = true;
        player.hidden = false;
        statusMain.textContent = 'Playing: ' + video.title;
        setWindowTitle(win, video.title + ' - Bilibili');
    }

    function stop() {
        playing = null;
        screen.replaceChildren(); // 移除 iframe 才会真正停止播放
        player.hidden = true;
        pane.hidden = false;
        select(selected, selected ? pane.querySelector('[data-bvid="' + selected.bvid + '"]') : null);
        setWindowTitle(win, 'Bilibili - Levy\'s videos');
    }

    function videoMenu(video) {
        return [
            { label: '&Play', bold: true, action: function () { play(video); } },
            { label: 'Open on &Bilibili', action: function () { openExternal(video.url); } },
            '-',
            { label: '&Copy Link', disabled: !navigator.clipboard, action: function () { navigator.clipboard.writeText(video.url); } }
        ];
    }

    function render() {
        const grid = createEl('div', 'card-grid');
        sorted().forEach(function (video) {
            const card = createEl('div', 'card');
            card.dataset.bvid = video.bvid;
            card.title = video.title;
            const thumb = createEl('div', 'card-thumb wide');
            const img = createEl('img');
            img.src = video.cover + '@320w_200h_1c.webp'; // B 站图片服务按需缩放
            img.alt = '';
            img.loading = 'lazy';
            img.referrerPolicy = 'no-referrer';            // B 站图片有防盗链，不带来源才能显示
            thumb.append(img, createEl('span', 'card-badge', video.length));
            const meta = createEl('div', 'card-meta');
            meta.append(createEl('span', '', '▶ ' + formatCount(video.plays)), createEl('span', '', formatDate(video.created)));
            card.append(thumb, createEl('div', 'card-title', video.title), meta);
            if (selected && selected.bvid === video.bvid) card.classList.add('selected');
            card.addEventListener('mousedown', function () { select(video, card); });
            card.addEventListener('dblclick', function () { play(video); });
            card.addEventListener('contextmenu', function (event) {
                select(video, card);
                openPopupMenu(videoMenu(video), event.clientX, event.clientY);
            });
            grid.appendChild(card);
        });
        pane.replaceChildren(grid);
    }

    // 从网址定位视频：bilibili.com/video/BVxxxx 直接播放
    function reveal(url) {
        const match = url && url.match(/BV[0-9A-Za-z]{10}/);
        if (!match || !videos.length) return;
        const video = videos.find(function (v) { return v.bvid === match[0]; });
        if (video) play(video);
        else openExternal(url); // 不是自己的视频：在新标签页打开
    }

    back.addEventListener('click', stop);
    openSite.addEventListener('click', function () { if (playing) openExternal(playing.url); });
    win.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' && playing && !isMenuOpen()) stop();
    });
    pane.addEventListener('mousedown', function (event) {
        if (!event.target.closest('.card')) select(null);
    });

    openWindow(win);

    loadData('bilibili')
        .then(function (data) {
            videos = data.items;
            if (data.profile && data.profile.url) spaceUrl = data.profile.url;
            statusUpdated.textContent = 'Updated ' + formatDate(data.updated);
            select(null);
            render();
            reveal(initialUrl);
        })
        .catch(function (error) {
            pane.replaceChildren(createEl('p', 'app-message', 'Could not load videos. ' + error.message));
            statusMain.textContent = 'Error';
        });

    return { win: win, reveal: reveal };
}
