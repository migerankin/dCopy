// 隐藏指定元素
function hideBottomRightElement() {
    // 使用选择器匹配以 bottomRight-- 开头的类名
    const elements = document.querySelectorAll('div[class*="bottomRight-"]');
    elements.forEach(element => {
        element.style.display = 'none';
        element.remove();
    });
}

// 添加批量下载功能
function initializeBatchDownload() {
    // 检查是否是目标页面
    if (!window.location.pathname.match(/\/[^/]+\/user\/\d+/)) return;

    // 创建下载按钮
    const downloadBtn = document.createElement('div');
    downloadBtn.className = 'kemono-batch-download-btn';
    downloadBtn.textContent = '下载';
    downloadBtn.style.cssText = `
        position: fixed;
        right: 20px;
        bottom: 20px;
        padding: 8px 16px;
        background-color: rgba(0, 0, 0, 0.7);
        color: white;
        border-radius: 4px;
        cursor: pointer;
        z-index: 10000;
        font-size: 14px;
    `;

    // 添加下载功能
    downloadBtn.addEventListener('click', async () => {
        try {
            // 更新按钮状态
            downloadBtn.textContent = '准备中...';
            downloadBtn.style.pointerEvents = 'none';

            // 获取标题
            const titleSpan = document.querySelector('.post__title span');
            const userNameElement = document.querySelector('.post__user-name');
            const userName = userNameElement ? userNameElement.textContent.trim() : '';
            const title = titleSpan ? titleSpan.textContent.trim() : 'download';

            // 获取所有图片
            const images = Array.from(document.querySelectorAll('.post__files .post__thumbnail figure a img'));
            if (images.length === 0) {
                throw new Error('没有找到图片');
            }

            // 创建 JSZip 实例
            const JSZip = window.JSZip || (await import('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js')).default;
            const zip = new JSZip();

            // 下载所有图片
            const downloads = images.map(async (img, index) => {
                try {
                    let imgUrl = img.src;
                    // 确保使用完整URL
                    if (imgUrl.startsWith('//')) {
                        imgUrl = 'https:' + imgUrl;
                    }

                    // 使用后台脚本获取图片
                    const response = await new Promise((resolve) => {
                        chrome.runtime.sendMessage({
                            type: 'fetchImage',
                            url: imgUrl
                        }, resolve);
                    });

                    if (!response.success) {
                        throw new Error(response.error || 'Failed to fetch image');
                    }

                    // 将 base64 转回 blob
                    const base64Response = await fetch(response.data);
                    const blob = await base64Response.blob();

                    // 获取文件扩展名
                    const ext = response.type.split('/')[1] || 'jpg';
                    // 生成文件名 (001, 002, etc.)
                    const fileName = `${String(index + 1).padStart(3, '0')}.${ext}`;

                    zip.file(fileName, blob);

                    // 更新进度
                    downloadBtn.textContent = `下载中 ${Math.round((index + 1) * 100 / images.length)}%`;
                } catch (error) {
                    console.error(`Error downloading image ${index + 1}:`, error);
                }
            });

            // 等待所有下载完成
            await Promise.all(downloads);

            // 生成并下载zip文件
            const content = await zip.generateAsync({ type: 'blob' });
            const url = URL.createObjectURL(content);
            const a = document.createElement('a');
            a.href = url;
            // 清理文件名中的非法字符
            const safeTitle = title.replace(/[<>:"/\\|?*]/g, '_').trim();
            const safeUserName = userName.replace(/[<>:"/\\|?*]/g, '_').trim();
            const fileName = safeUserName ? `[${safeUserName}]${safeTitle || 'kemono_images'}` : safeTitle || 'kemono_images';
            a.download = `${fileName}.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            // 恢复按钮状态
            downloadBtn.textContent = '下载';
            downloadBtn.style.pointerEvents = 'auto';
        } catch (error) {
            console.error('Download error:', error);
            downloadBtn.textContent = '下载失败';
            setTimeout(() => {
                downloadBtn.textContent = '下载';
                downloadBtn.style.pointerEvents = 'auto';
            }, 2000);
        }
    });

    document.body.appendChild(downloadBtn);
}

// 修改现有的 observer
const observer = new MutationObserver((mutations) => {
    // 原有的功能保持不变
    mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
            if (node.nodeType === 1) {
                if (node.className && node.className.includes('bottomRight-')) {
                    node.style.display = 'none';
                    node.remove();
                }
                const elements = node.querySelectorAll('div[class*="bottomRight-"]');
                elements.forEach(element => {
                    element.style.display = 'none';
                    element.remove();
                });
            }
        });
    });
});

// 初始化
hideBottomRightElement();
initializeBatchDownload();

// 开始观察
observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class']
}); 