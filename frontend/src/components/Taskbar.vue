<template>
  <div class="taskbar">
    <div class="taskbar-start">
      <button class="start-btn" @click="$emit('show-start-menu')">
        <span class="start-icon">🍎</span>
      </button>
    </div>
    
    <div class="taskbar-items">
      <div
        v-for="(group, groupIndex) in displayGroups"
        :key="group.id || groupIndex"
        class="taskbar-group"
      >
        <div
          v-if="displayGroups.length > 1"
          class="group-divider"
          :style="{ borderColor: group.color }"
        ></div>
        <div
          v-for="win in group.windows"
          :key="win.id"
          class="taskbar-item"
          :class="{ active: win.isActive, minimized: win.isMinimized, unsaved: win.content !== win.savedContent }"
          :style="getItemStyle(group.color)"
          @click="handleItemClick(win)"
          @contextmenu.prevent="handleItemContextMenu($event, win)"
          @mouseenter="showPreview(win, $event)"
          @mouseleave="hidePreview"
        >
          <span class="item-icon">📝</span>
          <span class="item-title">
            <span v-if="win.content !== win.savedContent" class="unsaved-dot">•</span>
            {{ win.title }}
          </span>
        </div>
      </div>
    </div>
    
    <div class="taskbar-end">
      <div class="system-tray">
        <span class="tray-item" title="音量">🔊</span>
        <span class="tray-item" title="网络">🌐</span>
        <span class="tray-item" title="设置">⚙️</span>
        <span class="clock" :title="currentTimeFull">{{ currentTime }}</span>
      </div>
    </div>

    <!-- 窗口预览 -->
    <div
      v-if="previewVisible && previewWindow"
      class="window-preview"
      :style="previewStyle"
    >
      <div class="preview-header">
        <span class="preview-title">{{ previewWindow.title }}</span>
        <span v-if="previewWindow.content !== previewWindow.savedContent" class="preview-unsaved">• 未保存</span>
      </div>
      <div class="preview-content">
        <div class="preview-content-inner">{{ previewContent }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

defineProps({
  windows: {
    type: Array,
    default: () => []
  },
  groupedWindows: {
    type: Array,
    default: () => []
  }
})

defineEmits(['activate-window', 'show-start-menu', 'item-context-menu'])

const currentTime = ref('')
const currentTimeFull = ref('')
const previewVisible = ref(false)
const previewWindow = ref(null)
const previewPosition = ref({ x: 0, y: 0 })
let timer = null
let previewTimer = null

const updateTime = () => {
  const now = new Date()
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  currentTime.value = `${hours}:${minutes}`
  
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  currentTimeFull.value = `${now.getFullYear()}-${month}-${day} ${hours}:${minutes}:${String(now.getSeconds()).padStart(2, '0')}`
}

const displayGroups = computed(() => {
  if (props.groupedWindows && props.groupedWindows.length > 0) {
    return props.groupedWindows
  }
  
  const groups = [{ id: 'default', name: '默认组', color: '#3b82f6', windows: [] }]
  
  props.windows.forEach(win => {
    groups[0].windows.push(win)
  })
  
  return groups.filter(g => g.windows.length > 0)
})

const previewContent = computed(() => {
  if (!previewWindow.value) return ''
  const content = previewWindow.value.content || ''
  return content.substring(0, 200) + (content.length > 200 ? '...' : '')
})

const previewStyle = computed(() => ({
  left: `${previewPosition.value.x}px`,
  bottom: '64px'
}))

const getItemStyle = (color) => {
  if (!color) return {}
  return {
    borderLeftColor: color
  }
}

const handleItemClick = (win) => {
  hidePreview()
  if (win.isMinimized) {
    emit('activate-window', win.id)
  } else if (win.isActive) {
    emit('activate-window', win.id)
  } else {
    emit('activate-window', win.id)
  }
}

const handleItemContextMenu = (e, win) => {
  hidePreview()
  emit('item-context-menu', e, win)
}

const showPreview = (win, e) => {
  if (previewTimer) clearTimeout(previewTimer)
  previewTimer = setTimeout(() => {
    previewWindow.value = win
    previewPosition.value = {
      x: e.target.getBoundingClientRect().left
    }
    previewVisible.value = true
  }, 200)
}

const hidePreview = () => {
  if (previewTimer) clearTimeout(previewTimer)
  previewVisible.value = false
}

onMounted(() => {
  updateTime()
  timer = setInterval(updateTime, 1000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
  if (previewTimer) clearTimeout(previewTimer)
})
</script>

<style scoped>
.taskbar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 52px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(20px);
  border-top: 1px solid rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  padding: 0 12px;
  gap: 8px;
  z-index: 9997;
}

[data-theme="dark"] .taskbar {
  background: rgba(31, 41, 55, 0.92);
  border-color: rgba(255, 255, 255, 0.1);
}

.taskbar-start {
  flex-shrink: 0;
}

.start-btn {
  width: 38px;
  height: 38px;
  border: none;
  border-radius: 10px;
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
}

.start-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

.start-btn:active {
  transform: scale(0.98);
}

.start-icon {
  font-size: 18px;
}

.taskbar-items {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 6px;
  overflow-x: auto;
  padding: 4px 0;
}

.taskbar-items::-webkit-scrollbar {
  height: 0;
}

.taskbar-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.04);
  cursor: pointer;
  transition: all 0.15s;
  min-width: 140px;
  max-width: 220px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  border: 1.5px solid transparent;
}

[data-theme="dark"] .taskbar-item {
  background: rgba(255, 255, 255, 0.06);
}

.taskbar-item:hover {
  background: rgba(0, 0, 0, 0.08);
}

[data-theme="dark"] .taskbar-item:hover {
  background: rgba(255, 255, 255, 0.1);
}

.taskbar-item.active {
  background: rgba(59, 130, 246, 0.12);
  border-color: rgba(59, 130, 246, 0.4);
}

.taskbar-item.unsaved {
  border-left: 3px solid #f59e0b;
}

.taskbar-item.minimized {
  opacity: 0.6;
}

.item-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.item-title {
  flex: 1;
  font-size: 13px;
  color: #374151;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  display: flex;
  align-items: center;
  gap: 4px;
}

[data-theme="dark"] .item-title {
  color: #d1d5db;
}

.unsaved-dot {
  color: #f59e0b;
  font-weight: bold;
  font-size: 14px;
}

.taskbar-end {
  flex-shrink: 0;
}

.system-tray {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tray-item {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.15s;
}

.tray-item:hover {
  background: rgba(0, 0, 0, 0.06);
}

[data-theme="dark"] .tray-item:hover {
  background: rgba(255, 255, 255, 0.08);
}

.clock {
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  padding: 6px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;
}

[data-theme="dark"] .clock {
  color: #d1d5db;
}

.clock:hover {
  background: rgba(0, 0, 0, 0.06);
}

[data-theme="dark"] .clock:hover {
  background: rgba(255, 255, 255, 0.08);
}

.taskbar-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.group-divider {
  width: 2px;
  height: 30px;
  border-left: 2px solid;
  opacity: 0.3;
  margin: 0 4px;
}

.window-preview {
  position: fixed;
  width: 280px;
  max-height: 200px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  z-index: 9998;
  overflow: hidden;
  animation: previewFadeIn 0.15s ease;
  border: 1px solid rgba(0, 0, 0, 0.08);
}

[data-theme="dark"] .window-preview {
  background: rgba(31, 41, 55, 0.95);
  border-color: rgba(255, 255, 255, 0.1);
}

@keyframes previewFadeIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  background: rgba(0, 0, 0, 0.02);
}

[data-theme="dark"] .preview-header {
  border-bottom-color: rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.02);
}

.preview-title {
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
}

[data-theme="dark"] .preview-title {
  color: #f9fafb;
}

.preview-unsaved {
  font-size: 12px;
  color: #f59e0b;
  font-weight: 500;
}

.preview-content {
  padding: 14px;
  max-height: 140px;
  overflow: hidden;
}

.preview-content-inner {
  font-size: 12px;
  color: #6b7280;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

[data-theme="dark"] .preview-content-inner {
  color: #9ca3af;
}
</style>
