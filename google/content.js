// 监听 HTTP 请求，修改 Accept-Language 头部，尽量避免重定向
chrome.webRequest.onBeforeSendHeaders.addListener(
    function (details) {
        const headers = details.requestHeaders.map(header => {
            // 设置请求的 Accept-Language 为英文，避免重定向到香港站点
            if (header.name.toLowerCase() === 'accept-language') {
                header.value = 'en-US,en;q=0.9';
            }
            return header;
        });
        return { requestHeaders: headers };
    },
    { urls: ["*://*.google.com/*"] }, // 只针对 google.com 的请求
    ["blocking", "requestHeaders"]
);

// 监听网页加载完成，检查是否被重定向到 google.com.hk
chrome.webNavigation.onCommitted.addListener(function (details) {
    if (details.url.includes('google.com.hk')) {
        // 如果被重定向到 google.com.hk，强制跳回 google.com
        chrome.tabs.update(details.tabId, { url: 'https://www.google.com/ncr' });
    }
});

// 监听 HTTP 响应，拦截 302 重定向响应头
chrome.webRequest.onHeadersReceived.addListener(
    function (details) {
        const locationHeader = details.responseHeaders.find(
            header => header.name.toLowerCase() === 'location'
        );

        if (locationHeader && locationHeader.value.includes('google.com.hk')) {
            // 如果是 google.com.hk 的重定向，修改 Location 头，跳回 google.com
            locationHeader.value = 'https://www.google.com/';
            return { responseHeaders: details.responseHeaders };
        }
    },
    { urls: ["*://*.google.com/*"], types: ["main_frame"] },
    ["blocking", "responseHeaders"]
);
