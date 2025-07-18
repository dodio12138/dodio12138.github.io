function meterminalwin() {
    document.getElementById('windows').appendChild(createWindow('meterminalwin',600, 500,'MeTerminal','../../res/img/console_prompt-0.png'))
    const meterminalwin = document.getElementById('meterminalwin');
    const contect = meterminalwin.getElementsByClassName('wincontent')[0];

    const terminal = document.createElement('iframe');
    terminal.src = 'https://dodio12138.github.io/MeTerminal/src/index.html';

    contect.style.position = 'relative';
    contect.style.overflow = 'hidden';
    contect.style.background = '#252F2A';

    terminal.style.position = 'absolute'
    terminal.style.width = '200%';
    terminal.style.height = '200%';
    terminal.style.top = '-50%';
    terminal.style.left = '-50%';
    terminal.style.flex = 1;
    terminal.style.overflow = 'hidden';
    terminal.style.resize = 'both';
    terminal.style.transform = 'scale(0.5)';
    contect.appendChild(terminal);

    //去除视频遮罩
    // const terminalWindows = terminal.contentWindow;
    // const terminalDocument = terminalWindows.contentDocument;

    // terminalDocument.getElementById('monitor-videos').style.display = 'none';
}