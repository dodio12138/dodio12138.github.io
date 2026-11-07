// My Projects 窗口：Win98 文件夹“Web 视图”——左侧标题与选中项目的说明，右侧大图标 / 详细信息视图。
// 数据来自 projects.json（loadProjects），双击用 openUrl 打开（网页进浏览器，应用和仓库交给对应应用）。

let projectsInstance = null;

function projectswin() {
    if (projectsInstance && projectsInstance.isConnected) {
        focusWindow(projectsInstance);
        return;
    }
    projectsInstance = createProjects();
}

function createProjects() {
    const win = createWindow('projectswin', 560, 380, 'My Projects', icon16('folder'), { minWidth: 360, minHeight: 220 });
    const content = win.querySelector('.wincontent');
    content.classList.add('app-wincontent');

    let projects = [];
    let view = 'icons';
    let selected = null;

    // ---------- 左侧 Web 视图面板 ----------
    const side = createEl('div', 'folder-side');
    const sideIcon = createEl('img', 'folder-side-icon');
    sideIcon.src = icon32('folder');
    sideIcon.alt = '';
    const sideTitle = createEl('h2', 'folder-side-title', 'My Projects');
    const sideRule = createEl('div', 'folder-side-rule');
    const sideBody = createEl('div', 'folder-side-body');
    side.append(sideIcon, sideTitle, sideRule, sideBody);

    const pane = createEl('div', 'app-pane white');
    pane.appendChild(createEl('p', 'app-message', 'Loading projects...'));

    const body = createEl('div', 'folder-body');
    body.append(side, pane);

    const status = createEl('div', 'statusbar');
    const statusMain = createEl('span', 'status-main', 'Loading...');
    status.append(statusMain, createEl('span', 'size-grip'));

    const menubar = createMenuBar([
        { label: '&File', items: function () {
            return [
                { label: '&Open', bold: true, disabled: !selected, action: function () { openUrl(selected.url); } },
                { label: 'Open in New &Tab', disabled: !selected, action: function () { openExternal(selected.url); } },
                '-',
                { label: '&Close', action: function () { closeWindow(win); } }
            ];
        } },
        { label: '&View', items: function () {
            return [
                { label: 'Lar&ge Icons', checked: view === 'icons', radio: true, action: function () { setView('icons'); } },
                { label: '&Details', checked: view === 'details', radio: true, action: function () { setView('details'); } }
            ];
        } },
        { label: '&Help', items: function () {
            return [{ label: '&About My Projects', action: function () {
                aboutDialog('projectsabout', 'My Projects', icon32('folder'), [
                    'Things I made in my spare time.',
                    'Edit projects.json to change this list.'
                ]);
            } }];
        } }
    ]);

    content.append(menubar, body, status);

    function renderSide() {
        if (!selected) {
            sideBody.replaceChildren(
                createEl('p', '', 'Things I made in my spare time.'),
                createEl('p', 'folder-side-hint', 'Select an item to view its description. Double-click to open it.')
            );
            return;
        }
        const kind = projectKind(selected);
        sideBody.replaceChildren(
            createEl('strong', 'folder-side-name', selected.name),
            createEl('p', 'folder-side-type', kind.type),
            createEl('p', '', selected.description)
        );
    }

    function select(project, el) {
        selected = project;
        pane.querySelectorAll('.selected').forEach(function (node) { node.classList.remove('selected'); });
        if (el) el.classList.add('selected');
        statusMain.textContent = project ? project.description : projects.length + ' object(s)';
        renderSide();
    }

    function projectMenu(project) {
        return [
            { label: '&Open', bold: true, action: function () { openUrl(project.url); } },
            { label: 'Open in New &Tab', action: function () { openExternal(project.url); } },
            '-',
            { label: '&Copy Link', disabled: !navigator.clipboard, action: function () { navigator.clipboard.writeText(project.url); } }
        ];
    }

    function bind(el, project) {
        el.addEventListener('mousedown', function () { select(project, el); });
        el.addEventListener('dblclick', function () { openUrl(project.url); });
        el.addEventListener('contextmenu', function (event) {
            select(project, el);
            openPopupMenu(projectMenu(project), event.clientX, event.clientY);
        });
    }

    function renderIcons() {
        const grid = createEl('div', 'iconview');
        projects.forEach(function (project) {
            const item = createEl('div', 'iconview-item');
            const img = createEl('img');
            img.src = projectIcon(project, 32);
            img.alt = '';
            // 只在驼峰处换行，避免把单词从中间截断
            item.append(img, createEl('span', '', project.name.replace(/([a-z])([A-Z])/g, '$1​$2')));
            item.title = project.description;
            if (project === selected) item.classList.add('selected');
            bind(item, project);
            grid.appendChild(item);
        });
        pane.replaceChildren(grid);
    }

    function renderDetails() {
        const table = createEl('table', 'listview');
        const colgroup = createEl('colgroup');
        const head = createEl('tr');
        [['Name', '30%'], ['Description', '50%'], ['Type', '20%']].forEach(function (col) {
            const c = createEl('col');
            c.style.width = col[1];
            colgroup.appendChild(c);
            const th = createEl('th');
            const button = createEl('button', '', col[0]);
            button.type = 'button';
            th.appendChild(button);
            head.appendChild(th);
        });
        const thead = createEl('thead');
        thead.appendChild(head);
        const tbody = createEl('tbody');
        projects.forEach(function (project) {
            const tr = createEl('tr');
            const nameCell = createEl('td');
            const name = createEl('div', 'cell-name');
            const img = createEl('img');
            img.src = projectIcon(project, 16);
            img.alt = '';
            name.append(img, createEl('span', '', project.name));
            nameCell.appendChild(name);
            tr.append(nameCell, createEl('td', 'muted', project.description), createEl('td', '', projectKind(project).type));
            tr.title = project.description;
            if (project === selected) tr.classList.add('selected');
            bind(tr, project);
            tbody.appendChild(tr);
        });
        table.append(colgroup, thead, tbody);
        pane.replaceChildren(table);
    }

    function setView(next) {
        view = next;
        if (view === 'details') renderDetails(); else renderIcons();
    }

    pane.addEventListener('mousedown', function (event) {
        if (!event.target.closest('.iconview-item, tbody tr')) select(null);
    });

    openWindow(win);
    renderSide();

    loadProjects()
        .then(function (list) {
            projects = list;
            setView(view);
            select(null);
        })
        .catch(function (error) {
            pane.replaceChildren(createEl('p', 'app-message', 'Could not load projects. ' + error.message));
            statusMain.textContent = 'Error';
        });

    return win;
}
