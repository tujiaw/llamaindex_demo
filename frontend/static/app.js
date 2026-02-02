const API_BASE = '/api';

// State
let allFiles = [];
let selectedFileIds = new Set();

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
    
    try {
        const res = await fetch(`${API_BASE}/chat/query`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: message,
                file_ids: fileIds.length > 0 ? fileIds : null // null means all
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
        sourceHtml = `
            <div class="sources">
                <strong>参考来源:</strong>
                ${sources.map(s => `
                    <div style="margin-top: 5px; border-top: 1px solid rgba(0,0,0,0.1); padding-top: 5px;">
                        <span style="font-weight:bold;">📄 ${s.filename}</span> (Score: ${s.score.toFixed(2)})
                        <br>
                        <span style="color: #555; font-style: italic; font-size: 0.9em;">"${s.text}"</span>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    // Markdown-like simple formatting for response
    // content = content.replace(/\n/g, '<br>');
    
    msgDiv.innerHTML = `
        <div class="message-content">
            <div style="white-space: pre-wrap;">${content}</div>
            ${sourceHtml}
        </div>
    `;
    messagesDiv.appendChild(msgDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function appendLoading() {
    const id = 'loading-' + Date.now();
    const messagesDiv = document.getElementById('chatMessages');
    const msgDiv = document.createElement('div');
    msgDiv.id = id;
    msgDiv.className = 'message assistant';
    msgDiv.innerHTML = '<div class="message-content">Thinking...</div>';
    messagesDiv.appendChild(msgDiv);
    return id;
}

function removeMessage(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

function handleKeyPress(e) {
    if (e.key === 'Enter') sendMessage();
}

// Init
loadFiles();
