function instagramwin() {
    document.getElementById('windows').appendChild(createWindow('instagramwin', 300, 400, 'Instagram - dodio12138', '../../res/img/Ins_logo_pixel.png'));
    const instagramwin = document.getElementById('instagramwin');
    const content = instagramwin.getElementsByClassName('wincontent')[0];
    
    // 设置状态栏文本
    updateStatusBar('instagramwin', 'Loading Instagram profile...');

    // 创建Instagram iframe或内容
    const iframe = document.createElement('iframe');
    iframe.src = 'https://www.instagram.com/dodio12138/';
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    
    // 当iframe加载完成时更新状态
    iframe.onload = function() {
        updateStatusBar('instagramwin', 'Instagram profile loaded');
    };
    
    iframe.onerror = function() {
        updateStatusBar('instagramwin', 'Failed to load Instagram profile');
    };
    
    content.appendChild(iframe);
}