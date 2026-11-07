// 任务栏时钟（Win98 样式 h:mm AM/PM，悬停显示日期）和“日期/时间 属性”对话框（月历 + 指针时钟 + 时区）。
// 网页无法修改电脑时间，对话框只用于查看。

const CLOCK_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const CLOCK_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function formatClock(date, withSeconds) {
    const h = date.getHours() % 12 || 12;
    return h + ':' + pad2(date.getMinutes()) + (withSeconds ? ':' + pad2(date.getSeconds()) : '') + ' ' + (date.getHours() < 12 ? 'AM' : 'PM');
}

function formatLongDate(date) {
    return CLOCK_DAYS[date.getDay()] + ', ' + CLOCK_MONTHS[date.getMonth()] + ' ' + pad2(date.getDate()) + ', ' + date.getFullYear();
}

function timeZoneLabel() {
    const offset = -new Date().getTimezoneOffset();
    const sign = offset >= 0 ? '+' : '-';
    const abs = Math.abs(offset);
    const zone = (Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local time').replace(/_/g, ' ');
    return '(GMT' + sign + pad2(Math.floor(abs / 60)) + ':' + pad2(abs % 60) + ') ' + zone;
}

// ---------- 任务栏时钟 ----------

(function () {
    const clock = document.getElementById('taskbar-time');
    const tray = clock.closest('.tray');
    let lastText = '';

    function tick() {
        const now = new Date();
        const text = formatClock(now, false);
        if (text !== lastText) {
            clock.textContent = text;
            // 悬停提示（由 menu.js 的提示框显示）
            clock.dataset.tip = formatLongDate(now);
            lastText = text;
        }
    }

    tick();
    setInterval(tick, 1000);

    tray.title = '';
    tray.addEventListener('dblclick', function () { datetimewin(); });
    tray.addEventListener('contextmenu', function (event) {
        event.preventDefault();
        event.stopPropagation();
        openPopupMenu([
            { label: '&Adjust Date/Time', bold: true, action: datetimewin },
            '-',
            { label: '&Cascade Windows', action: cascadeWindows },
            { label: '&Minimize All Windows', action: function () { allWindows().forEach(minimizeWindow); } }
        ], event.clientX, event.clientY);
    });

    DesktopActions.datetime = function () { datetimewin(); };
})();

// ---------- 日期/时间 属性 ----------

let datetimeInstance = null;

function datetimewin() {
    if (datetimeInstance && datetimeInstance.isConnected) {
        focusWindow(datetimeInstance);
        return;
    }
    datetimeInstance = createDatetime();
}

function createDatetime() {
    const win = createWindow('datetimewin', 420, 300, 'Date/Time Properties', icon16('clock'), { resizable: false });
    const content = win.querySelector('.wincontent');
    content.classList.add('dialog-wincontent');

    const today = new Date();
    let shownYear = today.getFullYear();
    let shownMonth = today.getMonth();
    let timer = null;

    // 选项卡
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

    // ---------- 日期和时间页 ----------
    const datePage = createEl('div', 'datetime-page');

    const dateGroup = createEl('fieldset', 'groupbox');
    dateGroup.appendChild(createEl('legend', '', 'Date'));
    const monthBar = createEl('div', 'calendar-bar');
    const prev = createEl('button', 'btn btn-small', '◀');
    prev.type = 'button';
    prev.title = 'Previous month';
    const monthLabel = createEl('span', 'calendar-month field');
    const next = createEl('button', 'btn btn-small', '▶');
    next.type = 'button';
    next.title = 'Next month';
    monthBar.append(prev, monthLabel, next);
    const calendar = createEl('div', 'calendar');
    dateGroup.append(monthBar, calendar);

    const timeGroup = createEl('fieldset', 'groupbox');
    timeGroup.appendChild(createEl('legend', '', 'Time'));
    const SVG = 'http://www.w3.org/2000/svg';
    const face = document.createElementNS(SVG, 'svg');
    face.setAttribute('viewBox', '0 0 100 100');
    face.setAttribute('class', 'analog-clock');
    face.setAttribute('shape-rendering', 'crispEdges');
    let marks = '<circle cx="50" cy="50" r="47" class="analog-face"/>';
    for (let i = 0; i < 60; i++) {
        const a = i * Math.PI / 30;
        const big = i % 5 === 0;
        const x = 50 + Math.sin(a) * (big ? 41 : 43);
        const y = 50 - Math.cos(a) * (big ? 41 : 43);
        marks += big
            ? '<rect x="' + (x - 2.5).toFixed(1) + '" y="' + (y - 2.5).toFixed(1) + '" width="5" height="5" class="analog-hour-mark"/>'
            : '<rect x="' + (x - 1).toFixed(1) + '" y="' + (y - 1).toFixed(1) + '" width="2" height="2" class="analog-minute-mark"/>';
    }
    marks += '<line x1="50" y1="50" x2="50" y2="26" class="analog-hour"/>' +
        '<line x1="50" y1="50" x2="50" y2="14" class="analog-minute"/>' +
        '<line x1="50" y1="58" x2="50" y2="10" class="analog-second"/>' +
        '<rect x="47" y="47" width="6" height="6" class="analog-pin"/>';
    face.innerHTML = marks;
    const digital = createEl('div', 'field digital-time');
    timeGroup.append(face, digital);

    datePage.append(dateGroup, timeGroup);

    // ---------- 时区页 ----------
    const zonePage = createEl('div', 'datetime-zone');
    const zoneField = createEl('div', 'field zone-field', timeZoneLabel());
    const globe = createEl('img', 'zone-globe');
    globe.src = icon32('globe');
    globe.alt = '';
    const dst = createEl('label', 'checkbox');
    const dstBox = createEl('input');
    dstBox.type = 'checkbox';
    dstBox.checked = true;
    dstBox.disabled = true;
    dst.append(dstBox, createEl('span', '', 'Automatically adjust clock for daylight saving changes'));
    zonePage.append(globe, zoneField, dst);

    addTab('date', '&Date/Time', datePage);
    addTab('zone', '&Time Zone', zonePage);

    const footer = createEl('p', 'datetime-footer', 'Current time zone: ' + timeZoneLabel());

    const buttons = createEl('div', 'dialog-buttons');
    [['OK', true], ['Cancel', false]].forEach(function (spec) {
        const button = createEl('button', 'btn' + (spec[1] ? ' btn-default' : ''), spec[0]);
        button.type = 'button';
        button.addEventListener('click', function () { closeWindow(win); });
        buttons.appendChild(button);
    });
    const apply = createEl('button', 'btn', 'Apply');
    apply.type = 'button';
    apply.disabled = true;
    buttons.appendChild(apply);

    content.append(tabs, footer, buttons);

    function renderCalendar() {
        monthLabel.textContent = CLOCK_MONTHS[shownMonth] + ' ' + shownYear;
        calendar.replaceChildren();
        ['S', 'M', 'T', 'W', 'T', 'F', 'S'].forEach(function (d) { calendar.appendChild(createEl('span', 'calendar-head', d)); });
        const first = new Date(shownYear, shownMonth, 1).getDay();
        const days = new Date(shownYear, shownMonth + 1, 0).getDate();
        for (let i = 0; i < first; i++) calendar.appendChild(createEl('span', 'calendar-day empty'));
        for (let d = 1; d <= days; d++) {
            const cell = createEl('span', 'calendar-day', String(d));
            if (d === today.getDate() && shownMonth === today.getMonth() && shownYear === today.getFullYear()) {
                cell.classList.add('today');
            }
            calendar.appendChild(cell);
        }
    }

    function setHand(selector, angle) {
        face.querySelector(selector).setAttribute('transform', 'rotate(' + angle + ' 50 50)');
    }

    function tick() {
        if (!win.isConnected) {
            clearInterval(timer);
            return;
        }
        const now = new Date();
        const s = now.getSeconds();
        const m = now.getMinutes() + s / 60;
        const h = (now.getHours() % 12) + m / 60;
        setHand('.analog-second', s * 6);
        setHand('.analog-minute', m * 6);
        setHand('.analog-hour', h * 30);
        digital.textContent = formatClock(now, true);
    }

    prev.addEventListener('click', function () {
        shownMonth--;
        if (shownMonth < 0) { shownMonth = 11; shownYear--; }
        renderCalendar();
    });
    next.addEventListener('click', function () {
        shownMonth++;
        if (shownMonth > 11) { shownMonth = 0; shownYear++; }
        renderCalendar();
    });

    showTab('date');
    renderCalendar();
    openWindow(win);   // 先挂载，tick() 会检查窗口是否还在页面上
    tick();
    timer = setInterval(tick, 1000);
    return win;
}
