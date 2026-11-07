// 小兔子吃草：点击放下一棵草，兔子跑过去吃掉

(function () {
    const IMG = {
        grass: '../../res/img/tall-grass-png-hd-photo-16.png',
        eating: '../../res/img/tuEat.gif',
        idle: '../../res/img/tuStatic.png'
    };
    const EAT_DURATION = 1000;

    const container = document.getElementById('container');
    const rabbit = document.getElementById('rabbit');
    let eating = false;

    document.addEventListener('click', function (event) {
        if (eating) return;

        const x = event.clientX;
        const y = event.clientY;

        const grass = document.createElement('img');
        grass.className = 'grass';
        grass.src = IMG.grass;
        grass.alt = '';
        grass.style.left = x + 'px';
        grass.style.top = y + 'px';
        container.appendChild(grass);

        rabbit.style.transform = 'translate(' + (x - rabbit.clientWidth / 2) + 'px, ' + (y - rabbit.clientHeight / 2) + 'px)';

        rabbit.addEventListener('transitionend', function (e) {
            if (e.propertyName !== 'transform') return;
            eating = true;
            rabbit.src = IMG.eating;
            setTimeout(function () {
                grass.remove();
                rabbit.src = IMG.idle;
                eating = false;
            }, EAT_DURATION);
        }, { once: true });
    });
})();
