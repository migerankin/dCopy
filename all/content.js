// 强制启用 F12
function enableDevTools() {
    // 移除可能禁用 F12、Ctrl+Shift+I、Ctrl+Shift+C 的事件
    document.addEventListener('keydown', function (e) {
        if (e.key === 'F12' ||
            (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'C' || e.key === 'c' || e.key === 'J' || e.key === 'j'))) {
            e.stopPropagation();
            return true;
        }
    }, true);

    // 清除可能禁用开发者工具的定时器
    // const clearTimers = () => {
    //     let id = window.setTimeout(() => { }, 0);
    //     while (id--) {
    //         window.clearTimeout(id);
    //         window.clearInterval(id);
    //     }
    // };

    // 重写可能用于检测和禁用开发者工具的函数
    const overrideFunctions = () => {
        // 防止重写 console
        const consoleProps = Object.getOwnPropertyDescriptor(window, 'console');
        if (consoleProps && consoleProps.configurable) {
            Object.defineProperty(window, 'console', {
                ...consoleProps,
                configurable: false,
                writable: false
            });
        }
    };

    // 执行所有保护措施
    try {
        // clearTimers();
        overrideFunctions();

        // 定期检查和重新应用保护
        setInterval(() => {
            // clearTimers();
            overrideFunctions();
        }, 1000);
    } catch (error) {
        console.log('Protection error:', error);
    }
}

// 检查当前网站是否在排除列表中
function isExcluded() {
    const hostname = window.location.hostname;
    // 添加默认排除网址
    const defaultExcludeList = ['www.douyin.com', 'www.bilibili.com', 'live.bilibili.com', 't.bilibili.com', 'x.com'];

    const result = chrome.storage.sync.get('contextMenuExcludeList');
    const userExcludeList = result.contextMenuExcludeList || [];

    // 合并默认列表和用户列表
    const excludeList = [...defaultExcludeList, ...userExcludeList];

    return excludeList.some(pattern => {
        // 支持通配符匹配
        const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
        return regex.test(hostname);
    });
}

// 强制启用右键菜单和复制功能
function enableContextMenuAndCopy() {
    // 移除禁用右键菜单的事件
    document.addEventListener('contextmenu', function (e) {
        // 获取选中的文本
        const selectedText = window.getSelection().toString();

        // 如果有选中的文���，则执行复制
        if (selectedText) {
            e.preventDefault(); // 阻止默认右键菜单
            e.stopImmediatePropagation();

            // 尝试复制到剪贴板
            navigator.clipboard.writeText(selectedText).then(() => {
                // 可以添加复制成功的视觉反馈
                const feedback = document.createElement('div');
                feedback.textContent = '已复制';
                feedback.style.cssText = `
                    position: fixed;
                    left: ${e.clientX + 10}px;
                    top: ${e.clientY - 20}px;
                    background: rgba(0, 0, 0, 0.7);
                    color: white;
                    padding: 5px 10px;
                    border-radius: 4px;
                    font-size: 12px;
                    pointer-events: none;
                    z-index: 999999;
                    animation: fadeOut 1s forwards;
                `;

                // 添加动画样式
                const style = document.createElement('style');
                style.textContent = `
                    @keyframes fadeOut {
                        0% { opacity: 1; }
                        70% { opacity: 1; }
                        100% { opacity: 0; }
                    }
                `;
                document.head.appendChild(style);

                document.body.appendChild(feedback);
                setTimeout(() => feedback.remove(), 1000);
            }).catch(console.error);

            return false;
        }

        // 如果没有选中文本，则正常显示右键菜单
        e.stopImmediatePropagation();
        return true;
    }, true);

    // 移除禁用复制的事件
    ['copy', 'cut', 'paste', 'select', 'selectstart'].forEach(function (event) {
        document.addEventListener(event, function (e) {
            e.stopImmediatePropagation();
            return true;
        }, true);
    });
}

// 初始化
async function init() {
    enableDevTools();

    // 检查是否应该启用右键菜单和复制功能
    if (!(await isExcluded())) {
        enableContextMenuAndCopy();
    }
}

init();