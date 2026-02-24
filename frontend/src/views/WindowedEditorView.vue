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
      @close-window="handleCloseWindow"
      @go-to-editor="handleGoToEditor"
    />

    <div class="main-container">

      <!-- 桌面区域 -->
      <div 
        class="desktop-area"
        @contextmenu.prevent="handleDesktopContextMenu"
      >
        <DesktopIcon
          icon="📝"
          label="新建编辑器"
          :initial-x="iconPosition.x"
          :initial-y="iconPosition.y"
          @click="createNewEditor"
          @move="handleIconMove"
        />
        <DesktopIcon
          icon="📂"
          label="我的文档"
          :initial-x="docIconPosition.x"
          :initial-y="docIconPosition.y"
          @click="toggleDocumentExplorer"
          @move="handleDocIconMove"
        />

        <div class="windows-container">
          <TransitionGroup name="window-list">
            <template v-for="win in windows" :key="win.id">
              <WindowComponent
                v-if="!win.isDocumentExplorer"
                :win="win"
                :sidebar-state="sidebarState"
                @activate="setActiveWindow"
                @close="handleCloseWindow"
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
              
              <DocumentExplorer
                v-else
                :win="win"
                :sidebar-mode="!!win.sidebarMode"
                @activate="setActiveWindow"
                @close="closeWindow"
                @maximize="toggleMaximize"
                @minimize="toggleMinimize"
                @move="updateWindowPosition"
                @resize="updateWindowSize"
                @update-title="updateWindowTitle"
                @dock-sidebar="handleDockToSidebar"
                @undock-sidebar="handleUndockFromSidebar"
                @open-document="openDocumentToWindow"
                @import-document="importDocument"
              />
            </template>
          </TransitionGroup>
        </div>
      </div>
    </div>

    <!-- 任务栏 -->
    <Taskbar
      :windows="windows"
      :grouped-windows="groupedWindows"
      @activate-window="setActiveWindow"
      @item-context-menu="handleTaskbarItemContextMenu"
      @menu-action="handleTaskbarMenuAction"
    />

    <!-- 右键菜单 -->
    <ContextMenu
      :visible="contextMenu.visible"
      :position="contextMenu.position"
      :items="contextMenu.items"
      @close="closeContextMenu"
      @select="handleContextMenuSelect"
    />

    <!-- 新建编辑器弹窗 -->
    <CustomModal
      v-model="newEditorModalVisible"
      title="新建编辑器"
      :show-default-footer="true"
      confirm-text="创建"
      @confirm="confirmCreateNewEditor"
    >
      <CustomInput
        ref="newEditorInputRef"
        v-model="newEditorTitle"
        label="文档名称"
        placeholder="请输入文档名称（可选）"
        @enter="confirmCreateNewEditor"
      />
    </CustomModal>

    <!-- 提示弹窗 -->
    <CustomModal
      v-model="alertModalVisible"
      :title="alertModalTitle"
      :show-default-footer="true"
      :show-cancel="false"
    >
      <p>{{ alertModalMessage }}</p>
    </CustomModal>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import TopBar from '../components/TopBar.vue'
import EditorPane from '../components/EditorPane.vue'
import WindowComponent from '../components/WindowComponent.vue'
import DocumentExplorer from '../components/DocumentExplorer.vue'
import DesktopIcon from '../components/DesktopIcon.vue'
import ContextMenu from '../components/ContextMenu.vue'
import Taskbar from '../components/Taskbar.vue'
import CustomModal from '../components/CustomModal.vue'
import CustomInput from '../components/CustomInput.vue'
import { useTheme } from '../composables/useTheme'
import { useAudio } from '../composables/useAudio'
import { useSidebar } from '../composables/useSidebar'
import { useWindowManager } from '../composables/useWindowManager'
import { useDocument } from '../composables/useDocument'
import { exportHTML as exportHTMLUtil, exportMD as exportMDUtil, exportPDF as exportPDFUtil } from '../utils/exportUtils'
import { markdownToHtml } from '../utils/markdownParser'
import { formatFileSize, formatDate } from '../utils/formatUtils'

const router = useRouter()
const { theme, toggleTheme } = useTheme()
const { soundEnabled, toggleSound, playEditSound, playExportSound } = useAudio()
const { leftSidebarCollapsed, rightSidebarCollapsed, toggleLeftSidebar } = useSidebar()
const {
  windows,
  activeWindowId,
  iconPosition,
  docIconPosition,
  groupedWindows,
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
  restoreIconPosition,
  restoreDocIconPosition
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
const windowSavedContent = ref({})
const contextMenu = ref({
  visible: false,
  position: { x: 0, y: 0 },
  items: [],
  type: null,
  windowId: null
})
const newEditorModalVisible = ref(false)
const newEditorTitle = ref('')
const newEditorInputRef = ref(null)
const alertModalVisible = ref(false)
const alertModalTitle = ref('提示')
const alertModalMessage = ref('')

watch(newEditorModalVisible, (val) => {
  if (val) {
    nextTick(() => {
      newEditorInputRef.value?.focus()
    })
  }
})

const activeWindow = computed(() => {
  return getWindowById(activeWindowId.value)
})

const sidebarState = computed(() => {
  const explorer = windows.value.find(w => w.isDocumentExplorer && w.sidebarMode)
  if (!explorer) {
    return { hasSidebar: false, side: null, width: 0 }
  }
  return {
    hasSidebar: true,
    side: explorer.sidebarSide,
    width: 320
  }
})

const getWindowContent = (id) => {
  return windowContents.value[id] || ''
}

const getWindowPreview = (id) => {
  return windowPreviews.value[id] || ''
}

const showAlert = (message, title = '提示') => {
  alertModalMessage.value = message
  alertModalTitle.value = title
  alertModalVisible.value = true
}

const createNewEditor = () => {
  newEditorTitle.value = ''
  newEditorModalVisible.value = true
}

const checkUnsavedChanges = async (winId) => {
  const win = getWindowById(winId)
  if (!win || win.isDocumentExplorer) return true
  
  const currentContent = windowContents.value[winId] || ''
  const savedContent = windowSavedContent.value[winId] || ''
  
  if (currentContent !== savedContent) {
    const result = confirm(`"${win.title}" 有未保存的修改，是否保存？\n\n点击确定保存并关闭，点击取消放弃修改并关闭，点击右上角 X 取消操作`)
    if (result) {
      await handleSaveWindowDocument(winId)
    }
    return true
  }
  return true
}

const doCreateWindow = (title, content = '', documentId = null) => {
  const id = createWindow({ title, content: '' })
  windowContents.value[id] = content
  windowSavedContent.value[id] = content
  windowPreviews.value[id] = content ? markdownToHtml(content) : ''
  windowDocumentIds.value[id] = documentId
  return id
}

const confirmCreateNewEditor = () => {
  const title = newEditorTitle.value.trim() || '未命名文档'
  doCreateWindow(title)
  newEditorModalVisible.value = false
  newEditorTitle.value = ''
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
    showAlert('请先设置文档标题（双击窗口标题编辑）')
    return
  }

  const content = windowContents.value[windowId] || ''
  const docId = windowDocumentIds.value[windowId]

  try {
    if (docId) {
      const res = await updateDocument(docId, { title, content })
      if (res.success) {
        windowSavedContent.value[windowId] = content
        showAlert('已保存到数据库')
      } else {
        showAlert('保存失败')
      }
    } else {
      const res = await uploadDocument({ title, content })
      if (res.success && res.data && res.data.id) {
        windowDocumentIds.value[windowId] = res.data.id
        windowSavedContent.value[windowId] = content
        const win = getWindowById(windowId)
        if (win) win.documentId = res.data.id
        showAlert('已上传到数据库')
      } else {
        showAlert('上传失败')
      }
    }
  } catch (err) {
    showAlert('操作失败')
  }
}

const handleGoToEditor = async () => {
  if (!activeWindowId.value) {
    showAlert('请先创建或选择一个编辑器窗口')
    return
  }
  await switchToOriginalView(activeWindowId.value)
}

const switchToOriginalView = async (windowId) => {
  if (!windowId) {
    showAlert('请先创建或选择一个编辑器窗口')
    return
  }
  
  const win = getWindowById(windowId)
  
  if (!win || win.isDocumentExplorer) {
    showAlert('请先创建或选择一个编辑器窗口')
    return
  }
  
  const content = windowContents.value[windowId] || ''
  const title = win?.title || '未命名文档'
  const docId = windowDocumentIds.value[windowId]
  
  const canSwitch = await checkUnsavedChanges(windowId)
  if (!canSwitch) {
    return
  }
  
  localStorage.setItem('windowedEditorContent', content)
  localStorage.setItem('windowedEditorTitle', title)
  if (docId) {
    localStorage.setItem('windowedEditorDocId', docId)
  }
  router.push('/editor')
}

const handleIconMove = (x, y) => {
  iconPosition.value = { x, y }
}

const handleExportHTML = () => {
  if (!activeWindow.value) {
    showAlert('请先选择一个窗口')
    return
  }
  playExportSound()
  exportHTMLUtil(windowPreviews.value[activeWindow.value.id])
}

const handleExportMD = () => {
  if (!activeWindow.value) {
    showAlert('请先选择一个窗口')
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

const openDocumentToWindow = async (doc) => {
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

  const res = await getDocument(doc.id)
  if (res.success && res.data) {
    const d = res.data
    const id = doCreateWindow(d.title, d.content, d.id)
    setActiveWindow(id)
  } else {
    showAlert('加载文档失败')
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

const handleTaskbarItemContextMenu = (e, win) => {
  contextMenu.value = {
    visible: true,
    position: { x: e.clientX, y: e.clientY },
    windowId: win.id,
    type: 'taskbar',
    items: [
      { icon: '🎯', label: '激活窗口', action: 'activate' },
      { icon: '🔄', label: '最小化/还原', action: 'toggle-minimize' },
      { icon: '⛶', label: '最大化/还原', action: 'toggle-maximize' },
      { divider: true },
      { icon: '💾', label: '保存文档', action: 'save-document' },
      { icon: '🎯', label: '专注模式', action: 'switch-to-original' },
      { divider: true },
      { icon: '✖️', label: '关闭窗口', action: 'close' }
    ]
  }
}

const handleTaskbarMenuAction = (item) => {
  switch (item.action) {
    case 'new-editor':
      createNewEditor()
      break
    case 'my-docs':
      toggleDocumentExplorer()
      break
    case 'import':
      importDocument()
      break
    case 'community':
      router.push('/community')
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
        ;[...windows.value].forEach(w => closeWindow(w.id))
      }
      break
    case 'theme':
      toggleTheme()
      break
    case 'export':
      if (activeWindow.value) {
        handleExportMD()
      } else {
        showAlert('请先选择一个窗口')
      }
      break
    case 'save':
      if (activeWindow.value && !activeWindow.value.isDocumentExplorer) {
        handleSaveWindowDocument(activeWindow.value.id)
      } else {
        showAlert('请先选择一个编辑器窗口')
      }
      break
    case 'settings':
      showAlert('设置功能开发中...')
      break
  }
}

const handleContextMenuSelect = (item) => {
  switch (item.action) {
    case 'activate':
      if (contextMenu.value.windowId) setActiveWindow(contextMenu.value.windowId)
      break
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
      if (confirm('确定要关闭所有窗口吗？')) {
        ;[...windows.value].forEach(w => closeWindow(w.id))
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

const handleDocIconMove = (x, y) => {
  docIconPosition.value = { x, y }
}

const getDocumentExplorerWindow = () => {
  return windows.value.find(w => w.isDocumentExplorer)
}

const toggleDocumentExplorer = () => {
  const existingExplorer = getDocumentExplorerWindow()
  if (existingExplorer) {
    if (existingExplorer.isMinimized) {
      toggleMinimize(existingExplorer.id)
    }
    setActiveWindow(existingExplorer.id)
  } else {
    createDocumentExplorer()
  }
}

const createDocumentExplorer = () => {
  const id = createWindow({ 
    title: '我的文档', 
    content: '', 
    isDocumentExplorer: true,
    width: 380,
    height: 500,
    x: 100,
    y: 100
  })
  windowContents.value[id] = ''
  windowPreviews.value[id] = ''
  windowDocumentIds.value[id] = null
  return id
}

const handleDockToSidebar = (side) => {
  const explorerWin = getDocumentExplorerWindow()
  if (!explorerWin) return
  
  explorerWin.sidebarMode = true
  explorerWin.sidebarSide = side
  setActiveWindow(explorerWin.id)
}

const handleUndockFromSidebar = () => {
  const explorerWin = getDocumentExplorerWindow()
  if (!explorerWin) return
  
  explorerWin.sidebarMode = false
  explorerWin.sidebarSide = null
  explorerWin.x = 100
  explorerWin.y = 100
  explorerWin.width = 380
  explorerWin.height = 500
  setActiveWindow(explorerWin.id)
}

const handleCloseWindow = async (windowId) => {
  const canClose = await checkUnsavedChanges(windowId)
  if (canClose) {
    closeWindow(windowId)
    delete windowContents.value[windowId]
    delete windowPreviews.value[windowId]
    delete windowDocumentIds.value[windowId]
    delete windowSavedContent.value[windowId]
  }
}

onMounted(() => {
  restoreIconPosition()
  restoreDocIconPosition()
  const hasRestored = restoreState()
  
  if (hasRestored) {
    windows.value.forEach(win => {
      windowContents.value[win.id] = win.content || ''
      windowSavedContent.value[win.id] = win.content || ''
      windowPreviews.value[win.id] = markdownToHtml(win.content || '')
      windowDocumentIds.value[win.id] = win.documentId || null
    })
  }
  
  const savedContent = localStorage.getItem('windowedEditorContent')
  const savedTitle = localStorage.getItem('windowedEditorTitle')
  const savedDocId = localStorage.getItem('windowedEditorDocId')
  if (savedContent) {
    let targetWindowId = null
    const docIdNum = savedDocId ? Number(savedDocId) : null
    
    if (docIdNum) {
      for (const win of windows.value) {
        if (!win.isDocumentExplorer && win.documentId === docIdNum) {
          targetWindowId = win.id
          break
        }
      }
    }
    
    if (!targetWindowId) {
      const id = doCreateWindow(savedTitle || '未命名文档', savedContent, docIdNum)
      targetWindowId = id
    } else {
      windowContents.value[targetWindowId] = savedContent
      windowSavedContent.value[targetWindowId] = savedContent
      windowPreviews.value[targetWindowId] = markdownToHtml(savedContent)
      if (savedTitle) {
        updateWindowTitle(targetWindowId, savedTitle)
      }
      const win = getWindowById(targetWindowId)
      if (win && win.isMinimized) {
        toggleMinimize(targetWindowId)
      }
    }
    
    setActiveWindow(targetWindowId)
    localStorage.removeItem('windowedEditorContent')
    localStorage.removeItem('windowedEditorTitle')
    if (savedDocId) {
      localStorage.removeItem('windowedEditorDocId')
    }
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
  position: relative;
  overflow: hidden;
}

.desktop-area {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background-image: url('/audio/wallpaper.png');
  background-size: cover;
  background-repeat: no-repeat;
  background-position: center center;
  background-attachment: fixed;
}

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
