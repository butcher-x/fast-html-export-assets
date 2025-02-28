/**
 * 初始化导航功能
 * @param {Object} navigationData - 导航数据
 */
function initializeNavigation(navigationData) {
    // 从localStorage恢复文件夹状态
    let folderStates = new Map();
    try {
        const savedStates = localStorage.getItem('folderStates');
        if (savedStates) {
            folderStates = new Map(JSON.parse(savedStates));
        }
    } catch (e) {
        console.warn('Failed to load folder states:', e);
    }
    
    /**
     * 切换文件夹的展开/折叠状态
     * @param {string} path - 文件夹路径
     */
    function toggleFolder(path) {
        const folder = document.querySelector(`[data-path="${path}"]`);
        const toggle = folder.querySelector('.nav-folder-toggle');
        const children = folder.querySelector('.nav-folder-children');
        
        const isCollapsed = folderStates.get(path);
        folderStates.set(path, !isCollapsed);
        
        if (isCollapsed) {
            toggle.classList.remove('collapsed');
            children.style.display = 'block';
        } else {
            toggle.classList.add('collapsed');
            children.style.display = 'none';
        }
        
        // 保存状态到 localStorage
        try {
            localStorage.setItem('folderStates', JSON.stringify(Array.from(folderStates.entries())));
        } catch (e) {
            console.warn('Failed to save folder states:', e);
        }
    }
    
    function toggleNavigation() {
        const nav = document.querySelector('.site-navigation');
        const content = document.querySelector('.content-wrapper');
        const toggle = document.querySelector('.nav-toggle');
        
        nav.classList.toggle('hidden');
        content.classList.toggle('full-width');
        toggle.classList.toggle('hidden');
        
        // 保存导航栏状态到 localStorage
        localStorage.setItem('navHidden', nav.classList.contains('hidden'));
    }
    
    const FOLDER_ICON = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path d="M20 5h-8.586L9.707 3.293A.997.997 0 0 0 9 3H4c-1.103 0-2 .897-2 2v14c0 1.103.897 2 2 2h16c1.103 0 2-.897 2-2V7c0-1.103-.897-2-2-2zm0 14H4V7h16v12z"/>
        </svg>
    `;

    const FILE_ICON = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/>
        </svg>
    `;

    /**
     * 渲染文件树节点
     * @param {Object} node - 节点数据
     * @param {HTMLElement} container - 容器元素
     */
    function renderTreeNode(node, container) {
        if (node.type === 'folder') {
            const folderDiv = document.createElement('div');
            folderDiv.className = 'nav-folder';
            folderDiv.setAttribute('data-path', node.path);
            
            const folderTitle = document.createElement('div');
            folderTitle.className = 'nav-item';
            
            const toggle = document.createElement('span');
            toggle.className = 'nav-folder-toggle';
            toggle.innerHTML = '▼';
            
            const icon = document.createElement('span');
            icon.className = 'nav-icon nav-folder-icon';
            icon.innerHTML = FOLDER_ICON;
            
            const name = document.createElement('span');
            name.className = 'nav-folder-name';
            name.textContent = node.name;
            
            folderTitle.appendChild(toggle);
            folderTitle.appendChild(icon);
            folderTitle.appendChild(name);
            
            const children = document.createElement('div');
            children.className = 'nav-folder-children';
            
            folderDiv.appendChild(folderTitle);
            folderDiv.appendChild(children);
            
            container.appendChild(folderDiv);
            
            if (node.children) {
                node.children.forEach(child => renderTreeNode(child, children));
            }
            
            folderTitle.addEventListener('click', () => toggleFolder(node.path));
            
            // 恢复文件夹状态
            const isCollapsed = folderStates.get(node.path);
            if (isCollapsed) {
                toggle.classList.add('collapsed');
                children.style.display = 'none';
            }
        } else {
            const fileDiv = document.createElement('div');
            fileDiv.className = 'nav-file';
            if (node.path === navigationData.currentPath) {
                fileDiv.classList.add('active');
            }
            
            const link = document.createElement('a');
            link.className = 'nav-item';
            link.href = window.location.origin + '/posts/' + node.path;
            
            const icon = document.createElement('span');
            icon.className = 'nav-icon nav-file-icon';
            icon.innerHTML = FILE_ICON;
            
            const name = document.createElement('span');
            name.textContent = node.name;
            
            link.appendChild(icon);
            link.appendChild(name);
            fileDiv.appendChild(link);
            container.appendChild(fileDiv);
        }
    }
    
    // 初始化导航
    const navContainer = document.querySelector('.nav-tree');
    
    // 添加导航栏头部
    const header = document.createElement('div');
    header.className = 'nav-header';
    header.textContent = navigationData.blogName || 'My Blog';
    navContainer.parentElement.insertBefore(header, navContainer);
    
    // 添加搜索框
    const searchDiv = document.createElement('div');
    searchDiv.className = 'nav-search';
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Search...';
    searchDiv.appendChild(searchInput);
    navContainer.parentElement.insertBefore(searchDiv, navContainer);
    
    // 渲染文件树
    renderTreeNode(navigationData.tree, navContainer);
    
    // 添加导航栏切换按钮
    const toggleButton = document.createElement('button');
    toggleButton.className = 'nav-toggle';
    toggleButton.innerHTML = '☰';
    document.body.appendChild(toggleButton);
    
    toggleButton.addEventListener('click', toggleNavigation);
    
    // 恢复导航栏状态
    const navHidden = localStorage.getItem('navHidden') === 'true';
    if (navHidden) {
        const nav = document.querySelector('.site-navigation');
        const content = document.querySelector('.content-wrapper');
        const toggle = document.querySelector('.nav-toggle');
        
        nav.classList.add('hidden');
        content.classList.add('full-width');
        toggle.classList.add('hidden');
    }

    // 添加搜索组件初始化
    const resultContainer = document.createElement('div');
    resultContainer.className = 'search-results';
    document.body.appendChild(resultContainer);

    // 获取搜索数据
    fetch('/assets/data/search-data.json')
        .then(response => response.json())
        .then(data => {
            initializeSearchComponent(searchInput, resultContainer, data);
        })
        .catch(error => console.error('加载搜索数据失败:', error));
}