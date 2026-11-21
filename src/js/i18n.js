// 界面语言：English / 简体中文（开始 → 设置 → 区域设置）。
// 选择保存在访客自己浏览器的 localStorage 里，和 Win98 一样“重新启动”（刷新页面）后生效。
//
// 翻译只针对界面文字，作品名、仓库说明、视频标题、记事本正文等内容保持原样：
// - t(text)：按 ZH 字典逐字匹配，再试 ZH_PATTERNS（带数字、文件名的动态文字）
// - menuLabel()（菜单、选项卡）和窗口标题在生成时调用 t()
// - 其余由 createEl 写入的界面文字，由下面的文本节点翻译在插入页面时统一处理，
//   这样各个应用不用逐个改代码；I18N_SKIP 里的区域是内容，不翻译

const LANG_KEY = 'levy95-language';
const LANGUAGES = [
    { value: 'en', name: 'English (United States)' },
    { value: 'zh', name: '中文 (简体)' }
];

const LANG = (function () {
    let value = null;
    try { value = localStorage.getItem(LANG_KEY); } catch (error) { /* 无痕模式等 */ }
    return value === 'zh' ? 'zh' : 'en';
})();

function saveLanguage(value) {
    try { localStorage.setItem(LANG_KEY, value); } catch (error) { /* 无痕模式等：只在本次生效 */ }
}

const ZH = {
    // ---------- 菜单（Win98 中文版写法：文件(F)） ----------
    '&File': '文件(&F)', '&Edit': '编辑(&E)', '&View': '查看(&V)', '&Go': '转到(&G)',
    'F&avorites': '收藏(&A)', '&Help': '帮助(&H)',
    '&Programs': '程序(&P)', '&My Projects': '我的项目(&M)', '&Games': '游戏(&G)', '&Tools': '工具(&T)',
    '&Links': '链接(&L)', '&Settings': '设置(&S)', 'Sh&ut Down...': '关闭系统(&U)...',
    '&Open': '打开(&O)', '&Open...': '打开(&O)...', '&Close': '关闭(&C)', 'E&xit': '退出(&X)',
    '&New': '新建(&N)', '&Save': '保存(&S)', 'Save &As...': '另存为(&A)...', '&Download as .txt': '下载为 .txt(&D)',
    '&Undo': '撤消(&U)', 'Cu&t': '剪切(&T)', '&Copy': '复制(&C)', '&Paste': '粘贴(&P)', 'De&lete': '删除(&L)',
    '&Delete': '删除(&D)', 'Select &All': '全选(&A)', 'Time/&Date': '时间/日期(&D)',
    '&Find...': '查找(&F)...', 'Find &Next': '查找下一个(&N)', '&Word Wrap': '自动换行(&W)',
    '&Status Bar': '状态栏(&S)', '&Links Bar': '链接栏(&L)', '&Preview': '预览(&P)', '&Source': '源文件(&S)',
    '&Language': '语言(&L)', 'Lar&ge Icons': '大图标(&G)', '&Details': '详细资料(&D)', '&List': '列表(&L)',
    '&Grid': '网格(&G)', 'Arrange &Icons': '排列图标(&I)', 'by &Name': '按名称(&N)', 'by &Type': '按类型(&T)',
    '&Refresh': '刷新(&R)', 'P&roperties': '属性(&R)', 'R&estore': '还原(&E)', '&Restore': '还原(&R)',
    'Mi&nimize': '最小化(&N)', 'Ma&ximize': '最大化(&X)',
    '&Cascade Windows': '层叠窗口(&C)', '&Minimize All Windows': '最小化所有窗口(&M)',
    '&Restore All Windows': '还原所有窗口(&R)', '&Adjust Date/Time': '调整日期/时间(&A)',
    '&Back': '后退(&B)', '&Forward': '前进(&F)', 'Sto&p': '停止(&P)', '&Home Page': '主页(&H)',
    '&Back to List': '返回列表(&B)', '&Back to Photos': '返回照片(&B)', '&View Photo': '查看照片(&V)',
    '&Copy Link': '复制链接(&C)', '&Copy Address': '复制地址(&C)', '&Copy Shortcut': '复制快捷方式(&C)',
    'Copy &Profile Link': '复制主页链接(&P)', 'Open in &New Tab': '在新标签页中打开(&N)',
    'Open in New &Tab': '在新标签页中打开(&T)', 'Open Levy &Browser': '打开 Levy 浏览器(&B)',
    'Visit &Website': '访问网站(&W)', '&Search': '搜索(&S)', '&Play': '播放(&P)',
    '&Newest First': '最新优先(&N)', '&Most Played': '播放最多(&M)', 'Empty Recycle &Bin': '清空回收站(&B)',
    'View devices by &type': '按类型查看设备(&T)', 'View devices by &connection': '按连接查看设备(&C)',
    '&General': '常规(&G)', '&Device Manager': '设备管理(&D)', '&Performance': '性能(&P)',
    '&Date/Time': '日期/时间(&D)', '&Time Zone': '时区(&T)', '&Regional Settings': '区域设置(&R)',
    '&Pet': '摸摸(&P)', '&Feed Grass': '喂草(&F)',
    'Open on &GitHub': '在 GitHub 上打开(&G)', 'Open Profile on &GitHub': '在 GitHub 上打开主页(&G)',
    'Open on &Bilibili': '在 Bilibili 上打开(&B)', 'Open &Space Page': '打开空间主页(&S)',
    '&Open on Instagram': '在 Instagram 上打开(&O)', 'Open &Profile on Instagram': '在 Instagram 上打开主页(&P)',
    'Open &Profile on itch.io': '在 itch.io 上打开主页(&P)',
    'Open &Lévy Flight Studio on itch.io': '在 itch.io 上打开列维飞行工作室(&L)',

    // ---------- 桌面、开始菜单、窗口标题 ----------
    "Levy's PC": 'Levy 的电脑', 'Recycle Bin': '回收站', 'Levy Browser': 'Levy 浏览器',
    'My Projects': '我的项目', "Dodio's Blog": 'Dodio 的博客', 'Notepad': '记事本',
    'Lévy Flight': '列维飞行', 'Lévy Flight Studio': '列维飞行工作室',
    'Start': '开始', 'Display Properties': '显示 属性', 'Date/Time': '日期/时间',
    'Date/Time Properties': '日期/时间 属性', 'System Properties': '系统 属性',
    'Regional Settings': '区域设置', 'Regional Settings Properties': '区域设置 属性',
    'Untitled - Notepad': '无标题 - 记事本', 'Untitled': '无标题', 'Save As': '另存为', 'Find': '查找',
    'All on itch.io': 'itch.io 上的全部作品', 'Open My Projects Folder': '打开“我的项目”文件夹',

    // ---------- 桌面图标提示 ----------
    'Click here to begin.': '单击这里开始。',
    'Every link opens here.': '所有链接都在这里打开。',
    'Things I made in my spare time.': '我在业余时间做的东西。',
    'Some interesting HTML stuffs.': '一些有趣的网页小玩意。',
    'I locked myself in the terminal !': '我把自己锁在终端里了！',
    'About me - links included.': '关于我——附带链接。',
    'What this desktop really runs on.': '这个桌面真正运行在什么电脑上。',
    'Files that did not make it.': '没能留下来的文件。',
    "Levy's repositories on GitHub": 'Levy 在 GitHub 上的仓库',
    "Levy's games on itch.io": 'Levy 在 itch.io 上的游戏',
    "Levy's videos on Bilibili": 'Levy 在 Bilibili 上的视频',
    'Lévy Flight Studio - my game studio': '列维飞行工作室——我的游戏工作室',

    // ---------- 对话框按钮与通用文字 ----------
    'OK': '确定', 'Cancel': '取消', 'Apply': '应用', 'Yes': '是', 'No': '否',
    'Back': '后退', 'Forward': '前进', 'Stop': '停止', 'Refresh': '刷新', 'Home': '主页',
    'Go': '转到', 'Address': '地址', 'Links': '链接', 'Favorites': '收藏夹', 'Done': '完毕',
    'Internet': 'Internet', 'Properties': '属性', 'Remove': '删除', 'Print...': '打印...',
    'Restore': '还原', 'Error': '错误', 'Loading...': '正在加载...', 'Name': '名称',
    'Description': '说明', 'Type': '类型', 'Size': '大小', 'Updated': '更新于',
    'Original Location': '原位置', 'Date Deleted': '删除日期', 'Language': '语言',
    'Date': '日期', 'Time': '时间', 'Open in New Tab': '在新标签页中打开',
    '(Empty)': '（空）', '(Unavailable)': '（不可用）', '(Loading...)': '（正在加载...）',
    '(No recent pages)': '（没有最近访问的网页）',

    // ---------- 加载与提示 ----------
    'Loading projects...': '正在加载项目...', 'Loading repositories...': '正在加载仓库...',
    'Loading games...': '正在加载游戏...', 'Loading videos...': '正在加载视频...',
    'Projects are unavailable right now.': '暂时无法加载项目。',
    'Select an item to view its description.': '选择一项即可查看说明。',
    'Select an item to view its description. Double-click to open it.': '选择一项即可查看说明。双击可以打开。',

    // ---------- Levy 浏览器 ----------
    'Every link on this desktop opens here. Type an address above, or pick a page below.':
        '这个桌面上的所有链接都在这里打开。可以在上面输入地址，或从下面选择一个网页。',
    'This page cannot be displayed here': '无法在这里显示该网页',
    'Please try the following:': '请尝试以下操作：',
    'Click Open in New Tab to view the page in a real browser tab.': '单击“在新标签页中打开”，在真正的浏览器标签页中查看该网页。',
    'Click the Back button to return to the previous page.': '单击“后退”按钮返回上一页。',
    'Cannot find server': '找不到服务器',
    'Check the address for typing errors.': '检查地址是否输入有误。',
    'Click the Home button to see a list of pages.': '单击“主页”按钮查看网页列表。',
    'Navigation canceled': '已取消导航', 'You stopped loading this page.': '你停止了加载该网页。',
    'Play on itch.io': '在 itch.io 上玩', 'Open on itch.io': '在 itch.io 上打开',
    'Game': '游戏', 'Tool': '工具', 'Play in browser': '可在浏览器中玩',
    'itch.io pages cannot be shown inside other sites, so the game opens in a new tab.':
        'itch.io 的页面不能嵌入其他网站，所以会在新标签页中打开。',
    "A tiny browser that lives on Levy's desktop.": '住在 Levy 桌面上的一个小浏览器。',
    'Pages from dodio12138.github.io open right here. Sites that refuse to be shown inside other pages can be opened in a new tab.':
        'dodio12138.github.io 上的网页会直接在这里打开；不允许被嵌入的网站可以在新标签页中打开。',

    // ---------- 系统属性 ----------
    'System:': '系统：', 'Registered to:': '注册到：', 'Computer:': '计算机：',
    'Second Edition': '第二版', 'Performance status': '性能状态', 'Advanced settings': '高级设置',
    'Memory:': '内存：', 'System Resources:': '系统资源：', 'File System:': '文件系统：',
    'Virtual Memory:': '虚拟内存：', 'Disk Compression:': '磁盘压缩：', 'PC Cards (PCMCIA):': 'PC 卡 (PCMCIA)：',
    '97% free': '97% 可用', 'Not installed': '未安装', 'No PC Card sockets are installed.': '未安装 PC 卡插槽。',
    'Your system is configured for optimal performance.': '系统已配置为最佳性能。',
    'File System...': '文件系统...', 'Graphics...': '图形...', 'Virtual Memory...': '虚拟内存...',
    'Display adapters': '显示卡', 'Disk drives': '磁盘驱动器', 'Monitors': '监视器', 'Processors': '处理器',
    'System memory': '系统内存', 'Operating system': '操作系统',

    // ---------- 回收站 ----------
    'This folder contains files that did not make it.': '这个文件夹里是没能留下来的文件。',
    'The Recycle Bin is empty.': '回收站为空。',
    'Confirm File Delete': '确认文件删除', 'Confirm Multiple File Delete': '确认删除多个文件',
    'Are you sure you want to delete all of the items in the Recycle Bin?': '确实要删除“回收站”中的所有项目吗？',
    'Open v7': '打开 v7',

    // ---------- 区域设置 ----------
    'Many programs support international settings for numbers, currencies, times, and dates. Choose the language Levy95 uses for menus and dialogs.':
        '许多程序支持数字、货币、时间和日期的国际设置。请选择 Levy95 菜单和对话框使用的语言。',
    'System Settings Change': '系统设置改变',
    'You must restart your computer before the new settings will take effect.\n\nDo you want to restart your computer now?':
        '必须重新启动计算机，新的设置才能生效。\n\n现在就重新启动计算机吗？',

    // ---------- 显示 / 日期时间 / 关机 ----------
    'Automatically adjust clock for daylight saving changes': '根据夏令时自动调节时钟',
    'Background color:': '背景颜色：', '&Background color:': '背景颜色(&B)：',
    "It's now safe to turn off": '现在可以安全地关闭',
    'your computer.': '计算机了。',
    'Click anywhere to restart': '单击任意位置重新启动'
};

// 带数字、名字的动态文字
const ZH_PATTERNS = [
    [/^(\d+) object\(s\)$/, function (m, n) { return n + ' 个对象'; }],
    [/^(\d+) game\(s\)$/, function (m, n) { return n + ' 个作品'; }],
    [/^(\d+) photo\(s\)$/, function (m, n) { return n + ' 张照片'; }],
    [/^(\d{1,2}):(\d\d) (AM|PM)$/, function (m, h, min, ap) { return (ap === 'AM' ? '上午 ' : '下午 ') + h + ':' + min; }],
    [/^(.+) - Levy Browser$/, function (m, page) { return t(page) + ' - Levy 浏览器'; }],
    [/^(.+) - Notepad$/, function (m, file) { return t(file) + ' - 记事本'; }],
    [/^&About (.+)$/, function (m, name) { return '关于 ' + t(name) + '(&A)'; }],
    [/^About (.+)$/, function (m, name) { return '关于 ' + t(name); }],
    [/^(.+) Properties$/, function (m, name) { return t(name) + ' 属性'; }],
    [/^Are you sure you want to delete '(.+)'\?$/, function (m, name) { return '确实要删除“' + name + '”吗？'; }],
    [/^Cannot restore (.+?)\. (.*)$/, function (m, name, rest) { return '无法还原 ' + name + '。' + rest; }],
    [/^Original location: (.+)$/, function (m, place) { return '原位置：' + place; }],
    [/^Date deleted: (.+)$/, function (m, date) { return '删除日期：' + date; }],
    [/^Shortcut to (.+)$/, function (m, name) { return name + ' 的快捷方式'; }]
];

function t(text) {
    if (LANG !== 'zh' || typeof text !== 'string') return text;
    if (Object.prototype.hasOwnProperty.call(ZH, text)) return ZH[text];
    for (let i = 0; i < ZH_PATTERNS.length; i++) {
        if (ZH_PATTERNS[i][0].test(text)) return text.replace(ZH_PATTERNS[i][0], ZH_PATTERNS[i][1]);
    }
    return text;
}

// ---------- 页面上的界面文字 ----------
// 内容区域（项目说明、仓库、视频、记事本正文、作品页等）不翻译
const I18N_SKIP = '.notepad-preview, .notepad-text, .listview tbody, .iconview-item, .card-title, .card-text, ' +
    '.folder-side-name, .browser-game h1, .browser-game-info > p:not(.browser-detail), .mypc-leaf, .start-menu-band, textarea, script, style';

function translateTextNode(node) {
    const raw = node.nodeValue;
    const text = raw.trim();
    if (!text || !/[A-Za-z]/.test(text)) return;
    const parent = node.parentElement;
    if (!parent || parent.closest(I18N_SKIP)) return;
    const out = t(text);
    if (out !== text) node.nodeValue = raw.replace(text, out);
}

function translateAttributes(el) {
    if (el.closest(I18N_SKIP)) return;
    ['title', 'placeholder', 'aria-label'].forEach(function (name) {
        const value = el.getAttribute(name);
        if (value) {
            const out = t(value);
            if (out !== value) el.setAttribute(name, out);
        }
    });
}

function translateTree(root) {
    if (root.nodeType === Node.TEXT_NODE) {
        translateTextNode(root);
        return;
    }
    if (root.nodeType !== Node.ELEMENT_NODE) return;
    translateAttributes(root);
    root.querySelectorAll('[title], [placeholder], [aria-label]').forEach(translateAttributes);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) translateTextNode(node);
}

if (LANG === 'zh') {
    document.documentElement.lang = 'zh-CN';
    translateTree(document.body);
    // 之后由各应用插入或改写的文字（窗口、菜单、状态栏、对话框……）
    new MutationObserver(function (records) {
        records.forEach(function (record) {
            if (record.type === 'characterData') translateTextNode(record.target);
            else if (record.type === 'attributes') translateAttributes(record.target);
            else record.addedNodes.forEach(translateTree);
        });
    }).observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ['title', 'placeholder', 'aria-label']
    });
}
