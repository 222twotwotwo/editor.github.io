/* ================= API 配置 ================= */
const API_CONFIG = {
  baseURL: 'http://localhost:5000/api',
  timeout: 10000,
  withCredentials: false
};

/* ================= API 服务 ================= */
class APIService {
  constructor() {
    this.baseURL = API_CONFIG.baseURL;
    this.token = localStorage.getItem('auth_token');
    console.log('API 服务已初始化，基础URL:', this.baseURL);
  }

  setToken(token) {
    this.token = token;
    localStorage.setItem('auth_token', token);
    console.log('Token 已设置');
  }

  removeToken() {
    this.token = null;
    localStorage.removeItem('auth_token');
    console.log('Token 已移除');
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
      console.log('请求携带 Token');
    }

    const config = {
      ...options,
      headers,
      credentials: API_CONFIG.withCredentials ? 'include' : 'same-origin',
      timeout: API_CONFIG.timeout
    };

    try {
      console.log(`API 请求: ${url}`, config.method || 'GET');
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      console.log(`API 响应 ${endpoint}:`, data);
      return data;
    } catch (error) {
      console.error(`API 请求失败 ${endpoint}:`, error);
      
      // 如果是认证错误，移除 token
      if (error.message.includes('401') || error.message.includes('403')) {
        this.removeToken();
        showLoginModal();
      }
      
      throw error;
    }
  }

  // 健康检查
  async healthCheck() {
    try {
      console.log('执行健康检查...');
      const response = await fetch('http://localhost:5000/health');
      return await response.json();
    } catch (error) {
      console.error('健康检查失败:', error);
      return { status: 'unhealthy', error: error.message };
    }
  }

  // 用户认证
  async register(username, email, password) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password })
    });
  }

  async login(username, password) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
  }

  async logout() {
    this.removeToken();
    return { success: true };
  }

  async getCurrentUser() {
    return this.request('/auth/me');
  }
}

// 创建全局实例
window.api = new APIService();
console.log('API 服务已全局可用: window.api');





/* ================= Markdown + 高亮 ================= */

const md = window.markdownit({
  html: true,
  linkify: true,
  typographer: true,
  highlight: (str, lang) => {
    if (lang && hljs.getLanguage(lang)) {
      return `<pre class="hljs"><code>${hljs.highlight(str, { language: lang }).value}</code></pre>`;
    }
    return `<pre class="hljs"><code>${md.utils.escapeHtml(str)}</code></pre>`;
  }
});

const editor = document.getElementById('editor');
const preview = document.getElementById('preview');

function renderPreview() {
  preview.innerHTML = md.render(editor.value);
}
editor.addEventListener('input', () => {
  renderPreview();
  playEditSound();
});

/* ================= 深色模式 ================= */

const themeToggle = document.getElementById('themeToggle');
const hljsLight = document.getElementById('hljs-light');
const hljsDark = document.getElementById('hljs-dark');

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);

  const dark = theme === 'dark';
  hljsLight.disabled = dark;
  hljsDark.disabled = !dark;
  themeToggle.textContent = dark ? '☀️' : '🌙';
}

setTheme(localStorage.getItem('theme') || 'dark');

themeToggle.onclick = () => {
  setTheme(
    document.documentElement.getAttribute('data-theme') === 'dark'
      ? 'light' : 'dark'
  );
};

/* ================= 左侧侧边栏控制 ================= */

const sidebar = document.getElementById('sidebar');
const toggleSidebar = document.getElementById('toggleSidebar');

function setSidebar(collapsed) {
  sidebar.classList.toggle('collapsed', collapsed);
  localStorage.setItem('sidebarCollapsed', collapsed ? '1' : '0');
}

const savedSidebarState = localStorage.getItem('sidebarCollapsed');
// 默认折叠左侧侧边栏
if (savedSidebarState === null) {
  setSidebar(true);
} else {
  setSidebar(savedSidebarState === '1');
}

toggleSidebar.onclick = () => {
  setSidebar(!sidebar.classList.contains('collapsed'));
};

/* ================= 右侧侧边栏及文件管理 ================= */

// 文件系统状态
const fileSystem = {
  files: {},           // 存储所有文件内容 { filename: content }
  currentFile: null,   // 当前激活的文件名
  FILE_STORAGE_KEY: 'markdownStudioFiles' // localStorage存储键名
};

// DOM元素
const sidebarRight = document.getElementById('sidebarRight');
const toggleRightSidebarBtn = document.getElementById('toggleRightSidebarBtn');
const toggleRightSidebar = document.getElementById('toggleRightSidebar');
const fileList = document.getElementById('fileList');

const saveFileBtn = document.getElementById('saveFileBtn');

const deleteFileBtn = document.getElementById('deleteFileBtn');
// 修复：删除当前文件按钮的事件绑定（显式传递当前文件参数，兜底校验）
deleteFileBtn.addEventListener('click', () => {
  // 兜底：若currentFile为空，提示用户
  if (!fileSystem.currentFile) {
    alert('暂无当前编辑的文件，无法删除！');
    return;
  }
  // 显式调用删除当前文件
  deleteFile(fileSystem.currentFile);
});


const fileNameInput = document.getElementById('fileNameInput');
const importFileBtn = document.getElementById('importFileBtn');

// 初始化文件系统
function initFileSystem() {
  const savedFiles = localStorage.getItem(fileSystem.FILE_STORAGE_KEY);
  if (savedFiles) {
    fileSystem.files = JSON.parse(savedFiles);
    // 加载第一个文件
    const fileNames = Object.keys(fileSystem.files);
    if (fileNames.length > 0) {
      openFile(fileNames[0]);
    }
  }
  renderFileList();
}

// 渲染文件列表
function renderFileList() {
  fileList.innerHTML = '';
  const fileNames = Object.keys(fileSystem.files);
  
  if (fileNames.length === 0) {
    fileList.innerHTML = '<div style="padding: 12px; text-align: center; color: #888;">无文件</div>';
    return;
  }
  
  fileNames.forEach(filename => {
    const fileItem = document.createElement('div');
    fileItem.className = `file-item ${fileSystem.currentFile === filename ? 'active' : ''}`;
    fileItem.innerHTML = `
      <span>${filename}.md</span>
      <span class="delete-icon" data-file="${filename}">×</span>
    `;
    
    // 点击文件切换
    fileItem.addEventListener('click', (e) => {
      if (!e.target.classList.contains('delete-icon')) {
        openFile(filename);
      }
    });
    
    fileList.appendChild(fileItem);
  });
  
  // 添加删除文件事件监听
  document.querySelectorAll('.delete-icon').forEach(icon => {
    icon.addEventListener('click', (e) => {
      e.stopPropagation();
      const filename = e.target.getAttribute('data-file');
      deleteFile(filename);
    });
  });
}

// 打开文件
function openFile(filename) {
  if (!fileSystem.files[filename]) return;
  
  // 保存当前文件内容
  if (fileSystem.currentFile) {
    fileSystem.files[fileSystem.currentFile] = editor.value;
    saveFilesToStorage();
  }
  
  // 加载新文件内容
  fileSystem.currentFile = filename;
  editor.value = fileSystem.files[filename];
  fileNameInput.value = filename;
  renderPreview();
  renderFileList();
}

// 新建文件
function newFile() {
  let defaultName = '新文件';
  let count = 1;
  
  // 确保文件名唯一
  while (fileSystem.files[defaultName]) {
    defaultName = `新文件${count}`;
    count++;
  }
  
  // 创建新文件
  fileSystem.files[defaultName] = '';
  saveFilesToStorage();
  openFile(defaultName);
}

// 保存文件
function saveFile() {
  const newFilename = fileNameInput.value.trim();
  if (!newFilename) {
    alert('请输入文件名');
    return;
  }
  
  // 如果文件名已更改且存在
  if (newFilename !== fileSystem.currentFile && fileSystem.files[newFilename]) {
    if (!confirm(`文件 "${newFilename}" 已存在，是否覆盖？`)) {
      return;
    }
  }
  
  // 如果是重命名
  if (fileSystem.currentFile && newFilename !== fileSystem.currentFile) {
    delete fileSystem.files[fileSystem.currentFile];
  }
  
  // 保存文件内容
  fileSystem.files[newFilename] = editor.value;
  saveFilesToStorage();
  openFile(newFilename);
}

// 删除文件
function deleteFile(filename) {
  // 1. 补全参数：未传文件名则删除当前文件
  if (!filename) filename = fileSystem.currentFile;
  
  // 2. 校验文件存在性：避免删除不存在的文件
  if (!filename || !fileSystem.files[filename]) {
    alert(`文件 "${filename || '未知'}.md" 不存在或已被删除`);
    return;
  }

  // 3. 确认删除操作
  if (!confirm(`确定要删除 "${filename}.md" 吗？`)) {
    return;
  }

  // 4. 标记是否为当前文件（核心：提前缓存状态）
  const isDeleteCurrentFile = fileSystem.currentFile === filename;

  // 5. 核心操作：删除文件（先删内存中的文件）
  delete fileSystem.files[filename];

  // 6. 同步删除结果到本地存储（优先同步，避免后续操作覆盖）
  saveFilesToStorage();

  // 7. 处理当前文件删除后的逻辑（满足“编辑区清空”的核心需求）
  if (isDeleteCurrentFile) {
    // 无论是否有其他文件，都清空编辑区（你要的核心效果）
    fileSystem.currentFile = null; // 重置当前文件状态，阻断回写
    editor.value = '';            // 清空编辑器内容
    fileNameInput.value = '';     // 清空文件名输入框
    renderPreview();              // 刷新预览区（清空预览）
  }

  // 8. 刷新文件列表UI，确保删除后的列表同步
  renderFileList();

  // 9. 友好反馈：告知删除成功
  alert(`文件 "${filename}.md" 已成功删除`);
}

// 导入文件
function importFile() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.md';
  
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      // 获取不带扩展名的文件名
      const filename = file.name.replace(/\.md$/i, '');
      let finalName = filename;
      let count = 1;
      
      // 确保文件名唯一
      while (fileSystem.files[finalName]) {
        finalName = `${filename}${count}`;
        count++;
      }
      
      // 保存导入的文件
      fileSystem.files[finalName] = event.target.result;
      saveFilesToStorage();
      openFile(finalName);
      alert(`已导入文件: ${finalName}.md`);
    };
    reader.readAsText(file);
  };
  
  input.click();
}

// 保存文件到localStorage
function saveFilesToStorage() {
  localStorage.setItem(fileSystem.FILE_STORAGE_KEY, JSON.stringify(fileSystem.files));
}

// 右侧侧边栏控制
function setRightSidebar(collapsed) {
  sidebarRight.classList.toggle('collapsed', collapsed);
  localStorage.setItem('rightSidebarCollapsed', collapsed ? '1' : '0');
}

// 右侧侧边栏事件监听

saveFileBtn.addEventListener('click', saveFile);
deleteFileBtn.addEventListener('click', deleteFile);
importFileBtn.addEventListener('click', importFile);

toggleRightSidebarBtn.addEventListener('click', () => {
  setRightSidebar(!sidebarRight.classList.contains('collapsed'));
});

toggleRightSidebar.addEventListener('click', () => {
  setRightSidebar(true);
});

// 初始化右侧侧边栏状态（默认折叠）
const rightSidebarSaved = localStorage.getItem('rightSidebarCollapsed');
if (rightSidebarSaved === null) {
  setRightSidebar(true); // 首次加载默认折叠
} else {
  setRightSidebar(rightSidebarSaved === '1');
}

/* ================= 音效系统 ================= */

const editAudio = new Audio('audio/edit.mp3');
const exportAudio = new Audio('audio/export.mp3');

editAudio.volume = 0.4;
exportAudio.volume = 0.6;

let audioUnlocked = false;
let soundEnabled = localStorage.getItem('soundEnabled') !== '0';
let editPlaying = false;

document.addEventListener('click', () => {
  if (!audioUnlocked) {
    editAudio.play().then(() => {
      editAudio.pause();
      editAudio.currentTime = 0;
      audioUnlocked = true;
    }).catch(() => {});
  }
}, { once: true });

function playEditSound() {
  if (!audioUnlocked || !soundEnabled || editPlaying) return;
  editPlaying = true;
  editAudio.currentTime = 0;
  editAudio.play().finally(() => {
    editAudio.onended = () => editPlaying = false;
  });
}

function playExportSound() {
  if (!audioUnlocked || !soundEnabled) return;
  exportAudio.currentTime = 0;
  exportAudio.play().catch(() => {});
}

/* 音效开关 */
const soundToggle = document.getElementById('soundToggle');
function updateSoundBtn() {
  soundToggle.textContent = soundEnabled ? '🔊' : '🔇';
}
updateSoundBtn();

soundToggle.onclick = () => {
  soundEnabled = !soundEnabled;
  localStorage.setItem('soundEnabled', soundEnabled ? '1' : '0');
  updateSoundBtn();
};

/* ================= 导出功能 ================= */

const exportBtn = document.getElementById('exportBtn');
const exportMdBtn = document.getElementById('exportMdBtn'); // 导出MD按钮
const exportPdfBtn = document.getElementById('exportPdfBtn');

// 导出HTML
exportBtn.onclick = () => {
  playExportSound();
  const blob = new Blob([preview.innerHTML], { type: 'text/html' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'export.html';
  a.click();
};

// 新增：导出MD文件
exportMdBtn.onclick = () => {
  playExportSound();
  // 使用当前文件名（如果有），否则用默认名
  const fileName = fileSystem.currentFile ? `${fileSystem.currentFile}.md` : 'export.md';
  const blob = new Blob([editor.value], { type: 'text/markdown' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  a.click();
  // 释放URL对象
  URL.revokeObjectURL(a.href);
};

// 导出PDF
exportPdfBtn.onclick = () => {
  playExportSound();
  html2pdf().from(preview).save();
};

/* ================= GitHub 上传 + 指标 ================= */

const KEY = 'uploadStats';
const uploadGithubBtn = document.getElementById('uploadGithubBtn');
const repoOwner = document.getElementById('repoOwner');
const repoName = document.getElementById('repoName');
const filePath = document.getElementById('filePath');
const tokenInput = document.getElementById('tokenInput');
const todayCount = document.getElementById('todayCount');
const uploadChart = document.getElementById('uploadChart');

function today() {
  return new Date().toISOString().slice(0, 10);
}

function recordUploadSuccess() {
  const s = JSON.parse(localStorage.getItem(KEY) || '{}');
  const t = today();
  s[t] = (s[t] || 0) + 1;
  localStorage.setItem(KEY, JSON.stringify(s));
  updateStats();
}

uploadGithubBtn.onclick = async () => {
  const owner = repoOwner.value.trim();
  const repo = repoName.value.trim();
  const path = filePath.value.trim();
  const token = tokenInput.value.trim();
  if (!owner || !repo || !path || !token) return alert('信息不完整');

  const content = btoa(unescape(encodeURIComponent(editor.value)));
  const api = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

  let sha = null;
  const r = await fetch(api, { headers: { Authorization: `token ${token}` } });
  if (r.ok) sha = (await r.json()).sha;

  const res = await fetch(api, {
    method: 'PUT',
    headers: {
      Authorization: `token ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ message: 'Update Markdown', content, sha })
  });

  if (!res.ok) return alert('上传失败');
  recordUploadSuccess();
  alert('✅ 已上传到 GitHub');
};

/* ================= 上传统计 ================= */

let chart;

function updateStats() {
  const s = JSON.parse(localStorage.getItem(KEY) || '{}');
  todayCount.textContent = `今日上传：${s[today()] || 0} 次`;

  const labels = [];
  const data = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const k = d.toISOString().slice(0, 10);
    labels.push(k.slice(5));
    data.push(s[k] || 0);
  }

  if (!chart) {
    chart = new Chart(uploadChart, {
      type: 'bar',
      data: { labels, datasets: [{ data }] }
    });
  } else {
    chart.data.datasets[0].data = data;
    chart.update();
  }
}

/* ================= 代码高亮颜色自定义 ================= */

// 定义可自定义的语法元素
const syntaxElements = [
  { id: 'keyword', name: '关键字' },
  { id: 'variable', name: '变量名' },
  { id: 'string', name: '字符串' },
  { id: 'number', name: '数字' },
  { id: 'comment', name: '注释' },
  { id: 'function', name: '函数名' },
  { id: 'class', name: '类名' },
  { id: 'meta', name: '元数据' },
  { id: 'built_in', name: '内置类型' },
  { id: 'punctuation', name: '标点符号' },
  { id: 'operator', name: '运算符' }
];

// 默认颜色配置
const defaultColors = {
  light: {
    keyword: '#6ABFFA',
    variable: '#C898FA',
    string: '#F0A898',
    number: '#88E888',
    comment: '#78C878',
    function: '#F8D878',
    class: '#98D8F8',
    meta: '#FF9878',
    built_in: '#88C8F8',
    punctuation: '#B8B8D8',
    operator: '#D8D8F8'
  },
  dark: {
    keyword: '#61AFEF',
    variable: '#A7D8FF',
    string: '#E59866',
    number: '#98C379',
    comment: '#72B865',
    function: '#E5E58A',
    class: '#56D9B9',
    meta: '#FF9878',
    built_in: '#88C8F8',
    punctuation: '#B8B8D8',
    operator: '#D8D8F8'
  }
};

// 初始化颜色设置面板
function initColorSettings() {
  const colorSettings = document.getElementById('colorSettings');
  const userColors = getUserColors();
  
  syntaxElements.forEach(element => {
    const theme = document.documentElement.getAttribute('data-theme');
    const defaultColor = defaultColors[theme][element.id];
    const currentColor = userColors[theme][element.id] || defaultColor;
    
    const settingDiv = document.createElement('div');
    settingDiv.className = 'color-setting';
    settingDiv.innerHTML = `
      <label for="${element.id}Color">${element.name}</label>
      <div class="color-input-group">
        <input type="color" id="${element.id}Color" value="${currentColor}">
        <input type="text" id="${element.id}ColorHex" value="${currentColor}">
      </div>
    `;
    
    colorSettings.appendChild(settingDiv);
    
    // 绑定颜色选择事件
    const colorInput = document.getElementById(`${element.id}Color`);
    const hexInput = document.getElementById(`${element.id}ColorHex`);
    
    colorInput.addEventListener('input', () => {
      hexInput.value = colorInput.value;
      saveColorSetting(element.id, colorInput.value);
      applyColorSettings();
    });
    
    hexInput.addEventListener('input', () => {
      if (/^#[0-9A-F]{6}$/i.test(hexInput.value)) {
        colorInput.value = hexInput.value;
        saveColorSetting(element.id, hexInput.value);
        applyColorSettings();
      }
    });
  });
  
  // 绑定重置按钮事件
  document.getElementById('resetColorsBtn').addEventListener('click', () => {
    if (confirm('确定要重置为默认颜色吗？')) {
      localStorage.removeItem('customHighlightColors');
      // 清空现有设置
      document.getElementById('colorSettings').innerHTML = '';
      initColorSettings();
      applyColorSettings();
    }
  });
  
  // 主题切换时更新颜色设置
  themeToggle.addEventListener('click', () => {
    setTimeout(() => {
      // 等待主题切换完成
      document.getElementById('colorSettings').innerHTML = '';
      initColorSettings();
    }, 0);
  });
}

// 获取用户颜色设置
function getUserColors() {
  const saved = localStorage.getItem('customHighlightColors');
  return saved ? JSON.parse(saved) : { light: {}, dark: {} };
}

// 保存颜色设置
function saveColorSetting(elementId, color) {
  const theme = document.documentElement.getAttribute('data-theme');
  const userColors = getUserColors();
  
  if (!userColors[theme]) {
    userColors[theme] = {};
  }
  
  userColors[theme][elementId] = color;
  localStorage.setItem('customHighlightColors', JSON.stringify(userColors));
}

// 应用颜色设置
// 应用颜色设置
function applyColorSettings() {
  const userColors = getUserColors();
  const theme = document.documentElement.getAttribute('data-theme');
  
  // 移除已存在的自定义样式
  const existingStyle = document.getElementById('customHighlightStyles');
  if (existingStyle) {
    existingStyle.remove();
  }
  
  // 创建新的样式元素
  const style = document.createElement('style');
  style.id = 'customHighlightStyles';
  
  let css = '';
  syntaxElements.forEach(element => {
    const color = userColors[theme][element.id] || defaultColors[theme][element.id];
    
    // 为函数名生成多个可能的CSS选择器，确保覆盖所有语言
    if (element.id === 'function') {
      // 同时覆盖多种可能的函数名类名
      css += `[data-theme="${theme}"] .hljs-function { color: ${color} !important; }\n`;
      css += `[data-theme="${theme}"] .hljs-title.function_ { color: ${color} !important; }\n`;
      css += `[data-theme="${theme}"] .hljs-title { color: ${color} !important; }\n`;
      css += `[data-theme="${theme}"] .hljs-name { color: ${color} !important; }\n`;
    }
    // 为标点符号生成多个可能的CSS选择器
    else if (element.id === 'punctuation') {
      // 同时覆盖多种可能的标点符号类名
      css += `[data-theme="${theme}"] .hljs-punctuation { color: ${color} !important; }\n`;
      css += `[data-theme="${theme}"] .hljs-operator { color: ${color} !important; }\n`;
      css += `[data-theme="${theme}"] .hljs-symbol { color: ${color} !important; }\n`;
    }
    // 为变量名生成多个可能的CSS选择器
    else if (element.id === 'variable') {
      // 同时覆盖多种可能的变量名类名
      css += `[data-theme="${theme}"] .hljs-variable { color: ${color} !important; }\n`;
      css += `[data-theme="${theme}"] .hljs-variable.language_ { color: ${color} !important; }\n`;
      css += `[data-theme="${theme}"] .hljs-params { color: ${color} !important; }\n`;
      css += `[data-theme="${theme}"] .hljs-attr { color: ${color} !important; }\n`;
    }
    // 为类名生成多个可能的CSS选择器
    else if (element.id === 'class') {
      // 同时覆盖多种可能的类名类名
      css += `[data-theme="${theme}"] .hljs-class { color: ${color} !important; }\n`;
      css += `[data-theme="${theme}"] .hljs-title.class_ { color: ${color} !important; }\n`;
      css += `[data-theme="${theme}"] .hljs-type { color: ${color} !important; }\n`;
      css += `[data-theme="${theme}"] .hljs-built_in { color: ${color} !important; }\n`;
      css += `[data-theme="${theme}"] .hljs-selector-class { color: ${color} !important; }\n`;
    }
    // 为其他元素生成CSS选择器
    else {
      css += `[data-theme="${theme}"] .hljs-${element.id} { color: ${color} !important; }\n`;
    }
  });
  
  style.textContent = css;
  document.head.appendChild(style);
  
  // 重新渲染预览以应用新样式
  renderPreview();
}

/* 初始化 */
function init() {
  updateStats();
  renderPreview();
  initFileSystem();
  initColorSettings(); // 添加颜色设置初始化
  applyColorSettings(); // 应用颜色设置
}

init();




/* ================= 认证功能 ================= */

let currentUser = null;

// 显示/隐藏模态框
function showAuthModal() {
  document.getElementById('authModal').style.display = 'flex';
  checkBackendStatus();
}

function hideAuthModal() {
  document.getElementById('authModal').style.display = 'none';
  clearStatusMessage();
}

function showLoginSection() {
  document.getElementById('loginSection').style.display = 'block';
  document.getElementById('registerSection').style.display = 'none';
  clearStatusMessage();
}

function showRegisterSection() {
  document.getElementById('loginSection').style.display = 'none';
  document.getElementById('registerSection').style.display = 'block';
  clearStatusMessage();
}

// 状态消息管理
function showStatusMessage(message, type = 'info') {
  const element = document.getElementById('statusMessage');
  element.textContent = message;
  element.className = `status-message ${type}`;
  console.log(`状态消息 [${type}]: ${message}`);
}

function clearStatusMessage() {
  const element = document.getElementById('statusMessage');
  element.textContent = '';
  element.className = 'status-message';
  element.style.display = 'none';
}

// 检查后端状态
async function checkBackendStatus() {
  try {
    const health = await api.healthCheck();
    const statusElement = document.getElementById('backendStatus');
    
    if (health.status === 'healthy' && health.database.connected) {
      statusElement.innerHTML = '✅ 后端连接正常';
      statusElement.style.color = '#48bb78';
    } else {
      statusElement.innerHTML = '❌ 后端连接异常';
      statusElement.style.color = '#f56565';
      showStatusMessage('后端服务连接异常，部分功能可能受限', 'error');
    }
  } catch (error) {
    const statusElement = document.getElementById('backendStatus');
    statusElement.innerHTML = '❌ 无法连接到后端';
    statusElement.style.color = '#f56565';
    showStatusMessage('无法连接到后端服务，请确保后端正在运行', 'error');
  }
}

// 处理登录
async function handleLogin() {
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;
  
  if (!username || !password) {
    showStatusMessage('请输入用户名和密码', 'error');
    return;
  }
  
  try {
    showStatusMessage('登录中...', 'info');
    const result = await api.login(username, password);
    
    if (result.success) {
      api.setToken(result.token);
      currentUser = result.user;
      showStatusMessage('登录成功！', 'success');
      
      setTimeout(() => {
        hideAuthModal();
        updateUserInfo(result.user);
        showNotification(`欢迎回来，${result.user.username}！`);
      }, 1000);
    }
  } catch (error) {
    console.error('登录错误:', error);
    showStatusMessage(error.message || '登录失败，请检查用户名和密码', 'error');
  }
}

// 处理注册
async function handleRegister() {
  const username = document.getElementById('registerUsername').value.trim();
  const email = document.getElementById('registerEmail').value.trim();
  const password = document.getElementById('registerPassword').value;
  const confirmPassword = document.getElementById('registerConfirmPassword').value;
  
  // 验证输入
  if (!username || !email || !password) {
    showStatusMessage('请填写所有必填项', 'error');
    return;
  }
  
  if (username.length < 3 || username.length > 50) {
    showStatusMessage('用户名长度应为3-50位', 'error');
    return;
  }
  
  if (password.length < 6) {
    showStatusMessage('密码长度至少6位', 'error');
    return;
  }
  
  if (password !== confirmPassword) {
    showStatusMessage('两次输入的密码不一致', 'error');
    return;
  }
  
  // 简单的邮箱验证
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    showStatusMessage('请输入有效的邮箱地址', 'error');
    return;
  }
  
  try {
    showStatusMessage('注册中...', 'info');
    const result = await api.register(username, email, password);
    
    if (result.success) {
      // 暂时存储用户信息
      currentUser = result.user;
      showStatusMessage('注册成功！正在自动登录...', 'success');
      
      // 模拟自动登录（实际应该调用登录接口）
      setTimeout(() => {
        hideAuthModal();
        updateUserInfo(result.user);
        showNotification(`欢迎使用 Markdown Studio，${result.user.username}！`);
        
        // 在实际应用中，这里应该调用登录接口获取token
        // 但为了简化，我们直接显示用户信息
        api.setToken('dummy-token-for-' + result.user.id);
      }, 1500);
    }
  } catch (error) {
    console.error('注册错误:', error);
    const errorMsg = error.message.includes('已存在') 
      ? '用户名或邮箱已存在' 
      : '注册失败，请稍后重试';
    showStatusMessage(errorMsg, 'error');
  }
}

// 处理退出
async function handleLogout() {
  try {
    await api.logout();
    currentUser = null;
    document.getElementById('userInfo').style.display = 'none';
    showNotification('已退出登录');
    showAuthModal();
  } catch (error) {
    console.error('退出错误:', error);
  }
}

// 更新用户信息显示
function updateUserInfo(user) {
  const usernameDisplay = document.getElementById('usernameDisplay');
  const userInfo = document.getElementById('userInfo');
  
  if (user && usernameDisplay && userInfo) {
    usernameDisplay.textContent = user.username;
    userInfo.style.display = 'flex';
    console.log('用户信息已更新:', user.username);
  }
}

// 显示通知
function showNotification(message, type = 'info') {
  console.log(`通知 [${type}]: ${message}`);
  // 可以在这里添加更复杂的通知系统
}

// 页面加载时检查认证状态
async function checkAuthStatus() {
  try {
    const token = localStorage.getItem('auth_token');
    
    if (token) {
      // 这里应该验证token并获取用户信息
      // 但为了简化，我们直接显示模态框
      console.log('检测到本地 token，显示登录模态框');
      setTimeout(() => showAuthModal(), 1000);
    } else {
      // 没有token，显示登录模态框
      console.log('未检测到 token，显示登录模态框');
      setTimeout(() => showAuthModal(), 1000);
    }
    
    // 检查后端连接
    await checkBackendStatus();
  } catch (error) {
    console.error('认证状态检查错误:', error);
    setTimeout(() => showAuthModal(), 1000);
  }
}

// 修改页面加载初始化函数
document.addEventListener('DOMContentLoaded', function() {
  // 原有的事件监听器...
  
  // 新增：检查认证状态
  setTimeout(() => {
    checkAuthStatus();
  }, 500);
});

// 修改 init() 函数
async function init() {
  try {
    updateStats();
    renderPreview();
    initFileSystem();
    initColorSettings();
    applyColorSettings();
    
    // 测试后端连接
    console.log('正在检查后端连接...');
    const health = await api.healthCheck();
    
    if (health.status === 'healthy' && health.database.connected) {
      console.log('✅ 后端服务连接正常');
      showNotification('后端服务连接正常', 'success');
    } else {
      console.warn('⚠️  后端服务连接异常');
      showNotification('后端服务连接异常，部分功能可能受限', 'warning');
    }
  } catch (error) {
    console.error('初始化错误:', error);
    showNotification('初始化过程中出现错误', 'error');
  }
}