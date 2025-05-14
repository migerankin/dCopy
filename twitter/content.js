// 使用 declarativeNetRequest API 拦截请求并修改 Accept-Language 头部为 en-US
chrome.declarativeNetRequest.onRequest.addListener(
    function (details) {
        // 修改 Accept-Language 请求头为英文（美国）
        if (details.requestHeaders) {
            details.requestHeaders = details.requestHeaders.map(header => {
                if (header.name.toLowerCase() === 'accept-language') {
                    // 设置为 en-US 来模拟美国用户请求
                    header.value = 'en-US,en;q=0.9';
                }
                return header;
            });
        }
        return { requestHeaders: details.requestHeaders };
    },
    { urls: ["*://*.google.com/*"] },  // 仅针对 google.com 的请求
    ["blocking", "requestHeaders"]
);

// 使用 declarativeNetRequest API 拦截 302 重定向响应并修改 Location 头
chrome.declarativeNetRequest.onRequest.addListener(
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

// 检查 URL 中是否含有 google.com.hk 并强制跳回 google.com
chrome.webNavigation.onBeforeNavigate.addListener(function (details) {
    if (details.url.includes('google.com.hk')) {
        chrome.tabs.update(details.tabId, { url: 'https://www.google.com/ncr' }); // 直接跳回
    }
}, { url: [{ hostContains: 'google.com.hk' }] });