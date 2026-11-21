// 回收站：Win98 文件夹“Web 视图”+ 详细信息列表。
// 里面是真的从网站和博客删掉的文件（大小、日期都是真的），以及 Final_Final_v7 之前的六个版本。
// 删除 / 清空只在本次打开时生效，刷新页面后它们又回来了（回收站嘛）。

const RECYCLE_ITEMS = [
    { name: 'Final_Final_v6.psd', from: 'C:\\Projects\\Final_Final', deleted: '2025-10-12', type: 'Photoshop Image', size: '61.4 MB', icon: 'web-file',
        note: 'So close. It grew up to be Final_Final_v7.',
        restore: { message: 'Final_Final_v6 grew up to be Final_Final_v7, a hand-drawn floor-plan puzzle. Open it instead?', buttons: ['Open v7', 'No'], url: 'https://dodio12138.itch.io/final-final-v7' } },
    { name: 'Final_Final_v5.psd', from: 'C:\\Projects\\Final_Final', deleted: '2025-09-30', type: 'Photoshop Image', size: '58.9 MB', icon: 'web-file',
        note: 'Lost to v6 by one pixel.' },
    { name: 'Final_Final_v4.psd', from: 'C:\\Projects\\Final_Final', deleted: '2025-09-02', type: 'Photoshop Image', size: '57.0 MB', icon: 'web-file',
        note: 'The client asked to "make it pop". It popped.' },
    { name: 'Final_Final_v3.psd', from: 'C:\\Projects\\Final_Final', deleted: '2025-08-21', type: 'Photoshop Image', size: '44.7 MB', icon: 'web-file',
        note: 'Final, but blue.' },
    { name: 'Final_Final_v2.psd', from: 'C:\\Projects\\Final_Final', deleted: '2025-08-03', type: 'Photoshop Image', size: '39.1 MB', icon: 'web-file',
        note: 'Not final enough.' },
    { name: 'Final_Final_v1.psd', from: 'C:\\Projects\\Final_Final', deleted: '2025-07-19', type: 'Photoshop Image', size: '12.0 MB', icon: 'web-file',
        note: 'Too final.' },
    { name: 'HiraginoSansGBW3.otf', from: 'C:\\Blog\\docs\\font', deleted: '2026-11-21', type: 'OpenType Font', size: '12.6 MB', icon: 'text-file',
        note: 'Made every visit to the blog download 10 MB. Replaced by a 170 KB pixel font.' },
    { name: 'logo.png', from: 'C:\\Blog\\docs\\images', deleted: '2026-11-21', type: 'PNG Image', size: '3.8 MB', icon: 'web-file',
        note: 'A 2859-pixel logo for a 24-pixel slot.' },
    { name: 'tall-grass-png-hd-photo-16.png', from: 'C:\\Levy95\\res\\img', deleted: '2026-11-16', type: 'PNG Image', size: '149 KB', icon: 'web-file',
        note: 'Replaced by a 23 KB tall-grass.png. Godzilla did not notice.' },
    { name: 'w95fa.woff', from: 'C:\\Levy95\\res\\fonts', deleted: '2026-11-16', type: 'Web Font', size: '9 KB', icon: 'text-file',
        note: 'Upgraded to w95fa.woff2.' },
    { name: 'Godzila.js', from: 'C:\\Levy95\\src\\js', deleted: '2026-11-16', type: 'JavaScript File', size: '1 KB', icon: 'notepad',
        note: 'Already restored as Godzilla.js. She deserves the extra l.' }
];

let recycleInstance = null;

function recyclebinwin() {
    if (recycleInstance && recycleInstance.isConnected) {
        focusWindow(recycleInstance);
        return;
    }
    recycleInstance = createRecycleBin();
}

function createRecycleBin() {
    const win = createWindow('recyclewin', 780, 380, 'Recycle Bin', icon16('recycle-bin'), { minWidth: 380, minHeight: 220 });
    const content = win.querySelector('.wincontent');
    content.classList.add('app-wincontent');

    let items = RECYCLE_ITEMS.slice();
    let selected = null;

    // ---------- 左侧 Web 视图面板 ----------
    const side = createEl('div', 'folder-side');
    const sideIcon = createEl('img', 'folder-side-icon');
    sideIcon.src = icon32('recycle-bin');
    sideIcon.alt = '';
    const sideBody = createEl('div', 'folder-side-body');
    side.append(sideIcon, createEl('h2', 'folder-side-title', 'Recycle Bin'), createEl('div', 'folder-side-rule'), sideBody);

    const pane = createEl('div', 'app-pane white');
    const body = createEl('div', 'folder-body');
    body.append(side, pane);

    const status = createEl('div', 'statusbar');
    const statusMain = createEl('span', 'status-main');
    const statusSize = createEl('span', 'recycle-status-size');
    status.append(statusMain, statusSize, createEl('span', 'size-grip'));

    const menubar = createMenuBar([
        { label: '&File', items: function () {
            return [
                { label: 'R&estore', disabled: !selected, action: function () { restore(selected); } },
                { label: '&Delete', disabled: !selected, action: function () { remove(selected); } },
                '-',
                { label: 'Empty Recycle &Bin', disabled: !items.length, action: emptyBin },
                '-',
                { label: '&Close', action: function () { closeWindow(win); } }
            ];
        } },
        { label: '&Help', items: function () {
            return [{ label: '&About Recycle Bin', action: function () {
                aboutDialog('recycleabout', 'Recycle Bin', icon32('recycle-bin'), [
                    'Files that did not make it.',
                    'Everything comes back when you reload the page.'
                ]);
            } }];
        } }
    ]);

    content.append(menubar, body, status);

    function renderSide() {
        if (!items.length) {
            sideBody.replaceChildren(createEl('p', '', 'The Recycle Bin is empty.'));
            return;
        }
        if (!selected) {
            sideBody.replaceChildren(
                createEl('p', '', 'This folder contains files that did not make it.'),
                createEl('p', 'folder-side-hint', 'Select an item to view its description.')
            );
            return;
        }
        sideBody.replaceChildren(
            createEl('strong', 'folder-side-name', selected.name),
            createEl('p', 'folder-side-type', selected.type),
            createEl('p', '', 'Original location: ' + selected.from),
            createEl('p', '', 'Date deleted: ' + selected.deleted),
            createEl('p', '', selected.note)
        );
    }

    function renderStatus() {
        statusMain.textContent = items.length + ' object(s)';
        statusSize.textContent = selected ? selected.size : '';
    }

    function select(item, row) {
        selected = item;
        pane.querySelectorAll('.selected').forEach(function (node) { node.classList.remove('selected'); });
        if (row) row.classList.add('selected');
        renderSide();
        renderStatus();
    }

    function itemMenu(item) {
        return [
            { label: 'R&estore', bold: true, action: function () { restore(item); } },
            '-',
            { label: '&Delete', action: function () { remove(item); } },
            '-',
            { label: 'P&roperties', action: function () { properties(item); } }
        ];
    }

    function render() {
        if (!items.length) {
            pane.replaceChildren(createEl('p', 'app-message', 'The Recycle Bin is empty.'));
            select(null);
            return;
        }
        const table = createEl('table', 'listview');
        const colgroup = createEl('colgroup');
        const head = createEl('tr');
        [['name', 'Name'], ['from', 'Original Location'], ['deleted', 'Date Deleted'], ['type', 'Type'], ['size', 'Size']].forEach(function (col) {
            colgroup.appendChild(createEl('col', 'recycle-col-' + col[0]));
            const th = createEl('th');
            const button = createEl('button', '', col[1]);
            button.type = 'button';
            th.appendChild(button);
            head.appendChild(th);
        });
        const thead = createEl('thead');
        thead.appendChild(head);
        const tbody = createEl('tbody');
        items.forEach(function (item) {
            const tr = createEl('tr');
            const nameCell = createEl('td');
            const name = createEl('div', 'cell-name');
            const img = createEl('img');
            img.src = icon16(item.icon);
            img.alt = '';
            name.append(img, createEl('span', '', item.name));
            nameCell.appendChild(name);
            tr.append(nameCell, createEl('td', 'muted', item.from), createEl('td', '', item.deleted),
                createEl('td', '', item.type), createEl('td', 'num', item.size));
            tr.title = item.note;
            if (item === selected) tr.classList.add('selected');
            tr.addEventListener('mousedown', function () { select(item, tr); });
            tr.addEventListener('dblclick', function () { properties(item); });
            tr.addEventListener('contextmenu', function (event) {
                select(item, tr);
                openPopupMenu(itemMenu(item), event.clientX, event.clientY);
            });
            tbody.appendChild(tr);
        });
        table.append(colgroup, thead, tbody);
        pane.replaceChildren(table);
    }

    function properties(item) {
        messageBox({
            title: item.name + ' Properties',
            icon: item.icon === 'notepad' ? 'text-file' : item.icon,
            message: item.name + '\n\nType: ' + item.type + '\nSize: ' + item.size +
                '\nOriginal location: ' + item.from + '\nDeleted: ' + item.deleted + '\n\n' + item.note
        });
    }

    function restore(item) {
        if (item.restore) {
            messageBox({ title: 'Restore', icon: 'info', message: item.restore.message, buttons: item.restore.buttons })
                .then(function (answer) { if (answer === item.restore.buttons[0]) openUrl(item.restore.url); });
            return;
        }
        messageBox({ title: 'Restore', icon: 'warning', message: 'Cannot restore ' + item.name + '. ' + item.note });
    }

    function remove(item) {
        messageBox({
            title: 'Confirm File Delete',
            icon: 'warning',
            message: 'Are you sure you want to delete \'' + item.name + '\'?',
            buttons: ['Yes', 'No']
        }).then(function (answer) {
            if (answer !== 'Yes') return;
            items = items.filter(function (other) { return other !== item; });
            selected = null;
            render();
        });
    }

    function emptyBin() {
        messageBox({
            title: 'Confirm Multiple File Delete',
            icon: 'warning',
            message: 'Are you sure you want to delete all of the items in the Recycle Bin?',
            buttons: ['Yes', 'No']
        }).then(function (answer) {
            if (answer !== 'Yes') return;
            items = [];
            selected = null;
            render();
        });
    }

    pane.addEventListener('mousedown', function (event) {
        if (!event.target.closest('tbody tr')) select(null);
    });

    openWindow(win);
    render();
    select(null);
    return win;
}
