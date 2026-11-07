// 点击兔子：在兔子上方弹出自我介绍气泡，再点一次收起

(function () {
    const bunny = document.getElementById('tuGif');
    const bubble = document.getElementById('bubble');

    bunny.addEventListener('click', function () {
        bubble.hidden = !bubble.hidden;
    });
})();
