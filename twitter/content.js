class TwitterImageHandler {
    constructor() {
        this.init();
    }

    init() {
        try {
            this.observeDOM();
            this.processImages();
            this.hidePromotions();
            this.addCustomDivs();
            initializeVideoFrameCapture();
        } catch (error) {
            console.error('Initialization error:', error);
        }
    }

    // 检查是否在媒体页面
    isMediaPage() {
        return window.location.pathname.endsWith('/media');
    }

    // 获取大图URL
    getHighResUrl(imgUrl) {
        return imgUrl.replace(/name=\d+x\d+/, 'name=large');
    }

    // 获取Twitter用户名
    getUserName() {
        // 查找所有包含@的span元素
        const spans = document.querySelectorAll('span');
        for (const span of spans) {
            // 检查span是否在UserName div内
            if (span.closest('div[data-testid="UserName"]')) {
                const text = span.textContent;
                const match = text.match(/@\w+/);
                if (match) {
                    return match[0].substring(1); // 移除@符号
                }
            }
        }

        // 备用方案：查找任何包含@用户名格式的span
        for (const span of spans) {
            const text = span.textContent;
            const match = text.match(/@\w+/);
            if (match) {
                return match[0].substring(1);
            }
        }

        return 'twitter_image'; // 如果都没找到，使用默认值
    }

    // 处理图片元素
    processImages() {
        // 只在媒体页面处理 li 元素
        // if (this.isMediaPage()) {
        //     this.processLiElements();
        // }
        // 处理 img 元素（在所有页面）
        this.processImgElements();
    }

    // 处理 li 元素
    // processLiElements() {
    //     const liElements = document.querySelectorAll('li');
    //     liElements.forEach(li => {
    //         if (li.querySelector('.dc-image-mask')) return;

    //         const rect = li.getBoundingClientRect();
    //         if (rect.width < 100 || rect.height < 100) return;

    //         if (getComputedStyle(li).position === 'static') {
    //             li.style.position = 'relative';
    //         }

    //         const mask = this.createMask();
    //         this.addMaskEventListeners(mask, li);
    //         li.appendChild(mask);
    //     });
    // }

    // 处理 img 元素
    processImgElements() {
        const imgElements = document.querySelectorAll('img');
        imgElements.forEach(img => {
            // 检查尺寸
            const rect = img.getBoundingClientRect();
            if (rect.width < 100 || rect.width > 600 || rect.height < 100 || rect.height > 600) return;

            // 查找父级 a 标签
            const parentAnchor = img.closest('a');
            if (!parentAnchor || parentAnchor.querySelector('.dc-image-mask')) return;

            // 确保父级 a 标签是相对定位
            if (getComputedStyle(parentAnchor).position === 'static') {
                parentAnchor.style.position = 'relative';
            }

            const mask = this.createMask(true); // 传入 true 表示这是 img 的遮罩
            this.addMaskEventListeners(mask, parentAnchor);
            parentAnchor.appendChild(mask);
        });
    }

    // 创建遮罩层
    createMask(isImgMask = false) {
        const mask = document.createElement('div');
        mask.className = 'dc-image-mask';
        if (isImgMask) {
            mask.classList.add('dc-image-mask-small');
        }
        mask.textContent = '下载/复制';
        return mask;
    }

    // 添加遮罩层事件监听
    addMaskEventListeners(mask, parent) {
        // 左键下载
        mask.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            const img = parent.querySelector('img');
            if (!img?.src) return;
            const highResUrl = this.getHighResUrl(img.src);
            await this.downloadImage(highResUrl, mask);
        });

        // 右键复制
        mask.addEventListener('contextmenu', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            const img = parent.querySelector('img');
            if (!img?.src) return;
            const highResUrl = this.getHighResUrl(img.src);
            await this.copyImage(highResUrl, mask);
        });
    }

    // 更新遮罩层文本并在延迟后恢复
    async updateMaskText(mask, text, delay = 1000) {
        const originalText = mask.textContent;
        mask.textContent = text;
        await new Promise(resolve => setTimeout(resolve, delay));
        mask.textContent = originalText;
    }

    // 下载图片
    async downloadImage(imgUrl, mask) {
        try {
            const response = await fetch(imgUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const userName = this.getUserName();
            const a = document.createElement('a');
            a.href = url;
            a.download = `${userName}_${Date.now()}.jpg`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            await this.updateMaskText(mask, '下载成功');
        } catch (error) {
            console.error('下载失败:', error);
            await this.updateMaskText(mask, '下载失败');
        }
    }

    // 复制图片
    async copyImage(imgUrl, mask) {
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            await new Promise((resolve) => {
                const tempImg = new Image();
                tempImg.crossOrigin = 'anonymous';
                tempImg.onload = () => {
                    canvas.width = tempImg.width;
                    canvas.height = tempImg.height;
                    ctx.drawImage(tempImg, 0, 0);
                    resolve();
                };
                tempImg.src = imgUrl;
            });

            await new Promise((resolve, reject) => {
                canvas.toBlob(async (blob) => {
                    try {
                        await navigator.clipboard.write([
                            new ClipboardItem({
                                'image/png': blob
                            })
                        ]);
                        await this.updateMaskText(mask, '复制成功');
                        resolve();
                    } catch (err) {
                        console.error('复制图片失败:', err);
                        await this.updateMaskText(mask, '复制失败');
                        reject(err);
                    }
                }, 'image/png');
            });

        } catch (error) {
            console.error('处理图片时出错:', error);
            await this.updateMaskText(mask, '复制失败');
        }
    }

    // 添加新的隐藏推广内容方法
    hidePromotions() {
        const spans = document.querySelectorAll('span');
        spans.forEach(span => {
            if (span.textContent === '推廣') {
                let parent = span;
                // 向上查找第12层父元素
                for (let i = 0; i < 12; i++) {
                    if (parent.parentElement) {
                        parent = parent.parentElement;
                    }
                }
                if (parent) {
                    parent.style.display = 'none';
                }
            }
        });
    }

    // Function to add custom divs
    addCustomDivs() {
        try {
            console.time('addCustomDivs');
            const divs = document.querySelectorAll('div[role="group"][aria-label*="個喜歡、"][aria-label*="個書籤、"][aria-label*="次觀看"]');
            divs.forEach(div => {
                // Check if the div already contains a calculated result
                if (div.querySelector('.calculated-percentage')) return;

                const ariaLabel = div.getAttribute('aria-label');
                const match = ariaLabel.match(/(\d+) 個喜歡、\d+ 個書籤、(\d+) 次觀看/);

                if (match) {
                    const likes = parseInt(match[1], 10);
                    const views = parseInt(match[2], 10);

                    if (views > 0) {
                        const percentage = ((likes / views) * 100).toFixed(2);

                        const newDiv = document.createElement('div');
                        newDiv.className = 'calculated-percentage'; // Add a class to identify the div
                        newDiv.style.position = 'absolute';
                        newDiv.style.right = '60px';
                        newDiv.style.bottom = '0';
                        // newDiv.style.transform = 'translateX(-100%)';
                        newDiv.style.color = 'white';
                        newDiv.textContent = `${percentage}`; // Remove the percentage sign

                        div.appendChild(newDiv);
                    }
                }
            });
            console.timeEnd('addCustomDivs');
        } catch (error) {
            console.error('Error in addCustomDivs:', error);
        }
    }

    // Debounce function to limit the rate of function calls
    debounce(func, wait) {
        let timeout;
        return function (...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), wait);
        };
    }

    // Modify observeDOM to include debouncing
    observeDOM() {
        const debouncedCallback = this.debounce(() => {
            this.processImages();
            this.hidePromotions();
            this.addCustomDivs();
            initializeVideoFrameCapture();
        }, 300); // Adjust the debounce delay as needed

        const observer = new MutationObserver(debouncedCallback);

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: false, // Only observe child list changes
            characterData: false // Ignore character data changes
        });
    }
}

// 初始化处理器
new TwitterImageHandler();

// 添加视频帧捕获功能
function initializeVideoFrameCapture() {
    const videoContainers = document.querySelectorAll('div[data-testid="videoComponent"]');

    videoContainers.forEach(container => {
        if (container.querySelector('.twitter-save-frame-btn')) return;

        const video = container.querySelector('video');
        if (!video) return;

        // 确保容器是相对定位
        if (getComputedStyle(container).position === 'static') {
            container.style.position = 'relative';
        }

        // 创建按钮
        const frameBtn = document.createElement('div');
        frameBtn.className = 'twitter-save-frame-btn';
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
                a.download = `twitter_video_frame_${Date.now()}.png`;
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
        frameBtn.addEventListener('contextmenu', async (e) => {
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

        // 添加按钮到容器
        container.appendChild(frameBtn);
    });
}
