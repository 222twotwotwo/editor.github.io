<template>
  <div
    v-if="!win.isMinimized"
    class="window"
    :class="{ active: win.isActive, maximized: win.isMaximized }"
    :style="windowStyle"
    @mousedown="activateWindow"
    @contextmenu.prevent="handleContextMenu"
  >
    <div
      class="window-header"
      @mousedown="startDrag"
      @dblclick="toggleMaximize"
      @contextmenu.prevent="handleContextMenu"
    >
      <input
        v-if="isEditingTitle"
        ref="titleInput"
        v-model="localTitle"
        class="title-input"
        @blur="saveTitle"
        @keyup.enter="saveTitle"
        @keyup.escape="cancelEdit"
        @mousedown.stop
      />
      <span
        v-else
        class="title"
        @dblclick.stop="startEditTitle"
      >{{ win.title }}</span>
      <div class="controls">
        <button class="btn min" @mousedown.stop @click="minimize">−</button>
        <button class="btn max" @mousedown.stop @click="toggleMaximize">{{ win.isMaximized ? '❒' : '□' }}</button>
        <button class="btn save" @mousedown.stop @click="saveDocument" title="保存到文档">💾</button>
        <button class="btn switch-to-original" @mousedown.stop @click="switchToOriginal" title="切换到专注模式">↩</button>
        <button class="btn close" @mousedown.stop @click="close">×</button>
      </div>
    </div>
    <div class="content">
      <slot></slot>
    </div>
    
    <template v-if="!win.isMaximized">
      <div class="resize n" @mousedown.stop="startResize('n', $event)"></div>
      <div class="resize s" @mousedown.stop="startResize('s', $event)"></div>
      <div class="resize e" @mousedown.stop="startResize('e', $event)"></div>
      <div class="resize w" @mousedown.stop="startResize('w', $event)"></div>
      <div class="resize ne" @mousedown.stop="startResize('ne', $event)"></div>
      <div class="resize nw" @mousedown.stop="startResize('nw', $event)"></div>
      <div class="resize se" @mousedown.stop="startResize('se', $event)"></div>
      <div class="resize sw" @mousedown.stop="startResize('sw', $event)"></div>
    </template>
  </div>
</template>

<script setup>
import { computed, onUnmounted, ref, nextTick } from 'vue'

const props = defineProps({
  win: { type: Object, required: true },
  sidebarState: { 
    type: Object, 
    default: () => ({ hasSidebar: false, side: null, width: 0 })
  }
})

const emit = defineEmits(['activate', 'close', 'maximize', 'minimize', 'move', 'resize', 'switch-to-original', 'save-document', 'update-title', 'context-menu'])

const isEditingTitle = ref(false)
const localTitle = ref('')
const titleInput = ref(null)

const windowStyle = computed(() => {
  if (props.win.isMaximized) {
    let left = 0
    let width = '100%'
    
    if (props.sidebarState.hasSidebar) {
      if (props.sidebarState.side === 'left') {
        left = props.sidebarState.width + 'px'
        width = `calc(100% - ${props.sidebarState.width}px)`
      } else if (props.sidebarState.side === 'right') {
        width = `calc(100% - ${props.sidebarState.width}px)`
      }
    }
    
    return { 
      left, 
      top: 0, 
      width, 
      height: '100%', 
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

const activateWindow = () => {
  emit('activate', props.win.id)
}

const handleContextMenu = (e) => {
  emit('context-menu', e, props.win.id)
}

let dragging = false
let dragStartX = 0
let dragStartY = 0
let winStartX = 0
let winStartY = 0

const startDrag = (e) => {
  if (props.win.isMaximized) return
  e.preventDefault()
  e.stopPropagation()
  emit('activate', props.win.id)
  
  dragging = true
  dragStartX = e.clientX
  dragStartY = e.clientY
  winStartX = props.win.x
  winStartY = props.win.y
  
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
}

const onDrag = (e) => {
  if (!dragging) return
  e.preventDefault()
  const newX = winStartX + (e.clientX - dragStartX)
  const newY = Math.max(0, winStartY + (e.clientY - dragStartY))
  emit('move', props.win.id, newX, newY)
}

const stopDrag = () => {
  dragging = false
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
}

const minimize = () => emit('minimize', props.win.id)
const toggleMaximize = () => emit('maximize', props.win.id)
const close = () => emit('close', props.win.id)
const switchToOriginal = () => emit('switch-to-original', props.win.id)
const saveDocument = () => emit('save-document', props.win.id)

const startEditTitle = () => {
  isEditingTitle.value = true
  localTitle.value = props.win.title
  nextTick(() => {
    if (titleInput.value) {
      titleInput.value.focus()
      titleInput.value.select()
    }
  })
}

const saveTitle = () => {
  if (localTitle.value.trim()) {
    emit('update-title', props.win.id, localTitle.value.trim())
  }
  isEditingTitle.value = false
}

const cancelEdit = () => {
  isEditingTitle.value = false
}

let resizing = false
let resizeDir = ''
let resizeStartX = 0
let resizeStartY = 0
let resizeStartW = 0
let resizeStartH = 0
let resizeStartLeft = 0
let resizeStartTop = 0

const startResize = (dir, e) => {
  e.preventDefault()
  e.stopPropagation()
  emit('activate', props.win.id)
  
  resizing = true
  resizeDir = dir
  resizeStartX = e.clientX
  resizeStartY = e.clientY
  resizeStartW = props.win.width
  resizeStartH = props.win.height
  resizeStartLeft = props.win.x
  resizeStartTop = props.win.y
  
  document.addEventListener('mousemove', onResize)
  document.addEventListener('mouseup', stopResize)
}

const onResize = (e) => {
  if (!resizing) return
  e.preventDefault()
  const dx = e.clientX - resizeStartX
  const dy = e.clientY - resizeStartY
  
  let w = resizeStartW
  let h = resizeStartH
  let l = resizeStartLeft
  let t = resizeStartTop
  
  if (resizeDir.includes('e')) w = Math.max(400, w + dx)
  if (resizeDir.includes('w')) { w = Math.max(400, w - dx); l = l + dx }
  if (resizeDir.includes('s')) h = Math.max(300, h + dy)
  if (resizeDir.includes('n')) { h = Math.max(300, h - dy); t = Math.max(0, t + dy) }
  
  emit('resize', props.win.id, l, t, w, h)
}

const stopResize = () => {
  resizing = false
  document.removeEventListener('mousemove', onResize)
  document.removeEventListener('mouseup', stopResize)
}

onUnmounted(() => {
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
  document.removeEventListener('mousemove', onResize)
  document.removeEventListener('mouseup', stopResize)
})
</script>

<style scoped>
.window {
  position: absolute;
  background: rgba(255, 255, 255, var(--panel-opacity, 0.85));
  border: 1px solid var(--border, #ddd);
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.2);
  display: flex;
  flex-direction: column;
  min-width: 400px;
  min-height: 300px;
  overflow: hidden;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.window-enter-active,
.window-leave-active {
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.window-enter-from {
  opacity: 0;
  transform: scale(0.7) translateY(20px);
}

.window-leave-to {
  opacity: 0;
  transform: scale(0.8) translateY(-20px);
}

[data-theme="dark"] .window {
  background: rgba(42, 42, 42, var(--panel-opacity, 0.85));
  border-color: #444;
}

.window.active {
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.28), 0 0 0 1px rgba(74, 154, 239, 0.3);
}

.window.maximized {
  border-radius: 0;
  border: none;
}

.window-header {
  height: 36px;
  background: rgba(245, 245, 245, 0.75);
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  padding: 0 12px;
  cursor: move;
  user-select: none;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

[data-theme="dark"] .window-header {
  background: rgba(40, 40, 40, 0.75);
  border-color: rgba(255, 255, 255, 0.08);
}

.window.active .window-header {
  background: rgba(74, 154, 239, 0.85);
  border-bottom-color: rgba(74, 154, 239, 0.4);
}

[data-theme="dark"] .window.active .window-header {
  background: rgba(58, 134, 239, 0.85);
  border-bottom-color: rgba(58, 134, 239, 0.4);
}

.window-header .title {
  flex: 1;
  font-size: 14px;
  color: #333;
  cursor: text;
}

.window.active .window-header .title {
  color: white;
}

.title-input {
  flex: 1;
  font-size: 14px;
  border: none;
  outline: none;
  background: transparent;
  color: inherit;
  padding: 0;
  margin: 0;
  width: 100%;
}

.window.active .title-input {
  color: white;
}

.controls {
  display: flex;
  gap: 6px;
}

.btn {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: none;
  padding: 0;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn:hover { opacity: 0.8; }
.btn.min { background: #ffbd44; }
.btn.max { background: #00ca4e; }
.btn.save { background: #3498db; font-size: 14px; }
.btn.switch-to-original { background: #9b59b6; font-size: 16px; }
.btn.close { background: #ff5f57; }

.content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.resize {
  position: absolute;
  z-index: 10;
}
.resize.n { top:0; left:10px; right:10px; height:8px; cursor:n-resize; }
.resize.s { bottom:0; left:10px; right:10px; height:8px; cursor:s-resize; }
.resize.e { top:10px; right:0; bottom:10px; width:8px; cursor:e-resize; }
.resize.w { top:10px; left:0; bottom:10px; width:8px; cursor:w-resize; }
.resize.ne { top:0; right:0; width:16px; height:16px; cursor:ne-resize; }
.resize.nw { top:0; left:0; width:16px; height:16px; cursor:nw-resize; }
.resize.se { bottom:0; right:0; width:16px; height:16px; cursor:se-resize; }
.resize.sw { bottom:0; left:0; width:16px; height:16px; cursor:sw-resize; }
</style>
