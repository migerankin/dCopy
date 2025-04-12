// 贴吧平台功能将在这里实现 

// 过滤广告内容
function filterAds() {
    // 查找所有广告标签
    const adLabels = document.querySelectorAll('span.label_text, span.mediago-ad, span.ec-tuiguang');

    adLabels.forEach(label => {
        if (label.textContent === '广告') {
            if (label.classList.contains('mediago-ad')) {
                // 对于 mediago-ad，获取第四级父元素
                let parent = label.parentElement.parentElement.parentElement;

                if (parent && parent.tagName === 'DIV') {
                    parent.style.display = 'none';
                }
            }
            else if (label.classList.contains('ec-tuiguang')) {
                // 对于 ec-tuiguang，获取第十二级父元素
                let parent = label.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement;
                if (parent && parent.tagName === 'DIV') {
                    parent.style.display = 'none';
                }
            }
            else {
                // 原有的广告处理逻辑
                const adContainer = label.parentElement;
                if (adContainer) {
                    adContainer.style.display = 'none';
                }
            }
        }
    });
}

// 监听DOM变化
const observer = new MutationObserver(() => {
    filterAds();
});

// 初始执行
filterAds();

// 开始观察
observer.observe(document.body, {
    childList: true,
    subtree: true
}); 