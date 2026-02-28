<template>
  <div :data-theme="theme" class="windowed-editor-container">
    <TopBar
      :sound-enabled="soundEnabled"
      :theme="theme"
      :on-toggle-left-sidebar="toggleLeftSidebar"
      :windows="windows"
      :active-window-id="activeWindowId"
      @toggle-sound="toggleSound"
      @toggle-theme="toggleTheme"
      @export-html="handleExportHTML"
      @export-md="handleExportMD"
      @export-pdf="handleExportPDF"
      @focus-window="setActiveWindow"
      @toggle-window-minimize="toggleMinimize"
      @close-window="closeWindow"
    />

    <div class="main-container">
      <!-- 侧边栏 - 我的文档：优化过渡动画和交互 -->
      <aside 
        class="document-sidebar" 
        :class="{ collapsed: desktopSidebarCollapsed }"
        :style="{ '--sidebar-width': sidebarWidth + 'px' }"
      >
        <div class="sidebar-header">
          <h3>📂 我的文档</h3>
          <button class="toggle-btn" @click="toggleDesktopSidebar">
            {{ desktopSidebarCollapsed ? '▶' : '◀' }}
          </button>
        </div>
        
        <div class="document-list">
          <div v-if="loading" class="loading">
            <span class="loading-spinner">🔄</span> 加载中...
          </div>
          <div v-else-if="!documents || documents.length === 0" class="empty-list">
            📄 暂无文档，点击下方「导入文档」添加
          </div>
          <div
            v-else
            v-for="doc in documents"
            :key="doc.id"
            class="document-item"
            :class="{ active: windowDocumentIds[doc.id] === activeWindowId }"
            @click="openDocumentToWindow(doc)"
          >
            <div class="document-info">
              <div class="document-title">{{ doc.title }}</div>
              <div class="document-meta">
                <span>{{ formatFileSize(doc.file_size) }}</span>
                <span>{{ formatDate(doc.updated_at) }}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="sidebar-actions">
          <button class="action-btn import-btn" @click="importDocument">📂 导入文档</button>
          <button class="action-btn refresh-btn" @click="refreshDocuments">🔄 刷新</button>
        </div>
      </aside>

      <!-- 桌面区域：优化点击穿透问题 -->
      <div 
        class="desktop-area"
        @contextmenu.prevent="handleDesktopContextMenu"
        :style="{ paddingLeft: desktopSidebarCollapsed ? '0' : sidebarWidth + 'px' }"
      >
        <DesktopIcon
          icon="📝"
          label="新建编辑器"
          :initial-x="iconPosition.x"
          :initial-y="iconPosition.y"
          @click="createNewEditor"
          @move="handleIconMove"
        />

        <div class="windows-container">
          <TransitionGroup name="window-list">
            <WindowComponent
              v-for="win in windows"
              :key="win.id"
              :win="win"
              @activate="setActiveWindow"
              @close="handleWindowClose" <!-- 替换为带清理逻辑的关闭方法 -->
              @maximize="toggleMaximize"
              @minimize="toggleMinimize"
              @move="updateWindowPosition"
              @resize="updateWindowSize"
              @update-title="updateWindowTitle"
              @save-document="handleSaveWindowDocument"
              @switch-to-original="() => switchToOriginalView(win.id)"
              @context-menu="handleWindowContextMenu"
            >
              <div class="window-editor-wrapper">
                <EditorPane
                  :model-value="getWindowContent(win.id)"
                  :preview-content="getWindowPreview(win.id)"
                  @update:model-value="(v) => handleWindowContentChange(win.id, v)"
                />
              </div>
            </WindowComponent>
          </TransitionGroup>
        </div>
      </div>
    </div>

    <!-- 右键菜单 -->
    <ContextMenu
      :visible="contextMenu.visible"
      :position="contextMenu.position"
      :items="contextMenu.items"
      @close="closeContextMenu"
      @select="handleContextMenuSelect"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, computed, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import TopBar from '../components/TopBar.vue'
import EditorPane from '../components/EditorPane.vue'
import WindowComponent from '../components/WindowComponent.vue'
import DesktopIcon from '../components/DesktopIcon.vue'
import ContextMenu from '../components/ContextMenu.vue'
import { useTheme } from '../composables/useTheme'
import { useAudio } from '../composables/useAudio'
import { useSidebar } from '../composables/useSidebar'
import { useWindowManager } from '../composables/useWindowManager'
import { useDocument } from '../composables/useDocument'
import { exportHTML as exportHTMLUtil, exportMD as exportMDUtil, exportPDF as exportPDFUtil } from '../utils/exportUtils'
import { markdownToHtml } from '../utils/markdownParser'

const router = useRouter()
const { theme, toggleTheme } = useTheme()
const { soundEnabled, toggleSound, playEditSound, playExportSound } = useAudio()
const { leftSidebarCollapsed, toggleLeftSidebar, desktopSidebarCollapsed, toggleDesktopSidebar } = useSidebar()
const {
  windows,
  activeWindowId,
  iconPosition,
  createWindow,
  closeWindow,
  setActiveWindow,
  toggleMaximize,
  toggleMinimize,
  updateWindowPosition,
  updateWindowSize,
  updateWindowTitle,
  updateWindowContent,
  getWindowById,
  restoreState,
  restoreIconPosition
} = useWindowManager()
const { 
  uploadDocument, 
  updateDocument, 
  getDocument, 
  documents, 
  loading, 
  fetchDocuments 
} = useDocument()

// ========== 核心状态优化 ==========
// 侧边栏宽度（响应式）
const sidebarWidth = ref(280)
// 窗口内容/预览/文档ID映射（增加默认值和清理逻辑）
const windowContents = ref({})
const windowPreviews = ref({})
const windowDocumentIds = ref({})
// 右键菜单状态
const contextMenu = ref({
  visible: false,
  position: { x: 0, y: 0 },
  items: [],
  type: null,
  windowId: null
})

// ========== 计算属性优化 ==========
const activeWindow = computed(() => {
  return getWindowById(activeWindowId.value)
})

// 优化：空值兜底
const getWindowContent = (id) => {
  return windowContents.value[id] || ''
}

const getWindowPreview = (id) => {
  return windowPreviews.value[id] || ''
}

// ========== 核心方法优化 ==========
// 新建编辑器：增加默认内容提示
const createNewEditor = () => {
  const id = createWindow({ 
    title: '未命名文档', 
    content: '# 欢迎使用Markdown编辑器\n\n开始编写你的文档吧！' 
  })
  windowContents.value[id] = '# 欢迎使用Markdown编辑器\n\n开始编写你的文档吧！'
  windowPreviews.value[id] = markdownToHtml(windowContents.value[id])
  windowDocumentIds.value[id] = null
  // 播放编辑音效
  playEditSound()
}

// 窗口内容变更：增加防抖和空值处理
const handleWindowContentChange = (windowId, content) => {
  if (typeof content !== 'string') return
  windowContents.value[windowId] = content
  windowPreviews.value[windowId] = markdownToHtml(content)
  updateWindowContent(windowId, content)
  playEditSound()
}

// 保存文档：优化错误提示和加载状态
const handleSaveWindowDocument = async (windowId) => {
  const win = getWindowById(windowId)
  if (!win) return

  const title = (win.title || '').trim()
  if (!title) {
    alert('请先设置文档标题（双击窗口标题编辑）')
    return
  }

  const content = windowContents.value[windowId] || ''
  const docId = windowDocumentIds.value[windowId]

  try {
    // 显示加载提示
    alert('正在保存...')
    if (docId) {
      const res = await updateDocument(docId, { title, content })
      if (res.success) {
        alert('✅ 已保存到数据库')
        // 刷新文档列表
        await fetchDocuments()
      } else {
        alert('❌ 保存失败：' + (res.message || '未知错误'))
      }
    } else {
      const res = await uploadDocument({ title, content })
      if (res.success && res.data && res.data.id) {
        windowDocumentIds.value[windowId] = res.data.id
        const win = getWindowById(windowId)
        if (win) win.documentId = res.data.id
        alert('✅ 已上传到数据库')
        // 刷新文档列表
        await fetchDocuments()
      } else {
        alert('❌ 上传失败：' + (res.message || '未知错误'))
      }
    }
  } catch (err) {
    console.error('保存文档失败：', err)
    alert('❌ 操作失败：' + err.message)
  }
}

// 切换到专注模式：增加内容保存
const switchToOriginalView = (windowId) => {
  const content = windowContents.value[windowId] || ''
  const title = getWindowById(windowId)?.title || '未命名文档'
  localStorage.setItem('windowedEditorContent', content)
  localStorage.setItem('windowedEditorTitle', title)
  router.push('/editor')
}

// 图标移动：优化边界检测
const handleIconMove = (x, y) => {
  // 限制图标在可视区域内
  const maxX = window.innerWidth - 80
  const maxY = window.innerHeight - 80
  iconPosition.value = { 
    x: Math.max(10, Math.min(x, maxX)), 
    y: Math.max(10, Math.min(y, maxY)) 
  }
}

// ========== 导出功能优化 ==========
// 导出HTML：补全参数和错误处理
const handleExportHTML = () => {
  if (!activeWindow.value) {
    alert('请先选择一个窗口')
    return
  }
  playExportSound()
  try {
    exportHTMLUtil(windowPreviews.value[activeWindow.value.id], activeWindow.value.title)
  } catch (err) {
    console.error('导出HTML失败：', err)
    alert('❌ 导出失败：' + err.message)
  }
}

// 导出MD：补全参数和错误处理
const handleExportMD = () => {
  if (!activeWindow.value) {
    alert('请先选择一个窗口')
    return
  }
  const win = activeWindow.value
  playExportSound()
  try {
    exportMDUtil(windowContents.value[win.id], win.title)
  } catch (err) {
    console.error('导出MD失败：', err)
    alert('❌ 导出失败：' + err.message)
  }
}

// 导出PDF：补全逻辑和参数
const handleExportPDF = () => {
  if (!activeWindow.value) {
    alert('请先选择一个窗口')
    return
  }
  const win = activeWindow.value
  playExportSound()
  try {
    exportPDFUtil({
      html: windowPreviews.value[win.id],
      title: win.title,
      theme: theme.value
    })
  } catch (err) {
    console.error('导出PDF失败：', err)
    alert('❌ 导出失败：' + err.message)
  }
}

// ========== 文档相关方法优化 ==========
// 格式化文件大小：优化边界值
const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 格式化日期：优化显示
const formatDate = (dateString) => {
  if (!dateString) return '未知时间'
  return new Date(dateString).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 打开文档到窗口：增加加载提示
const openDocumentToWindow = async (doc) => {
  // 检查是否已打开
  const existingWindowId = Object.keys(windowDocumentIds.value).find(
    winId => windowDocumentIds.value[winId] === doc.id
  )

  if (existingWindowId) {
    const winId = Number(existingWindowId)
    const win = getWindowById(winId)
    if (win && win.isMinimized) {
      toggleMinimize(winId)
    }
    setActiveWindow(winId)
    return
  }

  try {
    alert('正在加载文档...')
    const res = await getDocument(doc.id)
    if (res.success && res.data) {
      const d = res.data
      const id = createWindow({ 
        title: d.title, 
        content: d.content, 
        documentId: d.id 
      })
      windowContents.value[id] = d.content
      windowPreviews.value[id] = markdownToHtml(d.content)
      windowDocumentIds.value[id] = d.id
      setActiveWindow(id)
      alert('✅ 文档加载成功')
    } else {
      alert('❌ 加载文档失败：' + (res.message || '未知错误'))
    }
  } catch (err) {
    console.error('打开文档失败：', err)
    alert('❌ 加载文档失败：' + err.message)
  }
}

// 刷新文档列表：增加错误处理
const refreshDocuments = async () => {
  try {
    await fetchDocuments()
    alert('✅ 文档列表已刷新')
  } catch (err) {
    console.error('刷新文档失败：', err)
    alert('❌ 刷新失败：' + err.message)
  }
}

// 导入文档：优化文件类型和编码
const importDocument = () => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.md,.txt,.markdown'
  input.multiple = false
  input.onchange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    // 检查文件大小（限制10MB）
    if (file.size > 10 * 1024 * 1024) {
      alert('❌ 文件大小不能超过10MB')
      return
    }
    
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const content = event.target.result
        const title = file.name.replace(/\.(md|txt|markdown)$/i, '')
        const id = createWindow({ title, content })
        windowContents.value[id] = content
        windowPreviews.value[id] = markdownToHtml(content)
        windowDocumentIds.value[id] = null
        setActiveWindow(id)
        alert('✅ 文档导入成功')
      } catch (err) {
        console.error('解析文档失败：', err)
        alert('❌ 导入失败：' + err.message)
      }
    }
    reader.onerror = () => {
      alert('❌ 文件读取失败')
    }
    reader.readAsText(file, 'utf-8')
  }
  input.click()
}

// ========== 右键菜单优化 ==========
const handleDesktopContextMenu = (e) => {
  const hasWindows = windows.value.length > 0
  contextMenu.value = {
    visible: true,
    position: { x: e.clientX, y: e.clientY },
    type: 'desktop',
    windowId: null,
    items: [
      { icon: '📝', label: '新建编辑器', action: 'new-editor' },
      { icon: '📂', label: '导入文档', action: 'import-document' },
      { divider: true },
      { icon: '🔄', label: '刷新文档列表', action: 'refresh-documents' },
      { divider: true },
      { icon: '⬇️', label: '最小化所有窗口', action: 'minimize-all', disabled: !hasWindows },
      { icon: '📌', label: '最大化所有窗口', action: 'maximize-all', disabled: !hasWindows },
      { divider: true },
      { icon: '🗑️', label: '关闭所有窗口', action: 'close-all', disabled: !hasWindows }
    ]
  }
}

const handleWindowContextMenu = (e, winId) => {
  e.stopPropagation()
  const win = getWindowById(winId)
  if (!win) return
  
  contextMenu.value = {
    visible: true,
    position: { x: e.clientX, y: e.clientY },
    type: 'window',
    windowId: winId,
    items: [
      { icon: win?.isMaximized ? '📐' : '📌', label: win?.isMaximized ? '还原' : '最大化', action: 'toggle-maximize' },
      { icon: win?.isMinimized ? '⬆️' : '⬇️', label: win?.isMinimized ? '还原' : '最小化', action: 'toggle-minimize' },
      { divider: true },
      { icon: '💾', label: '保存到文档', action: 'save-document' },
      { icon: '🎯', label: '切换到专注模式', action: 'switch-to-original' },
      { divider: true },
      { icon: '✖️', label: '关闭窗口', action: 'close' }
    ]
  }
}

const closeContextMenu = () => {
  contextMenu.value.visible = false
}

const handleContextMenuSelect = (item) => {
  if (item.disabled) return
  
  switch (item.action) {
    case 'new-editor':
      createNewEditor()
      break
    case 'import-document':
      importDocument()
      break
    case 'refresh-documents':
      refreshDocuments()
      break
    case 'minimize-all':
      windows.value.forEach(w => {
        if (!w.isMinimized) toggleMinimize(w.id)
      })
      break
    case 'maximize-all':
      windows.value.forEach(w => {
        if (!w.isMaximized) toggleMaximize(w.id)
      })
      break
    case 'close-all':
      if (confirm('⚠️ 确定要关闭所有窗口吗？未保存的内容将会丢失！')) {
        ;[...windows.value].forEach(w => handleWindowClose(w.id))
      }
      break
    case 'toggle-maximize':
      if (contextMenu.value.windowId) toggleMaximize(contextMenu.value.windowId)
      break
    case 'toggle-minimize':
      if (contextMenu.value.windowId) toggleMinimize(contextMenu.value.windowId)
      break
    case 'save-document':
      if (contextMenu.value.windowId) handleSaveWindowDocument(contextMenu.value.windowId)
      break
    case 'switch-to-original':
      if (contextMenu.value.windowId) switchToOriginalView(contextMenu.value.windowId)
      break
    case 'close':
      if (contextMenu.value.windowId) handleWindowClose(contextMenu.value.windowId)
      break
  }
  closeContextMenu()
}

// ========== 窗口关闭：增加清理逻辑 ==========
const handleWindowClose = (windowId) => {
  // 清理窗口相关状态
  delete windowContents.value[windowId]
  delete windowPreviews.value[windowId]
  delete windowDocumentIds.value[windowId]
  // 调用原始关闭方法
  closeWindow(windowId)
}

// ========== 生命周期优化 ==========
onMounted(() => {
  // 响应式侧边栏宽度
  const updateSidebarWidth = () => {
    sidebarWidth.value = window.innerWidth < 768 ? 240 : 280
  }
  updateSidebarWidth()
  window.addEventListener('resize', updateSidebarWidth)

  // 恢复图标位置和窗口状态
  restoreIconPosition()
  const hasRestored = restoreState()
  
  if (!hasRestored || windows.value.length === 0) {
    createNewEditor()
  } else {
    windows.value.forEach(win => {
      windowContents.value[win.id] = win.content || ''
      windowPreviews.value[win.id] = markdownToHtml(win.content || '')
      windowDocumentIds.value[win.id] = win.documentId || null
    })
  }
  
  // 加载文档列表（增加错误处理）
  fetchDocuments().catch(err => {
    console.error('加载文档列表失败：', err)
    alert('❌ 文档列表加载失败：' + err.message)
  })
})

onUnmounted(() => {
  // 移除resize监听
  window.removeEventListener('resize', () => {
    sidebarWidth.value = window.innerWidth < 768 ? 240 : 280
  })
})
</script>

<style scoped>
.windowed-editor-container {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  --sidebar-width: 280px; /* 变量化侧边栏宽度 */
}

.main-container {
  flex: 1;
  position: relative;
  overflow: hidden;
}

/* 侧边栏样式优化 */
.document-sidebar {
  position: absolute;
  top: 0;
  left: 0;
  width: var(--sidebar-width);
  height: 100%;
  background: rgba(255, 255, 255, var(--panel-opacity));
  border-right: 1px solid var(--border);
  padding: 12px;
  display: flex;
  flex-direction: column;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease;
  overflow: hidden;
  backdrop-filter: blur(8px);
  z-index: 100;
  /* 修复层级问题 */
  will-change: transform, opacity;
}

[data-theme="dark"] .document-sidebar {
  background: rgba(42, 42, 42, var(--panel-opacity));
}

.document-sidebar.collapsed {
  transform: translateX(calc(-100% + 40px)); /* 保留一小部分，优化交互 */
  opacity: 0.2;
  pointer-events: none;
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.sidebar-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.toggle-btn {
  background: rgba(0, 0, 0, 0.05);
  border: 1px solid var(--border);
  cursor: pointer;
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.15s;
}

.toggle-btn:hover {
  background: rgba(0, 0, 0, 0.1);
  transform: scale(1.05);
}

[data-theme="dark"] .toggle-btn {
  background: rgba(255, 255, 255, 0.05);
}

[data-theme="dark"] .toggle-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

/* 文档列表样式优化 */
.document-list {
  flex: 1;
  border: 1px solid var(--border);
  border-radius: 6px;
  overflow-y: auto;
  margin-bottom: 12px;
  background: rgba(255, 255, 255, 0.85);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

[data-theme="dark"] .document-list {
  background: rgba(30, 30, 30, 0.85);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.document-item {
  padding: 10px 12px;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
  transition: all 0.2s;
}

.document-item:hover {
  background-color: rgba(0, 0, 0, 0.05);
  transform: translateX(2px);
}

.document-item.active {
  background-color: rgba(59, 130, 246, 0.1);
  border-left: 3px solid #3b82f6;
}

[data-theme="dark"] .document-item:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

[data-theme="dark"] .document-item.active {
  background-color: rgba(59, 130, 246, 0.2);
  border-left: 3px solid #3b82f6;
}

.document-item:last-child {
  border-bottom: none;
}

.document-info {
  flex: 1;
  overflow: hidden;
}

.document-title {
  font-weight: 500;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.document-meta {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--text);
  opacity: 0.7;
}

.loading,
.empty-list {
  padding: 20px;
  text-align: center;
  color: var(--text);
  opacity: 0.7;
  font-size: 12px;
}

.loading-spinner {
  display: inline-block;
  animation: spin 1s linear infinite;
  margin-right: 6px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 侧边栏按钮样式优化 */
.sidebar-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  flex: 1;
  padding: 8px;
  font-size: 12px;
  border: 1px solid var(--border);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.import-btn {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

.import-btn:hover {
  background: rgba(59, 130, 246, 0.2);
  transform: translateY(-1px);
}

.refresh-btn {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
}

.refresh-btn:hover {
  background: rgba(16, 185, 129, 0.2);
  transform: translateY(-1px);
}

[data-theme="dark"] .import-btn {
  background: rgba(59, 130, 246, 0.2);
}

[data-theme="dark"] .refresh-btn {
  background: rgba(16, 185, 129, 0.2);
}

/* 桌面区域优化 */
.desktop-area {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background-image: url('/audio/wallpaper.png');
  background-size: cover;
  background-repeat: no-repeat;
  background-position: center center;
  background-attachment: fixed;
  /* 修复侧边栏展开时的点击穿透 */
  transition: padding-left 0.3s ease;
}

/* 窗口容器优化 */
.windows-container {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
}

.windows-container > * {
  pointer-events: auto;
}

.window-editor-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 窗口过渡动画优化 */
.window-list-enter-active,
.window-list-leave-active {
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.window-list-enter-from {
  opacity: 0;
  transform: scale(0.85) translateY(30px);
}

.window-list-leave-to {
  opacity: 0;
  transform: scale(0.9) translateY(-20px);
}

/* 响应式优化 */
@media (max-width: 768px) {
  .document-sidebar {
    width: 240px !important;
  }
  
  .document-title {
    font-size: 12px;
  }
  
  .document-meta {
    font-size: 10px;
  }
  
  .action-btn {
    font-size: 11px;
    padding: 6px;
  }
}
</style>