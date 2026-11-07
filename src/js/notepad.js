// Notepad：Win98 记事本。只在开始菜单 Programs 里，桌面上的 AboutMe.txt 也用它打开。
//
// 文件：内置文件（NOTEPAD_BUILTIN，随网站发布，只读原件）+ 访客自己保存的文件（存在本浏览器的 localStorage）。
// 访客编辑内置文件后保存，只会在自己的浏览器里保存一份副本，不会影响网站。

const NOTEPAD_BUILTIN = {
    'AboutMe.md': 'res/text/AboutMe.md'
};
const NOTEPAD_STORE = 'notepad-documents';

function readNotepadStore() {
    try {
        const data = JSON.parse(localStorage.getItem(NOTEPAD_STORE) || '{}');
        return data && typeof data === 'object' ? data : {};
    } catch (error) {
        return {};
    }
}

function writeNotepadStore(data) {
    try {
        localStorage.setItem(NOTEPAD_STORE, JSON.stringify(data));
        return true;
    } catch (error) {
        return false; // 无痕模式或存储已满
    }
}

// 读取文件：优先用访客保存的版本，其次是网站内置文件
function readNotepadFile(name) {
    const saved = readNotepadStore();
    if (Object.prototype.hasOwnProperty.call(saved, name)) return Promise.resolve(saved[name]);
    const url = NOTEPAD_BUILTIN[name];
    if (!url) return Promise.reject(new Error('Cannot find the ' + name + ' file.'));
    return fetch(url).then(function (response) {
        if (!response.ok) throw new Error('Cannot open ' + name + '.');
        return response.text();
    });
}

function notepadFileList() {
    const names = Object.keys(NOTEPAD_BUILTIN).concat(Object.keys(readNotepadStore()));
    return names.filter(function (name, i) { return names.indexOf(name) === i; }).sort();
}

// ---------- 极简 Markdown 渲染 ----------
// 支持：# 标题（1-3 级）、**粗体**、*斜体*、`代码`、[链接](网址)、- 列表、> 引用、--- 分隔线。
// 先整体转义 HTML，链接只允许 http(s) 和站内相对路径，所以文件内容无法插入代码。

const CJK = /[\u2e80-\u9fff\uff00-\uffef]/;

// 合并折行：中文与中文之间不加空格
function joinMarkdownLines(lines) {
    return lines.reduce(function (acc, line) {
        if (!acc) return line;
        return CJK.test(acc.slice(-1)) && CJK.test(line[0]) ? acc + line : acc + ' ' + line;
    }, '');
}

function markdownInline(escaped) {
    return escaped
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (match, label, url) {
            const safe = /^https?:\/\//i.test(url) || /^[\w./-]+$/.test(url);
            return safe ? '<a href="' + url + '" title="' + url + '">' + label + '</a>' : label;
        })
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?!\w)/g, '$1<em>$2</em>');
}

function renderMarkdown(source) {
    const lines = escapeHtml(source).replace(/\r/g, '').split('\n');
    const out = [];
    let para = [];
    let list = null;
    let quote = [];

    function flush() {
        if (para.length) out.push('<p>' + markdownInline(joinMarkdownLines(para)) + '</p>');
        if (list) out.push('<ul>' + list.map(function (item) { return '<li>' + markdownInline(joinMarkdownLines(item)) + '</li>'; }).join('') + '</ul>');
        if (quote.length) out.push('<blockquote>' + markdownInline(joinMarkdownLines(quote)) + '</blockquote>');
        para = [];
        list = null;
        quote = [];
    }

    lines.forEach(function (line) {
        const t = line.trim();
        let m;
        if (!t) {
            flush();
        } else if (/^(-{3,}|\*{3,})$/.test(t)) {
            flush();
            out.push('<hr>');
        } else if ((m = t.match(/^(#{1,3})\s+(.*)$/))) {
            flush();
            out.push('<h' + m[1].length + '>' + markdownInline(m[2]) + '</h' + m[1].length + '>');
        } else if ((m = t.match(/^[-*]\s+(.*)$/))) {
            if (para.length || quote.length) flush();
            (list = list || []).push([m[1]]);
        } else if (list && /^\s/.test(line)) {
            list[list.length - 1].push(t); // 列表项的续行（缩进）
        } else if ((m = t.match(/^&gt;\s?(.*)$/))) {
            if (para.length || list) flush();
            quote.push(m[1]);
        } else {
            if (list || quote.length) flush();
            para.push(t);
        }
    });
    flush();
    return out.join('\n');
}

// 多语言文档：用 <!-- lang:en --> / <!-- lang:zh --> 分段；预览时只显示一种语言，可用“翻译”按钮切换
const NOTEPAD_LANGUAGES = { en: 'English', zh: '中文' };

function splitLanguages(source) {
    const re = /^[ \t]*<!--\s*lang:([\w-]+)\s*-->[ \t]*$/gm;
    const marks = [];
    let m;
    while ((m = re.exec(source))) marks.push({ lang: m[1], start: m.index, end: re.lastIndex });
    if (!marks.length) return null;
    const parts = {};
    marks.forEach(function (mark, i) {
        parts[mark.lang] = source.slice(mark.end, i + 1 < marks.length ? marks[i + 1].start : source.length);
    });
    return parts;
}

let notepadCounter = 0;

// 打开记事本；name 为文件名（省略则新建 Untitled）。同一文件已打开时切换到该窗口
function notepadwin(name) {
    if (name) {
        const open = document.querySelector('window[data-notepad-file="' + CSS.escape(name) + '"]');
        if (open) {
            focusWindow(open);
            return open;
        }
    }
    return createNotepad(name || null);
}

function createNotepad(initialName) {
    // 默认宽度刚好容纳 60 个字符一行（AboutMe.txt 按这个宽度排版）
    const width = Math.min(560, window.innerWidth - 14);
    const height = Math.min(400, window.innerHeight - taskbarHeight() - 40);
    const win = createWindow('notepad' + (++notepadCounter), width, height, 'Untitled - Notepad', icon16('notepad'), { minWidth: 220, minHeight: 120 });
    const content = win.querySelector('.wincontent');
    content.classList.add('app-wincontent');

    let fileName = null;
    let savedText = '';
    let wordWrap = true;
    let lastFind = '';
    let preview = false;   // Markdown 预览（.md 文件默认打开）
    let language = 'en';  // 多语言文档默认显示英文，用“翻译”按钮切换

    const text = createEl('textarea', 'notepad-text');
    text.spellcheck = false;
    text.setAttribute('autocomplete', 'off');
    text.setAttribute('aria-label', 'Text');

    const menubar = createMenuBar([
        { label: '&File', items: function () {
            return [
                { label: '&New', action: newFile },
                { label: '&Open', items: notepadFileList().map(function (name) {
                    return { label: name, icon: icon16('text-file'), action: function () { openFile(name); } };
                }) },
                { label: '&Save', shortcut: 'Ctrl+S', action: save },
                { label: 'Save &As...', action: saveAs },
                { label: '&Download as .txt', action: download },
                '-',
                { label: 'E&xit', action: function () { closeWindow(win); } }
            ];
        } },
        { label: '&Edit', items: function () {
            // 预览模式下不能编辑（View → Source 切回源文本）
            const hasSelection = !preview && text.selectionStart !== text.selectionEnd;
            return [
                { label: '&Undo', shortcut: 'Ctrl+Z', disabled: preview, action: function () { text.focus(); document.execCommand('undo'); } },
                '-',
                { label: 'Cu&t', shortcut: 'Ctrl+X', disabled: !hasSelection, action: function () { text.focus(); document.execCommand('cut'); } },
                { label: '&Copy', shortcut: 'Ctrl+C', disabled: !hasSelection, action: function () { text.focus(); document.execCommand('copy'); } },
                { label: '&Paste', shortcut: 'Ctrl+V', disabled: preview || !(navigator.clipboard && navigator.clipboard.readText), action: paste },
                { label: 'De&lete', shortcut: 'Del', disabled: !hasSelection, action: function () { text.focus(); document.execCommand('delete'); } },
                '-',
                { label: 'Select &All', disabled: preview, action: function () { text.focus(); text.select(); } },
                { label: 'Time/&Date', shortcut: 'F5', disabled: preview, action: insertTimeDate },
                '-',
                { label: '&Word Wrap', checked: wordWrap, action: toggleWrap }
            ];
        } },
        { label: '&View', items: function () {
            const langs = Object.keys(splitLanguages(text.value) || {});
            const items = [
                { label: '&Preview', shortcut: 'Ctrl+E', checked: preview, radio: true, action: function () { setPreview(true); } },
                { label: '&Source', shortcut: 'Ctrl+E', checked: !preview, radio: true, action: function () { setPreview(false); } }
            ];
            if (langs.length > 1) {
                items.push('-', { label: '&Language', items: langs.map(function (code) {
                    return { label: languageName(code), checked: language === code, radio: true, action: function () {
                        if (!preview) setPreview(true);
                        setLanguage(code);
                    } };
                }) });
            }
            return items;
        } },
        { label: '&Search', items: function () {
            return [
                { label: '&Find...', action: find },
                { label: 'Find &Next', shortcut: 'F3', disabled: !lastFind, action: function () { findNext(lastFind); } }
            ];
        } },
        { label: '&Help', items: function () {
            return [{ label: '&About Notepad', action: function () {
                aboutDialog('notepadabout', 'Notepad', icon32('notepad'), [
                    'A tiny text editor for this desktop.',
                    'Saved files stay in this browser only.'
                ]);
            } }];
        } }
    ]);

    const previewPane = createEl('div', 'notepad-preview');
    previewPane.hidden = true;

    // 预览工具条：多语言文档才显示，包含“翻译”按钮
    const toolbar = createEl('div', 'notepad-toolbar');
    toolbar.hidden = true;
    const languageLabel = createEl('span', 'notepad-language');
    const translate = createEl('button', 'btn notepad-translate');
    translate.type = 'button';
    translate.title = 'Translate';
    const translateIcon = createEl('img');
    translateIcon.src = icon16('globe');
    translateIcon.alt = '';
    const translateText = createEl('span');
    translate.append(translateIcon, translateText);
    toolbar.append(languageLabel, translate);
    translate.addEventListener('click', function () {
        const langs = Object.keys(splitLanguages(text.value) || {});
        if (langs.length < 2) return;
        setLanguage(langs[(langs.indexOf(language) + 1) % langs.length]);
    });

    content.append(menubar, toolbar, text, previewPane);

    function languageName(code) {
        return NOTEPAD_LANGUAGES[code] || code;
    }

    function setLanguage(code) {
        language = code;
        if (preview) setPreview(true);
        previewPane.scrollTop = 0;
    }

    function isMarkdown() {
        return /\.(md|markdown)$/i.test(fileName || '');
    }

    previewPane.tabIndex = 0;
    previewPane.addEventListener('keydown', function (event) {
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'e') {
            event.preventDefault();
            setPreview(false);
        }
    });

    function setPreview(on) {
        preview = on;
        const parts = splitLanguages(text.value);
        const langs = parts ? Object.keys(parts) : [];
        if (on) {
            let source = text.value;
            if (parts) {
                if (!parts[language]) language = langs[0];
                source = parts[language];
            }
            previewPane.innerHTML = renderMarkdown(source); // 内容已转义，见 renderMarkdown
        }
        toolbar.hidden = !(on && langs.length > 1);
        if (!toolbar.hidden) {
            const next = langs[(langs.indexOf(language) + 1) % langs.length];
            languageLabel.textContent = (language === 'zh' ? '语言：' : 'Language: ') + languageName(language);
            translateText.textContent = language === 'zh' ? 'Translate: ' + languageName(next) : '翻译：' + languageName(next);
        }
        previewPane.hidden = !on;
        text.hidden = on;
        (on ? previewPane : text).focus();
    }

    // ---------- 状态 ----------

    function isDirty() {
        return text.value !== savedText;
    }

    function setDocument(name, value) {
        fileName = name;
        savedText = value;
        text.value = value;
        text.setSelectionRange(0, 0);
        text.scrollTop = 0;
        win.dataset.notepadFile = name || '';
        setPreview(isMarkdown());
        setWindowTitle(win, (name || 'Untitled') + ' - Notepad');
    }

    // 有未保存的修改时询问；返回 true 表示可以继续（已保存或放弃修改）
    function confirmDiscard() {
        if (!isDirty()) return Promise.resolve(true);
        return messageBox({
            title: 'Notepad',
            icon: 'warning',
            message: 'The text in the ' + (fileName || 'Untitled') + ' file has changed.\n\nDo you want to save the changes?',
            buttons: ['Yes', 'No', 'Cancel']
        }).then(function (answer) {
            if (answer === 'Yes') return save();
            return answer === 'No';
        });
    }

    // ---------- 文件 ----------

    function newFile() {
        confirmDiscard().then(function (ok) {
            if (ok) setDocument(null, '');
        });
    }

    function openFile(name) {
        confirmDiscard().then(function (ok) {
            if (!ok) return;
            readNotepadFile(name)
                .then(function (value) { setDocument(name, value); })
                .catch(function (error) {
                    messageBox({ title: 'Notepad', icon: 'warning', message: error.message });
                });
        });
    }

    // 保存到本浏览器；返回 Promise<boolean>（是否保存成功）
    function save() {
        if (!fileName) return saveAs();
        const store = readNotepadStore();
        store[fileName] = text.value;
        if (!writeNotepadStore(store)) {
            return messageBox({ title: 'Notepad', icon: 'warning', message: 'This browser does not allow saving. Use File > Download as .txt instead.' })
                .then(function () { return false; });
        }
        savedText = text.value;
        return Promise.resolve(true);
    }

    function saveAs() {
        return inputDialog({ title: 'Save As', label: 'File &name:', value: fileName || 'Untitled.txt', okLabel: 'Save' })
            .then(function (name) {
                if (name === null) return false;
                name = name.trim().replace(/[\\/:*?"<>|]/g, '');
                if (!name) return false;
                if (!/\.\w+$/.test(name)) name += '.txt';
                fileName = name;
                win.dataset.notepadFile = name;
                setWindowTitle(win, name + ' - Notepad');
                return save();
            });
    }

    // 下载到电脑（真正的 .txt 文件）
    function download() {
        const blob = new Blob([text.value.replace(/\n/g, '\r\n')], { type: 'text/plain;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = fileName || 'Untitled.txt';
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(function () { URL.revokeObjectURL(link.href); }, 1000);
    }

    // ---------- 编辑 ----------

    function insertAtCursor(value) {
        text.focus();
        // execCommand 保留撤销记录；不支持时退回直接替换
        if (!document.execCommand('insertText', false, value)) {
            text.setRangeText(value, text.selectionStart, text.selectionEnd, 'end');
        }
    }

    function paste() {
        navigator.clipboard.readText()
            .then(insertAtCursor)
            .catch(function () {
                messageBox({ title: 'Notepad', icon: 'info', message: 'Use Ctrl+V to paste here.' });
            });
    }

    function insertTimeDate() {
        const now = new Date();
        insertAtCursor(formatClock(now, false) + ' ' + (now.getMonth() + 1) + '/' + now.getDate() + '/' + now.getFullYear());
    }

    function toggleWrap() {
        wordWrap = !wordWrap;
        text.wrap = wordWrap ? 'soft' : 'off';
    }

    // ---------- 查找 ----------

    function find() {
        if (preview) setPreview(false);  // 在源文本里查找
        inputDialog({ title: 'Find', icon: 'notepad', label: 'Fi&nd what:', value: lastFind, okLabel: 'Find Next' })
            .then(function (value) {
                if (value) {
                    lastFind = value;
                    findNext(value);
                }
            });
    }

    function findNext(value) {
        if (!value) return;
        const haystack = text.value.toLowerCase();
        const needle = value.toLowerCase();
        let at = haystack.indexOf(needle, text.selectionEnd);
        if (at === -1) at = haystack.indexOf(needle); // 到末尾后从头再找
        if (at === -1) {
            messageBox({ title: 'Notepad', icon: 'info', message: 'Cannot find "' + value + '"' });
            return;
        }
        text.focus();
        text.setSelectionRange(at, at + value.length);
        // 让选中的文字滚动到可见区域
        const before = text.value.slice(0, at).split('\n').length - 1;
        const lineHeight = parseFloat(getComputedStyle(text).lineHeight) || 16;
        text.scrollTop = Math.max(0, before * lineHeight - text.clientHeight / 2);
    }

    // ---------- 快捷键与关闭 ----------

    text.addEventListener('keydown', function (event) {
        if (event.key === 'F5') { event.preventDefault(); insertTimeDate(); }
        else if (event.key === 'F3') { event.preventDefault(); if (lastFind) findNext(lastFind); else find(); }
        else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') { event.preventDefault(); save(); }
        else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f') { event.preventDefault(); find(); }
        else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'e') { event.preventDefault(); setPreview(true); }
    });

    // 关闭前询问是否保存（标题栏关闭、Alt+F4、File > Exit 都会经过这里）
    win.beforeClose = function () {
        if (!isDirty()) return true;
        confirmDiscard().then(function (ok) {
            if (ok) closeWindow(win, true);
        });
        return false;
    };

    openWindow(win);
    setDocument(null, '');
    if (initialName) {
        readNotepadFile(initialName)
            .then(function (value) { setDocument(initialName, value); })
            .catch(function (error) {
                messageBox({ title: 'Notepad', icon: 'warning', message: error.message });
            });
    }
    text.focus();
    return win;
}
