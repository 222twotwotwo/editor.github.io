<template>
  <div :data-theme="theme" class="windowed-editor-container">
    <TopBar
      :theme="theme"
      @toggle-theme="toggleTheme"
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
          label="新建MD"
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
        <DesktopIcon
          icon="🍅"
          label="番茄钟"
          :initial-x="pomodoroIconPosition.x"
          :initial-y="pomodoroIconPosition.y"
          @click="togglePomodoroTimer"
          @move="handlePomodoroIconMove"
        />
        <DesktopIcon
          icon="🏷️"
          label="标签管理"
          :initial-x="tagIconPosition.x"
          :initial-y="tagIconPosition.y"
          @click="toggleTagManager"
          @move="handleTagIconMove"
        />
        <DesktopIcon
          icon="📋"
          label="学习任务"
          :initial-x="taskIconPosition.x"
          :initial-y="taskIconPosition.y"
          @click="toggleTaskManager"
          @move="handleTaskIconMove"
        />

        <div class="windows-container">
          <TransitionGroup name="window-list">
            <template v-for="win in windows" :key="win.id">
              <DocumentExplorer
                v-if="win.isDocumentExplorer"
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
                @doc-context-menu="handleDocContextMenu"
              />
              
              <WindowComponent
                v-else-if="win.isPomodoroTimer"
                :win="win"
                :sidebar-state="sidebarState"
                @activate="setActiveWindow"
                @close="closeWindow"
                @maximize="toggleMaximize"
                @minimize="toggleMinimize"
                @move="updateWindowPosition"
                @resize="updateWindowSize"
                @update-title="updateWindowTitle"
                @context-menu="handleWindowContextMenu"
              >
                <PomodoroTimer @complete="handlePomodoroComplete" />
              </WindowComponent>
              
              <WindowComponent
                v-else-if="win.isTagManager"
                :win="win"
                :sidebar-state="sidebarState"
                @activate="setActiveWindow"
                @close="closeWindow"
                @maximize="toggleMaximize"
                @minimize="toggleMinimize"
                @move="updateWindowPosition"
                @resize="updateWindowSize"
                @update-title="updateWindowTitle"
                @context-menu="handleWindowContextMenu"
              >
                <TagManager @tags-updated="handleTagsUpdated" />
              </WindowComponent>
              
              <WindowComponent
                v-else-if="win.isTaskManager"
                :win="win"
                :sidebar-state="sidebarState"
                @activate="setActiveWindow"
                @close="closeWindow"
                @maximize="toggleMaximize"
                @minimize="toggleMinimize"
                @move="updateWindowPosition"
                @resize="updateWindowSize"
                @update-title="updateWindowTitle"
                @context-menu="handleWindowContextMenu"
              >
                <TaskManager />
              </WindowComponent>
              
              <WindowComponent
                v-else
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
                    @sync-without-sound="(v) => handleWindowContentChangeSilent(win.id, v)"
                  />
                </div>
              </WindowComponent>
            </template>
          </TransitionGroup>
        </div>
      </div>
    </div>

    <!-- 任务栏 -->
    <Taskbar
      :windows="windows"
      :grouped-windows="groupedWindows"
      @activate-window="handleTaskbarActivateWindow"
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

    <!-- 文档标签选择面板 -->
    <Teleport to="body">
      <div
        v-if="tagPickerVisible"
        class="tag-picker-overlay"
        @click.self="closeTagPicker"
        @contextmenu.prevent="closeTagPicker"
      >
        <div
          class="tag-picker-panel"
          :style="{ left: tagPickerPosition.x + 'px', top: tagPickerPosition.y + 'px' }"
        >
          <div class="tag-picker-header">
            <span>🏷️ 为文档添加标签</span>
            <button class="tag-picker-close" @click="closeTagPicker">×</button>
          </div>
          <div v-if="tagPickerAllTags.length === 0" class="tag-picker-empty">
            暂无标签，请先在标签管理中创建
          </div>
          <div v-else class="tag-picker-list">
            <div
              v-for="tag in tagPickerAllTags"
              :key="tag.id"
              class="tag-picker-item"
              :class="{ active: isTagActive(tag.id) }"
              @click="toggleDocTag(tag)"
            >
              <span class="tag-picker-dot" :style="{ background: tag.color }"></span>
              <span class="tag-picker-name">{{ tag.name }}</span>
              <span v-if="isTagActive(tag.id)" class="tag-picker-check">✓</span>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 新建MD弹窗 -->
    <CustomModal
      v-model="newEditorModalVisible"
      title="新建MD"
      :show-default-footer="true"
      confirm-text="创建"
      @confirm="confirmCreateNewEditor"
    >
      <CustomInput
        ref="newEditorInputRef"
        v-model="newEditorTitle"
        label="文档名称"
        placeholder="不填则使用「新文档」"
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
import PomodoroTimer from '../components/PomodoroTimer.vue'
import TagManager from '../components/TagManager.vue'
import TaskManager from '../components/TaskManager.vue'
import { tagAPI } from '../services/api'
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
  pomodoroIconPosition,
  tagIconPosition,
  taskIconPosition,
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
  restoreDocIconPosition,
  restorePomodoroIconPosition,
  restoreTagIconPosition,
  restoreTaskIconPosition
} = useWindowManager()
const { 
  uploadDocument, 
  updateDocument, 
  getDocument, 
  documents, 
  loading, 
  fetchDocuments,
  touchDocumentAccess
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

// 文档标签选择面板状态
const tagPickerVisible = ref(false)
const tagPickerPosition = ref({ x: 0, y: 0 })
const tagPickerDoc = ref(null)
const tagPickerDocTags = ref([])
const tagPickerAllTags = ref([])
const tagPickerCallback = ref(null)
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

watch(activeWindowId, (id) => {
  if (id == null) return
  const docId = windowDocumentIds.value[id]
  if (docId != null) touchDocumentAccess(docId)
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
  const id = createWindow({ title, content, documentId })
  windowContents.value[id] = content
  windowSavedContent.value[id] = content
  windowPreviews.value[id] = content ? markdownToHtml(content) : ''
  windowDocumentIds.value[id] = documentId
  return id
}

const confirmCreateNewEditor = async () => {
  const title = newEditorTitle.value.trim() || '新文档'
  const id = doCreateWindow(title, '')
  newEditorModalVisible.value = false
  newEditorTitle.value = ''
  setActiveWindow(id)
  await handleSaveWindowDocument(id)
}

const handleWindowContentChange = (windowId, content) => {
  windowContents.value[windowId] = content
  windowPreviews.value[windowId] = markdownToHtml(content)
  updateWindowContent(windowId, content)
  playEditSound()
}

const handleWindowContentChangeSilent = (windowId, content) => {
  windowContents.value[windowId] = content
  windowPreviews.value[windowId] = markdownToHtml(content)
  updateWindowContent(windowId, content)
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

const handleGoToEditor = () => {
  const win = getWindowById(activeWindowId.value)
  if (win && !win.isDocumentExplorer) {
    switchToOriginalView(activeWindowId.value)
  } else {
    localStorage.setItem('windowedEditorContent', '')
    localStorage.setItem('windowedEditorTitle', '未命名文档')
    localStorage.removeItem('windowedEditorSourceWindowId')
    localStorage.removeItem('windowedEditorLastSourceWindowId')
    localStorage.removeItem('windowedEditorDocumentId')
    router.push('/editor')
  }
}

const switchToOriginalView = (windowId) => {
  const content = windowContents.value[windowId] || ''
  const title = getWindowById(windowId)?.title || '未命名文档'
  const docId = windowDocumentIds.value[windowId]
  localStorage.setItem('windowedEditorContent', content)
  localStorage.setItem('windowedEditorTitle', title)
  localStorage.setItem('windowedEditorSourceWindowId', String(windowId))
  localStorage.setItem('windowedEditorLastSourceWindowId', String(windowId))
  if (docId != null) {
    localStorage.setItem('windowedEditorDocumentId', String(docId))
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

  // 若 doc 已包含 content 字段（DocumentExplorer 传来的完整对象），直接使用，无需重复 fetch
  if (doc.content != null) {
    const id = doCreateWindow(doc.title, doc.content, doc.id)
    touchDocumentAccess(doc.id)
    setActiveWindow(id)
    return
  }

  const res = await getDocument(doc.id)
  if (res.success && res.data) {
    const d = res.data
    const id = doCreateWindow(d.title, d.content, d.id)
    touchDocumentAccess(doc.id)
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
      { icon: '📝', label: '新建MD', action: 'new-editor' },
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

const handleTaskbarActivateWindow = (id) => {
  const win = getWindowById(id)
  if (win?.isMinimized) {
    toggleMinimize(id)
  } else {
    setActiveWindow(id)
  }
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

const handlePomodoroIconMove = (x, y) => {
  pomodoroIconPosition.value = { x, y }
}

const handleTagIconMove = (x, y) => {
  tagIconPosition.value = { x, y }
}

const handleTaskIconMove = (x, y) => {
  taskIconPosition.value = { x, y }
}

const getPomodoroTimerWindow = () => {
  return windows.value.find(w => w.isPomodoroTimer)
}

const togglePomodoroTimer = () => {
  const existingTimer = getPomodoroTimerWindow()
  if (existingTimer) {
    if (existingTimer.isMinimized) {
      toggleMinimize(existingTimer.id)
    }
    setActiveWindow(existingTimer.id)
  } else {
    createPomodoroTimer()
  }
}

const createPomodoroTimer = () => {
  const id = createWindow({ 
    title: '番茄钟', 
    content: '', 
    isPomodoroTimer: true,
    width: 320,
    height: 420,
    x: 200,
    y: 100
  })
  windowContents.value[id] = ''
  windowPreviews.value[id] = ''
  windowDocumentIds.value[id] = null
  return id
}

const getTagManagerWindow = () => {
  return windows.value.find(w => w.isTagManager)
}

const toggleTagManager = () => {
  const existingManager = getTagManagerWindow()
  if (existingManager) {
    if (existingManager.isMinimized) {
      toggleMinimize(existingManager.id)
    }
    setActiveWindow(existingManager.id)
  } else {
    createTagManager()
  }
}

const createTagManager = () => {
  const id = createWindow({ 
    title: '标签管理', 
    content: '', 
    isTagManager: true,
    width: 400,
    height: 500,
    x: 300,
    y: 100
  })
  windowContents.value[id] = ''
  windowPreviews.value[id] = ''
  windowDocumentIds.value[id] = null
  return id
}

const getTaskManagerWindow = () => {
  return windows.value.find(w => w.isTaskManager)
}

const toggleTaskManager = () => {
  const existingManager = getTaskManagerWindow()
  if (existingManager) {
    if (existingManager.isMinimized) {
      toggleMinimize(existingManager.id)
    }
    setActiveWindow(existingManager.id)
  } else {
    createTaskManager()
  }
}

const createTaskManager = () => {
  const id = createWindow({ 
    title: '学习任务', 
    content: '', 
    isTaskManager: true,
    width: 650,
    height: 550,
    x: 400,
    y: 100
  })
  windowContents.value[id] = ''
  windowPreviews.value[id] = ''
  windowDocumentIds.value[id] = null
  return id
}

const handlePomodoroComplete = () => {
  showAlert('🎉 恭喜！完成了一个番茄钟！')
}

const handleTagsUpdated = () => {
}

const handleDocContextMenu = async (e, doc, docTags, updateCallback) => {
  let allTags = []
  try {
    const res = await tagAPI.list()
    if (res?.data?.list) allTags = res.data.list
  } catch (err) {
    console.error('获取标签列表失败', err)
  }

  tagPickerDoc.value = doc
  tagPickerDocTags.value = [...docTags]
  tagPickerAllTags.value = allTags
  tagPickerCallback.value = updateCallback
  tagPickerPosition.value = { x: e.clientX, y: e.clientY }
  tagPickerVisible.value = true
}

const isTagActive = (tagId) => {
  return tagPickerDocTags.value.some(t => t.id === tagId)
}

const toggleDocTag = async (tag) => {
  if (!tagPickerDoc.value) return
  const docId = tagPickerDoc.value.id
  const active = isTagActive(tag.id)
  try {
    if (active) {
      await tagAPI.removeDocumentTag(docId, tag.id)
      tagPickerDocTags.value = tagPickerDocTags.value.filter(t => t.id !== tag.id)
    } else {
      await tagAPI.addDocumentTag(docId, tag.id)
      tagPickerDocTags.value = [...tagPickerDocTags.value, tag]
    }
    if (tagPickerCallback.value) {
      tagPickerCallback.value(docId, [...tagPickerDocTags.value])
    }
  } catch (err) {
    showAlert(err?.message || '操作标签失败，请稍后重试', '错误')
  }
}

const closeTagPicker = () => {
  tagPickerVisible.value = false
  tagPickerDoc.value = null
  tagPickerDocTags.value = []
  tagPickerAllTags.value = []
  tagPickerCallback.value = null
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

const handleUndockFromSidebar = (payload) => {
  const explorerWin = getDocumentExplorerWindow()
  if (!explorerWin) return
  
  explorerWin.sidebarMode = false
  explorerWin.sidebarSide = null
  explorerWin.x = payload?.x ?? 100
  explorerWin.y = payload?.y ?? 100
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

onMounted(async () => {
  restoreIconPosition()
  restoreDocIconPosition()
  restorePomodoroIconPosition()
  restoreTagIconPosition()
  restoreTaskIconPosition()
  const hasRestored = restoreState()
  await fetchDocuments()

  // 从编辑区返回时，优先使用 localStorage 中的内容（编辑区写入的内容）
  const savedContent = localStorage.getItem('windowedEditorContent')
  const savedTitle = localStorage.getItem('windowedEditorTitle')
  const savedSourceWindowId = localStorage.getItem('windowedEditorSourceWindowId')
  const savedDocId = localStorage.getItem('windowedEditorDocumentId')
  const documentId = savedDocId ? (/^\d+$/.test(savedDocId) ? parseInt(savedDocId, 10) : savedDocId) : null

  if (!hasRestored || windows.value.length === 0) {
    const content = savedContent || ''
    const title = (savedTitle || '未命名文档').trim()
    doCreateWindow(title || '未命名文档', content, documentId)
  } else {
    windows.value.forEach(win => {
      windowContents.value[win.id] = win.content || ''
      windowSavedContent.value[win.id] = win.content || ''
      windowPreviews.value[win.id] = markdownToHtml(win.content || '')
      windowDocumentIds.value[win.id] = win.documentId || null
    })
    // 若从编辑区返回且无 sourceWindowId（用户已在编辑页切换了文档），则关闭原来的「空白且未保存」的文档窗口
    const savedLastSourceWindowId = localStorage.getItem('windowedEditorLastSourceWindowId')
    if (savedContent !== null && !savedSourceWindowId && savedLastSourceWindowId) {
      const lastId = Number(savedLastSourceWindowId)
      const winToClose = getWindowById(lastId)
      const isBlankUnsaved = winToClose &&
        !winToClose.isDocumentExplorer &&
        (winToClose.documentId == null) &&
        ((winToClose.content || '').trim() === '')
      if (isBlankUnsaved) {
        closeWindow(lastId)
        delete windowContents.value[lastId]
        delete windowPreviews.value[lastId]
        delete windowDocumentIds.value[lastId]
        delete windowSavedContent.value[lastId]
      }
      localStorage.removeItem('windowedEditorLastSourceWindowId')
    }
    // 若从编辑区返回，用编辑区的内容覆盖对应窗口，并切换至该窗口（仅当有源窗口 id 时覆盖，否则复用同文档窗口或新建窗口避免重复）
    if (savedContent !== null) {
      const sourceId = savedSourceWindowId ? Number(savedSourceWindowId) : null
      let targetWin = sourceId != null && getWindowById(sourceId) && !getWindowById(sourceId).isDocumentExplorer
        ? getWindowById(sourceId)
        : null
      if (!targetWin && documentId != null) {
        const existingWinId = Object.keys(windowDocumentIds.value).find(
          winId => windowDocumentIds.value[winId] === documentId
        )
        if (existingWinId) {
          const win = getWindowById(Number(existingWinId))
          if (win && !win.isDocumentExplorer) targetWin = win
        }
      }
      if (targetWin) {
        const title = (savedTitle || targetWin.title || '未命名文档').trim()
        windowContents.value[targetWin.id] = savedContent
        windowSavedContent.value[targetWin.id] = savedContent
        windowPreviews.value[targetWin.id] = markdownToHtml(savedContent)
        windowDocumentIds.value[targetWin.id] = documentId
        updateWindowContent(targetWin.id, savedContent)
        updateWindowTitle(targetWin.id, title)
        setActiveWindow(targetWin.id)
      } else {
        // 避免多余窗口：仅当有实际内容或 documentId 时才新建窗口（编辑->桌面->社区->编辑->桌面 流程下常为空，不创建）
        const hasMeaningfulContent = (savedContent || '').trim() !== '' || documentId != null
        if (hasMeaningfulContent) {
          doCreateWindow((savedTitle || '未命名文档').trim(), savedContent, documentId)
        }
      }
    }
  }

  // 关闭在编辑页已删除的文档对应的窗口
  const existingDocIds = new Set(documents.value.map(d => d.id))
  const docExists = (docId) => {
    if (docId == null) return false
    return existingDocIds.has(docId) || existingDocIds.has(Number(docId)) || existingDocIds.has(String(docId))
  }
  const windowsToCloseForDeleted = windows.value.filter(w =>
    !w.isDocumentExplorer &&
    w.documentId != null &&
    !docExists(w.documentId)
  )
  windowsToCloseForDeleted.forEach(w => {
    closeWindow(w.id)
    delete windowContents.value[w.id]
    delete windowPreviews.value[w.id]
    delete windowDocumentIds.value[w.id]
    delete windowSavedContent.value[w.id]
  })

  if (savedContent !== null) {
    localStorage.removeItem('windowedEditorContent')
    localStorage.removeItem('windowedEditorTitle')
    localStorage.removeItem('windowedEditorLastSourceWindowId')
  }
  if (savedSourceWindowId !== null) {
    localStorage.removeItem('windowedEditorSourceWindowId')
  }
  if (savedDocId !== null) {
    localStorage.removeItem('windowedEditorDocumentId')
  }
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

<style>
.tag-picker-overlay {
  position: fixed;
  inset: 0;
  z-index: 10001;
}

.tag-picker-panel {
  position: fixed;
  min-width: 220px;
  max-width: 280px;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 10px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.2);
  overflow: hidden;
  z-index: 10002;
}

[data-theme="dark"] .tag-picker-panel {
  background: #2a2a2a;
  border-color: #444;
}

.tag-picker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px 8px;
  font-size: 13px;
  font-weight: 600;
  color: #222;
  border-bottom: 1px solid #ddd;
}

[data-theme="dark"] .tag-picker-header {
  color: #eee;
  border-bottom-color: #444;
}

.tag-picker-close {
  border: none;
  background: transparent;
  font-size: 18px;
  cursor: pointer;
  color: #555;
  line-height: 1;
  padding: 0 2px;
  opacity: 0.6;
  transition: opacity 0.15s;
}

.tag-picker-close:hover {
  opacity: 1;
}

.tag-picker-empty {
  padding: 20px 14px;
  font-size: 13px;
  color: #888;
  text-align: center;
}

.tag-picker-list {
  max-height: 260px;
  overflow-y: auto;
  padding: 6px;
}

.tag-picker-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;
  font-size: 13px;
  color: #222;
}

[data-theme="dark"] .tag-picker-item {
  color: #eee;
}

.tag-picker-item:hover {
  background: rgba(0,0,0,0.07);
}

[data-theme="dark"] .tag-picker-item:hover {
  background: rgba(255,255,255,0.08);
}

.tag-picker-item.active {
  background: rgba(59,130,246,0.1);
}

.tag-picker-dot {
  width: 14px;
  height: 14px;
  border-radius: 4px;
  flex-shrink: 0;
  box-shadow: 0 1px 4px rgba(0,0,0,0.15);
}

.tag-picker-name {
  flex: 1;
}

.tag-picker-check {
  color: #3b82f6;
  font-weight: 700;
  font-size: 14px;
}
</style>
