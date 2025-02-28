 // 动态加载 ForceGraph
 async function loadForceGraph() {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = '//unpkg.com/force-graph@1.49.0/dist/force-graph.min.js';
        script.onload = () => resolve(window.ForceGraph);
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// 初始化图谱
async function initializeGraph(data) {
    try {
        await loadForceGraph();
        
        const container = document.querySelector('.graph-container');
        if (!container) return;

        // 获取当前页面的文章ID
        const currentPath = window.location.pathname;
        const currentId = currentPath.split('/posts/')[1]?.replace('.html', '');
        // 解码 URL 编码的中文字符
        const decodedCurrentId = currentId ? decodeURIComponent(currentId) : null;

        // 过滤数据，只保留当前节点和与其相关的节点
        const filterGraphData = (data) => {
            if (!decodedCurrentId) return data;
            
            // 找到与当前节点直接相连的所有节点ID
            const connectedNodeIds = new Set([decodedCurrentId]);
            data.links.forEach(link => {
                if (link.source === decodedCurrentId) connectedNodeIds.add(link.target);
                if (link.target === decodedCurrentId) connectedNodeIds.add(link.source);
            });

            // 过滤节点和连接
            const filteredNodes = data.nodes.filter(node => connectedNodeIds.has(node.id));
            const filteredLinks = data.links.filter(link => 
                connectedNodeIds.has(link.source) && connectedNodeIds.has(link.target)
            );

            return {
                nodes: filteredNodes,
                links: filteredLinks
            };
        };

        // 创建提示框
        const tooltip = document.createElement('div');
        tooltip.className = 'graph-tooltip';
        container.appendChild(tooltip);

        // 创建图谱实例
        const Graph = ForceGraph();
        
        // 记录当前悬停的节点
        let hoverNode = null;
        
        // 配置力导向参数
        const graph = Graph(container)
            .graphData(filterGraphData(data))
            .nodeId('id')
            .nodeLabel('label')
            .nodeCanvasObject((node, ctx, globalScale) => {
                // 绘制节点
                const size = 6;
                ctx.beginPath();
                ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
                ctx.fillStyle = node.id === decodedCurrentId ? 
                    getComputedStyle(document.body).getPropertyValue('--text-success') :
                    getComputedStyle(document.body).getPropertyValue('--text-accent');
                ctx.fill();

                // 绘制文本标签
                const label = node.label;
                ctx.font = "8px Arial";
                ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--text-normal') + '80';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(label, node.x, node.y + size + 12);
            })
            .nodePointerAreaPaint((node, color, ctx) => {
                // 扩大可点击区域
                const size = 10;
                ctx.beginPath();
                ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
                ctx.fillStyle = color;
                ctx.fill();
            })
            .linkColor(() => getComputedStyle(document.body).getPropertyValue('--background-modifier-border'))
            .linkWidth(1)
            .linkDirectionalParticles(1)
            .linkDirectionalParticleWidth(2);

        // 配置物理引擎
        Graph.d3Force('charge').strength(-100);
        Graph.d3Force('link').distance(50);
        Graph.d3Force('center').strength(0.05);

        // 配置事件处理
        Graph
            .cooldownTicks(100)
            .onEngineTick(() => {
                // 更新工具提示位置
                if (hoverNode) {
                    const pos = Graph.graph2ScreenCoords(hoverNode.x, hoverNode.y);
                    tooltip.style.left = `${pos.x}px`;
                    tooltip.style.top = `${pos.y - 20}px`;
                }
            })
            .onNodeHover((node, prev) => {
                hoverNode = node;  // 更新当前悬停节点
                
                if (node) {
                    tooltip.style.display = 'block';
                    tooltip.textContent = node.label;
                    
                    // 高亮相关节点
                    const highlightNodes = new Set([node.id, ...node.neighbors]);
                    Graph.nodeColor(n => {
                        if (n.id === decodedCurrentId) return getComputedStyle(document.body).getPropertyValue('--text-success');
                        return highlightNodes.has(n.id) ? 
                            getComputedStyle(document.body).getPropertyValue('--text-accent') : 
                            getComputedStyle(document.body).getPropertyValue('--text-muted');
                    });
                } else {
                    tooltip.style.display = 'none';
                    // 恢复所有节点颜色，保持当前节点高亮
                    Graph.nodeColor(n => n.id === decodedCurrentId ? 
                        getComputedStyle(document.body).getPropertyValue('--text-success') : 
                        getComputedStyle(document.body).getPropertyValue('--text-accent'));
                }
            })
            .onNodeClick((node) => {
                const encodedId = encodeURIComponent(node.id);
                window.location.href = '/posts/' + encodedId + '.html';
            })
            .onNodeDragEnd(node => {
                // 拖拽结束后固定节点位置
                node.fx = node.x;
                node.fy = node.y;
            })
            .onBackgroundClick(() => {
                // 点击背景时释放所有固定节点
                Graph.graphData().nodes.forEach(node => {
                    node.fx = null;
                    node.fy = null;
                });
            });

        // 自适应容器大小
        const resize = () => {
            const { width, height } = container.getBoundingClientRect();
            Graph.width(width);
            Graph.height(height);
        };
        window.addEventListener('resize', resize);
        resize();

        // 添加双击事件以重置视图
        container.addEventListener('dblclick', () => {
            Graph.zoomToFit(400);
        });

        // 初始化时自动适应视图
        setTimeout(() => {
            Graph.zoomToFit(400, 50); // 50ms 过渡动画
        }, 500); // 等待图谱布局稳定
    } catch (error) {
        console.error('Failed to initialize graph:', error);
        const container = document.querySelector('.graph-container');
        if (container) {
            container.innerHTML = '<div class="graph-error">Failed to load graph</div>';
        }
    }
}