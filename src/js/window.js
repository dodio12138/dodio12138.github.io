// 窗口管理器：创建 / 聚焦 / 最小化 / 最大化 / 关闭，任务栏按钮，拖拽与边缘吸附

const WINDOW_FRAME = 3;      // 窗口外框内边距（与 windows.css 中 window 的 padding 一致）
const WINDOW_CHROME = 20;    // 标题栏 18px + 间距 2px
let snapDistance = 10;       // 吸附距离（像素）

function taskbarHeight() {
    const bar = document.getElementById('BottomBar');
    return bar ? bar.offsetHeight : 28;
}

function allWindows() {
    return Array.from(document.querySelectorAll('window'));
}

// ---------- 任务栏按钮 ----------

function taskButtonOf(windowId) {
    return document.getElementById('task-' + windowId);
}

function setActiveTaskButton(windowId) {
    document.querySelectorAll('.task-button').forEach(function (button) {
        button.classList.toggle('active', button.id === 'task-' + windowId);
    });
}

function createTaskbarButton(windowId, title, icon) {
    const tasksBar = document.querySelector('.tasks-bar');
    if (!tasksBar) return;

    const old = taskButtonOf(windowId);
    if (old) old.remove();

    const button = document.createElement('button');
    button.id = 'task-' + windowId;
    button.className = 'task-button';
    button.type = 'button';
    button.title = title;

    const img = document.createElement('img');
    img.src = icon;
    img.alt = '';
    const label = document.createElement('span');
    label.textContent = title;

    button.append(img, label);
    // 激活窗口 → 最小化；其他情况 → 显示并置顶（与 Windows 任务栏一致）
    button.addEventListener('click', function () {
        const win = document.getElementById(windowId);
        if (!win) return;
        if (win.style.display !== 'none' && button.classList.contains('active')) {
            minimizeWindow(win);
        } else {
            focusWindow(win);
        }
    });
    tasksBar.appendChild(button);
}

// ---------- 窗口操作 ----------

function focusWindow(win) {
    win.style.display = '';
    const maxZ = Math.max(0, ...allWindows().map(function (w) {
        return parseInt(w.style.zIndex, 10) || 0;
    }));
    if ((parseInt(win.style.zIndex, 10) || 0) !== maxZ || maxZ === 0) {
        win.style.zIndex = maxZ + 1;
    }
    setActiveTaskButton(win.id);
}

function minimizeWindow(win) {
    win.style.display = 'none';
    const button = taskButtonOf(win.id);
    if (button) button.classList.remove('active');
}

// win.beforeClose：应用可设置该函数，返回 false 表示暂不关闭（例如先询问是否保存）；force 跳过询问
function closeWindow(win, force) {
    if (!force && typeof win.beforeClose === 'function' && win.beforeClose() === false) return;
    const button = taskButtonOf(win.id);
    if (button) button.remove();
    if (drag && drag.win === win) {
        document.body.classList.remove('is-dragging');
        drag = null;
    }
    win.remove();
}

function toggleMaximize(win) {
    const content = win.querySelector('.wincontent');
    const icon = win.querySelector('.winbaricon.maximize, .winbaricon.restore');

    if (win.dataset.maximized === 'true') {
        win.style.left = win.dataset.restoreLeft;
        win.style.top = win.dataset.restoreTop;
        content.style.width = win.dataset.restoreWidth;
        content.style.height = win.dataset.restoreHeight;
        win.dataset.maximized = 'false';
        icon.className = 'winbaricon maximize';
    } else {
        win.dataset.restoreLeft = win.style.left;
        win.dataset.restoreTop = win.style.top;
        win.dataset.restoreWidth = content.style.width;
        win.dataset.restoreHeight = content.style.height;
        win.style.left = '0px';
        win.style.top = '0px';
        content.style.width = 'calc(100vw - ' + (WINDOW_FRAME * 2) + 'px)';
        content.style.height = 'calc(100vh - var(--taskbar-height) - ' + (WINDOW_FRAME * 2 + WINDOW_CHROME) + 'px)';
        win.dataset.maximized = 'true';
        icon.className = 'winbaricon restore';
    }
    focusWindow(win);
}

function titlebarButton(kind, label, onClick) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'winbarbutton ' + kind;
    button.setAttribute('aria-label', label);
    const icon = document.createElement('span');
    icon.className = 'winbaricon ' + kind;
    button.appendChild(icon);
    button.addEventListener('click', onClick);
    return button;
}

// 创建窗口（不挂载）；width / height 为内容区尺寸。挂载用 openWindow()
// options：resizable（默认 true）、minWidth / minHeight（内容区最小尺寸，默认 200 × 120）
// 不可缩放的窗口按对话框处理：只有关闭按钮，双击标题栏不最大化
function createWindow(id, width, height, title, icon, options) {
    options = options || {};
    const resizable = options.resizable !== false;
    const old = document.getElementById(id);
    if (old) closeWindow(old, true);

    const win = document.createElement('window');
    win.id = id;
    win.dataset.resizable = String(resizable);
    win.dataset.minWidth = options.minWidth || 200;
    win.dataset.minHeight = options.minHeight || 120;

    const titlebar = document.createElement('windowTitlebar');
    const titleIcon = document.createElement('img');
    titleIcon.className = 'window-icon';
    titleIcon.src = icon;
    titleIcon.alt = '';
    const titleText = document.createElement('div');
    titleText.className = 'windows-title';
    titleText.textContent = title;

    titlebar.append(titleIcon, titleText);
    if (resizable) {
        titlebar.append(
            titlebarButton('minimize', 'Minimize', function () { minimizeWindow(win); }),
            titlebarButton('maximize', 'Maximize', function () { toggleMaximize(win); })
        );
    }
    titlebar.appendChild(titlebarButton('close', 'Close', function () { closeWindow(win); }));

    const content = document.createElement('div');
    content.className = 'wincontent';
    content.style.width = width + 'px';
    content.style.height = height + 'px';

    win.append(titlebar, content);

    // 8 个方向的缩放把手（边 + 角）
    if (resizable) {
        ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'].forEach(function (dir) {
            const handle = document.createElement('div');
            handle.className = 'win-resize';
            handle.dataset.dir = dir;
            handle.addEventListener('mousedown', function (event) { startResize(event, win, dir); });
            win.appendChild(handle);
        });
    }

    // 初始位置：水平居中，垂直略偏上
    const outerWidth = width + WINDOW_FRAME * 2;
    const outerHeight = height + WINDOW_FRAME * 2 + WINDOW_CHROME;
    win.style.left = Math.max(0, Math.round((window.innerWidth - outerWidth) / 2)) + 'px';
    win.style.top = Math.max(0, Math.round((window.innerHeight - taskbarHeight() - outerHeight) * 0.4)) + 'px';

    win.addEventListener('mousedown', function () { focusWindow(win); });
    titlebar.addEventListener('mousedown', function (event) { startDrag(event, win); });
    titlebar.addEventListener('dblclick', function (event) {
        if (event.target.closest('button')) return;
        // 双击窗口图标关闭窗口，双击其余位置最大化/还原（Win98 行为）
        if (event.target === titleIcon) {
            closePopupMenu();
            closeWindow(win);
        } else if (resizable) {
            toggleMaximize(win);
        }
    });
    // 单击窗口图标打开系统菜单
    titleIcon.addEventListener('mousedown', function (event) {
        event.stopPropagation();
        focusWindow(win);
        const rect = win.getBoundingClientRect();
        openPopupMenu(windowMenu(win), rect.left + WINDOW_FRAME, titlebar.getBoundingClientRect().bottom);
    });

    createTaskbarButton(id, title, icon);
    return win;
}

// ---------- 右键菜单 ----------

// 窗口的系统菜单（标题栏右键、点击窗口图标、任务栏按钮右键）
function windowMenu(win) {
    const maximized = win.dataset.maximized === 'true';
    const minimized = win.style.display === 'none';
    const resizable = win.dataset.resizable !== 'false';
    return [
        { label: '&Restore', disabled: !maximized && !minimized, action: function () {
            if (maximized) toggleMaximize(win); else focusWindow(win);
        } },
        { label: 'Mi&nimize', disabled: minimized || !resizable, action: function () { minimizeWindow(win); } },
        { label: 'Ma&ximize', disabled: maximized || !resizable, action: function () { toggleMaximize(win); } },
        '-',
        { label: '&Close', bold: true, shortcut: 'Alt+F4', action: function () { closeWindow(win); } }
    ];
}

// 任务栏空白处右键：层叠 / 全部最小化 / 全部还原
function taskbarMenu() {
    const wins = allWindows();
    return [
        { label: '&Cascade Windows', disabled: !wins.length, action: cascadeWindows },
        '-',
        { label: '&Minimize All Windows', disabled: !wins.length, action: function () { wins.forEach(minimizeWindow); } },
        { label: '&Restore All Windows', disabled: !wins.length, action: function () { wins.forEach(focusWindow); } }
    ];
}

function cascadeWindows() {
    allWindows().forEach(function (win, i) {
        if (win.dataset.maximized === 'true') toggleMaximize(win);
        win.style.left = (24 + i * 28) + 'px';
        win.style.top = (16 + i * 28) + 'px';
        focusWindow(win);
    });
}

document.addEventListener('contextmenu', function (event) {
    const titlebar = event.target.closest('windowTitlebar');
    const taskButton = event.target.closest('.task-button');
    if (titlebar) {
        const win = titlebar.closest('window');
        focusWindow(win);
        openPopupMenu(windowMenu(win), event.clientX, event.clientY);
    } else if (taskButton) {
        const win = document.getElementById(taskButton.id.replace(/^task-/, ''));
        if (win) openPopupMenu(windowMenu(win), event.clientX, event.clientY);
    } else if (event.target.closest('.tasks-bar')) {
        openPopupMenu(taskbarMenu(), event.clientX, event.clientY);
    }
});

// Alt+F4 关闭最上层的窗口
document.addEventListener('keydown', function (event) {
    if (!(event.altKey && event.key === 'F4')) return;
    const visible = allWindows().filter(function (w) { return w.style.display !== 'none'; });
    if (!visible.length) return;
    event.preventDefault();
    visible.sort(function (a, b) { return (parseInt(b.style.zIndex, 10) || 0) - (parseInt(a.style.zIndex, 10) || 0); });
    closeWindow(visible[0]);
});

// ---------- 消息框 / 输入框（Promise） ----------
// messageBox({ title, message, icon: 'warning' | 'info', buttons: ['Yes', 'No', 'Cancel'] }) → 点击的按钮文字
// inputDialog({ title, label, value, okLabel }) → 输入的文字，取消时为 null

let dialogCounter = 0;

function dialogWindow(title, icon, width, height) {
    const win = createWindow('dialog' + (++dialogCounter), width, height, title, icon, { resizable: false });
    win.querySelector('.wincontent').classList.add('dialog-wincontent');
    return win;
}

function centerOnScreen(win) {
    const r = win.getBoundingClientRect();
    win.style.left = Math.max(0, Math.round((window.innerWidth - r.width) / 2)) + 'px';
    win.style.top = Math.max(0, Math.round((window.innerHeight - taskbarHeight() - r.height) / 2)) + 'px';
}

function messageBox(options) {
    return new Promise(function (resolve) {
        const buttons = options.buttons || ['OK'];
        const win = dialogWindow(options.title || 'Message', icon16(options.icon || 'info'), 340, 0);
        const content = win.querySelector('.wincontent');
        content.style.height = 'auto';
        let done = false;
        function finish(answer) {
            if (done) return;
            done = true;
            closeWindow(win, true);
            resolve(answer);
        }
        const body = createEl('div', 'message-body');
        const img = createEl('img');
        img.src = icon32(options.icon || 'info');
        img.alt = '';
        body.append(img, createEl('p', '', options.message));
        const row = createEl('div', 'dialog-buttons message-buttons');
        buttons.forEach(function (label, i) {
            const button = createEl('button', 'btn' + (i === 0 ? ' btn-default' : ''), label);
            button.type = 'button';
            button.addEventListener('click', function () { finish(label); });
            row.appendChild(button);
        });
        content.append(body, row);
        // 标题栏关闭 / Esc 视为最后一个按钮（通常是 Cancel / No / OK）
        win.beforeClose = function () { finish(buttons[buttons.length - 1]); return false; };
        win.addEventListener('keydown', function (event) {
            if (event.key === 'Escape') finish(buttons[buttons.length - 1]);
        });
        openWindow(win);
        centerOnScreen(win);
        row.querySelector('.btn-default').focus();
    });
}

function inputDialog(options) {
    return new Promise(function (resolve) {
        const win = dialogWindow(options.title || 'Input', icon16(options.icon || 'notepad'), 320, 0);
        const content = win.querySelector('.wincontent');
        content.style.height = 'auto';
        let done = false;
        function finish(value) {
            if (done) return;
            done = true;
            closeWindow(win, true);
            resolve(value);
        }
        const form = createEl('form', 'input-dialog');
        const label = createEl('label', '', '');
        label.appendChild(menuLabel(options.label || '&Value:'));
        const input = createEl('input', 'field');
        input.type = 'text';
        input.value = options.value || '';
        input.spellcheck = false;
        input.id = 'dialog-input-' + dialogCounter;
        label.htmlFor = input.id;
        const row = createEl('div', 'dialog-buttons');
        const ok = createEl('button', 'btn btn-default', options.okLabel || 'OK');
        ok.type = 'submit';
        const cancel = createEl('button', 'btn', 'Cancel');
        cancel.type = 'button';
        cancel.addEventListener('click', function () { finish(null); });
        row.append(ok, cancel);
        form.append(label, input, row);
        form.addEventListener('submit', function (event) {
            event.preventDefault();
            finish(input.value);
        });
        content.appendChild(form);
        win.beforeClose = function () { finish(null); return false; };
        win.addEventListener('keydown', function (event) {
            if (event.key === 'Escape') finish(null);
        });
        openWindow(win);
        centerOnScreen(win);
        input.focus();
        input.select();
    });
}

// “关于”对话框（各应用 Help → About 共用）；icon 传 32px 图标路径
function aboutDialog(id, title, icon, lines) {
    const win = createWindow(id, 300, 150, 'About ' + title, icon.replace('/icon/32/', '/icon/16/'), { resizable: false });
    const content = win.querySelector('.wincontent');
    content.classList.add('dialog-wincontent');
    const header = createEl('div', 'dialog-header');
    const img = createEl('img');
    img.src = icon;
    img.alt = '';
    const text = createEl('div');
    text.append(createEl('strong', '', title), createEl('p', '', 'Version 1.0'));
    header.append(img, text);
    const panel = createEl('div', 'dialog-panel');
    panel.append(header, createEl('div', 'dialog-rule'));
    lines.forEach(function (line) { panel.appendChild(createEl('p', '', line)); });
    const buttons = createEl('div', 'dialog-buttons');
    const ok = createEl('button', 'btn btn-default', 'OK');
    ok.type = 'button';
    ok.addEventListener('click', function () { closeWindow(win); });
    buttons.appendChild(ok);
    content.append(panel, buttons);
    openWindow(win);
}

// 更新窗口标题（标题栏 + 任务栏按钮）
function setWindowTitle(win, title) {
    win.querySelector('.windows-title').textContent = title;
    const button = taskButtonOf(win.id);
    if (button) {
        button.title = title;
        button.querySelector('span').textContent = title;
    }
}

function openWindow(win) {
    document.getElementById('windows').appendChild(win);
    focusWindow(win);
    return win;
}

// ---------- 拖拽 + 吸附（document 级监听只绑定一次） ----------

let drag = null;

function startDrag(event, win) {
    if (event.button !== 0 || event.target.closest('button')) return;
    if (win.dataset.maximized === 'true') return;
    drag = {
        win: win,
        handle: event.currentTarget,
        offsetX: win.offsetLeft - event.clientX,
        offsetY: win.offsetTop - event.clientY
    };
    drag.handle.classList.add('dragging');
    // 拖拽时让 iframe 不接收鼠标，否则鼠标移到 iframe 上会丢失 mousemove
    document.body.classList.add('is-dragging');
}

document.addEventListener('mousemove', function (event) {
    if (!drag) return;
    event.preventDefault(); // 仅在拖拽时阻止选中文本
    drag.win.style.left = event.clientX + drag.offsetX + 'px';
    drag.win.style.top = event.clientY + drag.offsetY + 'px';
    snapWindow(drag.win);
});

document.addEventListener('mouseup', function () {
    if (!drag) return;
    drag.handle.classList.remove('dragging');
    document.body.classList.remove('is-dragging');
    drag = null;
});

// 点击 iframe 内部不会触发窗口的 mousedown；页面失焦且焦点落在 iframe 上时置顶它所在的窗口
window.addEventListener('blur', function () {
    setTimeout(function () {
        const active = document.activeElement;
        const win = active && active.tagName === 'IFRAME' ? active.closest('window') : null;
        if (win) focusWindow(win);
    }, 0);
});

// 在 targets 中找离 value 最近且在吸附距离内的值
function nearestWithin(value, targets) {
    let best = null;
    let bestDistance = snapDistance;
    targets.forEach(function (target) {
        const distance = Math.abs(value - target);
        if (distance < bestDistance) {
            bestDistance = distance;
            best = target;
        }
    });
    return best === null ? null : { value: best, distance: bestDistance };
}

// 两条边分别吸附，取更近的一个；返回新的起点坐标或 null
function snapAxis(start, size, startTargets, endTargets) {
    const a = nearestWithin(start, startTargets);
    const b = nearestWithin(start + size, endTargets);
    if (a && (!b || a.distance <= b.distance)) return a.value;
    if (b) return b.value - size;
    return null;
}

function snapWindow(win) {
    const rect = win.getBoundingClientRect();
    const screenBottom = window.innerHeight - taskbarHeight();
    const others = allWindows()
        .filter(function (w) { return w !== win && w.style.display !== 'none'; })
        .map(function (w) { return w.getBoundingClientRect(); });

    // 只吸附到在另一方向上相邻或重叠的窗口
    const besideY = others.filter(function (o) {
        return o.top - snapDistance <= rect.bottom && o.bottom + snapDistance >= rect.top;
    });
    const besideX = others.filter(function (o) {
        return o.left - snapDistance <= rect.right && o.right + snapDistance >= rect.left;
    });

    const x = snapAxis(rect.left, rect.width,
        [0].concat(besideY.map(function (o) { return o.right; }), besideY.map(function (o) { return o.left; })),
        [window.innerWidth].concat(besideY.map(function (o) { return o.left; }), besideY.map(function (o) { return o.right; })));
    const y = snapAxis(rect.top, rect.height,
        [0].concat(besideX.map(function (o) { return o.bottom; }), besideX.map(function (o) { return o.top; })),
        [screenBottom].concat(besideX.map(function (o) { return o.top; }), besideX.map(function (o) { return o.bottom; })));

    let left = x === null ? rect.left : x;
    let top = y === null ? rect.top : y;

    // 不允许移出屏幕（考虑任务栏）
    left = Math.max(0, Math.min(left, window.innerWidth - rect.width));
    top = Math.max(0, Math.min(top, screenBottom - rect.height));

    win.style.left = Math.round(left) + 'px';
    win.style.top = Math.round(top) + 'px';
}

// ---------- 缩放 ----------
// 拖动时铺一层全屏遮罩：统一显示缩放光标，并防止 iframe 吞掉鼠标事件

let resize = null;

function startResize(event, win, dir) {
    if (event.button !== 0 || win.dataset.maximized === 'true') return;
    event.preventDefault();
    event.stopPropagation();
    focusWindow(win);
    const content = win.querySelector('.wincontent');
    const overlay = document.createElement('div');
    overlay.className = 'resize-overlay';
    overlay.dataset.dir = dir;
    document.body.appendChild(overlay);
    resize = {
        win: win,
        content: content,
        dir: dir,
        overlay: overlay,
        x: event.clientX,
        y: event.clientY,
        width: content.offsetWidth,
        height: content.offsetHeight,
        left: win.offsetLeft,
        top: win.offsetTop,
        minWidth: Number(win.dataset.minWidth),
        minHeight: Number(win.dataset.minHeight)
    };
}

document.addEventListener('mousemove', function (event) {
    if (!resize) return;
    event.preventDefault();
    const r = resize;
    const dx = event.clientX - r.x;
    const dy = event.clientY - r.y;
    let width = r.width;
    let height = r.height;
    let left = r.left;
    let top = r.top;

    if (r.dir.indexOf('e') !== -1) width = Math.max(r.minWidth, r.width + dx);
    if (r.dir.indexOf('s') !== -1) height = Math.max(r.minHeight, r.height + dy);
    if (r.dir.indexOf('w') !== -1) {
        width = Math.max(r.minWidth, r.width - dx);
        left = r.left + r.width - width;
    }
    if (r.dir.indexOf('n') !== -1) {
        height = Math.max(r.minHeight, r.height - dy);
        top = r.top + r.height - height;
        if (top < 0) { height += top; top = 0; } // 标题栏不能拖出屏幕顶部
    }

    r.content.style.width = width + 'px';
    r.content.style.height = height + 'px';
    r.win.style.left = left + 'px';
    r.win.style.top = top + 'px';
});

document.addEventListener('mouseup', function () {
    if (!resize) return;
    resize.overlay.remove();
    resize = null;
});

// 状态栏右下角的缩放把手（.size-grip）等同于右下角缩放
document.addEventListener('mousedown', function (event) {
    const grip = event.target.closest('.size-grip');
    const win = grip && grip.closest('window');
    if (win && win.dataset.resizable !== 'false') startResize(event, win, 'se');
});

// 控制台调试用：setSnapDistance(20)
window.setSnapDistance = function (distance) {
    snapDistance = distance;
};
