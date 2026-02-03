const API_BASE = '/api';

// State
let allFiles = [];
let selectedFileIds = new Set();

// 获取或创建用户ID（用于 Mem0 记忆）
function getUserId() {
    let userId = localStorage.getItem('llamaindex_user_id');
    if (!userId) {
        userId = 'user_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('llamaindex_user_id', userId);
    }
    return userId;
}

// Tabs
function switchTab(tab) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    
    document.querySelector(`.tab[onclick="switchTab('${tab}')"]`).classList.add('active');
    document.getElementById(`${tab}-tab`).classList.add('active');
    
    if (tab === 'chat') {
        renderChatFileSelector();
    }
}

// File Upload
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');

uploadArea.addEventListener('click', () => fileInput.click());

uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragging');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragging');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragging');
    const files = e.dataTransfer.files;
    if (files.length) handleFiles(files);
});

fileInput.addEventListener('change', () => {
    if (fileInput.files.length) handleFiles(fileInput.files);
});

async function handleFiles(files) {
    const file = files[0];
    const formData = new FormData();
    formData.append('file', file);
    
    const msgDiv = document.getElementById('uploadMessage');
    msgDiv.innerHTML = '<div class="loading">正在上传...</div>';
    
    try {
        const res = await fetch(`${API_BASE}/files/upload`, {
            method: 'POST',
            body: formData
        });
        
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || '上传失败');
        }
        
        const data = await res.json();
        msgDiv.innerHTML = `<div class="success">文件 ${data.filename} 上传成功！</div>`;
        loadFiles();
    } catch (e) {
        msgDiv.innerHTML = `<div class="error">${e.message}</div>`;
    }
}

// File List
async function loadFiles() {
    const listDiv = document.getElementById('fileList');
    try {
        const res = await fetch(`${API_BASE}/files/list`);
        const files = await res.json();
        allFiles = files; // Update state
        
        if (files.length === 0) {
            listDiv.innerHTML = '<div class="loading">暂无文件</div>';
            return;
        }
        
        listDiv.innerHTML = files.map(file => `
            <div class="file-item">
                <div class="file-info">
                    <div class="file-name">${file.filename}</div>
                    <div class="file-meta">
                        ${(file.size / 1024).toFixed(1)} KB | 
                        ${new Date(file.uploaded_at).toLocaleString()} | 
                        ${file.chunks_count} chunks
                    </div>
                </div>
                <button class="btn btn-danger" onclick="deleteFile('${file.file_id}')">删除</button>
            </div>
        `).join('');
        
        // Also update chat selector if visible
        if (document.getElementById('chat-tab').classList.contains('active')) {
            renderChatFileSelector();
        }
    } catch (e) {
        listDiv.innerHTML = `<div class="error">加载失败: ${e.message}</div>`;
    }
}

async function deleteFile(fileId) {
    if (!confirm('确定要删除这个文件吗？')) return;
    
    try {
        const res = await fetch(`${API_BASE}/files/${fileId}`, {
            method: 'DELETE'
        });
        
        if (!res.ok) throw new Error('删除失败');
        
        loadFiles();
    } catch (e) {
        alert(e.message);
    }
}

// Chat
function renderChatFileSelector() {
    const container = document.getElementById('chatFileSelector');
    if (!container) return; 
    
    if (allFiles.length === 0) {
        container.innerHTML = '<div style="color:#666; font-size:12px; margin-bottom: 10px;">暂无可用文件，请先上传</div>';
        return;
    }
    
    container.innerHTML = `
        <div style="margin-bottom: 10px; font-weight: bold; color: #333;">选择上下文文档 (默认全选):</div>
        <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 15px;">
            ${allFiles.map(file => `
                <label style="
                    display: flex; 
                    align-items: center; 
                    gap: 5px; 
                    background: white; 
                    padding: 8px 12px; 
                    border-radius: 20px; 
                    border: 1px solid ${selectedFileIds.has(file.file_id) ? '#667eea' : '#e0e0e0'};
                    cursor: pointer;
                    transition: all 0.2s;
                ">
                    <input type="checkbox" 
                           value="${file.file_id}" 
                           ${selectedFileIds.has(file.file_id) ? 'checked' : ''}
                           onchange="toggleFileSelection('${file.file_id}')">
                    <span style="font-size: 13px; color: #333;">${file.filename}</span>
                </label>
            `).join('')}
        </div>
    `;
}

function toggleFileSelection(fileId) {
    if (selectedFileIds.has(fileId)) {
        selectedFileIds.delete(fileId);
    } else {
        selectedFileIds.add(fileId);
    }
    renderChatFileSelector();
}

async function sendMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    if (!message) return;
    
    input.value = '';
    appendMessage('user', message);
    
    const loadingId = appendLoading();
    
    const fileIds = Array.from(selectedFileIds);
    const userId = getUserId(); // 获取用户ID用于记忆
    
    try {
        const res = await fetch(`${API_BASE}/chat/query`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: message,
                file_ids: fileIds.length > 0 ? fileIds : null, // null means all
                user_id: userId, // 传递用户ID
                chat_history: [] // Mem0 会自动管理历史，这里传空数组
            })
        });
        
        removeMessage(loadingId);
        
        if (!res.ok) throw new Error('请求失败');
        
        const data = await res.json();
        appendMessage('assistant', data.response, data.sources);
    } catch (e) {
        removeMessage(loadingId);
        appendMessage('assistant', `Error: ${e.message}`);
    }
}

function appendMessage(role, content, sources = []) {
    const messagesDiv = document.getElementById('chatMessages');
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${role}`;
    
    let sourceHtml = '';
    if (sources && sources.length > 0) {
        // 按分数从高到低排序
        const sortedSources = [...sources].sort((a, b) => b.score - a.score);
        
        sourceHtml = `
            <div class="sources">
                <div style="margin-bottom: 8px; font-weight: bold; color: #667eea;">
                    📚 检索到 ${sortedSources.length} 个相关片段
                </div>
                ${sortedSources.map((s, idx) => {
                    const sourceId = `source-${Date.now()}-${idx}`;
                    return `
                        <div style="margin-top: 10px; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
                            <div style="
                                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                                color: white;
                                padding: 10px 12px;
                                display: flex;
                                justify-content: space-between;
                                align-items: center;
                                cursor: pointer;
                            " onclick="toggleSource('${sourceId}')">
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <span style="font-weight: bold;">📄 ${s.filename}</span>
                                    <span style="
                                        background: rgba(255,255,255,0.3);
                                        padding: 2px 8px;
                                        border-radius: 12px;
                                        font-size: 12px;
                                    ">相关度: ${(s.score * 100).toFixed(1)}%</span>
                                </div>
                                <span id="${sourceId}-icon" style="font-size: 18px; transition: transform 0.3s;">▼</span>
                            </div>
                            <div id="${sourceId}" style="
                                max-height: 0;
                                overflow: hidden;
                                transition: max-height 0.3s ease-out;
                                background: #f8f9fa;
                            ">
                                <div style="padding: 12px; color: #333;">
                                    <div style="
                                        background: white;
                                        padding: 12px;
                                        border-radius: 6px;
                                        border-left: 3px solid #667eea;
                                        line-height: 1.6;
                                        font-size: 14px;
                                        white-space: pre-wrap;
                                        word-wrap: break-word;
                                    ">${escapeHtml(s.text)}</div>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }
    
    msgDiv.innerHTML = `
        <div class="message-content">
            <div style="white-space: pre-wrap;">${content}</div>
            ${sourceHtml}
        </div>
    `;
    messagesDiv.appendChild(msgDiv);
    scrollToBottom();
}

function toggleSource(sourceId) {
    const contentDiv = document.getElementById(sourceId);
    const iconSpan = document.getElementById(`${sourceId}-icon`);
    
    if (contentDiv.style.maxHeight && contentDiv.style.maxHeight !== '0px') {
        // 折叠
        contentDiv.style.maxHeight = '0px';
        iconSpan.style.transform = 'rotate(0deg)';
    } else {
        // 展开
        contentDiv.style.maxHeight = contentDiv.scrollHeight + 'px';
        iconSpan.style.transform = 'rotate(180deg)';
        // 展开后延迟滚动，等待动画完成
        setTimeout(() => scrollToBottom(), 300);
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function appendLoading() {
    const id = 'loading-' + Date.now();
    const messagesDiv = document.getElementById('chatMessages');
    const msgDiv = document.createElement('div');
    msgDiv.id = id;
    msgDiv.className = 'message assistant';
    msgDiv.innerHTML = '<div class="message-content">Thinking...</div>';
    messagesDiv.appendChild(msgDiv);
    scrollToBottom();
    return id;
}

// 平滑滚动到底部
function scrollToBottom() {
    const messagesDiv = document.getElementById('chatMessages');
    messagesDiv.scrollTo({
        top: messagesDiv.scrollHeight,
        behavior: 'smooth'
    });
}

function removeMessage(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

function handleKeyPress(e) {
    if (e.key === 'Enter') sendMessage();
}

// 显示用户ID
function displayUserId() {
    const userIdElement = document.getElementById('userIdDisplay');
    if (userIdElement) {
        const userId = getUserId();
        userIdElement.textContent = `用户ID: ${userId}`;
    }
}

// Init
loadFiles();
displayUserId();
