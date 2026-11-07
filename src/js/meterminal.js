// MeTerminal 窗口：以 50% 缩放嵌入 MeTerminal 页面

function meterminalwin() {
    const win = createWindow('meterminalwin', 600, 500, 'MeTerminal', icon16('console'), { minWidth: 240, minHeight: 160 });
    const content = win.querySelector('.wincontent');
    content.classList.add('meterminal-wincontent');

    const frame = document.createElement('iframe');
    frame.className = 'meterminal-frame';
    frame.title = 'MeTerminal';
    frame.src = 'https://dodio12138.github.io/MeTerminal/src/index.html';
    content.appendChild(frame);

    openWindow(win);
}
