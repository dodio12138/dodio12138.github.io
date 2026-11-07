// itch.io：游戏卡片，数据来自 data/itch.json（每天自动更新）

let itchInstance = null;

function itchwin(url) {
    if (itchInstance && itchInstance.win.isConnected) {
        focusWindow(itchInstance.win);
        itchInstance.reveal(url);
        return;
    }
    itchInstance = createItch(url);
}

function createItch(initialUrl) {
    const win = createWindow('itchwin', 640, 430, 'itch.io - Levy\'s games', icon16('itch'), { minWidth: 260, minHeight: 220 });
    const content = win.querySelector('.wincontent');
    content.classList.add('app-wincontent');

    let games = [];
    let profileUrl = 'https://dodio12138.itch.io/';
    let selected = null;

    const pane = createEl('div', 'app-pane');
    pane.appendChild(createEl('p', 'app-message', 'Loading games...'));
    const status = createEl('div', 'statusbar');
    const statusMain = createEl('span', 'status-main', 'Loading...');
    const statusUpdated = createEl('span', '', '');
    status.append(statusMain, statusUpdated, createEl('span', 'size-grip'));

    const menubar = createMenuBar([
        { label: '&File', items: function () {
            return [
                { label: '&Open on itch.io', bold: true, disabled: !selected, action: function () { openExternal(selected.url); } },
                { label: 'Open &Profile on itch.io', action: function () { openExternal(profileUrl); } },
                '-',
                { label: '&Close', action: function () { closeWindow(win); } }
            ];
        } },
        { label: '&Help', items: function () {
            return [{ label: '&About itch.io', action: function () {
                aboutDialog('itchabout', 'itch.io', icon32('itch'), [
                    'Games by Levy on dodio12138.itch.io.',
                    'The list updates itself every day.'
                ]);
            } }];
        } }
    ]);

    content.append(menubar, pane, status);

    function describe(game) {
        const parts = [game.title];
        if (game.genre) parts.push(game.genre);
        if (game.web) parts.push('Play in browser');
        if (game.platforms.length) parts.push(game.platforms.join(' / '));
        return parts.join('  ·  ');
    }

    function select(game, card) {
        selected = game;
        pane.querySelectorAll('.card.selected').forEach(function (el) { el.classList.remove('selected'); });
        if (card) card.classList.add('selected');
        statusMain.textContent = game ? describe(game) : games.length + ' game(s)';
    }

    function gameMenu(game) {
        return [
            { label: '&Open on itch.io', bold: true, action: function () { openExternal(game.url); } },
            '-',
            { label: '&Copy Link', disabled: !navigator.clipboard, action: function () { navigator.clipboard.writeText(game.url); } }
        ];
    }

    function render() {
        const grid = createEl('div', 'card-grid');
        games.forEach(function (game) {
            const card = createEl('div', 'card');
            card.dataset.url = game.url;
            card.title = game.text || game.title;

            const thumb = createEl('div', 'card-thumb');
            if (game.cover) {
                const img = createEl('img');
                img.src = game.cover;
                img.alt = '';
                img.loading = 'lazy';
                thumb.appendChild(img);
            }
            if (game.web) thumb.appendChild(createEl('span', 'card-badge', '▶ Play in browser'));

            const meta = createEl('div', 'card-meta');
            if (game.genre) meta.appendChild(createEl('span', 'card-tag', game.genre));
            game.platforms.forEach(function (p) { meta.appendChild(createEl('span', 'card-tag', p)); });

            card.append(thumb, createEl('div', 'card-title', game.title), createEl('div', 'card-text', game.text), meta);
            card.addEventListener('mousedown', function () { select(game, card); });
            card.addEventListener('dblclick', function () { openExternal(game.url); });
            card.addEventListener('contextmenu', function (event) {
                select(game, card);
                openPopupMenu(gameMenu(game), event.clientX, event.clientY);
            });
            grid.appendChild(card);
        });
        pane.replaceChildren(grid);
    }

    // 从网址定位到游戏（如 dodio12138.itch.io/let-the-boss-win）
    function reveal(url) {
        if (!url || !games.length) return;
        const norm = function (u) { return u.replace(/^https?:\/\//, '').replace(/\/+$/, '').toLowerCase(); };
        const game = games.find(function (g) { return norm(g.url) === norm(url); });
        if (!game) return;
        const card = pane.querySelector('[data-url="' + CSS.escape(game.url) + '"]');
        select(game, card);
        if (card) card.scrollIntoView({ block: 'nearest' });
    }

    pane.addEventListener('mousedown', function (event) {
        if (!event.target.closest('.card')) select(null);
    });

    openWindow(win);

    loadData('itch')
        .then(function (data) {
            games = data.items;
            if (data.profile && data.profile.url) profileUrl = data.profile.url;
            statusUpdated.textContent = 'Updated ' + formatDate(data.updated);
            select(null);
            render();
            reveal(initialUrl);
        })
        .catch(function (error) {
            pane.replaceChildren(createEl('p', 'app-message', 'Could not load games. ' + error.message));
            statusMain.textContent = 'Error';
        });

    return { win: win, reveal: reveal };
}
