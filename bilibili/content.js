// 检查是否在搜索页面
function isSearchPage() {
    return window.location.hostname === 'search.bilibili.com';
}

// 添加视频帧捕获功能
function initializeFrameCapture() {
    // 如果是搜索页面则不添加截图功能
    if (isSearchPage()) return;

    // 修改选择器以同时匹配两种 video
    const videos = document.querySelectorAll('video[crossorigin="anonymous"], video[webkit-playsinline="true"]');

    videos.forEach(video => {
        // 检查视频尺寸
        const videoWidth = video.offsetWidth;
        const videoHeight = video.offsetHeight;

        // 如果视频尺寸小于 200x110，则不添加截图按钮
        if (videoWidth < 310 || videoHeight < 180) return;

        // 获取二级父元素
        const parentDiv = video.parentElement?.parentElement;
        if (!parentDiv) return;

        // 检查是否已添加按钮
        if (parentDiv.querySelector('.bilibili-save-frame-btn')) return;

        // 确保父元素是相对定位
        if (getComputedStyle(parentDiv).position === 'static') {
            parentDiv.style.position = 'relative';
        }

        // 创建按钮
        const frameBtn = document.createElement('div');
        frameBtn.className = 'bilibili-save-frame-btn';
        frameBtn.textContent = '截图';

        // 更新按钮文本的函数
        const updateBtnText = async (text) => {
            const originalText = frameBtn.textContent;
            frameBtn.textContent = text;
            await new Promise(resolve => setTimeout(resolve, 1000));
            frameBtn.textContent = originalText;
        };

        // 捕获当前帧
        const captureFrame = () => {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            return canvas;
        };

        // 左键下载
        frameBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();

            try {
                const canvas = captureFrame();
                const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `bilibili_frame_${Date.now()}.png`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                await updateBtnText('成功');
            } catch (error) {
                console.error('截图失败:', error);
                await updateBtnText('失败');
            }
        });

        // 右键复制
        frameBtn.addEventListener('mousedown', async (e) => {
            // 只处理右键按下
            if (e.button !== 2) return;

            e.preventDefault();
            e.stopPropagation();

            try {
                const canvas = captureFrame();
                const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
                await navigator.clipboard.write([
                    new ClipboardItem({
                        'image/png': blob
                    })
                ]);
                await updateBtnText('成功');
            } catch (error) {
                console.error('复制帧失败:', error);
                await updateBtnText('失败');
            }
        });

        // 阻止默认的右键菜单
        frameBtn.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
        });

        // 添加按钮到父元素
        parentDiv.appendChild(frameBtn);
    });
}

// 添加迷你播放器缩放功能
function initializeMiniPlayerResize() {
    const containers = document.querySelectorAll('.bpx-player-container[data-screen="mini"]');

    containers.forEach(container => {
        // 检查是否已添加按钮
        if (container.querySelector('.mini-player-resize-btn')) return;

        // 创建放大/缩小按钮
        const resizeBtn = document.createElement('div');
        resizeBtn.className = 'mini-player-resize-btn';

        // 添加样式
        resizeBtn.style.cssText = `
            position: absolute;
            right: 10px;
            bottom: 10px;
            width: 24px;
            height: 24px;
            background-color: rgba(0, 0, 0, 0.6);
            border-radius: 4px;
            cursor: pointer;
            display: none;
            z-index: 100;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        // 添加图标
        resizeBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
            </svg>
        `;

        // 控制按钮显示
        container.addEventListener('mouseenter', () => {
            resizeBtn.style.display = 'flex';
        });

        container.addEventListener('mouseleave', () => {
            resizeBtn.style.display = 'none';
        });

        // 标记当前是否放大
        let isEnlarged = false;

        // 点击事件处理
        resizeBtn.addEventListener('click', (e) => {
            e.stopPropagation();

            if (!isEnlarged) {
                // 放大到 529x300
                container.style.width = '529px';
                container.style.height = '300px';
                resizeBtn.querySelector('svg').style.transform = 'rotate(180deg)';
            } else {
                // 恢复原始大小
                container.style.width = '';
                container.style.height = '';
                resizeBtn.querySelector('svg').style.transform = '';
            }

            isEnlarged = !isEnlarged;
        });

        container.appendChild(resizeBtn);
    });
}

// 在文件开头添加隐藏弹幕按钮的功能
function hideDanmakuButton() {
    const tooltipItems = document.querySelectorAll('div.bpx-player-tooltip-item');
    tooltipItems.forEach(item => {
        const title = item.querySelector('div.bpx-player-tooltip-title');
        if (title && (title.textContent.includes('关闭弹幕') || title.textContent.includes('开启弹幕'))) {
            item.style.display = 'none';
        }
    });
}

// 添加封面下载功能
function initializeCoverDownload() {
    const coverSelectors = [
        'picture.b-img__inner',
        'picture.v-img.bili-video-card__cover'
    ];

    coverSelectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(picture => {
            // 获取第二层父元素（可能是 a 或 div）
            const parentLink = picture.parentElement?.parentElement;
            if (!parentLink) return;

            // 如果父元素是 bili-album__preview__picture，则不添加按钮
            if (!(parentLink.classList.contains('bili-dyn-card-video__cover') || parentLink.classList.contains('bili-video-card__image--hover') || parentLink.classList.contains('video-awesome-img'))) return;

            // 检查是否已添加按钮
            if (parentLink.querySelector('.bilibili-save-cover-btn')) return;

            // 确保父元素是相对定位
            if (getComputedStyle(parentLink).position === 'static') {
                parentLink.style.position = 'relative';
            }

            // 创建按钮
            const coverBtn = document.createElement('div');
            coverBtn.className = 'bilibili-save-cover-btn';
            coverBtn.textContent = '封面';

            // 设置按钮样式
            coverBtn.style.cssText = `
                position: absolute;
                left: 0;
                bottom: 15%;
                padding: 3px 12px;
                background-color: rgba(0, 0, 0, 0.35);
                color: white;
                border-radius: 0 4px 4px 0;
                cursor: pointer;
                font-size: 12px;
                z-index: 100;
            `;

            // 更新按钮文本的函数
            const updateBtnText = async (text) => {
                const originalText = coverBtn.textContent;
                coverBtn.textContent = text;
                await new Promise(resolve => setTimeout(resolve, 1000));
                coverBtn.textContent = originalText;
            };

            // 处理图片URL的函数
            const processImageUrl = (url) => {
                // 确保URL以http开头
                if (url.startsWith('//')) {
                    url = 'https:' + url;
                }

                // 处理@后的参数
                const urlParts = url.split('@');
                if (urlParts.length > 1) {
                    const basePart = urlParts[0];
                    const params = urlParts[1].split('_');

                    // 提取并放大宽高
                    const width = parseInt(params[0].replace('w', '')) * 10;
                    const height = parseInt(params[1].replace('h', '')) * 10;

                    // 构建新的URL，使用放大后的尺寸
                    return `${basePart}@${width}w_${height}h`;
                }
                return url;
            };

            // 获取图片URL
            const getImageUrl = () => {
                const img = picture.querySelector('img');
                return img ? processImageUrl(img.getAttribute('src')) : null;
            };

            // 左键下载
            coverBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();

                try {
                    const imageUrl = getImageUrl();
                    if (!imageUrl) throw new Error('No image URL found');

                    const response = await fetch(imageUrl);
                    const blob = await response.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    // 从原始URL中提取文件扩展名
                    const extension = imageUrl.split('@')[0].split('.').pop();
                    a.download = `bilibili_cover_${Date.now()}.${extension}`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    await updateBtnText('成功');
                } catch (error) {
                    console.error('下载失败:', error);
                    await updateBtnText('失败');
                }
            });

            // 右键复制
            coverBtn.addEventListener('contextmenu', async (e) => {
                e.preventDefault();
                e.stopPropagation();

                try {
                    const imageUrl = getImageUrl();
                    if (!imageUrl) throw new Error('No image URL found');

                    // 创建一个 Image 对象
                    const img = new Image();
                    img.crossOrigin = 'anonymous';  // 允许跨域

                    // 等待图片加载
                    await new Promise((resolve, reject) => {
                        img.onload = resolve;
                        img.onerror = reject;
                        img.src = imageUrl;
                    });

                    // 创建 canvas 并绘制图片
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);

                    // 将 canvas 转换为 blob
                    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));

                    await navigator.clipboard.write([
                        new ClipboardItem({
                            'image/png': blob
                        })
                    ]);
                    await updateBtnText('成功');
                } catch (error) {
                    console.error('复制失败:', error);
                    await updateBtnText('失败');
                }
            });

            parentLink.appendChild(coverBtn);
        });
    });
}

// 在文件开头添加新函数
function hideSearchAds() {
    // 确保在搜索页面
    if (!isSearchPage()) return;

    const adElements = document.querySelectorAll('div.bili-video-card__info--ad');
    adElements.forEach(adElement => {
        let parent = adElement;
        // 向上查找第7层父元素
        for (let i = 0; i < 7; i++) {
            if (parent.parentElement) {
                parent = parent.parentElement;
            }
        }
        if (parent) {
            parent.style.display = 'none';
            parent.style.height = '0px';
            parent.style.width = '0px';
        }
    });
}

// 修改现有的 observer
const observer = new MutationObserver(() => {
    if (!isSearchPage()) {
        initializeFrameCapture();
        initializeMiniPlayerResize();
        hideDanmakuButton();
        initializeCoverDownload();
    } else {
        hideSearchAds(); // 在搜索页面时执行广告隐藏
    }
});

// 初始化时也要调用
if (!isSearchPage()) {
    initializeFrameCapture();
    initializeMiniPlayerResize();
    hideDanmakuButton();
    initializeCoverDownload();
} else {
    hideSearchAds(); // 在搜索页面时执行广告隐藏
}

// 开始观察
observer.observe(document.body, {
    childList: true,
    subtree: true
}); 