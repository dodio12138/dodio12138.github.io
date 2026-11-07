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

    // My Projects 子菜单：项目列表 + 打开文件夹（与 My Projects 窗口共用 loadProjects()）
    loadProjects()
        .then(function (projects) {
            projectsMenu.replaceChildren();
            projects.forEach(function (project) {
                const item = document.createElement('li');
                item.className = 'start-menu-item';
                item.setAttribute('role', 'menuitem');
                item.dataset.href = project.url;
                item.title = project.description;
                const icon = document.createElement('img');
                icon.src = projectIcon(project, 16);
                icon.alt = '';
                const label = document.createElement('span');
                label.className = 'label';
                label.textContent = project.name;
                item.append(icon, label);
                projectsMenu.appendChild(item);
            });
            const separator = document.createElement('li');
            separator.className = 'start-menu-separator';
            separator.setAttribute('role', 'separator');
            const open = document.createElement('li');
            open.className = 'start-menu-item';
            open.setAttribute('role', 'menuitem');
            open.dataset.action = 'projects';
            const icon = document.createElement('img');
            icon.src = icon16('folder');
            icon.alt = '';
            const label = document.createElement('span');
            label.className = 'label';
            label.textContent = 'Open My Projects Folder';
            open.append(icon, label);
            projectsMenu.append(separator, open);
        })
        .catch(function (error) {
            projectsMenu.querySelector('.start-menu-empty').textContent = '(Unavailable)';
            console.error('Error loading projects:', error);
        });
})();
