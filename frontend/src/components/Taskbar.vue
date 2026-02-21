<template>
  <div class="taskbar">
    <div class="taskbar-start">
      <button class="start-btn" @click="$emit('show-start-menu')">
        <span class="start-icon">🍎</span>
      </button>
    </div>
    
    <div class="taskbar-items">
      <div
        v-for="win in windows"
        :key="win.id"
        class="taskbar-item"
        :class="{ active: win.isActive, minimized: win.isMinimized, unsaved: win.content !== win.savedContent }"
        @click="handleItemClick(win)"
        @contextmenu.prevent="handleItemContextMenu($event, win)"
      >
        <span class="item-icon">📝</span>
        <span class="item-title">
          <span v-if="win.content !== win.savedContent" class="unsaved-dot">•</span>
          {{ win.title }}
        </span>
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
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

defineProps({
  windows: {
    type: Array,
    default: () => []
  }
})

defineEmits(['activate-window', 'show-start-menu', 'item-context-menu'])

const currentTime = ref('')
const currentTimeFull = ref('')
let timer = null

const updateTime = () => {
  const now = new Date()
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  currentTime.value = `${hours}:${minutes}`
  
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  currentTimeFull.value = `${now.getFullYear()}-${month}-${day} ${hours}:${minutes}:${String(now.getSeconds()).padStart(2, '0')}`
}

const handleItemClick = (win) => {
  if (win.isMinimized) {
    emit('activate-window', win.id)
  } else if (win.isActive) {
    emit('activate-window', win.id)
  } else {
    emit('activate-window', win.id)
  }
}

const handleItemContextMenu = (e, win) => {
  emit('item-context-menu', e, win)
}

onMounted(() => {
  updateTime()
  timer = setInterval(updateTime, 1000)
})

onUnmounted(() => {
  if (timer) {
    clearInterval(timer)
  }
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
</style>
