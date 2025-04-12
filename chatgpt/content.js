// ChatGPT 平台功能
function initializeChatGPT() {
    // 监听DOM变化
    const observer = new MutationObserver(() => {
        // 查找所有包含 whitespace-pre-wrap 类的 div
        const contentDivs = document.querySelectorAll('.whitespace-pre-wrap');

        contentDivs.forEach(div => {
            // 获取父 div
            const parentDiv = div.parentElement;
            if (!parentDiv) return;

            // 查找父 div 中包含 -mr-3.5 类的第一个子 div
            const targetDiv = parentDiv.querySelector('div[class*="-mr-3.5"]');
            if (!targetDiv) return;

            // 添加自定义类
            targetDiv.classList.add('rewrite-btn');
        });
    });

    // 开始观察
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // 处理已存在的元素
    const contentDivs = document.querySelectorAll('.whitespace-pre-wrap');
    contentDivs.forEach(div => {
        const parentDiv = div.parentElement;
        if (!parentDiv) return;

        const targetDiv = parentDiv.querySelector('div[class*="-mr-3.5"]');
        if (!targetDiv) return;

        targetDiv.classList.add('rewrite-btn');
    });
}

// 初始化
initializeChatGPT();
