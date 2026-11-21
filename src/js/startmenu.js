// 开始菜单：点击 Start 打开/关闭，悬停或点击展开子菜单，菜单项通过 DesktopActions 执行

(function () {
    const startButton = document.querySelector('.start-button');
    const menu = document.getElementById('start-menu');
    const shutdownScreen = document.getElementById('shutdown-screen');
    const projectsMenu = document.getElementById('start-projects');
    if (!startButton || !menu) return;

    DesktopActions.shutdown = function () {
        shutdownScreen.classList.add('show');
    };

    function isOpen() {
        return menu.classList.contains('open');
    }

    function setOpen(open) {
        if (open) loadThumbs();
        menu.classList.toggle('open', open);
        startButton.classList.toggle('pressed', open);
        startButton.setAttribute('aria-expanded', String(open));
        if (!open) {
            menu.querySelectorAll('.start-menu-item.active').forEach(function (item) {
                item.classList.remove('active');
            });
        }
    }

    // 同一层级只高亮一个菜单项（子菜单随之展开/收起）
    function setActive(item) {
        Array.from(item.parentNode.children).forEach(function (sibling) {
            sibling.classList.toggle('active', sibling === item);
        });
        fitSubmenu(item);
    }

    // 子菜单默认与父项顶部对齐；超出任务栏上沿时整体上移（与 Windows 一致）
    function fitSubmenu(item) {
        const submenu = item.querySelector(':scope > .start-submenu');
        if (!submenu) return;
        submenu.style.top = '';
        const rect = submenu.getBoundingClientRect();
        const limit = window.innerHeight - taskbarHeight();
        if (rect.bottom > limit) {
            const shift = Math.min(rect.bottom - limit, rect.top);
            submenu.style.top = (parseFloat(getComputedStyle(submenu).top) - shift) + 'px';
        }
    }

    startButton.addEventListener('click', function () {
        setOpen(!isOpen());
    });

    menu.addEventListener('mouseover', function (event) {
        const item = event.target.closest('.start-menu-item');
        if (item) setActive(item);
    });

    menu.addEventListener('click', function (event) {
        const item = event.target.closest('.start-menu-item');
        if (!item) return;

        // 有子菜单的项：点击只展开（方便触屏）
        if (item.classList.contains('has-submenu')) {
            setActive(item);
            return;
        }
        setOpen(false);
        runDesktopItem(item);
    });

    document.addEventListener('mousedown', function (event) {
        if (isOpen() && !menu.contains(event.target) && !startButton.contains(event.target)) {
            setOpen(false);
        }
    });

    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') {
            setOpen(false);
            shutdownScreen.classList.remove('show');
        }
    });

    shutdownScreen.addEventListener('click', function () {
        shutdownScreen.classList.remove('show');
    });

    // 子菜单里的一项：data-href 打开链接，data-action 调用 DesktopActions（点击时由 runDesktopItem 处理）
    function submenuItem(label, iconSrc, options) {
        const item = createEl('li', 'start-menu-item');
        item.setAttribute('role', 'menuitem');
        if (options.href) item.dataset.href = options.href;
        if (options.action) item.dataset.action = options.action;
        if (options.title) item.title = options.title;
        const icon = createEl('img');
        icon.src = iconSrc;
        icon.alt = '';
        item.append(icon, createEl('span', 'label', label));
        return item;
    }

    function separator() {
        const line = createEl('li', 'start-menu-separator');
        line.setAttribute('role', 'separator');
        return line;
    }

    function showMessage(list, text) {
        list.replaceChildren(createEl('li', 'start-menu-empty', text));
    }

    // My Projects 子菜单：项目列表 + 打开文件夹（与 My Projects 窗口共用 loadProjects()）
    loadProjects()
        .then(function (projects) {
            projectsMenu.replaceChildren();
            projects.forEach(function (project) {
                projectsMenu.appendChild(submenuItem(project.name, projectIcon(project, 16), {
                    href: project.url,
                    title: project.description
                }));
            });
            projectsMenu.append(separator(), submenuItem('Open My Projects Folder', icon16('folder'), { action: 'projects' }));
        })
        .catch(function (error) {
            showMessage(projectsMenu, '(Unavailable)');
            console.error('Error loading projects:', error);
        });

    // 作品图标用封面缩略图；第一次打开开始菜单时才下载封面（先显示 itch.io 图标）
    let thumbsWanted = false;
    function loadThumbs() {
        thumbsWanted = true;
        menu.querySelectorAll('.start-menu-item[data-cover]').forEach(function (item) {
            const icon = item.querySelector('img');
            if (icon) icon.replaceWith(pixelThumb(item.dataset.cover, 16, icon16('itch')));
            delete item.dataset.cover;
        });
    }

    // Games / Tools 子菜单：itch.io 上的作品按 itch.io 的分类分组；
    // 分类未知的（旧数据）先算作游戏。最后一项打开 itch.io 窗口看全部作品。
    const gamesMenu = document.getElementById('start-games');
    const toolsMenu = document.getElementById('start-tools');
    if (gamesMenu && toolsMenu) {
        loadData('itch')
            .then(function (data) {
                const items = data.items || [];
                const fill = function (list, entries) {
                    list.replaceChildren();
                    if (!entries.length) {
                        list.appendChild(createEl('li', 'start-menu-empty', '(Empty)'));
                    }
                    entries.forEach(function (game) {
                        const label = game.studio ? game.title + ' (' + game.studio + ')' : game.title;
                        const item = submenuItem(label, icon16('itch'), { href: game.url, title: game.text });
                        if (game.cover) item.dataset.cover = game.cover;
                        list.appendChild(item);
                    });
                    list.append(separator(), submenuItem('All on itch.io', icon16('itch'), { action: 'itch' }));
                };
                fill(gamesMenu, items.filter(function (game) { return game.kind !== 'tool'; }));
                fill(toolsMenu, items.filter(function (game) { return game.kind === 'tool'; }));
                if (thumbsWanted) loadThumbs();
            })
            .catch(function (error) {
                showMessage(gamesMenu, '(Unavailable)');
                showMessage(toolsMenu, '(Unavailable)');
                console.error('Error loading itch.io data:', error);
            });
    }
})();
