// Levy's PC：Win98 的“系统属性”对话框，显示 Levy 真正在用的这台电脑的配置。
// 换电脑时只改 LEVY_PC。

const LEVY_PC = {
    system: ['Levy95', 'Second Edition', '4.10.2222 A'],
    registered: ['Levy Zhang', 'Lévy Flight Studio', 'dodio12138'],
    computer: ['Apple MacBook Pro (16-inch, 2019)', 'Intel(R) Core(TM) i9 CPU @ 2.40GHz', '32.0GB RAM'],
    devices: [
        { type: 'Display adapters', items: ['AMD Radeon Pro 5600M (8 GB HBM2)', 'Intel UHD Graphics 630'] },
        { type: 'Disk drives', items: ['Apple SSD (2 TB)'] },
        { type: 'Monitors', items: ['Built-in Retina display (3072 x 1920)'] },
        { type: 'Processors', items: ['Intel Core i9, 8 cores / 16 threads @ 2.4 GHz'] },
        { type: 'System memory', items: ['32 GB DDR4'] },
        { type: 'Operating system', items: ['macOS 15.7 (Levy95 runs on top)'] }
    ],
    performance: [
        ['Memory:', '32.0 GB of RAM'],
        ['System Resources:', '97% free'],
        ['File System:', '64-bit'],
        ['Virtual Memory:', '64-bit'],
        ['Disk Compression:', 'Not installed'],
        ['PC Cards (PCMCIA):', 'No PC Card sockets are installed.']
    ]
};

let mypcInstance = null;

function mypcwin() {
    if (mypcInstance && mypcInstance.isConnected) {
        focusWindow(mypcInstance);
        return;
    }
    mypcInstance = createMyPC();
}

function createMyPC() {
    const win = createWindow('mypcwin', 420, 400, 'System Properties', icon16('computer'), { resizable: false });
    const content = win.querySelector('.wincontent');
    content.classList.add('dialog-wincontent');

    // ---------- 选项卡 ----------
    const tabs = createEl('div', 'tabs');
    const strip = createEl('div', 'tab-strip');
    const panel = createEl('div', 'tab-panel');
    tabs.append(strip, panel);
    const pages = {};
    const tabButtons = {};

    function addTab(key, label, page) {
        const tab = createEl('button', 'tab');
        tab.type = 'button';
        tab.appendChild(menuLabel(label));
        tab.addEventListener('click', function () { showTab(key); });
        strip.appendChild(tab);
        tabButtons[key] = tab;
        pages[key] = page;
        page.hidden = true;
        panel.appendChild(page);
    }

    function showTab(key) {
        Object.keys(pages).forEach(function (k) {
            pages[k].hidden = k !== key;
            tabButtons[k].classList.toggle('active', k === key);
        });
    }

    // ---------- General：左边电脑插画，右边系统 / 注册 / 硬件三段 ----------
    const general = createEl('div', 'mypc-general');
    const art = createEl('img', 'mypc-art');
    art.src = asset('img/system-pc.png');
    art.alt = '';
    const facts = createEl('div', 'mypc-facts');
    [['System:', LEVY_PC.system], ['Registered to:', LEVY_PC.registered], ['Computer:', LEVY_PC.computer]].forEach(function (section) {
        const block = createEl('div', 'mypc-section');
        block.appendChild(createEl('p', 'mypc-heading', section[0]));
        section[1].forEach(function (line) { block.appendChild(createEl('p', 'mypc-line', line)); });
        facts.appendChild(block);
    });
    general.append(art, facts);

    // ---------- Device Manager：按类型分组的设备树，点 +/- 折叠 ----------
    const devices = createEl('div', 'mypc-devices');
    const viewBy = createEl('div', 'mypc-viewby');
    ['View devices by &type', 'View devices by &connection'].forEach(function (label, i) {
        const option = createEl('label', 'checkbox');
        const radio = createEl('input');
        radio.type = 'radio';
        radio.name = 'mypc-view';
        radio.checked = i === 0;
        radio.disabled = i !== 0;
        option.append(radio, menuLabel(label));
        viewBy.appendChild(option);
    });

    const tree = createEl('ul', 'mypc-tree field');
    tree.setAttribute('role', 'tree');
    const root = createEl('li', 'mypc-node open');
    const rootRow = createEl('div', 'mypc-row');
    const rootIcon = createEl('img');
    rootIcon.src = icon16('computer');
    rootIcon.alt = '';
    rootRow.append(createEl('span', 'mypc-toggle'), rootIcon, createEl('span', 'mypc-label', "Levy's PC"));
    const rootList = createEl('ul');
    LEVY_PC.devices.forEach(function (group) {
        const node = createEl('li', 'mypc-node open');
        const row = createEl('div', 'mypc-row');
        row.append(createEl('span', 'mypc-toggle'), createEl('span', 'mypc-label', group.type));
        const list = createEl('ul');
        group.items.forEach(function (name) {
            const leaf = createEl('li', 'mypc-leaf');
            leaf.appendChild(createEl('span', 'mypc-label', name));
            list.appendChild(leaf);
        });
        node.append(row, list);
        rootList.appendChild(node);
    });
    root.append(rootRow, rootList);
    tree.appendChild(root);

    // 点击行选中；点 +/- 或双击分组折叠 / 展开
    tree.addEventListener('mousedown', function (event) {
        const label = event.target.closest('.mypc-row, .mypc-leaf');
        if (!label) return;
        tree.querySelectorAll('.selected').forEach(function (el) { el.classList.remove('selected'); });
        label.classList.add('selected');
        if (event.target.classList.contains('mypc-toggle')) label.parentNode.classList.toggle('open');
    });
    tree.addEventListener('dblclick', function (event) {
        const row = event.target.closest('.mypc-row');
        if (row) row.parentNode.classList.toggle('open');
    });

    const deviceButtons = createEl('div', 'mypc-device-buttons');
    ['Properties', 'Refresh', 'Remove', 'Print...'].forEach(function (label) {
        const button = createEl('button', 'btn', label);
        button.type = 'button';
        button.disabled = label !== 'Refresh';
        if (label === 'Refresh') {
            button.addEventListener('click', function () {
                tree.classList.add('refreshing');
                setTimeout(function () { tree.classList.remove('refreshing'); }, 150);
            });
        }
        deviceButtons.appendChild(button);
    });
    devices.append(viewBy, tree, deviceButtons);

    // ---------- Performance：状态分组框 + 高级设置 ----------
    const perf = createEl('div', 'mypc-performance');
    const status = createEl('fieldset', 'groupbox');
    status.appendChild(createEl('legend', '', 'Performance status'));
    const table = createEl('dl', 'mypc-perf-table');
    LEVY_PC.performance.forEach(function (row) {
        table.append(createEl('dt', '', row[0]), createEl('dd', '', row[1]));
    });
    status.append(table, createEl('p', 'mypc-perf-note', 'Your system is configured for optimal performance.'));
    const advanced = createEl('fieldset', 'groupbox');
    advanced.appendChild(createEl('legend', '', 'Advanced settings'));
    const advancedButtons = createEl('div', 'mypc-device-buttons');
    ['File System...', 'Graphics...', 'Virtual Memory...'].forEach(function (label) {
        const button = createEl('button', 'btn', label);
        button.type = 'button';
        button.disabled = true;
        advancedButtons.appendChild(button);
    });
    advanced.appendChild(advancedButtons);
    perf.append(status, advanced);

    addTab('general', '&General', general);
    addTab('devices', '&Device Manager', devices);
    addTab('performance', '&Performance', perf);
    showTab('general');

    const buttons = createEl('div', 'dialog-buttons');
    [['OK', true], ['Cancel', false]].forEach(function (spec) {
        const button = createEl('button', 'btn' + (spec[1] ? ' btn-default' : ''), spec[0]);
        button.type = 'button';
        button.addEventListener('click', function () { closeWindow(win); });
        buttons.appendChild(button);
    });

    content.append(tabs, buttons);
    openWindow(win);
    return win;
}
