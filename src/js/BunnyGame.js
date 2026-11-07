// 小兔子吃草：点击放下一棵草，兔子跑过去吃掉

(function () {
    const IMG = {
        grass: '../../res/img/tall-grass-png-hd-photo-16.png',
        eating: '../../res/img/tuEat.webp',
        idle: '../../res/img/tuStatic.png'
    };
    const EAT_DURATION = 1000;

    const container = document.getElementById('container');
    const rabbit = document.getElementById('rabbit');
    // 跑动和吃草期间都忽略点击，保证一次只有一棵草
    let busy = false;

    function eat(grass) {
        rabbit.src = IMG.eating;
        setTimeout(function () {
            grass.remove();
            rabbit.src = IMG.idle;
            busy = false;
        }, EAT_DURATION);
    }

    document.addEventListener('click', function (event) {
        if (busy) return;
        busy = true;

        const x = event.clientX;
        const y = event.clientY;

        const grass = document.createElement('img');
        grass.className = 'grass';
        grass.src = IMG.grass;
        grass.alt = '';
        grass.style.left = x + 'px';
        grass.style.top = y + 'px';
        container.appendChild(grass);

        const before = rabbit.style.transform;
        rabbit.style.transform = 'translate(' + (x - rabbit.clientWidth / 2) + 'px, ' + (y - rabbit.clientHeight / 2) + 'px)';

        // 位置没变就不会有过渡动画（也不会触发 transitionend），直接开吃
        if (rabbit.style.transform === before) {
            eat(grass);
            return;
        }
        rabbit.addEventListener('transitionend', function onEnd(e) {
            if (e.propertyName !== 'transform') return;
            rabbit.removeEventListener('transitionend', onEnd);
            eat(grass);
        });
    });
})();
