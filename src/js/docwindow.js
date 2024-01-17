function docwindow() {
    document.getElementById('windows').appendChild(createWindow(500, 400,'Document'))
}


function closewindow(button) {
    var window = button.parentNode.parentNode;
    window.remove();
}

function createWindow(width, height,title) {
    const windowDiv = document.createElement('window');
    const windowTitlebar = document.createElement('windowTitlebar');
    const TitlebarImg = document.createElement('img');
    const Title = document.createElement('div');
    Title.className = 'windows-title';
    const winmin = document.createElement('button');
    winmin.className = 'winbarbutton';
    const winmax = document.createElement('button');
    winmax.className = 'winbarbutton';
    const winclose = document.createElement('button');
    winclose.className = 'winbarbutton';

    const minicon = document.createElement('span');
    minicon.className = 'winbaricon';
    const maxicon = document.createElement('span');
    maxicon.className = 'winbaricon';
    const closeicon = document.createElement('span');
    closeicon.className = 'winbaricon';

    winclose.setAttribute('onclick', 'closewindow(this)');


    windowDiv.appendChild(windowTitlebar);
    windowTitlebar.appendChild(TitlebarImg);
    windowTitlebar.appendChild(Title);
    winmin.appendChild(minicon);
    winmax.appendChild(maxicon);
    winclose.appendChild(closeicon);
    windowTitlebar.appendChild(winmin);
    windowTitlebar.appendChild(winmax);
    windowTitlebar.appendChild(winclose);

    windowDiv.style.width = width + 'px';
    windowDiv.style.height = height + 'px';
    windowDiv.style.top = `calc(40% - ${height/2}px)`;
    windowDiv.style.left = `calc(40% - ${width/2}px)`;

    TitlebarImg.src = "../../res/img/directory_closed_cool-0.png";
    TitlebarImg.style.width = '16px';
    TitlebarImg.style.height = '16px';
    TitlebarImg.style.marginLeft = '2px';

    winclose.style.margin = '0px 2px';
    winmin.innerHTML = '_';
    winmax.innerHTML = '□';
    winclose.innerHTML = 'X';

    Title.innerHTML = title;
    
    return windowDiv;
}