// GitHub：仓库列表（详细信息 / 大图标视图，可排序），数据来自 data/github.json（每天自动更新）

let githubInstance = null;

// 仓库有 GitHub Pages 网站时在 Levy Browser 打开网站，否则在新标签页打开 GitHub 仓库页
function openRepo(repo) {
    if (repo.homepage && /^https?:\/\/dodio12138\.github\.io\//i.test(repo.homepage)) {
        openUrl(repo.homepage);
    } else {
        openExternal(repo.url);
    }
}

function githubwin(url) {
    if (githubInstance && githubInstance.win.isConnected) {
        focusWindow(githubInstance.win);
        githubInstance.reveal(url);
        return;
    }
    githubInstance = createGithub(url);
}

function createGithub(initialUrl) {
    const win = createWindow('githubwin', 620, 400, 'GitHub - dodio12138', icon16('github'), { minWidth: 360, minHeight: 220 });
    const content = win.querySelector('.wincontent');
    content.classList.add('app-wincontent');

    const COLUMNS = [
        { key: 'name', label: 'Name', width: '30%' },
        { key: 'description', label: 'Description', width: '34%' },
        { key: 'language', label: 'Language', width: '14%' },
        { key: 'stars', label: '★', width: '8%', num: true },
        { key: 'pushed', label: 'Updated', width: '14%' }
    ];

    let repos = [];
    let profile = null;
    let sortKey = 'pushed';
    let sortDir = 'desc';
    let view = 'details';
    let selected = null;

    const header = createEl('div', 'app-header');
    const pane = createEl('div', 'app-pane white');
    pane.appendChild(createEl('p', 'app-message', 'Loading repositories...'));
    const status = createEl('div', 'statusbar');
    const statusMain = createEl('span', 'status-main', 'Loading...');
    const statusUpdated = createEl('span', '', '');
    status.append(statusMain, statusUpdated, createEl('span', 'size-grip'));

    const menubar = createMenuBar([
        { label: '&File', items: function () {
            return [
                { label: '&Open', bold: true, disabled: !selected, action: function () { openRepo(selected); } },
                { label: 'Open Profile on &GitHub', action: function () { openExternal(profile ? profile.url : 'https://github.com/dodio12138'); } },
                '-',
                { label: '&Close', action: function () { closeWindow(win); } }
            ];
        } },
        { label: '&View', items: function () {
            return [
                { label: 'Lar&ge Icons', checked: view === 'icons', radio: true, action: function () { view = 'icons'; render(); } },
                { label: '&Details', checked: view === 'details', radio: true, action: function () { view = 'details'; render(); } },
                '-',
                { label: 'Arrange &Icons', items: COLUMNS.map(function (col) {
                    return { label: 'by ' + (col.key === 'stars' ? 'Stars' : col.label), checked: sortKey === col.key, radio: true, action: function () { sortBy(col.key); } };
                }) }
            ];
        } },
        { label: '&Help', items: function () {
            return [{ label: '&About GitHub', action: function () {
                aboutDialog('githubabout', 'GitHub', icon32('github'), [
                    'Repositories of github.com/dodio12138.',
                    'The list updates itself every day.'
                ]);
            } }];
        } }
    ]);

    content.append(menubar, header, pane, status);

    function sorted() {
        const dir = sortDir === 'asc' ? 1 : -1;
        return repos.slice().sort(function (a, b) {
            const va = a[sortKey];
            const vb = b[sortKey];
            if (typeof va === 'number') return (va - vb) * dir;
            return String(va).toLowerCase().localeCompare(String(vb).toLowerCase()) * dir;
        });
    }

    function sortBy(key) {
        if (sortKey === key) {
            sortDir = sortDir === 'asc' ? 'desc' : 'asc';
        } else {
            sortKey = key;
            sortDir = key === 'name' || key === 'language' || key === 'description' ? 'asc' : 'desc';
        }
        render();
    }

    function select(repo, element) {
        selected = repo;
        pane.querySelectorAll('.selected').forEach(function (el) { el.classList.remove('selected'); });
        if (element) element.classList.add('selected');
        statusMain.textContent = repo
            ? (repo.description || repo.name) + (repo.homepage ? '  —  ' + repo.homepage : '')
            : repos.length + ' object(s)';
    }

    function repoMenu(repo) {
        const hasSite = repo.homepage && /^https?:\/\/dodio12138\.github\.io\//i.test(repo.homepage);
        return [
            { label: '&Open', bold: true, action: function () { openRepo(repo); } },
            '-',
            { label: 'Visit &Website', disabled: !hasSite, action: function () { openUrl(repo.homepage); } },
            { label: 'Open on &GitHub', action: function () { openExternal(repo.url); } },
            '-',
            { label: '&Copy Link', disabled: !navigator.clipboard, action: function () { navigator.clipboard.writeText(repo.url); } }
        ];
    }

    function bindItem(element, repo) {
        element.addEventListener('mousedown', function () { select(repo, element); });
        element.addEventListener('dblclick', function () { openRepo(repo); });
        element.addEventListener('contextmenu', function (event) {
            select(repo, element);
            openPopupMenu(repoMenu(repo), event.clientX, event.clientY);
        });
    }

    function repoIcon(repo, size) {
        const hasSite = repo.homepage && /^https?:\/\/dodio12138\.github\.io\//i.test(repo.homepage);
        return size === 16 ? icon16(hasSite ? 'web-file' : 'folder') : icon32(hasSite ? 'web-file' : 'folder');
    }

    function renderDetails() {
        const table = createEl('table', 'listview');
        const colgroup = createEl('colgroup');
        const head = createEl('tr');
        COLUMNS.forEach(function (col) {
            const c = createEl('col');
            c.style.width = col.width;
            colgroup.appendChild(c);
            const th = createEl('th');
            const button = createEl('button', '', col.label);
            button.type = 'button';
            if (col.key === sortKey) button.dataset.sort = sortDir;
            button.addEventListener('click', function () { sortBy(col.key); });
            th.appendChild(button);
            head.appendChild(th);
        });
        const thead = createEl('thead');
        thead.appendChild(head);
        const tbody = createEl('tbody');
        sorted().forEach(function (repo) {
            const tr = createEl('tr');
            tr.dataset.name = repo.name;
            const nameCell = createEl('td');
            const name = createEl('div', 'cell-name');
            const img = createEl('img');
            img.src = repoIcon(repo, 16);
            img.alt = '';
            name.append(img, createEl('span', '', repo.name));
            nameCell.appendChild(name);
            tr.append(
                nameCell,
                createEl('td', 'muted', repo.description),
                createEl('td', '', repo.language),
                createEl('td', 'num', String(repo.stars)),
                createEl('td', '', formatDate(repo.pushed))
            );
            tr.title = repo.description || repo.name;
            if (selected && selected.name === repo.name) tr.classList.add('selected');
            bindItem(tr, repo);
            tbody.appendChild(tr);
        });
        table.append(colgroup, thead, tbody);
        pane.replaceChildren(table);
    }

    function renderIcons() {
        const grid = createEl('div', 'iconview');
        sorted().forEach(function (repo) {
            const item = createEl('div', 'iconview-item');
            item.dataset.name = repo.name;
            const img = createEl('img');
            img.src = repoIcon(repo, 32);
            img.alt = '';
            item.append(img, createEl('span', '', repo.name.replace(/([a-z])([A-Z-])/g, '$1​$2')));
            item.title = repo.description || repo.name;
            if (selected && selected.name === repo.name) item.classList.add('selected');
            bindItem(item, repo);
            grid.appendChild(item);
        });
        pane.replaceChildren(grid);
    }

    function render() {
        if (view === 'details') renderDetails(); else renderIcons();
    }

    // 从网址定位到仓库（如 github.com/dodio12138/MeTerminal）
    function reveal(url) {
        const match = url && url.match(/github\.com\/dodio12138\/([^/?#]+)/i);
        if (!match || !repos.length) return;
        const repo = repos.find(function (r) { return r.name.toLowerCase() === match[1].toLowerCase(); });
        if (!repo) return;
        const el = pane.querySelector('[data-name="' + CSS.escape(repo.name) + '"]');
        select(repo, el);
        if (el) el.scrollIntoView({ block: 'nearest' });
    }

    pane.addEventListener('mousedown', function (event) {
        if (event.target === pane || event.target.classList.contains('iconview')) select(null);
    });

    openWindow(win);

    loadData('github')
        .then(function (data) {
            repos = data.items;
            profile = data.profile;
            const avatar = createEl('img', 'app-header-avatar');
            avatar.src = profile.avatar + (profile.avatar.indexOf('?') === -1 ? '?' : '&') + 's=64';
            avatar.alt = '';
            const text = createEl('div', 'app-header-text');
            text.append(
                createEl('strong', '', profile.name + ' (@' + profile.login + ')'),
                createEl('span', '', (profile.bio ? profile.bio + '  ·  ' : '') + profile.publicRepos + ' repositories  ·  ' + profile.followers + ' followers')
            );
            header.replaceChildren(avatar, text);
            statusUpdated.textContent = 'Updated ' + formatDate(data.updated);
            select(null);
            render();
            reveal(initialUrl);
        })
        .catch(function (error) {
            pane.replaceChildren(createEl('p', 'app-message', 'Could not load repositories. ' + error.message));
            statusMain.textContent = 'Error';
        });

    return { win: win, reveal: reveal };
}
