function time() {
    var date = new Date();
    hours = date.getHours();
    min = date.getMinutes();
    sec = date.getSeconds();
    if (sec<10){
        document.getElementById('taskbar-time').innerHTML = hours + ':' + min + ':0' + sec;
    }else{
        document.getElementById('taskbar-time').innerHTML = hours + ':' + min + ':' + sec;
    }
    
}
setInterval("time()", 500);

var BunnyGame = document.getElementById('BunnyGame');

var stuff = document.getElementById('Stuff');

var FunPages = document.getElementById('FunPages');

var MeTerminal = document.getElementById('MeTerminal');

var blog = document.getElementById('Blog');

var isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// 窗口吸附和对齐功能
class WindowSnap {
    constructor() {
        this.snapDistance = 10; // 吸附距离（像素）- 调整为10px
        this.isDragging = false;
        this.currentWindow = null;
        this.windows = [];
        this.init();
    }

    init() {
        // 监听窗口的创建和移动
        this.observeWindows();
    }

    observeWindows() {
        // 使用 MutationObserver 监听窗口的添加
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeName && node.nodeName.toLowerCase() === 'window') {
                        this.addWindowListeners(node);
                    }
                });
            });
        });

        observer.observe(document.getElementById('windows') || document.body, {
            childList: true,
            subtree: true
        });

        // 为现有窗口添加监听器
        this.updateWindowsList();
    }

    updateWindowsList() {
        this.windows = Array.from(document.querySelectorAll('window'));
        this.windows.forEach(window => this.addWindowListeners(window));
    }

    addWindowListeners(windowElement) {
        const titlebar = windowElement.querySelector('windowTitlebar');
        if (!titlebar) return;

        // 避免重复添加监听器
        if (titlebar.hasAttribute('data-snap-listeners')) return;
        titlebar.setAttribute('data-snap-listeners', 'true');

        titlebar.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            this.currentWindow = windowElement;
            this.updateWindowsList();
            
            // 设置窗口为最高层级
            const maxZ = Math.max(...this.windows.map(w => parseInt(w.style.zIndex) || 0));
            windowElement.style.zIndex = maxZ + 1;
        });

        document.addEventListener('mouseup', () => {
            if (this.isDragging && this.currentWindow === windowElement) {
                this.isDragging = false;
                this.currentWindow = null;
            }
        });

        document.addEventListener('mousemove', (e) => {
            if (this.isDragging && this.currentWindow === windowElement) {
                this.handleWindowSnap(windowElement, e);
            }
        });
    }

    handleWindowSnap(draggedWindow, event) {
        if (!this.isDragging) return;

        const draggedRect = draggedWindow.getBoundingClientRect();
        const snapPositions = this.calculateSnapPositions(draggedWindow);
        let bestSnap = null;
        let minDistance = this.snapDistance;

        // 找到最近的吸附位置
        snapPositions.forEach(position => {
            const draggedRect = draggedWindow.getBoundingClientRect();
            
            // 检测被拖拽窗口的边缘是否靠近目标位置
            let distance = Infinity;
            
            if (position.type.includes('right')) {
                // 检测拖拽窗口的左边缘是否靠近目标窗口的右边缘
                distance = Math.abs(draggedRect.left - position.x);
            } else if (position.type.includes('left')) {
                // 检测拖拽窗口的右边缘是否靠近目标窗口的左边缘
                distance = Math.abs(draggedRect.right - position.x);
            } else if (position.type.includes('bottom')) {
                // 检测拖拽窗口的上边缘是否靠近目标窗口的下边缘
                distance = Math.abs(draggedRect.top - position.y);
            } else if (position.type.includes('top')) {
                // 检测拖拽窗口的下边缘是否靠近目标窗口的上边缘
                distance = Math.abs(draggedRect.bottom - position.y);
            }

            if (distance < minDistance) {
                minDistance = distance;
                bestSnap = position;
            }
        });

        // 检查屏幕边缘吸附
        const screenSnap = this.getScreenEdgeSnap(draggedWindow, event);
        if (screenSnap && screenSnap.distance < minDistance) {
            bestSnap = screenSnap;
        }

        // 执行最佳吸附
        if (bestSnap) {
            draggedWindow.style.left = bestSnap.snapX + 'px';
            draggedWindow.style.top = bestSnap.snapY + 'px';
        }

        // 确保窗口不会移动到屏幕外
        this.constrainToScreen(draggedWindow);
    }

    constrainToScreen(windowElement) {
        const rect = windowElement.getBoundingClientRect();
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        const taskbarHeight = document.getElementById('BottomBar')?.offsetHeight || 40;

        let newLeft = parseInt(windowElement.style.left) || rect.left;
        let newTop = parseInt(windowElement.style.top) || rect.top;

        // 确保窗口左边不超出屏幕
        if (newLeft < 0) {
            newLeft = 0;
        }

        // 确保窗口右边不超出屏幕
        if (newLeft + rect.width > screenWidth) {
            newLeft = screenWidth - rect.width;
        }

        // 确保窗口顶部不超出屏幕
        if (newTop < 0) {
            newTop = 0;
        }

        // 确保窗口底部不超出屏幕（考虑任务栏）
        if (newTop + rect.height > screenHeight - taskbarHeight) {
            newTop = screenHeight - taskbarHeight - rect.height;
        }

        // 应用限制后的位置
        windowElement.style.left = newLeft + 'px';
        windowElement.style.top = newTop + 'px';
    }

    calculateSnapPositions(draggedWindow) {
        const snapPositions = [];
        const draggedRect = draggedWindow.getBoundingClientRect();

        this.windows.forEach(window => {
            if (window === draggedWindow) return;

            const rect = window.getBoundingClientRect();
            
            // 计算边缘吸附位置，并检查是否需要边缘对齐
            const edgeSnapPositions = [
                // 吸附到目标窗口的右边缘（拖拽窗口在右侧）
                { 
                    x: rect.right, 
                    y: this.getAlignedY(draggedRect, rect),  // 检查上下边缘对齐
                    snapX: rect.right,
                    snapY: this.getAlignedY(draggedRect, rect),
                    type: 'edge-snap-right'
                },
                // 吸附到目标窗口的左边缘（拖拽窗口在左侧）
                { 
                    x: rect.left, 
                    y: this.getAlignedY(draggedRect, rect),  // 检查上下边缘对齐
                    snapX: rect.left - draggedRect.width,
                    snapY: this.getAlignedY(draggedRect, rect),
                    type: 'edge-snap-left'
                },
                // 吸附到目标窗口的下边缘（拖拽窗口在下方）
                { 
                    x: this.getAlignedX(draggedRect, rect),  // 检查左右边缘对齐
                    y: rect.bottom,
                    snapX: this.getAlignedX(draggedRect, rect),
                    snapY: rect.bottom,
                    type: 'edge-snap-bottom'
                },
                // 吸附到目标窗口的上边缘（拖拽窗口在上方）
                { 
                    x: this.getAlignedX(draggedRect, rect),  // 检查左右边缘对齐
                    y: rect.top,
                    snapX: this.getAlignedX(draggedRect, rect),
                    snapY: rect.top - draggedRect.height,
                    type: 'edge-snap-top'
                }
            ];

            snapPositions.push(...edgeSnapPositions);
        });

        return snapPositions;
    }

    // 检查并返回对齐的Y坐标（上下边缘对齐）
    getAlignedY(draggedRect, targetRect) {
        // 检查拖拽窗口的上边缘是否接近目标窗口的上边缘
        if (Math.abs(draggedRect.top - targetRect.top) <= this.snapDistance) {
            return targetRect.top;
        }
        // 检查拖拽窗口的下边缘是否接近目标窗口的下边缘
        if (Math.abs(draggedRect.bottom - targetRect.bottom) <= this.snapDistance) {
            return targetRect.bottom - draggedRect.height;
        }
        // 如果没有对齐条件，保持当前Y位置
        return draggedRect.top;
    }

    // 检查并返回对齐的X坐标（左右边缘对齐）
    getAlignedX(draggedRect, targetRect) {
        // 检查拖拽窗口的左边缘是否接近目标窗口的左边缘
        if (Math.abs(draggedRect.left - targetRect.left) <= this.snapDistance) {
            return targetRect.left;
        }
        // 检查拖拽窗口的右边缘是否接近目标窗口的右边缘
        if (Math.abs(draggedRect.right - targetRect.right) <= this.snapDistance) {
            return targetRect.right - draggedRect.width;
        }
        // 如果没有对齐条件，保持当前X位置
        return draggedRect.left;
    }

    getScreenEdgeSnap(draggedWindow, event) {
        const rect = draggedWindow.getBoundingClientRect();
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        const taskbarHeight = document.getElementById('BottomBar')?.offsetHeight || 40;

        const snapPositions = [];

        // 左边缘 - 检测窗口左边缘是否靠近屏幕左边缘
        if (Math.abs(rect.left) < this.snapDistance) {
            snapPositions.push({
                x: 0,
                y: rect.top,
                snapX: 0,
                snapY: rect.top,
                distance: Math.abs(rect.left),
                type: 'screen-left'
            });
        }

        // 右边缘 - 检测窗口右边缘是否靠近屏幕右边缘
        if (Math.abs(rect.right - screenWidth) < this.snapDistance) {
            snapPositions.push({
                x: screenWidth,
                y: rect.top,
                snapX: screenWidth - rect.width,
                snapY: rect.top,
                distance: Math.abs(rect.right - screenWidth),
                type: 'screen-right'
            });
        }

        // 上边缘 - 检测窗口上边缘是否靠近屏幕上边缘
        if (Math.abs(rect.top) < this.snapDistance) {
            snapPositions.push({
                x: rect.left,
                y: 0,
                snapX: rect.left,
                snapY: 0,
                distance: Math.abs(rect.top),
                type: 'screen-top'
            });
        }

        // 下边缘 - 检测窗口下边缘是否靠近屏幕下边缘（考虑任务栏）
        const bottomEdge = screenHeight - taskbarHeight;
        if (Math.abs(rect.bottom - bottomEdge) < this.snapDistance) {
            snapPositions.push({
                x: rect.left,
                y: bottomEdge,
                snapX: rect.left,
                snapY: bottomEdge - rect.height,
                distance: Math.abs(rect.bottom - bottomEdge),
                type: 'screen-bottom'
            });
        }

        // 返回最近的屏幕边缘吸附位置
        return snapPositions.length > 0 ? snapPositions.reduce((closest, current) => 
            current.distance < closest.distance ? current : closest
        ) : null;
    }

    handleScreenEdgeSnap(draggedWindow, event) {
        // 这个方法现在由 handleWindowSnap 调用，保留以兼容性
        const screenSnap = this.getScreenEdgeSnap(draggedWindow, event);
        if (screenSnap) {
            draggedWindow.style.left = screenSnap.snapX + 'px';
            draggedWindow.style.top = screenSnap.snapY + 'px';
            return true;
        }
        return false;
    }
}

// 初始化窗口吸附功能
var windowSnap = new WindowSnap();

BunnyGame.addEventListener('dblclick', function (event) {
    //event.preventDefault();
    window.open(BunnyGame.href, '_blank'); // 在新窗口中打开链接
});
BunnyGame.onclick = function (event) {
    if (isMobile) {
        //window.open(BunnyGame.href, '_blank')
    }
    else {
        event.preventDefault(); // 阻止默认行为
        return false; // 取消事件传播
    }
};

FunPages.addEventListener('dblclick', function (event) {
    //event.preventDefault();
    window.open(FunPages.href, '_blank'); // 在新窗口中打开链接
});
FunPages.onclick = function (event) {
    if (isMobile) {
        //window.open(BunnyGame.href, '_blank')
    }
    else {
        event.preventDefault(); // 阻止默认行为
        return false; // 取消事件传播
    }
};

blog.addEventListener('dblclick', function (event) {
    //event.preventDefault();
    window.open(blog.href, '_blank'); // 在新窗口中打开链接
});
blog.onclick = function (event) {
    if (isMobile) {
        //window.open(BunnyGame.href, '_blank')
    }
    else {
        event.preventDefault(); // 阻止默认行为
        return false; // 取消事件传播
    }
};

// MeTerminal.addEventListener('dblclick', function (event) {
//     //event.preventDefault();
//     window.open(MeTerminal.href, '_blank'); // 在新窗口中打开链接
// });
// MeTerminal.onclick = function (event) {
//     if (isMobile) {
//         //window.open(MeTerminal.href, '_blank')
//     }
//     else {
//         event.preventDefault(); // 阻止默认行为
//         return false; // 取消事件传播
//     }
// };

// 全局便捷函数
// 设置吸附距离
window.setSnapDistance = (distance) => {
    windowSnap.snapDistance = distance;
    console.log('窗口吸附距离设置为: ' + distance + 'px');
};

// 获取窗口管理器实例
window.getWindowSnap = () => windowSnap;

// 显示帮助信息
window.showWindowSnapHelp = () => {
    console.log('窗口边缘吸附功能使用说明:\n\n' +
        '🖱️ 拖拽功能:\n' +
        '- 边缘吸附: 拖拽窗口时自动吸附到其他窗口的边缘\n' +
        '- 屏幕边缘吸附: 拖拽到屏幕边缘时自动吸附\n' +
        '- 边缘对齐: 吸附时自动对齐上下或左右边缘\n' +
        '- 窗口不会移动到屏幕外\n\n' +
        '💻 控制台命令:\n' +
        '- setSnapDistance(像素): 设置吸附距离 (默认10px)\n' +
        '- getWindowSnap(): 获取窗口管理器实例\n' +
        '- showWindowSnapHelp(): 显示此帮助信息\n\n' +
        '✨ 吸附类型:\n' +
        '- 窗口可以吸附到其他窗口的四个边缘（上、下、左、右）\n' +
        '- 拖拽窗口接近目标窗口边缘10px时自动吸附\n' +
        '- 支持屏幕四边缘吸附（考虑任务栏高度）\n' +
        '- 智能边缘对齐: 左右吸附时检查上下边缘对齐，上下吸附时检查左右边缘对齐');
};