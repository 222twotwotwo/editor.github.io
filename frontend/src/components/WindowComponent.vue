<template>
  <div
    v-if="!win.isMinimized"
    class="window"
    :class="{ active: win.isActive, maximized: win.isMaximized, unsaved: isUnsaved }"
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
      >
        <span v-if="isUnsaved" class="unsaved-indicator">• </span>
        {{ win.title }}
        <span v-if="isUnsaved" class="unsaved-star">*</span>
      </span>
      <div class="controls">
        <span v-if="isUnsaved" class="unsaved-dot" title="未保存"></span>
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
  win: { type: Object, required: true }
})

const emit = defineEmits(['activate', 'close', 'maximize', 'minimize', 'move', 'resize', 'switch-to-original', 'save-document', 'update-title', 'context-menu'])

const isEditingTitle = ref(false)
const localTitle = ref('')
const titleInput = ref(null)

const isUnsaved = computed(() => {
  return props.win.content !== props.win.savedContent
})

const windowStyle = computed(() => {
  if (props.win.isMaximized) {
    return { left: 0, top: 0, width: '100%', height: '100%', zIndex: props.win.zIndex }
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
  background: white;
  border: 2px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.15);
  display: flex;
  flex-direction: column;
  min-width: 400px;
  min-height: 300px;
  overflow: hidden;
  transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
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
  background: #2a2a2a;
  border-color: rgba(255, 255, 255, 0.12);
}

.window.active {
  box-shadow: 0 12px 40px rgba(0,0,0,0.25);
  border-color: #3b82f6;
}

[data-theme="dark"] .window.active {
  border-color: #3b82f6;
}

.window.unsaved {
  border-color: #f59e0b;
}

.window.unsaved.active {
  border-color: #f59e0b;
  box-shadow: 0 12px 40px rgba(245, 158, 11, 0.2);
}

.window.maximized {
  border-radius: 0;
  border: none;
  box-shadow: none;
}

.window-header {
  height: 40px;
  background: linear-gradient(180deg, #fafafa, #f0f0f0);
  border-bottom: 1px solid rgba(0,0,0,0.08);
  display: flex;
  align-items: center;
  padding: 0 14px;
  cursor: move;
  user-select: none;
}

[data-theme="dark"] .window-header {
  background: linear-gradient(180deg, #3a3a3a, #2a2a2a);
  border-color: rgba(255, 255, 255, 0.1);
}

.window.active .window-header {
  background: linear-gradient(180deg, #60a5fa, #3b82f6);
}

[data-theme="dark"] .window.active .window-header {
  background: linear-gradient(180deg, #58a6ff, #2563eb);
}

.window-header .title {
  flex: 1;
  font-size: 14px;
  color: #374151;
  cursor: text;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 4px;
}

.window.active .window-header .title {
  color: white;
}

.unsaved-indicator {
  color: #f59e0b;
  font-weight: bold;
  animation: pulse 1.5s ease-in-out infinite;
}

.unsaved-star {
  color: #f59e0b;
  font-weight: bold;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
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
  font-weight: 500;
}

.window.active .title-input {
  color: white;
}

.controls {
  display: flex;
  gap: 8px;
  align-items: center;
}

.unsaved-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #f59e0b;
  animation: pulse 1.5s ease-in-out infinite;
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
  transition: transform 0.15s, opacity 0.15s;
}

.btn:hover { 
  opacity: 0.85;
  transform: scale(1.05);
}
.btn:active {
  transform: scale(0.95);
}
.btn.min { background: #ffbd44; }
.btn.max { background: #00ca4e; }
.btn.save { background: #3498db; font-size: 13px; }
.btn.switch-to-original { background: #9b59b6; font-size: 15px; }
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