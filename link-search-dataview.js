/**
 * 处理内部链接与脚注点击事件
 * 如果链接指向当前页面，则阻止默认跳转，
 * 平滑滚动到目标元素，并添加高亮效果。
 */
document.addEventListener('click', function (e) {
    const target = e.target;
    // 如果点击目标不是 <a> 元素，则查找最近的含有 'internal-link' 或 'footnote-link' 类的 a 元素
    const link = target.tagName === 'A' ? target : target.closest('a.internal-link, a.footnote-link');
    if (link) {
        const href = link.getAttribute('href');
        if (href) {
            // 使用当前页面 URL 作为基地址，解析链接地址
            const linkUrl = new URL(href, window.location.href);
            const currentUrl = new URL(window.location.href);
            // 如果链接的路径与当前页面相同，则进行滚动和高亮处理
            if (linkUrl.pathname === currentUrl.pathname) {
                e.preventDefault();
                if (linkUrl.hash) {
                    const elementId = linkUrl.hash.substring(1);
                    const element = document.getElementById(elementId);
                    if (element) {
                        element.scrollIntoView({ behavior: 'smooth' });
                        element.classList.add('heading-highlight');
                        setTimeout(() => {
                            element.classList.remove('heading-highlight');
                        }, 1500);
                    }
                }
            }
        }
    }
}); 

/**
 * 初始化搜索组件
 * @param {HTMLElement} searchInput - 搜索输入框元素
 * @param {HTMLElement} resultContainer - 搜索结果容器
 * @param {Array} data - 搜索数据
 */
function initializeSearchComponent(searchInput, resultContainer, data) {
    if (!Array.isArray(data)) {
        console.error('搜索数据格式错误');
        return;
    }

    // 点击外部时隐藏搜索结果
    document.addEventListener('click', (e) => {
        if (!resultContainer.contains(e.target) && !searchInput.contains(e.target)) {
            resultContainer.classList.remove('active');
        }
    });

    // 防抖处理
    let searchTimeout;
    
    searchInput.addEventListener('input', () => {
        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }

        const query = searchInput.value.trim().toLowerCase();
        if (query.length < 2) {
            return; // 如果输入字符少于两个，则不执行搜索
        }

        searchTimeout = setTimeout(() => {
            const allMatches = [];
            
            // 查找所有匹配项
            data.forEach(item => {
                if (!item || !item.content || typeof item.content !== 'string') return;
                
                const matches = findAllMatches(item.content, query);
                matches.forEach(match => {
                    allMatches.push({
                        path: item.path,
                        content: item.content,
                        matchStart: match.start,
                        matchEnd: match.end
                    });
                });
            });

            renderSearchResults(allMatches, resultContainer, query);
        }, 200);
    });
}

/**
 * 查找文本中的所有匹配位置
 * @param {string} content - 要搜索的文本内容
 * @param {string} query - 搜索关键词
 * @returns {Array} - 匹配位置数组，每个元素包含 start 和 end 索引
 */
function findAllMatches(content, query) {
    const matches = [];
    const lowerContent = content.toLowerCase();
    const lowerQuery = query.toLowerCase();
    let index = 0;

    while ((index = lowerContent.indexOf(lowerQuery, index)) !== -1) {
        matches.push({
            start: index,
            end: index + query.length
        });
        index += query.length;
    }

    return matches;
}

/**
 * 生成匹配内容的预览
 * @param {string} content - 完整内容
 * @param {number} matchStart - 匹配开始位置
 * @param {number} matchEnd - 匹配结束位置
 * @param {string} query - 搜索关键词
 * @returns {string} - 带有高亮的预览HTML
 */
function generateMatchPreview(content, matchStart, matchEnd, query) {
    const contextLength = 50;
    const start = Math.max(0, matchStart - contextLength);
    const end = Math.min(content.length, matchEnd + contextLength);
    let preview = content.substring(start, end);
    
    if (start > 0) preview = '...' + preview;
    if (end < content.length) preview = preview + '...';
    
    return highlightQuery(preview, query);
}

/**
 * 渲染搜索结果
 * @param {Array} matches - 搜索匹配结果数组
 * @param {HTMLElement} container - 结果容器元素
 * @param {string} query - 搜索关键词
 */
function renderSearchResults(matches, container, query) {
    container.innerHTML = '';
    
    if (matches.length === 0) {
        container.innerHTML = `
            <div class="search-no-results">
                未找到相关内容
            </div>
        `;
        container.classList.add('active');
        return;
    }

    // 按文件路径分组匹配项
    const groupedMatches = matches.reduce((groups, match) => {
        if (!groups[match.path]) {
            groups[match.path] = [];
        }
        groups[match.path].push(match);
        return groups;
    }, {});

    // 为每个匹配项创建结果元素
    Object.entries(groupedMatches).forEach(([path, fileMatches]) => {
        fileMatches.forEach((match, index) => {
            const resultItem = document.createElement('div');
            resultItem.className = 'search-result-item';
            
            const title = document.createElement('div');
            title.className = 'search-result-title';
            // 如果同一文件有多个匹配项，显示匹配序号
            const matchCount = fileMatches.length > 1 ? ` (${index + 1}/${fileMatches.length})` : '';
            title.textContent = `${path.split('/').pop() || path}${matchCount}`;
            
            const preview = document.createElement('div');
            preview.className = 'search-result-context';
            preview.innerHTML = generateMatchPreview(match.content, match.matchStart, match.matchEnd, query);
            
            resultItem.appendChild(title);
            resultItem.appendChild(preview);
            
            resultItem.addEventListener('click', () => {
                const url = `/posts/${match.path}.html?highlight=${encodeURIComponent(query)}&matchNum=${index + 1}`;
                window.location.href = url;
            });
            
            container.appendChild(resultItem);
        });
    });
    
    container.classList.add('active');
}

/**
 * 高亮显示查询内容
 * @param {string} content - 内容
 * @param {string} query - 查询
 * @returns {string} - 带有高亮的HTML
 */
function highlightQuery(content, query) {
    const regex = new RegExp(`(${query})`, 'gi');
    return content.replace(regex, '<span class="highlight">$1</span>');
}

/**
 * 高亮显示页面中的内容
 * @param {string} path - 文件路径
 * @param {string} query - 查询
 */
function highlightContent(path, query) {
    const element = document.getElementById(path);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
        element.classList.add('highlight');
        setTimeout(() => {
            element.classList.remove('highlight');
        }, 1500);
    }
} 

/**
 * 初始化高亮处理
 * 处理URL参数中的高亮和定位请求
 */
function initializeHighlight() {
    const urlParams = new URLSearchParams(window.location.search);
    const highlight = urlParams.get('highlight');
    const matchNum = parseInt(urlParams.get('matchNum')) || 1;

    console.log('Highlight params:', { highlight, matchNum });

    if (!highlight) {
        console.log('No highlight text provided');
        return;
    }

    // 等待内容加载完成
    setTimeout(() => {
        const content = document.querySelector('.content-wrapper');
        console.log('Content element found:', !!content);
        
        if (!content) {
            console.warn('Content wrapper not found');
            return;
        }

        // 查找所有文本节点
        const walker = document.createTreeWalker(
            content,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );

        let node;
        let matchCount = 0;
        let found = false;

        // 遍历所有文本节点查找第N个匹配
        while ((node = walker.nextNode()) && !found) {
            const nodeText = node.textContent;
            let matchIndex = -1;
            let currentIndex = 0;

            // 在当前节点中查找所有匹配
            while ((matchIndex = nodeText.toLowerCase().indexOf(highlight.toLowerCase(), currentIndex)) !== -1) {
                matchCount++;
                console.log('Found match:', {
                    count: matchCount,
                    text: nodeText.substr(matchIndex, highlight.length),
                    target: matchNum
                });
                
                if (matchCount === matchNum) {
                    console.log('Found target match:', {
                        nodeText,
                        matchIndex,
                        matchNum
                    });

                    try {
                        // 创建高亮元素
                        const range = document.createRange();
                        const highlightSpan = document.createElement('span');
                        highlightSpan.className = 'search-highlight';

                        range.setStart(node, matchIndex);
                        range.setEnd(node, matchIndex + highlight.length);
                        range.surroundContents(highlightSpan);

                        // 保存原始文本
                        const originalText = highlightSpan.textContent;

                        // 先滚动到目标位置
                        highlightSpan.scrollIntoView({ behavior: 'smooth', block: 'center' });

                        // 等待滚动完成后再执行动画
                        setTimeout(() => {
                            // 确保元素在视口中心
                            const rect = highlightSpan.getBoundingClientRect();
                            const viewportHeight = window.innerHeight;
                            const targetTop = viewportHeight / 2 - rect.height / 2;
                            const currentTop = rect.top;
                            
                            if (Math.abs(currentTop - targetTop) > 10) {
                                // 如果位置不够居中，再次调整
                                highlightSpan.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                setTimeout(startAnimation, 500);
                            } else {
                                startAnimation();
                            }

                            function startAnimation() {
                                highlightSpan.classList.add('active');
                                console.log('Highlight animation activated');
                                
                                // 动画结束后移除高亮元素
                                highlightSpan.addEventListener('animationend', () => {
                                    // 创建文本节点替换高亮元素
                                    const textNode = document.createTextNode(originalText);
                                    highlightSpan.parentNode.replaceChild(textNode, highlightSpan);
                                    console.log('Highlight element removed');
                                });
                            }
                        }, 800); // 等待滚动完成

                        found = true;
                        break;
                    } catch (error) {
                        console.error('Error creating highlight:', error);
                    }
                }
                currentIndex = matchIndex + highlight.length;
            }
        }

        if (!found) {
            console.warn(`Match number ${matchNum} not found for text:`, highlight);
        }

        // 清除URL参数
        window.history.replaceState({}, '', window.location.pathname);
    }, 500);
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded, initializing highlight');
    initializeHighlight();
});

// 添加错误处理
window.addEventListener('error', (event) => {
    console.error('Global error in highlight handler:', event.error);
}); 

function initializeDataviewCharts() {
    // 查找所有 dataviewjs 代码块
    const dataviewBlocks = document.querySelectorAll('.block-language-dataviewjs');
    
    dataviewBlocks.forEach(block => {
        const chartData = block.getAttribute('data-chart');
        if (chartData) {
            try {
                const data = JSON.parse(chartData);
                renderChart(block, data);
            } catch (error) {
                console.error('Failed to parse chart data:', error);
                block.innerHTML = '<div class="dataview-error">Failed to parse chart data</div>';
            }
        }
    });
}

function renderChart(container, data) {
    // 动态加载 Chart.js
    const chartScript = document.createElement('script');
    chartScript.src = '/assets/js/chart.js';
    chartScript.onload = () => createChart(container, data);
    document.head.appendChild(chartScript);
}

function createChart(container, data) {
    const canvas = document.createElement('canvas');
    container.appendChild(canvas);
    window.Chart && new window.Chart(canvas, {
        type: data.type,
        data: data.data,
        options: data.options
    });
}

// 在 DOM 加载完成后初始化图表
document.addEventListener('DOMContentLoaded', initializeDataviewCharts);