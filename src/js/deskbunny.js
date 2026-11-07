// 桌面宠物：右下角从任务栏后探出半个身子的像素兔子（Godzilla，原型是一只狮子兔）。
// 悬停：竖耳朵探头、说话、冒爱心；点击：缩一下再弹出来；右键：Win98 菜单。
// 精灵图 res/img/desk-bunny.png 由她的照片生成：6 帧 × 80px，按 1:1 显示；帧由 data-frame 切换（样式见 index.css）。

(function () {
    const desk = document.getElementById('DeskBackground');
    if (!desk) return;

    const LINES = [
        "Hi, I'm Godzilla!",
        '今天也毛茸茸的',
        '粉粉的小鼻子',
        'Got any grass?',
        '我爱吃草草',
        'Ears up. Listening.'
    ];

    const pet = createEl('button', 'desk-bunny');
    pet.type = 'button';
    pet.setAttribute('aria-label', 'Godzilla the bunny');
    const sprite = createEl('span', 'desk-bunny-sprite');
    const balloon = createEl('span', 'desk-bunny-balloon');
    balloon.hidden = true;
    pet.append(balloon, sprite);
    desk.appendChild(pet);

    let hovered = false;
    let busy = false;          // 点击动画进行中，空闲小动作和悬停都先让路
    let idleTimer = null;
    let balloonTimer = null;
    let lastLine = -1;

    function show(frame) {
        sprite.dataset.frame = frame;
    }

    function rest() {
        show(hovered ? 'alert' : 'idle');
    }

    // 按顺序播放 [帧, 毫秒] 列表，结束后回到静止帧
    function play(steps, done) {
        let i = 0;
        (function next() {
            if (i >= steps.length) {
                if (done) done(); else rest();
                return;
            }
            show(steps[i][0]);
            setTimeout(next, steps[i][1]);
            i++;
        })();
    }

    function say(text) {
        if (!text) {
            let n;
            do { n = Math.floor(Math.random() * LINES.length); } while (n === lastLine && LINES.length > 1);
            lastLine = n;
            text = LINES[n];
        }
        balloon.textContent = text;
        balloon.hidden = false;
        clearTimeout(balloonTimer);
        balloonTimer = setTimeout(function () { balloon.hidden = true; }, 2600);
    }

    function heart(delay) {
        setTimeout(function () {
            const img = createEl('img', 'desk-bunny-heart');
            img.src = asset('img/desk-bunny-heart.png');
            img.alt = '';
            // 横向位置随机，落在头顶附近（动态位置，允许内联）
            img.style.left = (24 + Math.floor(Math.random() * 32)) + 'px';
            img.addEventListener('animationend', function () { img.remove(); });
            pet.appendChild(img);
        }, delay || 0);
    }

    // 空闲时偶尔眨眼、动鼻子、抖耳朵
    function scheduleIdle() {
        clearTimeout(idleTimer);
        idleTimer = setTimeout(function () {
            if (!busy) {
                const roll = Math.random();
                if (roll < 0.45) {
                    play([['blink', 140]]);
                } else if (roll < 0.8) {
                    play([['nose', 120], [hovered ? 'alert' : 'idle', 120], ['nose', 120]]);
                } else if (!hovered) {
                    play([['twitch', 180], ['idle', 120], ['twitch', 180]]);
                }
            }
            scheduleIdle();
        }, 2200 + Math.random() * 3800);
    }

    function cheer(text) {
        if (busy) return;
        busy = true;
        play([['duck', 160], ['happy', 900]], function () {
            busy = false;
            rest();
        });
        setTimeout(function () {
            say(text || '我爱吃草草');
            heart(0); heart(180); heart(360);
        }, 160);
    }

    pet.addEventListener('mouseenter', function () {
        hovered = true;
        if (busy) return;
        show('alert');
        say();
        heart(120);
    });

    pet.addEventListener('mouseleave', function () {
        hovered = false;
        if (!busy) show('idle');
    });

    pet.addEventListener('click', function () { cheer(); });

    pet.addEventListener('contextmenu', function (event) {
        event.preventDefault();
        event.stopPropagation();
        openPopupMenu([
            { label: '&Pet', bold: true, action: function () { cheer('Purr... wait, rabbits don\'t purr.'); } },
            { label: '&Feed Grass', action: function () { cheer('Nom nom nom'); } },
            '-',
            { label: '&About Godzilla', action: function () { openUrl(new URL('src/page/Godzilla.html', location.href).href); } }
        ], event.clientX, event.clientY);
    });

    show('idle');
    scheduleIdle();
})();
