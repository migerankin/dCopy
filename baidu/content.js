// 百度平台功能将在这里实现 

// 过滤广告内容
function filterAds() {
    // 获取搜索结果容器
    const contentLeft = document.getElementById('content_left');
    if (!contentLeft) return;

    // 获取所有一级子div
    const resultDivs = contentLeft.children;

    // 遍历每个搜索结果
    Array.from(resultDivs).forEach(div => {
        if (div.tagName === 'DIV') {
            // 查找广告标识
            const adSpan = div.querySelector('span.ec-tuiguang');
            if (adSpan && adSpan.textContent === '广告') {
                div.style.display = 'none';
            }
        }
    });
}

// 过滤"大家还在搜"
function filterHotSearch() {
    // 查找包含"大家还在搜"的div
    const hotSearchDivs = document.querySelectorAll('div.c-font-medium.c-color-t');

    hotSearchDivs.forEach(div => {
        if (div.textContent === '大家还在搜') {
            // 获取二级父元素
            const parentDiv = div.parentElement?.parentElement;
            if (parentDiv && parentDiv.tagName === 'DIV') {
                parentDiv.style.display = 'none';
            }
        }
    });
}

// 过滤"相关搜索"
function filterRelatedSearch() {
    // 查找包含"相关搜索"的div
    const hotSearchDivs = document.querySelectorAll('div.c-color-t.c-gap-bottom');

    hotSearchDivs.forEach(div => {
        if (div.textContent === '相关搜索') {
            // 获取三级父元素
            const parentDiv = div.parentElement?.parentElement?.parentElement;
            if (parentDiv && parentDiv.tagName === 'DIV') {
                parentDiv.style.display = 'none';
            }
        }
    });
}

// 修改现有的 MutationObserver
const observer = new MutationObserver(() => {
    filterAds();
    filterHotSearch();
    filterRelatedSearch();
});

// 初始执行
filterAds();
filterHotSearch();
filterRelatedSearch();

// 开始观察
observer.observe(document.body, {
    childList: true,
    subtree: true
}); 