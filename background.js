importScripts('lib/jszip.min.js');

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'createZip') {
        const zip = new JSZip();
        const folder = zip.folder("covers");

        // 添加所有图片到 zip
        request.images.forEach((imageData, index) => {
            const fileName = `cover_${index + 1}.${imageData.extension}`;
            folder.file(fileName, imageData.blob);
        });

        // 生成 zip
        zip.generateAsync({
            type: "blob",
            compression: "DEFLATE",
            compressionOptions: {
                level: 9
            }
        }).then(content => {
            sendResponse({ success: true, zipBlob: content });
        });

        return true; // 保持消息通道开放
    }

    if (request.type === 'fetchImage') {
        fetch(request.url, {
            headers: {
                'Referer': 'https://kemono.su/',
                'Origin': 'https://kemono.su'
            }
        })
            .then(response => response.blob())
            .then(blob => {
                // 将 blob 转换为 base64
                const reader = new FileReader();
                reader.onloadend = () => {
                    sendResponse({
                        success: true,
                        data: reader.result,
                        type: blob.type
                    });
                };
                reader.readAsDataURL(blob);
            })
            .catch(error => {
                sendResponse({
                    success: false,
                    error: error.message
                });
            });
        return true; // 保持消息通道打开
    }
}); 