<template>
  <div :data-theme="theme" class="windowed-editor-container" @keydown="handleKeyDown" tabindex="0">
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
      <!-- 侧边栏 - 我的文档 -->
      <aside class="document-sidebar" :class="{ collapsed: sidebarCollapsed }">
        <div class="sidebar-header">
          <h3>📂 我的文档</h3>
          <button class="toggle-btn" @click="sidebarCollapsed = !sidebarCollapsed">
            {{ sidebarCollapsed ? '▶' : '◀' }}
          </button>
        </div>
        
        <div class="search-box">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索文档..."
            class="search-input"
          />
        </div>
        
        <div class="document-list">
          <div v-if="loading" class="loading">加载中...</div>
          <div v-else-if="!filteredDocuments || filteredDocuments.length === 0" class="empty-list">
            {{ searchQuery ? '无匹配文档' : '暂无文档' }}
          </div>
          <div
            v-else
            v-for="doc in filteredDocuments"
            :key="doc.id"
            class="document-item"
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
          <button @click="importDocument">📂 导入文档</button>
          <button @click="refreshDocuments">🔄 刷新</button>
        </div>
      </aside>

      <!-- 桌面区域 -->
      <div 
        class="desktop-area"
        @contextmenu.prevent="handleDesktopContextMenu"
      >
        <DesktopIcon
          v-for="icon in desktopIcons"
          :key="icon.id"
          :icon="icon.icon"
          :label="icon.label"
          :initial-x="icon.x"
          :initial-y="icon.y"
          @click="handleIconClick(icon)"
          @move="(x, y) => handleIconMove(icon.id, x, y)"
        />

        <div class="windows-container">
          <TransitionGroup name="window-list">
            <WindowComponent
              v-for="win in windows"
              :key="win.id"
              :win="win"
              @activate="setActiveWindow"
              @close="closeWindow"
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
                  :appearance="win.appearance"
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

    <!-- 任务栏 -->
    <Taskbar
      :windows="windows"
      @activate-window="setActiveWindow"
      @show-start-menu="createNewEditor"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import TopBar from '../components/TopBar.vue'
import EditorPane from '../components/EditorPane.vue'
import WindowComponent from '../components/WindowComponent.vue'
import DesktopIcon from '../components/DesktopIcon.vue'
import ContextMenu from '../components/ContextMenu.vue'
import Taskbar from '../components/Taskbar.vue'
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
const { leftSidebarCollapsed, toggleLeftSidebar } = useSidebar()
const {
  windows,
  activeWindowId,
  desktopIcons,
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
  arrangeWindowsCascade,
  arrangeWindowsHorizontal,
  arrangeWindowsVertical,
  arrangeWindowsGrid,
  updateIconPosition,
  markWindowSaved,
  restoreState,
  restoreDesktopIcons,
  updateWindowAppearance,
  resetWindowAppearance
} = useWindowManager()
const { 
  uploadDocument, 
  updateDocument, 
  getDocument, 
  documents, 
  loading, 
  fetchDocuments 
} = useDocument()

const windowContents = ref({})
const windowPreviews = ref({})
const windowDocumentIds = ref({})
const sidebarCollapsed = ref(false)
const searchQuery = ref('')
const contextMenu = ref({
  visible: false,
  position: { x: 0, y: 0 },
  items: [],
  type: null,
  windowId: null
})

const activeWindow = computed(() => {
  return getWindowById(activeWindowId.value)
})

const activeWindowAppearance = computed(() => {
  return activeWindow.value?.appearance || {}
})

const filteredDocuments = computed(() => {
  if (!searchQuery.value.trim()) {
    return documents
  }
  const query = searchQuery.value.toLowerCase().trim()
  return documents.filter(doc => 
    (doc.title && doc.title.toLowerCase().includes(query)) ||
    (doc.content && doc.content.toLowerCase().includes(query))
  )
})

const handleUpdateAppearance = (key, value) => {
  if (activeWindowId.value) {
    updateWindowAppearance(activeWindowId.value, key, value)
  }
}

const handleResetAppearance = () => {
  if (activeWindowId.value) {
    resetWindowAppearance(activeWindowId.value)
  }
}

const getWindowContent = (id) => {
  return windowContents.value[id] || ''
}

const getWindowPreview = (id) => {
  return windowPreviews.value[id] || ''
}

const createNewEditor = () => {
  const id = createWindow({ title: '未命名文档', content: '' })
  windowContents.value[id] = ''
  windowPreviews.value[id] = ''
  windowDocumentIds.value[id] = null
}

const handleWindowContentChange = (windowId, content) => {
  windowContents.value[windowId] = content
  windowPreviews.value[windowId] = markdownToHtml(content)
  updateWindowContent(windowId, content)
  playEditSound()
}

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
    if (docId) {
      const res = await updateDocument(docId, { title, content })
      if (res.success) {
        markWindowSaved(windowId)
        alert('已保存到数据库')
      } else {
        alert('保存失败')
      }
    } else {
      const res = await uploadDocument({ title, content })
      if (res.success && res.data && res.data.id) {
        windowDocumentIds.value[windowId] = res.data.id
        markWindowSaved(windowId)
        alert('已上传到数据库')
      } else {
        alert('上传失败')
      }
    }
  } catch (err) {
    alert('操作失败')
  }
}

const switchToOriginalView = (windowId) => {
  const content = windowContents.value[windowId] || ''
  const title = getWindowById(windowId)?.title || '未命名文档'
  localStorage.setItem('windowedEditorContent', content)
  localStorage.setItem('windowedEditorTitle', title)
  router.push('/editor')
}

const handleIconMove = (iconId, x, y) => {
  updateIconPosition(iconId, x, y)
}

const handleIconClick = (icon) => {
  switch (icon.action) {
    case 'new-editor':
      createNewEditor()
      break
    case 'go-community':
      router.push('/community')
      break
    case 'file-manager':
      alert('文件管理功能开发中...')
      break
    case 'settings':
      alert('设置功能开发中...')
      break
    case 'trash':
      alert('垃圾桶功能开发中...')
      break
  }
}

const handleExportHTML = () => {
  if (!activeWindow.value) {
    alert('请先选择一个窗口')
    return
  }
  playExportSound()
  exportHTMLUtil(windowPreviews.value[activeWindow.value.id])
}

const handleExportMD = () => {
  if (!activeWindow.value) {
    alert('请先选择一个窗口')
    return
  }
  const win = activeWindow.value
  playExportSound()
  exportMDUtil(windowContents.value[win.id], win.title)
}

const handleExportPDF = () => {
  playExportSound()
  exportPDFUtil()
}

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('zh-CN')
}

const openDocumentToWindow = async (doc) => {
  const res = await getDocument(doc.id)
  if (res.success && res.data) {
    const d = res.data
    const id = createWindow({ title: d.title, content: d.content })
    windowContents.value[id] = d.content
    windowPreviews.value[id] = markdownToHtml(d.content)
    windowDocumentIds.value[id] = d.id
    setActiveWindow(id)
  } else {
    alert('加载文档失败')
  }
}

const refreshDocuments = async () => {
  await fetchDocuments()
}

const importDocument = () => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.md,.txt'
  input.onchange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target.result
      const title = file.name.replace(/\.(md|txt)$/, '')
      const id = createWindow({ title, content })
      windowContents.value[id] = content
      windowPreviews.value[id] = markdownToHtml(content)
      windowDocumentIds.value[id] = null
      setActiveWindow(id)
    }
    reader.readAsText(file)
  }
  input.click()
}

const handleDesktopContextMenu = (e) => {
  const hasVisibleWindows = windows.value.some(w => !w.isMinimized)
  contextMenu.value = {
    visible: true,
    position: { x: e.clientX, y: e.clientY },
    type: 'desktop',
    windowId: null,
    items: [
      { icon: '📝', label: '新建编辑器', shortcut: 'Alt+N', action: 'new-editor' },
      { icon: '📂', label: '导入文档', action: 'import-document' },
      { divider: true },
      { icon: '🔄', label: '刷新文档列表', action: 'refresh-documents' },
      { divider: true },
      { icon: '📚', label: '层叠窗口', action: 'arrange-cascade', disabled: !hasVisibleWindows },
      { icon: '⬅️➡️', label: '水平并排', action: 'arrange-horizontal', disabled: !hasVisibleWindows },
      { icon: '⬆️⬇️', label: '垂直并排', action: 'arrange-vertical', disabled: !hasVisibleWindows },
      { icon: '🔲', label: '网格排列', action: 'arrange-grid', disabled: !hasVisibleWindows },
      { divider: true },
      { icon: '⬇️', label: '最小化所有窗口', action: 'minimize-all', disabled: windows.value.length === 0 },
      { icon: '📌', label: '最大化所有窗口', action: 'maximize-all', disabled: windows.value.length === 0 },
      { divider: true },
      { icon: '🗑️', label: '关闭所有窗口', action: 'close-all', disabled: windows.value.length === 0 }
    ]
  }
}

const handleWindowContextMenu = (e, winId) => {
  e.stopPropagation()
  const win = getWindowById(winId)
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
    case 'arrange-cascade':
      arrangeWindowsCascade()
      break
    case 'arrange-horizontal':
      arrangeWindowsHorizontal()
      break
    case 'arrange-vertical':
      arrangeWindowsVertical()
      break
    case 'arrange-grid':
      arrangeWindowsGrid()
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
      if (confirm('确定要关闭所有窗口吗？')) {
        [...windows.value].forEach(w => closeWindow(w.id))
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
      if (contextMenu.value.windowId) closeWindow(contextMenu.value.windowId)
      break
  }
}

const handleKeyDown = (e) => {
  if (e.altKey) {
    switch (e.key.toLowerCase()) {
      case 'n':
        e.preventDefault()
        createNewEditor()
        break
      case 'w':
        e.preventDefault()
        if (activeWindowId.value) {
          closeWindow(activeWindowId.value)
        }
        break
      case 'tab':
        e.preventDefault()
        const visibleWindows = windows.value.filter(w => !w.isMinimized)
        if (visibleWindows.length > 1) {
          const currentIndex = visibleWindows.findIndex(w => w.id === activeWindowId.value)
          const nextIndex = e.shiftKey 
            ? (currentIndex - 1 + visibleWindows.length) % visibleWindows.length
            : (currentIndex + 1) % visibleWindows.length
          setActiveWindow(visibleWindows[nextIndex].id)
        }
        break
    }
  }
}

onMounted(() => {
  restoreDesktopIcons()
  const hasRestored = restoreState()
  
  if (!hasRestored || windows.value.length === 0) {
    createNewEditor()
  } else {
    windows.value.forEach(win => {
      windowContents.value[win.id] = win.content || ''
      windowPreviews.value[win.id] = markdownToHtml(win.content || '')
      windowDocumentIds.value[win.id] = null
    })
  }
  
  fetchDocuments()
})
</script>

<style scoped>
.windowed-editor-container {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.main-container {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.document-sidebar {
  width: 280px;
  background: rgba(255, 255, 255, var(--panel-opacity));
  border-right: 1px solid var(--border);
  padding: 12px;
  display: flex;
  flex-direction: column;
  transition: width 0.25s ease, padding 0.25s ease;
  overflow: hidden;
  backdrop-filter: blur(8px);
}

[data-theme="dark"] .document-sidebar {
  background: rgba(42, 42, 42, var(--panel-opacity));
}

.document-sidebar.collapsed {
  width: 0;
  padding: 0;
  border-right: none;
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
}

.toggle-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background 0.15s;
}

.toggle-btn:hover {
  background: rgba(0, 0, 0, 0.1);
}

.search-box {
  margin-bottom: 12px;
}

.search-input {
  width: 100%;
  padding: 10px 14px;
  font-size: 14px;
  border: 1.5px solid rgba(0, 0, 0, 0.1);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(10px);
  outline: none;
  transition: all 0.2s;
  box-sizing: border-box;
}

[data-theme="dark"] .search-input {
  background: rgba(31, 41, 55, 0.8);
  border-color: rgba(255, 255, 255, 0.12);
  color: #f9fafb;
}

.search-input::placeholder {
  color: #9ca3af;
}

[data-theme="dark"] .search-input::placeholder {
  color: #6b7280;
}

.search-input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.15);
}

[data-theme="dark"] .search-input:focus {
  border-color: #60a5fa;
  box-shadow: 0 0 0 4px rgba(96, 165, 250, 0.2);
}

.document-list {
  flex: 1;
  border: 1px solid var(--border);
  border-radius: 4px;
  overflow-y: auto;
  margin-bottom: 12px;
  background: rgba(255, 255, 255, 0.8);
}

[data-theme="dark"] .document-list {
  background: rgba(30, 30, 30, 0.8);
}

.document-item {
  padding: 10px;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
  transition: background-color 0.2s;
}

.document-item:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

[data-theme="dark"] .document-item:hover {
  background-color: rgba(255, 255, 255, 0.1);
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
}

.sidebar-actions {
  display: flex;
  gap: 8px;
}

.sidebar-actions button {
  flex: 1;
  padding: 8px;
  font-size: 12px;
}

.desktop-area {
  flex: 1;
  position: relative;
  overflow: hidden;
  background-image: url('/audio/wallpaper.png');
  background-size: cover;
  background-repeat: no-repeat;
  background-position: center center;
  background-attachment: fixed;
  padding-bottom: 52px;
}

.windows-container {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 52px;
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
</style>
