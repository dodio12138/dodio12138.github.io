// 桌面：图标选择（单击 / Ctrl 多选 / 框选）、打开（双击 / 回车）、右键菜单、排列图标、属性对话框

(function () {
    const desktop = document.getElementById('DeskBackground');
    const DRAG_THRESHOLD = 4;
    const DESKTOP_COLORS = [
        { name: 'Teal', value: '#008080' },
        { name: 'Blue Gray', value: '#3a6ea5' },
        { name: 'Navy', value: '#000080' },
        { name: 'Pine', value: '#2f5f4f' },
        { name: 'Plum', value: '#6a3d6a' },
        { name: 'Brick', value: '#7a3a2a' },
        { name: 'Slate', value: '#5a6070' },
        { name: 'Black', value: '#000000' }
    ];
    const COLOR_KEY = 'desktop-color';

    function icons() {
        return Array.from(desktop.querySelectorAll('.app-box:not([hidden]) .app'));
    }

    function selected() {
        return icons().filter(function (icon) { return icon.classList.contains('selected'); });
    }

    function select(list, additive) {
        if (!additive) icons().forEach(function (icon) { icon.classList.remove('selected'); });
        list.forEach(function (icon) { icon.classList.add('selected'); });
    }

    function iconName(icon) {
        return icon.querySelector('.app-title').textContent;
    }

    function openIcons(list) {
        list.forEach(runDesktopItem);
    }

    // ---------- 单击选择 / 双击打开 ----------

    desktop.addEventListener('click', function (event) {
        const icon = event.target.closest('.app');
        if (!icon) return;
        event.preventDefault();
        if (isMobile) {
            runDesktopItem(icon);
            return;
        }
        if (event.ctrlKey || event.metaKey) {
            icon.classList.toggle('selected');
        } else {
            select([icon]);
        }
        icon.focus();
    });

    desktop.addEventListener('dblclick', function (event) {
        const icon = event.target.closest('.app');
        if (icon && !isMobile) runDesktopItem(icon);
    });

    desktop.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' && event.target.closest('.app')) {
            event.preventDefault();
            openIcons(selected().length ? selected() : [event.target.closest('.app')]);
        } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a') {
            event.preventDefault();
            select(icons());
        }
    });

    // ---------- 框选 ----------

    let marquee = null;

    desktop.addEventListener('mousedown', function (event) {
        if (event.button !== 0 || event.target.closest('.app, .desk-bunny')) return;
        event.preventDefault();
        document.activeElement && document.activeElement.blur && document.activeElement.blur();
        const additive = event.ctrlKey || event.metaKey;
        marquee = {
            x: event.clientX,
            y: event.clientY,
            additive: additive,
            base: additive ? selected() : [],
            box: null
        };
        if (!additive) select([]);
    });

    document.addEventListener('mousemove', function (event) {
        if (!marquee) return;
        const dx = event.clientX - marquee.x;
        const dy = event.clientY - marquee.y;
        if (!marquee.box) {
            if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return;
            marquee.box = createEl('div', 'desktop-marquee');
            document.body.appendChild(marquee.box);
        }
        const left = Math.min(event.clientX, marquee.x);
        const top = Math.min(event.clientY, marquee.y);
        const right = Math.max(event.clientX, marquee.x);
        const bottom = Math.max(event.clientY, marquee.y);
        Object.assign(marquee.box.style, {
            left: left + 'px',
            top: top + 'px',
            width: (right - left) + 'px',
            height: (bottom - top) + 'px'
        });

        // 与框相交的图标被选中；Ctrl 框选时与原选择叠加
        icons().forEach(function (icon) {
            const r = icon.getBoundingClientRect();
            const hit = r.left < right && r.right > left && r.top < bottom && r.bottom > top;
            const keep = marquee.base.indexOf(icon) !== -1;
            icon.classList.toggle('selected', marquee.additive ? keep !== hit : hit);
        });
    });

    document.addEventListener('mouseup', function () {
        if (!marquee) return;
        if (marquee.box) marquee.box.remove();
        marquee = null;
    });

    // ---------- 排列图标 ----------

    // 在左右两组内各自排序（平台应用始终留在右侧）
    function arrangeBy(getKey) {
        desktop.querySelectorAll('.desktop-icons').forEach(function (group) {
            const boxes = Array.from(group.querySelectorAll('.app-box'));
            boxes.sort(function (a, b) {
                const ka = getKey(a.querySelector('.app'));
                const kb = getKey(b.querySelector('.app'));
                return ka < kb ? -1 : ka > kb ? 1 : 0;
            });
            boxes.forEach(function (box) { group.appendChild(box); });
        });
    }

    function iconType(icon) {
        if (icon.dataset.type) return icon.dataset.type;
        if (icon.tagName === 'A') return 'Internet Shortcut';
        if (icon.getAttribute('data-action')) return 'Application';
        return 'System Folder';
    }

    function refreshDesktop() {
        desktop.classList.add('refreshing');
        setTimeout(function () { desktop.classList.remove('refreshing'); }, 120);
    }

    // ---------- 右键菜单 ----------

    function desktopMenu() {
        return [
            {
                label: 'Arrange &Icons',
                items: [
                    { label: 'by &Name', action: function () { arrangeBy(function (i) { return iconName(i).toLowerCase(); }); } },
                    { label: 'by &Type', action: function () { arrangeBy(function (i) { return iconType(i) + iconName(i).toLowerCase(); }); } }
                ]
            },
            { label: '&Refresh', action: refreshDesktop },
            '-',
            { label: 'Select &All', shortcut: 'Ctrl+A', action: function () { select(icons()); } },
            '-',
            { label: 'Open Levy &Browser', icon: icon16('browser'), action: function () { browserwin(); } },
            '-',
            { label: 'P&roperties', action: displayProperties }
        ];
    }

    function iconMenu(icon) {
        const list = selected();
        const isLink = icon.tagName === 'A';
        const canOpen = !!(icon.getAttribute('data-action') || isLink);
        return [
            { label: '&Open', bold: true, disabled: !canOpen, action: function () { openIcons(list); } },
            { label: 'Open in &New Tab', disabled: !isLink || list.length > 1, action: function () { openExternal(icon.href); } },
            '-',
            { label: '&Copy Shortcut', disabled: !isLink || !navigator.clipboard, action: function () { navigator.clipboard.writeText(icon.href); } },
            '-',
            { label: 'P&roperties', disabled: list.length > 1, action: function () { iconProperties(icon); } }
        ];
    }

    desktop.addEventListener('contextmenu', function (event) {
        const icon = event.target.closest('.app');
        if (icon) {
            if (!icon.classList.contains('selected')) select([icon]);
            icon.focus();
            openPopupMenu(iconMenu(icon), event.clientX, event.clientY);
        } else {
            openPopupMenu(desktopMenu(), event.clientX, event.clientY);
        }
    });

    // ---------- 对话框 ----------

    function dialogButtons(buttons) {
        const row = createEl('div', 'dialog-buttons');
        buttons.forEach(function (spec) {
            const button = createEl('button', 'btn' + (spec.primary ? ' btn-default' : ''), spec.label);
            button.type = 'button';
            button.addEventListener('click', spec.action);
            row.appendChild(button);
        });
        return row;
    }

    function iconProperties(icon) {
        const name = iconName(icon);
        // 标题栏用 16px 版本，对话框里用 32px 版本
        const smallIcon = icon.querySelector('img').src.replace('/icon/32/', '/icon/16/');
        const win = createWindow('propswin', 320, 230, name + ' Properties', smallIcon, { resizable: false });
        const content = win.querySelector('.wincontent');
        content.classList.add('dialog-wincontent');

        const header = createEl('div', 'dialog-header');
        const img = createEl('img');
        img.src = icon.querySelector('img').src;
        img.alt = '';
        header.append(img, createEl('strong', '', name));

        const rows = [
            ['Type:', iconType(icon)],
            ['Target:', icon.tagName === 'A' ? icon.href : (icon.getAttribute('data-action') ? '(built-in)' : '(none)')],
            ['Location:', 'Desktop']
        ];
        const table = createEl('dl', 'dialog-fields');
        rows.forEach(function (row) {
            table.append(createEl('dt', '', row[0]), createEl('dd', '', row[1]));
        });

        const panel = createEl('div', 'dialog-panel');
        panel.append(header, createEl('div', 'dialog-rule'), table);
        content.append(panel, dialogButtons([{ label: 'OK', primary: true, action: function () { closeWindow(win); } }]));
        openWindow(win);
    }

    // 只接受预设颜色，防止存储里出现意外值
    function readColor() {
        let value = null;
        try { value = localStorage.getItem(COLOR_KEY); } catch (error) { return null; }
        return DESKTOP_COLORS.some(function (c) { return c.value === value; }) ? value : null;
    }

    function applyColor(value) {
        document.documentElement.style.setProperty('--Desktop', value);
    }

    function displayProperties() {
        const saved = readColor() || DESKTOP_COLORS[0].value;
        let choice = saved;

        const win = createWindow('displaywin', 340, 330, 'Display Properties', icon16('computer'), { resizable: false });
        const content = win.querySelector('.wincontent');
        content.classList.add('dialog-wincontent');

        const monitor = createEl('div', 'display-monitor');
        const screen = createEl('div', 'display-screen');
        monitor.appendChild(screen);

        const label = createEl('p', 'dialog-label');
        label.appendChild(menuLabel('&Background color:'));
        const list = createEl('div', 'display-list');
        list.setAttribute('role', 'listbox');
        list.tabIndex = 0;

        function update() {
            screen.style.background = choice;
            list.querySelectorAll('.display-option').forEach(function (option) {
                option.classList.toggle('active', option.dataset.value === choice);
            });
        }

        DESKTOP_COLORS.forEach(function (color) {
            const option = createEl('div', 'display-option');
            option.dataset.value = color.value;
            option.setAttribute('role', 'option');
            const swatch = createEl('span', 'display-swatch');
            swatch.style.background = color.value;
            option.append(swatch, createEl('span', '', color.name));
            option.addEventListener('click', function () { choice = color.value; update(); });
            list.appendChild(option);
        });

        function apply() {
            applyColor(choice);
            try { localStorage.setItem(COLOR_KEY, choice); } catch (error) { /* 无痕模式等：只在本次生效 */ }
        }

        const panel = createEl('div', 'dialog-panel');
        panel.append(monitor, label, list);
        content.append(panel, dialogButtons([
            { label: 'OK', primary: true, action: function () { apply(); closeWindow(win); } },
            { label: 'Cancel', action: function () { closeWindow(win); } },
            { label: 'Apply', action: apply }
        ]));
        update();
        openWindow(win);
    }

    // 开始菜单 Settings → Display Properties
    DesktopActions.display = displayProperties;

    // 启动时恢复上次选的桌面颜色
    const savedColor = readColor();
    if (savedColor) applyColor(savedColor);
})();
