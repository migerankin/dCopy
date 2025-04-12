document.addEventListener('DOMContentLoaded', function () {
    const searchInput = document.getElementById('settingSearch');

    searchInput.addEventListener('input', function (e) {
        const query = e.target.value.toLowerCase();
        const sections = document.querySelectorAll('.setting-item > div');

        sections.forEach(section => {
            const title = section.querySelector('h2')?.textContent.toLowerCase() || '';
            const items = section.querySelectorAll('.switch-label');
            let found = false;

            // 检查标题
            if (title.includes(query)) {
                found = true;
            }

            // 检查设置项文本
            items.forEach(item => {
                if (item.textContent.toLowerCase().includes(query)) {
                    found = true;
                }
            });

            // 显示或隐藏部分
            section.classList.toggle('hidden', !found);
        });
    });

    // 加载排除列表
    const excludeInput = document.getElementById('contextMenuExclude');
    const addExcludeBtn = document.getElementById('addExclude');
    const excludeList = document.getElementById('excludeList');

    // 从存储中加载排除列表
    chrome.storage.sync.get('contextMenuExcludeList', function (result) {
        const list = result.contextMenuExcludeList || [];
        list.forEach(addExcludeItem);
    });

    // 添加新的排除项
    addExcludeBtn.addEventListener('click', function () {
        const pattern = excludeInput.value.trim().replace(/\/$/, '');
        if (!pattern) return;

        chrome.storage.sync.get('contextMenuExcludeList', function (result) {
            const list = result.contextMenuExcludeList || [];
            if (!list.includes(pattern)) {
                list.push(pattern);
                chrome.storage.sync.set({ contextMenuExcludeList: list });
                addExcludeItem(pattern);
                excludeInput.value = '';
            }
        });
    });

    // 添加排除项到列表
    function addExcludeItem(pattern) {
        const item = document.createElement('div');
        item.className = 'exclude-item';

        const text = document.createElement('span');
        text.textContent = pattern;

        const removeBtn = document.createElement('button');
        removeBtn.textContent = '删除';
        removeBtn.onclick = function () {
            chrome.storage.sync.get('contextMenuExcludeList', function (result) {
                const list = result.contextMenuExcludeList || [];
                const index = list.indexOf(pattern);
                if (index > -1) {
                    list.splice(index, 1);
                    chrome.storage.sync.set({ contextMenuExcludeList: list });
                    item.remove();
                }
            });
        };

        item.appendChild(text);
        item.appendChild(removeBtn);
        excludeList.appendChild(item);
    }

    // 添加收起展开功能
    document.querySelectorAll('.setting-header').forEach(header => {
        const content = header.nextElementSibling;
        const toggleBtn = header.querySelector('.toggle-btn');

        // 初始状态展开
        content.style.display = 'block';

        header.addEventListener('click', () => {
            const isCollapsed = toggleBtn.classList.contains('collapsed');

            // 切换按钮状态
            toggleBtn.classList.toggle('collapsed');
            content.classList.toggle('collapsed');

            // 设置内容高度
            if (isCollapsed) {
                content.style.display = 'block';
            } else {
                content.style.display = 'none';
            }
        });
    });
}); 