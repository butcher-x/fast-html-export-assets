function initializeOutline() {
    // 解析文档标题生成大纲
    function generateOutline() {
        const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
        const outlineItems = [];
        
        headings.forEach(heading => {
            const level = parseInt(heading.tagName[1]);
            const text = heading.textContent || '';
            const id = heading.id;
            
            outlineItems.push({
                level,
                text,
                id
            });
        });
        
        return outlineItems;
    }
    
    // 高亮标题
    function highlightHeading(id) {
        const heading = document.getElementById(id);
        if (heading) {
            // 移除之前的高亮
            const prevHighlight = document.querySelector('.heading-highlight');
            if (prevHighlight) {
                prevHighlight.classList.remove('heading-highlight');
                prevHighlight.classList.remove('heading-highlight-focus');
            }
            
            // 添加新的高亮
            heading.classList.add('heading-highlight');
            heading.classList.add('heading-highlight-focus');
            
            // 移除动画类以便下次点击能重新触发
            setTimeout(() => {
                heading.classList.remove('heading-highlight');
                heading.classList.remove('heading-highlight-focus');
            }, 1500);
        }
    }
    
    // 渲染大纲项
    function renderOutlineItem(item) {
        const itemDiv = document.createElement('div');
        itemDiv.className = `outline-item outline-level-${item.level}`;
        itemDiv.setAttribute('data-id', item.id);
        
        const content = document.createElement('span');
        content.className = 'outline-item-content';
        content.textContent = item.text;
        
        itemDiv.appendChild(content);
        
        // 点击跳转并高亮
        itemDiv.addEventListener('click', () => {
            const target = document.getElementById(item.id);
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
                highlightHeading(item.id);
                
                // 更新大纲高亮
                document.querySelectorAll('.outline-item').forEach(item => {
                    item.classList.remove('active');
                });
                itemDiv.classList.add('active');
            }
        });
        
        return itemDiv;
    }
    
    // 渲染大纲
    function renderOutline() {
        const outlineContainer = document.querySelector('.outline-container');
        if (!outlineContainer) return;
        
        const items = generateOutline();
        items.forEach(item => {
            outlineContainer.appendChild(renderOutlineItem(item));
        });
    }
    
    /**
     * 处理滚动同步
     * 选择距离视图上边界最近的标题作为当前标题
     */
    function handleScroll() {
        const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
        if (!headings.length) return;

        // 获取所有标题相对于视图顶部的距离
        const distances = headings.map(heading => {
            const rect = heading.getBoundingClientRect();
            const distance = rect.top;
            return {
                heading,
                distance: distance >= 0 ? distance : -distance 
            };
        });

        // 按距离排序，选择最近的标题
        const sorted = distances.sort((a, b) => Math.abs(a.distance) - Math.abs(b.distance));
        const currentHeading = sorted[0].heading;

        // 更新大纲高亮
        const outlineItems = document.querySelectorAll('.outline-item');
        outlineItems.forEach(item => {
            const itemId = item.getAttribute('data-id');
            item.classList.remove('active');
            if (itemId === currentHeading.id) {
                item.classList.add('active');
                // 确保高亮项在大纲视图中
                const container = document.querySelector('.outline-container');
                const itemTop = item.offsetTop;
                const containerScrollTop = container.scrollTop;
                const containerHeight = container.offsetHeight;
                
                if (itemTop < containerScrollTop || itemTop > containerScrollTop + containerHeight) {
                    item.scrollIntoView({ block: 'center', behavior: 'smooth' });
                }
            }
        });
    }

    /**
     * 初始化滚动监听
     * 监听content-wrapper的滚动事件
     */
    function initScrollHandler() {
        const contentWrapper = document.querySelector('.content-wrapper');
        
        if (contentWrapper) {
            // 使用MutationObserver监听内容变化
            const observer = new MutationObserver(() => {
                handleScroll();
            });
            
            observer.observe(contentWrapper, {
                childList: true,
                subtree: true
            });

            // 监听滚动事件
            contentWrapper.addEventListener('scroll', () => {
                if (!scrollTimeout) {
                    scrollTimeout = setTimeout(() => {
                        handleScroll();
                        scrollTimeout = null;
                    }, 100);
                }
            }, { passive: true });

            // 监听鼠标滚轮事件
            contentWrapper.addEventListener('wheel', () => {
                if (!scrollTimeout) {
                    scrollTimeout = setTimeout(() => {
                        handleScroll();
                        scrollTimeout = null;
                    }, 100);
                }
            }, { passive: true });
        }
    }

    /**
     * 切换右侧大纲栏的显示/隐藏
     */
    function toggleOutline() {
        const outline = document.querySelector('.site-outline');
        const content = document.querySelector('.content-wrapper');
        const toggle = document.querySelector('.outline-toggle');
        
        outline.classList.toggle('hidden');
        content.classList.toggle('outline-hidden');
        toggle.classList.toggle('hidden');
        
        // 保存大纲栏状态到 localStorage
        localStorage.setItem('outlineHidden', outline.classList.contains('hidden'));
    }

    // 初始化大纲栏
    function initializeOutlinePanel() {
        // 添加大纲栏切换按钮
        const toggleButton = document.createElement('button');
        toggleButton.className = 'outline-toggle';
        toggleButton.innerHTML = '☰';
        document.body.appendChild(toggleButton);
        
        toggleButton.addEventListener('click', toggleOutline);
        
        // 恢复大纲栏状态
        const outlineHidden = localStorage.getItem('outlineHidden') === 'true';
        if (outlineHidden) {
            const outline = document.querySelector('.site-outline');
            const content = document.querySelector('.content-wrapper');
            const toggle = document.querySelector('.outline-toggle');
            
            outline.classList.add('hidden');
            content.classList.add('outline-hidden');
            toggle.classList.add('hidden');
        }
    }

    let scrollTimeout;
    
    // 初始化
    renderOutline();
    initializeOutlinePanel();
    
    // 确保DOM完全加载后再初始化滚动监听
    if (document.readyState === 'complete') {
        initScrollHandler();
        handleScroll();
    } else {
        window.addEventListener('load', () => {
            initScrollHandler();
            handleScroll();
        });
    }
}