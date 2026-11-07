// 通用弹出菜单（右键菜单、菜单栏、下拉列表共用）
//
// 菜单项格式：'-' 为分隔线，其余为对象：
//   { label: '&Open', action: fn, shortcut: 'F5', disabled, checked, radio, bold, icon, items: [...] }
// label 中 & 后面的字母显示下划线；items 为子菜单。

let menuStack = [];     // 当前打开的各级弹出层
let menuOwner = null;   // 打开菜单的元素（菜单栏等），在它上面按下鼠标不会关闭菜单
let menuOnClose = null;

// '&File' → <u>F</u>ile
function menuLabel(text) {
    const span = document.createElement('span');
    const parts = String(text).split('&');
    span.append(parts[0]);
    parts.slice(1).forEach(function (part) {
        if (!part) return;
        const u = document.createElement('u');
        u.textContent = part[0];
        span.append(u, part.slice(1));
    });
    return span;
}

function closeMenusFrom(level) {
    menuStack.splice(level).forEach(function (popup) { popup.remove(); });
}

function placePopup(popup, x, y, anchorLeft) {
    document.body.appendChild(popup);
    const width = popup.offsetWidth;
    const height = popup.offsetHeight;
    if (x + width > window.innerWidth) {
        x = anchorLeft !== undefined ? anchorLeft - width : window.innerWidth - width;
    }
    if (y + height > window.innerHeight) {
        y = window.innerHeight - height;
    }
    popup.style.left = Math.max(0, Math.round(x)) + 'px';
    popup.style.top = Math.max(0, Math.round(y)) + 'px';
}

function buildPopup(items, level) {
    const popup = document.createElement('div');
    popup.className = 'menu-popup';
    popup.setAttribute('role', 'menu');

    items.forEach(function (item) {
        if (item === '-') {
            const separator = document.createElement('div');
            separator.className = 'menu-separator';
            popup.appendChild(separator);
            return;
        }

        const entry = document.createElement('div');
        entry.className = 'menu-entry';
        entry.setAttribute('role', 'menuitem');
        entry.classList.toggle('disabled', !!item.disabled);
        entry.classList.toggle('bold', !!item.bold);

        const mark = document.createElement('span');
        mark.className = 'menu-mark';
        if (item.icon) {
            const img = document.createElement('img');
            img.src = item.icon;
            img.alt = '';
            mark.appendChild(img);
        } else if (item.checked) {
            mark.textContent = item.radio ? '●' : '✓';
        }

        const label = menuLabel(item.label);
        label.className = 'menu-label';

        const tail = document.createElement('span');
        tail.className = item.items ? 'menu-arrow' : 'menu-shortcut';
        if (!item.items && item.shortcut) tail.textContent = item.shortcut;

        entry.append(mark, label, tail);

        entry.addEventListener('mouseenter', function () {
            closeMenusFrom(level + 1);
            popup.querySelectorAll('.menu-entry.active').forEach(function (el) { el.classList.remove('active'); });
            entry.classList.add('active');
            if (item.items && !item.disabled) {
                const rect = entry.getBoundingClientRect();
                const child = buildPopup(item.items, level + 1);
                placePopup(child, rect.right - 3, rect.top - 3, rect.left + 3);
                menuStack.push(child);
            }
        });

        entry.addEventListener('click', function (event) {
            event.stopPropagation();
            if (item.disabled || item.items) return;
            closePopupMenu();
            if (item.action) item.action();
        });

        popup.appendChild(entry);
    });

    // 在空白处或分隔线上按下鼠标不关闭菜单
    popup.addEventListener('mousedown', function (event) { event.preventDefault(); });
    return popup;
}

// 在 (x, y) 打开弹出菜单。options.owner：菜单所属元素；options.onClose：关闭时回调；
// options.className：额外样式（如 'listbox' 为组合框下拉列表）；options.width：固定宽度
function openPopupMenu(items, x, y, options) {
    closePopupMenu();
    options = options || {};
    menuOwner = options.owner || null;
    menuOnClose = options.onClose || null;
    const popup = buildPopup(items, 0);
    if (options.className) popup.classList.add(options.className);
    if (options.width) popup.style.width = options.width + 'px';
    placePopup(popup, x, y);
    menuStack = [popup];
    return popup;
}

function closePopupMenu() {
    if (!menuStack.length && !menuOnClose) return;
    closeMenusFrom(0);
    const callback = menuOnClose;
    menuOwner = null;
    menuOnClose = null;
    if (callback) callback();
}

function isMenuOpen() {
    return menuStack.length > 0;
}

// 菜单栏：menus = [{ label: '&File', items: function () { return [...]; } }]
// items 用函数返回，打开时才计算，可反映当前状态（禁用、勾选）
function createMenuBar(menus) {
    const bar = document.createElement('div');
    bar.className = 'menubar';
    bar.setAttribute('role', 'menubar');
    let openIndex = -1;

    function open(index) {
        const button = bar.children[index];
        const rect = button.getBoundingClientRect();
        openPopupMenu(menus[index].items(), rect.left, rect.bottom, {
            owner: bar,
            onClose: function () {
                button.classList.remove('open');
                openIndex = -1;
            }
        });
        button.classList.add('open');
        openIndex = index;
    }

    menus.forEach(function (menu, index) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'menubar-item';
        button.appendChild(menuLabel(menu.label));
        button.addEventListener('mousedown', function (event) {
            event.preventDefault();
            if (openIndex === index) {
                closePopupMenu();
            } else {
                open(index);
            }
        });
        button.addEventListener('mouseenter', function () {
            if (openIndex !== -1 && openIndex !== index) open(index);
        });
        bar.appendChild(button);
    });

    return bar;
}

// 全局只绑定一次：点击菜单外、按 Esc、页面失焦（如点进 iframe）时关闭菜单
document.addEventListener('mousedown', function (event) {
    if (!menuStack.length) return;
    const inside = menuStack.some(function (popup) { return popup.contains(event.target); });
    if (!inside && !(menuOwner && menuOwner.contains(event.target))) closePopupMenu();
}, true);

document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && menuStack.length) {
        event.stopPropagation();
        closePopupMenu();
    }
}, true);

window.addEventListener('blur', closePopupMenu);
window.addEventListener('resize', closePopupMenu);

// ---------- Win98 提示框：替代浏览器自带的 title 提示 ----------
// 鼠标停留 600ms 后在指针下方显示；元素的 title 暂存到 data-tip，避免出现两个提示

(function () {
    const DELAY = 600;
    let tip = null;
    let timer = null;
    let target = null;

    function hide() {
        clearTimeout(timer);
        if (tip) tip.remove();
        tip = null;
        target = null;
    }

    document.addEventListener('mouseover', function (event) {
        const el = event.target.closest('[title], [data-tip]');
        if (!el || el === target || el.tagName === 'IFRAME') return;
        hide();
        if (el.hasAttribute('title')) {
            el.dataset.tip = el.getAttribute('title');
            el.removeAttribute('title');
        }
        if (!el.dataset.tip) return;
        target = el;
        const x = event.clientX;
        const y = event.clientY;
        timer = setTimeout(function () {
            if (target !== el || isMenuOpen()) return;
            tip = document.createElement('div');
            tip.className = 'tooltip';
            tip.textContent = el.dataset.tip;
            document.body.appendChild(tip);
            const left = Math.min(x, window.innerWidth - tip.offsetWidth - 2);
            const top = y + 20 + tip.offsetHeight > window.innerHeight ? y - tip.offsetHeight - 4 : y + 20;
            tip.style.left = Math.max(0, left) + 'px';
            tip.style.top = Math.max(0, top) + 'px';
        }, DELAY);
    });

    document.addEventListener('mouseout', function (event) {
        if (target && !target.contains(event.relatedTarget)) hide();
    });
    document.addEventListener('mousedown', hide, true);
    document.addEventListener('wheel', hide, { passive: true });
    window.addEventListener('blur', hide);
})();
