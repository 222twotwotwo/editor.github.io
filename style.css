:root {
  --bg: #f7f7f7;
  --panel: #ffffff;
  --border: #ddd;
  --text: #222;
  /* 新增半透明变量 */
  --panel-opacity: 0.85;
  --topbar-opacity: 0.9;
}

[data-theme="dark"] {
  --bg: #1e1e1e;
  --panel: #2a2a2a;
  --border: #444;
  --text: #eee;
  /* 深色模式保持一致的透明度 */
  --panel-opacity: 0.85;
  --topbar-opacity: 0.9;
}

body {
  margin: 0;
  font-family: system-ui, -apple-system;
  background: var(--bg);
  color: var(--text);
  /* 全局壁纸设置 */
  background-image: url('audio/wallpaper.png');
  background-size: cover; /* 覆盖整个界面 */
  background-repeat: no-repeat; /* 不重复 */
  background-position: center center; /* 居中 */
  background-attachment: fixed; /* 固定背景不滚动 */
}

/* 顶部栏 - 半透明 */
.topbar {
  height: 52px;
  display: flex;
  align-items: center;
  padding: 0 12px;
  background: rgba(255, 255, 255, var(--topbar-opacity));
  border-bottom: 1px solid var(--border);
  /* 深色模式适配 */
  backdrop-filter: blur(8px); /* 毛玻璃效果增强观感 */
}

/* 深色模式顶部栏背景修正 */
[data-theme="dark"] .topbar {
  background: rgba(42, 42, 42, var(--topbar-opacity));
}

.topbar .title {
  margin-left: 10px;
  font-weight: bold;
}

.topbar .actions {
  margin-left: auto;
}

.topbar button {
  margin-left: 6px;
}

/* 布局 */
.container {
  display: flex;
  height: calc(100vh - 52px);
}

/* 左侧侧边栏 - 半透明 */
.sidebar {
  width: 280px;
  background: rgba(255, 255, 255, var(--panel-opacity));
  border-right: 1px solid var(--border);
  padding: 12px;
  transition: width .25s ease, padding .25s ease;
  overflow-y: auto;
  backdrop-filter: blur(8px);
}

/* 深色模式左侧侧边栏 */
[data-theme="dark"] .sidebar {
  background: rgba(42, 42, 42, var(--panel-opacity));
}

.sidebar.collapsed {
  width: 0;
  padding: 0;
  border-right: none;
  overflow: hidden;
}

/* 右侧侧边栏 - 半透明 */
.sidebar-right {
  width: 280px;
  background: rgba(255, 255, 255, var(--panel-opacity));
  border-left: 1px solid var(--border);
  padding: 12px;
  transition: width .25s ease, padding .25s ease;
  overflow-y: auto;
  backdrop-filter: blur(8px);
}

/* 深色模式右侧侧边栏 */
[data-theme="dark"] .sidebar-right {
  background: rgba(42, 42, 42, var(--panel-opacity));
}

.sidebar-right.collapsed {
  width: 0;
  padding: 0;
  border-left: none;
  overflow: hidden;
}

/* 面板 - 半透明（增强层级） */
.panel {
  margin-bottom: 18px;
  background: rgba(255, 255, 255, 0.9);
  padding: 8px;
  border-radius: 4px;
  backdrop-filter: blur(4px);
}

[data-theme="dark"] .panel {
  background: rgba(42, 42, 42, 0.9);
}

.panel h3 {
  margin: 0 0 8px;
  font-size: 14px;
}

.panel input,
.panel button {
  width: 100%;
  margin-bottom: 6px;
}

/* 文件列表样式 */
.file-list {
  border: 1px solid var(--border);
  border-radius: 4px;
  max-height: 300px;
  overflow-y: auto;
  margin-bottom: 12px;
  background: rgba(255, 255, 255, 0.8);
}

[data-theme="dark"] .file-list {
  background: rgba(30, 30, 30, 0.8);
}

.file-item {
  padding: 8px 12px;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.file-item:last-child {
  border-bottom: none;
}

.file-item:hover {
  background-color: rgba(0,0,0,0.05);
}

.file-item.active {
  background-color: rgba(59, 130, 246, 0.1);
  font-weight: bold;
}

.file-item .delete-icon {
  opacity: 0.5;
  font-size: 12px;
  cursor: pointer;
}

.file-item .delete-icon:hover {
  opacity: 1;
}

/* 主区 */
.main {
  flex: 1;
  padding: 12px;
  display: flex;
  flex-direction: column;
}

.editor-container {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

/* 编辑器 - 半透明 */
#editor {
  padding: 12px;
  font-family: monospace;
  border: 1px solid var(--border);
  background: rgba(255, 255, 255, var(--panel-opacity));
  color: var(--text);
  backdrop-filter: blur(8px);
}

[data-theme="dark"] #editor {
  background: rgba(42, 42, 42, var(--panel-opacity));
}

/* 预览区 - 半透明 */
#preview {
  padding: 12px;
  border: 1px solid var(--border);
  background: rgba(255, 255, 255, var(--panel-opacity));
  overflow-y: auto;
  backdrop-filter: blur(8px);
}

[data-theme="dark"] #preview {
  background: rgba(42, 42, 42, var(--panel-opacity));
}

/* 预览区代码块样式优化 */
#preview pre.hljs {
  margin: 12px 0; /* 上下外边距 */
  padding: 16px; /* 内边距增大 */
  border-radius: 4px; /* 轻微圆角 */
  background: rgba(0, 0, 0, 0.8) !important; /* 代码块加深保证可读性 */
}

#preview pre.hljs code {
  line-height: 1.5; /* 优化行高 */
}

/* 两侧边栏都打开时的布局调整 */
.container:has(.sidebar:not(.collapsed)):has(.sidebar-right:not(.collapsed)) .main {
  flex: 1;
  min-width: 400px;
}

/* 按钮样式增强（保证半透明背景下的可读性） */
button {
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 6px 10px;
  cursor: pointer;
  color: var(--text);
  transition: background 0.2s;
}

[data-theme="dark"] button {
  background: rgba(42, 42, 42, 0.9);
}

button:hover {
  background: rgba(240, 240, 240, 0.95);
}

[data-theme="dark"] button:hover {
  background: rgba(50, 50, 50, 0.95);
}

/* 输入框半透明 */
input {
  background: rgba(255, 255, 255, 0.85);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 6px 8px;
  color: var(--text);
}

[data-theme="dark"] input {
  background: rgba(42, 42, 42, 0.9);
}

[data-theme="light"] .hljs {
  background-color: #ffffff;
  padding: 12px;
  border-radius: 4px;
  color: #ffffff; /* Light+ 基础文字色（纯黑，高对比） */
}

[data-theme="light"] .hljs-meta {
  color: #FF9878; /* 亮珊瑚橙，黑底高对比，预处理指令醒目 */
  font-weight: 500;
}
/* 关键字（int/if/else/for 等） */
[data-theme="light"] .hljs-keyword {
  color: #6ABFFA; /* 亮青蓝，核心语法关键字 */
  font-weight: 500;
}
/* 内置类型（int/char/float 等） */
[data-theme="light"] .hljs-built_in {
  color: #88C8F8; /* 浅青蓝，与普通关键字区分，仍属语法层 */
}
/* 函数名（main/自定义函数等） */
[data-theme="light"] .hljs-title.function_ {
  color: #F8D878; /* 亮浅金黄，函数名核心层级 */
}
/* 变量名 */
[data-theme="light"] .hljs-variable {
  color: #C898FA; /* 亮浅紫，数据层 */
}
/* 字符串 */
[data-theme="light"] .hljs-string {
  color: #F0A898; /* 亮三文鱼橙，文本层 */
}
/* 数字 */
[data-theme="light"] .hljs-number {
  color: #88E888; /* 亮薄荷绿，数值层 */
}
/* 注释 */
[data-theme="light"] .hljs-comment {
  color: #78C878; /* 亮橄榄绿，弱化但清晰 */
  font-style: italic;
  opacity: 0.9;
}
/* 类名 */
[data-theme="light"] .hljs-class {
  color: #98D8F8; /* 亮浅青，类型层 */
}
/* 标点符号（括号/分号/大括号等） */
[data-theme="light"] .hljs-punctuation {
  color: #B8B8D8; /* 浅紫灰，标点层，黑底不融且不抢戏 */
}
/* 运算符（=/+/*/等） */
[data-theme="light"] .hljs-operator {
  color: #D8D8F8; /* 亮紫灰，运算符层，略亮于标点 */
}

/* 针对 dark mode 的调整（与浅色系同风格的柔雾深色主题，视觉统一） */
[data-theme="dark"] .hljs {
  background-color: #f1e9e9; /* 深灰紫底（与浅色系同色系，协调统一） */
  padding: 12px;
  border-radius: 6px;
  color: #e0e0f0; /* 浅灰紫基础文字色（高对比度+柔和感） */
  line-height: 1.6;
}

/* VSCode Dark+ 优化配色（核心：高对比度、高鲜艳度，无灰暗色） */
[data-theme="dark"] .hljs-keyword {
  color: #61AFEF; /* 亮蓝色（鲜艳不刺眼，替代原灰暗的 #569CD6） */
}

[data-theme="dark"] .hljs-variable {
  color: #A7D8FF; /* 浅青蓝（更亮更通透，替代原偏灰的 #9CDCFE） */
}

[data-theme="dark"] .hljs-string {
  color: #E59866; /* 三文鱼橙（更鲜艳，替代原偏暗的 #CE9178） */
}

[data-theme="dark"] .hljs-number {
  color: #98C379; /* 薄荷绿（更亮更清新，替代原偏灰的 #B5CEA8） */
}

[data-theme="dark"] .hljs-comment {
  color: #72B865; /* 橄榄绿（更亮更通透，替代原偏暗的 #6A9955） */
}

[data-theme="dark"] .hljs-function {
  color: #E5E58A; /* 浅金黄（更亮更醒目，替代原偏灰的 #DCDCAA） */
}

[data-theme="dark"] .hljs-class {
  color: #56D9B9; /* 青柠绿（更鲜艳，替代原偏暗的 #4EC9B0） */
}

/* 颜色设置面板样式 */
.color-setting {
  margin-bottom: 10px;
}

.color-setting label {
  display: block;
  margin-bottom: 4px;
  font-size: 12px;
}

.color-input-group {
  display: flex;
  gap: 8px;
}

.color-input-group input[type="color"] {
  width: 40px;
  height: 28px;
  padding: 0;
  border: 1px solid var(--border);
  cursor: pointer;
}

.color-input-group input[type="text"] {
  flex: 1;
}

#resetColorsBtn {
  margin-top: 10px;
  background: rgba(230, 74, 74, 0.9);
  color: white;
}

[data-theme="dark"] #resetColorsBtn {
  background: rgba(230, 74, 74, 0.7);
}

#resetColorsBtn:hover {
  background: rgba(230, 74, 74, 1);
}
