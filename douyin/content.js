// 在文件开头添加动态加载 JSZip
async function loadJSZip() {
    const jsZipUrl = chrome.runtime.getURL('../lib/jszip.min.js');
    await import(jsZipUrl);
}

// 添加一个检查函数来判断是否在用户页面
function isUserPage() {
    return window.location.pathname.startsWith('/user/');
}

// 等待 JSZip 加载完成后再初始化其他功能
loadJSZip().then(() => {
    // 原有的所有代码放在这里
    async function downloadImages(images) {
        try {
            const zip = new JSZip();
            const folder = zip.folder("covers");

            // 收集所有图片数据
            const imageDataPromises = Array.from(images).map(async (img, index) => {
                try {
                    const response = await fetch(img.src);
                    const blob = await response.blob();
                    const fileName = `cover_${index + 1}.${getImageExtension(img.src)}`;
                    folder.file(fileName, blob);
                    return true;
                } catch (error) {
                    console.error(`Error downloading image ${index + 1}:`, error);
                    return false;
                }
            });

            const results = await Promise.all(imageDataPromises);
            const successCount = results.filter(Boolean).length;

            // 生成zip文件
            const content = await zip.generateAsync({
                type: "blob",
                compression: "DEFLATE",
                compressionOptions: {
                    level: 9
                }
            });

            // 添加一个新的辅助函数来获取 h1 的文本
            function getH1Text() {
                const h1 = document.querySelector('h1');
                if (!h1) return '';
                // 获取所有文本内容，忽略HTML标签
                return h1.textContent.trim();
            }

            // 修改这部分代码
            const h1Text = getH1Text();
            const timestamp = new Date().getTime();
            const zipFileName = h1Text
                ? `${h1Text}_${timestamp}.zip`
                : `covers_${timestamp}.zip`;

            // 下载zip文件
            const url = window.URL.createObjectURL(content);
            const link = document.createElement('a');
            link.href = url;
            link.download = zipFileName;  // 使用新的文件名
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            return successCount;
        } catch (error) {
            console.error('Error creating zip:', error);
            throw error;
        }
    }

    // 辅助函数：获取图片扩展名
    function getImageExtension(url) {
        // 从 URL 中提取文件名部分
        const fileName = url.split('/').pop();
        // 匹配 .webp 或其他扩展名
        const match = fileName.match(/\.(webp|jpg|jpeg|png|gif)(?:[?#].*)?$/i);
        // 如果找到匹配的扩展名，返回它，否则返回默认值 'webp'
        return match ? match[1].toLowerCase() : 'webp';
    }

    function addDownloadAllButton(containerDiv) {
        // 检查是否已经存在下载按钮
        if (containerDiv.querySelector('.download-all-button')) {
            return;
        }

        const downloadAllBtn = document.createElement('div');
        downloadAllBtn.className = 'download-all-button';
        downloadAllBtn.textContent = '下载全部封面';

        downloadAllBtn.addEventListener('click', async () => {
            // 只获取当前容器内的图片
            const allImages = containerDiv.querySelectorAll('li a img');
            if (!allImages.length) return;

            const originalText = downloadAllBtn.textContent;
            downloadAllBtn.textContent = '正在打包...';

            try {
                const successCount = await downloadImages(allImages);
                downloadAllBtn.textContent = `完成 (${successCount}/${allImages.length})`;
            } catch (error) {
                downloadAllBtn.textContent = '下载失败';
            }

            setTimeout(() => {
                downloadAllBtn.textContent = originalText;
            }, 2000);
        });

        containerDiv.style.position = 'relative';
        containerDiv.appendChild(downloadAllBtn);
    }

    function createOverlay(li) {
        const overlay = document.createElement('div');
        overlay.className = 'hover-overlay';
        overlay.textContent = '下载/复制封面';

        // 创建一个函数来处理临时文字提示
        const showTemporaryText = (text, duration = 1000) => {
            const originalText = overlay.textContent;
            overlay.textContent = text;
            setTimeout(() => {
                overlay.textContent = originalText;
            }, duration);
        };

        // 禁用浏览器默认的右键菜单
        overlay.addEventListener('contextmenu', async (e) => {
            e.preventDefault();
            e.stopPropagation();

            // 查找 li 下的 img 标签
            const img = li.querySelector('a img');
            if (img) {
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
                        tempImg.src = img.src;
                    });

                    canvas.toBlob(async (blob) => {
                        try {
                            await navigator.clipboard.write([
                                new ClipboardItem({
                                    'image/png': blob
                                })
                            ]);
                            showTemporaryText('复制成功');
                        } catch (err) {
                            console.error('复制图片失败:', err);
                            showTemporaryText('复制失败');
                        }
                    }, 'image/png');

                } catch (error) {
                    console.error('处理图片时出错:', error);
                    showTemporaryText('复制失败');
                }
            }
        });

        // 保持原有的左键下载功能
        overlay.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();

            const img = li.querySelector('a img');
            if (img) {
                const imgUrl = img.src;

                try {
                    const response = await fetch(imgUrl);
                    const blob = await response.blob();
                    const blobUrl = window.URL.createObjectURL(blob);
                    const fileName = imgUrl.split('/').pop();

                    const link = document.createElement('a');
                    link.href = blobUrl;
                    link.download = fileName;
                    link.style.display = 'none';
                    document.body.appendChild(link);
                    link.click();

                    document.body.removeChild(link);
                    window.URL.revokeObjectURL(blobUrl);
                    showTemporaryText('下载成功');
                } catch (error) {
                    console.error('下载图片时出错:', error);
                    showTemporaryText('下载失败');
                }
            }
        });

        li.appendChild(overlay);
    }

    // 修改初始化函数
    function initializeOverlays() {
        if (isUserPage()) {
            const ulElements = document.querySelectorAll('ul');

            ulElements.forEach(ul => {
                const containerDiv = ul.closest('div');

                let currentElement = ul;
                for (let i = 0; i < 4; i++) {
                    currentElement = currentElement.parentElement;
                    if (!currentElement) break;
                    if (
                        currentElement.id && currentElement.id.includes('douyin-header-menuCt') ||
                        currentElement.classList.contains('semi-tooltip-content')
                    ) {
                        return;
                    }
                }

                if (containerDiv) {
                    // 获取父div的父div
                    const grandparentDiv = containerDiv.parentElement;
                    if (grandparentDiv) {
                        // 获取第一个子div
                        const firstChildDiv = grandparentDiv.querySelector(':first-child');
                        // 只有当第一个子div存在且包含"视频"文字时才添加下载按钮
                        if (firstChildDiv && firstChildDiv.textContent.includes('视频')) {
                            addDownloadAllButton(containerDiv);
                        }
                    }
                }

                const liElements = ul.querySelectorAll('li');
                liElements.forEach(li => {
                    if (!li.querySelector('.hover-overlay')) {
                        createOverlay(li);
                    }
                });
            });
        }
    }

    // 初始化
    initializeOverlays();

    // 在 loadJSZip().then() 中添加新的初始化函数

    function initializeVideoDownloadButtons() {
        const sliderVideos = document.querySelectorAll('div[class*="slider-video"]');

        sliderVideos.forEach(sliderVideo => {
            const buttons = sliderVideo.querySelectorAll('button');

            buttons.forEach(button => {
                // 检查按钮是否包含 xg-switch class 或有内容
                if (button.className.includes('xg-switch') ||
                    button.children.length > 0 ||
                    button.textContent.trim() ||
                    button.style.height !== '100%' ||
                    button.style.width !== '100%') {
                    return; // 跳过这个按钮
                }

                const buttonWrapper = button.parentElement;

                if (buttonWrapper.querySelector('.video-download-btn')) {
                    return;
                }

                // 创建下载按钮容器
                const downloadBtn = document.createElement('div');
                downloadBtn.className = 'video-download-btn';

                // 创建第一行按钮
                const firstRow = document.createElement('div');
                firstRow.className = 'btn-row';
                firstRow.textContent = '下载/复制图片';

                // 创建第二行按钮
                const secondRow = document.createElement('div');
                secondRow.className = 'btn-row';
                secondRow.textContent = '批量下载图片';

                downloadBtn.appendChild(firstRow);
                downloadBtn.appendChild(secondRow);

                // 显示临时文字的函数
                const showTemporaryText = (element, text, duration = 1000) => {
                    const originalText = element.textContent;
                    element.textContent = text;
                    setTimeout(() => {
                        element.textContent = originalText;
                    }, duration);
                };

                // 修改 getAccountName 函数，添加 sliderVideo 参数
                const getAccountName = (sliderVideo) => {
                    // 在当前 slider-video 中查找 account-name
                    const accountElement = sliderVideo.querySelector('.account-name');
                    return accountElement ? accountElement.textContent.trim() : '';
                };

                // 添加一个辅助函数来获取正确的图片元素
                function getImageFromButton(button) {
                    // 获取父元素
                    const parent = button.parentElement;
                    // 查找所有兄弟 div 中的第一个 img
                    const img = parent.querySelector('div img');
                    return img;
                }

                // 修改批量下载部分的代码
                secondRow.addEventListener('click', async (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    const allImages = sliderVideo.querySelectorAll('button').length > 0
                        ? Array.from(sliderVideo.querySelectorAll('button')).map(btn => {
                            const parent = btn.parentElement;
                            return parent.querySelector('div img');
                        }).filter(Boolean)
                        : [];

                    if (allImages.length === 0) return;

                    // showTemporaryText(secondRow, '正在打包...');

                    try {
                        const zip = new JSZip();
                        const folder = zip.folder("images");

                        // 下载所有图片
                        const imagePromises = allImages.map(async (img, index) => {
                            try {
                                const response = await fetch(img.src);
                                const blob = await response.blob();
                                const extension = getImageExtension(img.src);
                                folder.file(`image_${index + 1}.${extension}`, blob);
                                return true;
                            } catch (error) {
                                console.error(`Error downloading image ${index + 1}:`, error);
                                return false;
                            }
                        });

                        const results = await Promise.all(imagePromises);
                        const successCount = results.filter(Boolean).length;

                        const content = await zip.generateAsync({
                            type: "blob",
                            compression: "DEFLATE",
                            compressionOptions: { level: 9 }
                        });

                        const accountName = getAccountName(sliderVideo);
                        const timestamp = new Date().getTime();
                        const zipFileName = accountName
                            ? `${accountName}_${timestamp}.zip`
                            : `images_${timestamp}.zip`;

                        const url = window.URL.createObjectURL(content);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = zipFileName;
                        document.body.appendChild(link);

                        // 在触发下载之前先更新状态文字
                        showTemporaryText(secondRow, `完成 (${successCount}/${allImages.length})`);

                        link.click();
                        document.body.removeChild(link);
                        window.URL.revokeObjectURL(url);

                    } catch (error) {
                        console.error('批量下载失败:', error);
                        showTemporaryText(secondRow, '下载失败');
                    }
                });

                // 原有的右键复制功能绑定到第一行
                firstRow.addEventListener('contextmenu', async (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    // 使用新的方式获取图片
                    const img = getImageFromButton(button);
                    if (img) {
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
                                tempImg.src = img.src;
                            });

                            canvas.toBlob(async (blob) => {
                                try {
                                    await navigator.clipboard.write([
                                        new ClipboardItem({
                                            'image/png': blob
                                        })
                                    ]);
                                    showTemporaryText(firstRow, '复制成功');
                                } catch (err) {
                                    console.error('复制图片失败:', err);
                                    showTemporaryText(firstRow, '复制失败');
                                }
                            }, 'image/png');

                        } catch (error) {
                            console.error('处理图片时出错:', error);
                            showTemporaryText(firstRow, '复制失败');
                        }
                    }
                });

                // 原有的左键下载功能绑定到第一行
                firstRow.addEventListener('click', async (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    // 使用新的方式获取图片
                    const img = getImageFromButton(button);
                    if (img) {
                        try {
                            const response = await fetch(img.src);
                            const blob = await response.blob();
                            const blobUrl = window.URL.createObjectURL(blob);
                            // 使用相同的扩展名处理逻辑
                            const extension = getImageExtension(img.src);
                            const fileName = `image.${extension}`;

                            const link = document.createElement('a');
                            link.href = blobUrl;
                            link.download = fileName;
                            link.style.display = 'none';
                            document.body.appendChild(link);
                            link.click();

                            document.body.removeChild(link);
                            window.URL.revokeObjectURL(blobUrl);
                            // showTemporaryText(firstRow, '下载���功');
                        } catch (error) {
                            console.error('下载图片时出错:', error);
                            showTemporaryText(firstRow, '下载失败');
                        }
                    }
                });

                buttonWrapper.appendChild(downloadBtn);
            });
        });
    }

    // 添加评论图片遮罩的初始化函数
    function initializeCommentImageOverlays() {
        // 查找所有评论信息包装器
        const commentWrappers = document.querySelectorAll('div[class*="comment-item-info-wrap"]');

        commentWrappers.forEach(wrapper => {
            const parentDiv = wrapper.parentElement;
            if (!parentDiv) return;

            // 获取第二个子div
            const secondDiv = parentDiv.children[1];
            if (!secondDiv) return;

            // 查找大于100px的图片
            const images = secondDiv.querySelectorAll('img');
            images.forEach(img => {
                // 检查图片尺寸
                if (img.naturalWidth > 100 && img.naturalHeight > 100) {
                    // 检查是否已经添加过遮罩
                    if (img.parentElement.querySelector('.comment-image-overlay')) return;

                    // 创建包装器（如果还没有）
                    let wrapper = img.parentElement;
                    if (!wrapper.classList.contains('comment-image-wrapper')) {
                        wrapper = document.createElement('div');
                        wrapper.className = 'comment-image-wrapper';
                        img.parentElement.insertBefore(wrapper, img);
                        wrapper.appendChild(img);
                    }

                    // 创建遮罩
                    const overlay = document.createElement('div');
                    overlay.className = 'comment-image-overlay';
                    overlay.textContent = '下载/复制图片';

                    // 显示临时文字的函数
                    const showTemporaryText = (text, duration = 1000) => {
                        const originalText = overlay.textContent;
                        overlay.textContent = text;
                        setTimeout(() => {
                            overlay.textContent = originalText;
                        }, duration);
                    };

                    // 处理右键复制
                    overlay.addEventListener('contextmenu', async (e) => {
                        e.preventDefault();
                        e.stopPropagation();

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
                                tempImg.src = img.src;
                            });

                            canvas.toBlob(async (blob) => {
                                try {
                                    await navigator.clipboard.write([
                                        new ClipboardItem({
                                            'image/png': blob
                                        })
                                    ]);
                                    showTemporaryText('复制成功');
                                } catch (err) {
                                    console.error('复制图片失败:', err);
                                    showTemporaryText('复制失败');
                                }
                            }, 'image/png');

                        } catch (error) {
                            console.error('处理图片时出错:', error);
                            showTemporaryText('复制失败');
                        }
                    });

                    // 处理左键下载
                    overlay.addEventListener('click', async (e) => {
                        e.preventDefault();
                        e.stopPropagation();

                        try {
                            const response = await fetch(img.src);
                            const blob = await response.blob();
                            const blobUrl = window.URL.createObjectURL(blob);
                            const extension = getImageExtension(img.src);
                            const fileName = `comment_image.${extension}`;

                            const link = document.createElement('a');
                            link.href = blobUrl;
                            link.download = fileName;
                            link.style.display = 'none';
                            document.body.appendChild(link);
                            link.click();

                            document.body.removeChild(link);
                            window.URL.revokeObjectURL(blobUrl);
                            showTemporaryText('下载成功');
                        } catch (error) {
                            console.error('下载图片时出错:', error);
                            showTemporaryText('下载失败');
                        }
                    });

                    wrapper.appendChild(overlay);
                }
            });
        });
    }

    // 在 loadJSZip().then() 中添加新的初始化函数
    function initializeDetailToggle() {
        const detailDivs = document.querySelectorAll('.video-info-detail');

        detailDivs.forEach(detailDiv => {
            // 检查是否已经添加过按钮
            if (detailDiv.parentElement.querySelector('.toggle-detail-btn')) return;

            // 确保父元素是相对定位
            const parent = detailDiv.parentElement;
            if (getComputedStyle(parent).position === 'static') {
                parent.style.position = 'relative';
            }

            // 向上查三层父元素，然后查找其子元素中的 positionBox
            let thirdParent = parent;
            for (let i = 0; i < 3; i++) {
                thirdParent = thirdParent.parentElement;
                if (!thirdParent) return; // 如果找不到父元素就退出
            }

            // 在找到的父元素中查找 positionBox
            const positionBox = thirdParent.querySelector('.positionBox');
            if (!positionBox) return; // 如果没有找到 positionBox，就不添加按钮

            // 创建切换按钮
            const toggleBtn = document.createElement('div');
            toggleBtn.className = 'toggle-detail-btn';

            // 创建图片元素
            const img = document.createElement('img');
            img.src = chrome.runtime.getURL('../assets/hidden_show_btn.png');
            toggleBtn.appendChild(img);

            // 添加点击事件
            toggleBtn.addEventListener('click', () => {
                const isHidden = detailDiv.style.display === 'none';
                // 同时切换两个元素的显示状态
                detailDiv.style.display = isHidden ? 'block' : 'none';
                positionBox.style.display = isHidden ? 'block' : 'none';
                toggleBtn.style.top = isHidden ? '-22px' : '-50px';
                // 切换展开状态的类名
                toggleBtn.classList.toggle('expanded', !isHidden);
            });

            // 添加按钮到父元素
            parent.appendChild(toggleBtn);
        });
    }

    // 隐藏播放器控件
    function hidePlayerControls() {
        const selectors = [
            '.xgplayer-start',
            '.xgplayer-loading',
            '.xgplayer-enter',
            '.xgplayer-error'
        ];

        selectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                element.style.display = 'none';
            });
        });
    }

    // 添加视频帧捕获功能
    function initializeFrameCapture() {
        const containers = document.querySelectorAll('.xg-video-container');

        containers.forEach(container => {
            // 获取父元素
            const parentElement = container.parentElement;
            if (!parentElement) return;

            const video = container.querySelector('video');
            // 检查视频元素和按钮是否已存在
            if (!video || parentElement.querySelector('.save-frame-btn')) return;

            // 创建按钮
            const frameBtn = document.createElement('div');
            frameBtn.className = 'save-frame-btn';
            frameBtn.textContent = '截图';
            frameBtn.style.display = 'flex';

            // 确保父元素是相对定位
            if (getComputedStyle(parentElement).position === 'static') {
                parentElement.style.position = 'relative';
            }

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
                    a.download = `video_frame_${Date.now()}.png`;
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

            // 添加按钮到父元素
            parentElement.appendChild(frameBtn);
        });
    }

    // 修改 MutationObserver 的回调
    const observer = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
            if (mutation.addedNodes.length) {
                // 只在用户页面初始化 ul 相关功能
                if (isUserPage()) {
                    initializeOverlays();
                }
                // 其他功能不受限制
                initializeVideoDownloadButtons();
                initializeCommentImageOverlays();
                initializeDetailToggle();
                hidePlayerControls();
                initializeFrameCapture();
            }
        });
    });

    // 初始化时也要判断
    loadJSZip().then(() => {
        // 只在用户页面初始化 ul 相关功能
        if (isUserPage()) {
            initializeOverlays();
        }
        // 其他功能不受限制
        initializeVideoDownloadButtons();
        initializeCommentImageOverlays();
        initializeDetailToggle();
        hidePlayerControls();
        initializeFrameCapture();

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }).catch(error => {
        console.error('Failed to load JSZip:', error);
    });
}).catch(error => {
    console.error('Failed to load JSZip:', error);
}); 