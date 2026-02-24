<template>
  <div 
    class="window document-explorer"
    :class="{ 
      maximized: win.isMaximized,
      minimized: win.isMinimized,
      active: win.isActive,
      'sidebar-mode': sidebarMode,
      'sidebar-left': sidebarMode && win.sidebarSide === 'left',
      'sidebar-right': sidebarMode && win.sidebarSide === 'right',
      collapsed: sidebarMode && sidebarCollapsed
    }"
    :style="windowStyle"
    @mousedown="handleWindowMouseDown"
  >
    <button 
      v-if="sidebarMode"
      class="sidebar-toggle-btn"
      :class="win.sidebarSide"
      @click.stop="toggleSidebar"
    >
      {{ sidebarCollapsed ? (win.sidebarSide === 'left' ? '→' : '←') : (win.sidebarSide === 'left' ? '←' : '→') }}
    </button>
    <div 
      v-if="!sidebarMode"
      class="window-header"
      @mousedown.stop="handleHeaderMouseDown"
      @dblclick="toggleMaximize"
    >
      <div class="window-title" @dblclick.stop="editTitle">
        <span v-if="!isEditingTitle" class="title-text">📁 {{ win.title }}</span>
        <input 
          v-else
          ref="titleInputRef"
          v-model="editingTitle"
          class="title-input"
          @blur="saveTitle"
          @keyup.enter="saveTitle"
          @keyup.escape="cancelEditTitle"
        />
      </div>
      <div class="window-controls">
        <button class="control-btn minimize" @click.stop="toggleMinimize" title="最小化">
          <span>−</span>
        </button>
        <button class="control-btn maximize" @click.stop="toggleMaximize" :title="win.isMaximized ? '还原' : '最大化'">
          <span>{{ win.isMaximized ? '❐' : '□' }}</span>
        </button>
        <button class="control-btn close" @click.stop="handleClose" title="关闭">
          <span>×</span>
        </button>
      </div>
    </div>

    <div 
      v-if="sidebarMode"
      class="sidebar-header"
    >
      <div class="sidebar-title">
        <span>📁 {{ win.title }}</span>
      </div>
      <div class="sidebar-controls">
        <button class="control-btn undock" @click="undockFromSidebar" title="从侧边栏移除">
          <span>↗</span>
        </button>
        <button class="control-btn close" @click.stop="handleClose" title="关闭">
          <span>×</span>
        </button>
      </div>
    </div>

    <div class="window-body">
      <div class="document-explorer-content">
        <div class="explorer-header">
          <h3>我的文档</h3>
        </div>
        
        <div class="document-list">
          <div v-if="loading" class="loading">加载中...</div>
          <div v-else-if="!documents || documents.length === 0" class="empty-list">
            暂无文档
          </div>
          <div
            v-else
            v-for="doc in documents"
            :key="doc.id"
            class="document-item"
            @click="openDocumentToWindow(doc)"
          >
            <div class="document-icon">📄</div>
            <div class="document-info">
              <div class="document-title">{{ doc.title }}</div>
              <div class="document-meta">
                <span>{{ formatFileSize(doc.file_size) }}</span>
                <span>{{ formatDate(doc.updated_at) }}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="explorer-actions">
          <button @click="importDocument">📥 导入文档</button>
          <button @click="refreshDocuments">🔄 刷新</button>
        </div>
      </div>
    </div>

    <div 
      v-if="!win.isMaximized && !sidebarMode"
      class="resize-handle se"
      @mousedown.stop="handleResizeMouseDown('se', $event)"
    ></div>
    <div 
      v-if="!win.isMaximized && !sidebarMode"
      class="resize-handle sw"
      @mousedown.stop="handleResizeMouseDown('sw', $event)"
    ></div>
    <div 
      v-if="!win.isMaximized && !sidebarMode"
      class="resize-handle ne"
      @mousedown.stop="handleResizeMouseDown('ne', $event)"
    ></div>
    <div 
      v-if="!win.isMaximized && !sidebarMode"
      class="resize-handle nw"
      @mousedown.stop="handleResizeMouseDown('nw', $event)"
    ></div>
    <div 
      v-if="!win.isMaximized && !sidebarMode"
      class="resize-handle n"
      @mousedown.stop="handleResizeMouseDown('n', $event)"
    ></div>
    <div 
      v-if="!win.isMaximized && !sidebarMode"
      class="resize-handle s"
      @mousedown.stop="handleResizeMouseDown('s', $event)"
    ></div>
    <div 
      v-if="!win.isMaximized && !sidebarMode"
      class="resize-handle e"
      @mousedown.stop="handleResizeMouseDown('e', $event)"
    ></div>
    <div 
      v-if="!win.isMaximized && !sidebarMode"
      class="resize-handle w"
      @mousedown.stop="handleResizeMouseDown('w', $event)"
    ></div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
import { useDocument } from '../composables/useDocument'
import { formatFileSize, formatDate } from '../utils/formatUtils'

const props = defineProps({
  win: {
    type: Object,
    required: true
  },
  sidebarMode: {
    type: Boolean,
    default: false
  }
})

const sidebarCollapsed = ref(false)

const emit = defineEmits([
  'activate',
  'close',
  'maximize',
  'minimize',
  'move',
  'resize',
  'update-title',
  'context-menu',
  'dock-sidebar',
  'undock-sidebar',
  'open-document',
  'import-document'
])

const { 
  documents, 
  loading, 
  fetchDocuments,
  getDocument 
} = useDocument()

const isEditingTitle = ref(false)
const editingTitle = ref('')
const titleInputRef = ref(null)
const isDragging = ref(false)
const isResizing = ref(false)
const dragStart = ref({ x: 0, y: 0 })
const resizeStart = ref({ x: 0, y: 0, width: 0, height: 0, left: 0, top: 0 })
const resizeDirection = ref('')
let dragMoveHandler = null
let dragUpHandler = null
let resizeMoveHandler = null
let resizeUpHandler = null

const windowStyle = computed(() => {
  if (props.sidebarMode) {
    return {
      zIndex: props.win.zIndex
    }
  }
  return {
    left: `${props.win.x}px`,
    top: `${props.win.y}px`,
    width: `${props.win.width}px`,
    height: `${props.win.height}px`,
    zIndex: props.win.zIndex
  }
})

const toggleSidebar = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value
}

const refreshDocuments = async () => {
  await fetchDocuments()
}

const importDocument = () => {
  emit('import-document')
}

const openDocumentToWindow = async (doc) => {
  const res = await getDocument(doc.id)
  if (res.success && res.data) {
    emit('open-document', res.data)
  }
}

const editTitle = () => {
  isEditingTitle.value = true
  editingTitle.value = props.win.title
  nextTick(() => {
    titleInputRef.value?.focus()
    titleInputRef.value?.select()
  })
}

const saveTitle = () => {
  const newTitle = editingTitle.value.trim()
  if (newTitle) {
    emit('update-title', props.win.id, newTitle)
  }
  isEditingTitle.value = false
}

const cancelEditTitle = () => {
  isEditingTitle.value = false
}

const handleWindowMouseDown = () => {
  emit('activate', props.win.id)
}

const handleHeaderMouseDown = (e) => {
  if (props.win.isMaximized) return
  
  isDragging.value = true
  dragStart.value = {
    x: e.clientX - props.win.x,
    y: e.clientY - props.win.y
  }
  
  dragMoveHandler = (e) => {
    if (!isDragging.value) return
    
    let newX = e.clientX - dragStart.value.x
    let newY = e.clientY - dragStart.value.y
    
    const screenWidth = window.innerWidth
    const screenHeight = window.innerHeight
    
    if (newX <= 10 && !props.sidebarMode) {
      emit('dock-sidebar', 'left')
      return
    }
    if (newX + props.win.width >= screenWidth - 10 && !props.sidebarMode) {
      emit('dock-sidebar', 'right')
      return
    }
    
    emit('move', props.win.id, newX, newY)
  }
  
  dragUpHandler = () => {
    isDragging.value = false
    document.removeEventListener('mousemove', dragMoveHandler)
    document.removeEventListener('mouseup', dragUpHandler)
  }
  
  document.addEventListener('mousemove', dragMoveHandler)
  document.addEventListener('mouseup', dragUpHandler)
}

const handleResizeMouseDown = (direction, e) => {
  isResizing.value = true
  resizeDirection.value = direction
  resizeStart.value = {
    x: e.clientX,
    y: e.clientY,
    width: props.win.width,
    height: props.win.height,
    left: props.win.x,
    top: props.win.y
  }
  
  resizeMoveHandler = (e) => {
    if (!isResizing.value) return
    
    let newWidth = resizeStart.value.width
    let newHeight = resizeStart.value.height
    let newX = resizeStart.value.left
    let newY = resizeStart.value.top
    
    const dx = e.clientX - resizeStart.value.x
    const dy = e.clientY - resizeStart.value.y
    
    if (direction.includes('e')) {
      newWidth = Math.max(400, resizeStart.value.width + dx)
    }
    if (direction.includes('w')) {
      newWidth = Math.max(400, resizeStart.value.width - dx)
      newX = resizeStart.value.left + (resizeStart.value.width - newWidth)
    }
    if (direction.includes('s')) {
      newHeight = Math.max(300, resizeStart.value.height + dy)
    }
    if (direction.includes('n')) {
      newHeight = Math.max(300, resizeStart.value.height - dy)
      newY = resizeStart.value.top + (resizeStart.value.height - newHeight)
    }
    
    emit('resize', props.win.id, newX, newY, newWidth, newHeight)
  }
  
  resizeUpHandler = () => {
    isResizing.value = false
    resizeDirection.value = ''
    document.removeEventListener('mousemove', resizeMoveHandler)
    document.removeEventListener('mouseup', resizeUpHandler)
  }
  
  document.addEventListener('mousemove', resizeMoveHandler)
  document.addEventListener('mouseup', resizeUpHandler)
}

const toggleMaximize = () => {
  emit('maximize', props.win.id)
}

const toggleMinimize = () => {
  emit('minimize', props.win.id)
}

const undockFromSidebar = () => {
  emit('undock-sidebar')
}

const handleClose = () => {
  emit('close', props.win.id)
}

onMounted(() => {
  fetchDocuments()
})

onUnmounted(() => {
  if (dragMoveHandler) {
    document.removeEventListener('mousemove', dragMoveHandler)
  }
  if (dragUpHandler) {
    document.removeEventListener('mouseup', dragUpHandler)
  }
  if (resizeMoveHandler) {
    document.removeEventListener('mousemove', resizeMoveHandler)
  }
  if (resizeUpHandler) {
    document.removeEventListener('mouseup', resizeUpHandler)
  }
})
</script>

<style scoped>
.window {
  position: absolute;
  background: var(--bg);
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border);
  transition: box-shadow 0.2s, left 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), right 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.window.sidebar-mode {
  position: fixed;
  top: 52px;
  bottom: 52px;
  width: 320px;
  height: auto;
  border-radius: 0;
  box-shadow: 2px 0 20px rgba(0, 0, 0, 0.2);
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.window.sidebar-mode.sidebar-left {
  left: 0;
  right: auto;
  transform: translateX(0);
}

.window.sidebar-mode.sidebar-left.collapsed {
  transform: translateX(-280px);
}

.window.sidebar-mode.sidebar-right {
  right: 0;
  left: auto;
  box-shadow: -2px 0 20px rgba(0, 0, 0, 0.2);
  transform: translateX(0);
}

.window.sidebar-mode.sidebar-right.collapsed {
  transform: translateX(280px);
}

.sidebar-toggle-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 20px;
  height: 60px;
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 12px;
  transition: opacity 0.2s;
  z-index: 1000;
}

.sidebar-toggle-btn.left {
  right: -20px;
  border-radius: 0 8px 8px 0;
}

.sidebar-toggle-btn.right {
  left: -20px;
  border-radius: 8px 0 0 8px;
}

.window:hover {
  box-shadow: 0 12px 50px rgba(0, 0, 0, 0.35);
}

.window.active {
  box-shadow: 0 14px 60px rgba(0, 0, 0, 0.4);
}

.window.minimized {
  display: none;
}

.window.maximized {
  left: 0 !important;
  top: 52px !important;
  width: 100% !important;
  height: calc(100vh - 104px) !important;
  border-radius: 0;
}

.window-header {
  height: 40px;
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
  padding: 0 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: move;
  user-select: none;
  flex-shrink: 0;
}

.sidebar-header {
  height: 44px;
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
  padding: 0 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  user-select: none;
  flex-shrink: 0;
}

.sidebar-title {
  color: white;
  font-weight: 600;
  font-size: 14px;
}

.window-title {
  flex: 1;
  display: flex;
  align-items: center;
  overflow: hidden;
}

.title-text {
  color: white;
  font-weight: 500;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.title-input {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  font-size: 14px;
  font-weight: 500;
  padding: 4px 8px;
  border-radius: 4px;
  outline: none;
  width: 100%;
}

.title-input::placeholder {
  color: rgba(255, 255, 255, 0.7);
}

.window-controls,
.sidebar-controls {
  display: flex;
  gap: 6px;
}

.control-btn {
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.15);
  color: white;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  line-height: 1;
}

.control-btn:hover {
  background: rgba(255, 255, 255, 0.25);
  transform: scale(1.1);
}

.control-btn.close:hover {
  background: #ef4444;
}

.control-btn span {
  display: block;
  margin-top: -2px;
}

.window-body {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.document-explorer-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 12px;
  overflow: hidden;
}

.explorer-header {
  margin-bottom: 12px;
}

.explorer-header h3 {
  margin: 0;
  font-size: 15px;
  color: var(--text);
}

.document-list {
  flex: 1;
  overflow-y: auto;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.5);
  margin-bottom: 12px;
}

[data-theme="dark"] .document-list {
  background: rgba(30, 30, 30, 0.5);
}

.document-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
  transition: background-color 0.15s;
}

.document-item:last-child {
  border-bottom: none;
}

.document-item:hover {
  background: rgba(59, 130, 246, 0.1);
}

.document-icon {
  font-size: 24px;
  flex-shrink: 0;
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
  color: var(--text);
}

.document-meta {
  display: flex;
  gap: 12px;
  font-size: 11px;
  color: var(--text-secondary);
  opacity: 0.7;
}

.loading,
.empty-list {
  padding: 30px;
  text-align: center;
  color: var(--text-secondary);
  opacity: 0.6;
}

.explorer-actions {
  display: flex;
  gap: 8px;
}

.explorer-actions button {
  flex: 1;
  padding: 10px;
  font-size: 13px;
  border: 1px solid var(--border);
  background: var(--bg-secondary);
  color: var(--text);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;
}

.explorer-actions button:hover {
  background: rgba(59, 130, 246, 0.1);
  border-color: #3b82f6;
}

.resize-handle {
  position: absolute;
  z-index: 10;
}

.resize-handle.n {
  top: 0;
  left: 10px;
  right: 10px;
  height: 8px;
  cursor: n-resize;
}

.resize-handle.s {
  bottom: 0;
  left: 10px;
  right: 10px;
  height: 8px;
  cursor: s-resize;
}

.resize-handle.e {
  right: 0;
  top: 10px;
  bottom: 10px;
  width: 8px;
  cursor: e-resize;
}

.resize-handle.w {
  left: 0;
  top: 10px;
  bottom: 10px;
  width: 8px;
  cursor: w-resize;
}

.resize-handle.ne {
  top: 0;
  right: 0;
  width: 16px;
  height: 16px;
  cursor: ne-resize;
}

.resize-handle.nw {
  top: 0;
  left: 0;
  width: 16px;
  height: 16px;
  cursor: nw-resize;
}

.resize-handle.se {
  bottom: 0;
  right: 0;
  width: 16px;
  height: 16px;
  cursor: se-resize;
}

.resize-handle.sw {
  bottom: 0;
  left: 0;
  width: 16px;
  height: 16px;
  cursor: sw-resize;
}
</style>
