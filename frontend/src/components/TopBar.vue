<template>
  <header class="topbar">
    <button type="button" @click="handleToggleLeft" title="侧边栏">☰</button>
    <div class="title">📝 仓库链接:https://github.com/222twotwotwo/editor.github.io</div>
    
    <!-- 窗口管理器（仅在窗口化模式显示） -->
    <div v-if="isWindowedMode && windows && windows.length > 0" class="window-manager">
      <div
        v-for="win in windows"
        :key="win.id"
        class="window-tab"
        :class="{ active: win.id === activeWindowId, minimized: win.isMinimized }"
        @click="handleWindowTabClick(win)"
      >
        <span class="tab-icon">📄</span>
        <span class="tab-title">{{ win.title }}</span>
        <button
          v-if="!win.isMinimized"
          class="tab-minimize"
          @click.stop="minimizeWindow(win.id)"
          title="最小化"
        >−</button>
        <button
          class="tab-close"
          @click.stop="closeWindow(win.id)"
          title="关闭"
        >×</button>
      </div>
    </div>
    
    <div class="actions">
      <!-- 模式切换按钮 -->
      <button @click="toggleMode" :title="isWindowedMode ? '切换到专注模式' : '切换到桌面模式'">
        {{ isWindowedMode ? '🎯 专注' : '🪟 桌面' }}
      </button>
      
      <!-- 社区导航按钮 -->
      <button @click="goToCommunity" title="创作社区">💬</button>
      
      <!-- 登录/登出按钮 -->
      <button @click="handleUserAction" :title="isAuthenticated ? '退出登录' : '去登录'">
        {{ isAuthenticated ? '🚪 登出' : '🔑 登录' }}
      </button>
      
      <!-- 仅在非窗口化模式显示以下按钮 -->
      <template v-if="!isWindowedMode">
        <button type="button" @click="toggleRightSidebar" title="文件列表">📂</button>
        <button @click="$emit('toggle-sound')">{{ soundIcon }}</button>
        <button @click="$emit('toggle-theme')">{{ themeIcon }}</button>
        <button @click="$emit('export-html')">导出 HTML</button>
        <button @click="$emit('export-md')">导出 MD</button>
        <button @click="$emit('export-pdf')">导出 PDF</button>
      </template>
    </div>
  </header>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { useSidebar } from '../composables/useSidebar'

const props = defineProps({
  soundEnabled: Boolean,
  theme: {
    type: String,
    default: 'dark'
  },
  onToggleLeftSidebar: { type: Function, default: null },
  windows: { type: Array, default: null },
  activeWindowId: { type: Number, default: null }
})

const emit = defineEmits([
  'toggle-left-sidebar',
  'toggle-sound',
  'toggle-theme',
  'export-html',
  'export-md',
  'export-pdf',
  'focus-window',
  'toggle-window-minimize',
  'close-window'
])

const router = useRouter()
const route = useRoute()
const { isAuthenticated, logout } = useAuth()
const { toggleLeftSidebar: sidebarToggleLeft, toggleRightSidebar } = useSidebar()

const isWindowedMode = computed(() => route.path === '/windowed')

const toggleMode = () => {
  if (isWindowedMode.value) {
    router.push('/editor')
  } else {
    router.push('/windowed')
  }
}

const handleToggleLeft = () => {
  if (typeof props.onToggleLeftSidebar === 'function') {
    props.onToggleLeftSidebar()
  } else {
    sidebarToggleLeft()
  }
}

const handleWindowTabClick = (win) => {
  if (win.isMinimized) {
    emit('toggle-window-minimize', win.id)
  } else {
    emit('focus-window', win.id)
  }
}

const minimizeWindow = (id) => {
  emit('toggle-window-minimize', id)
}

const closeWindow = (id) => {
  emit('close-window', id)
}

const soundIcon = computed(() => props.soundEnabled ? '🔊' : '🔇')
const themeIcon = computed(() => props.theme === 'dark' ? '☀️' : '🌙')

const goToCommunity = () => {
  router.push('/community')
}

const handleUserAction = () => {
  if (isAuthenticated.value) {
    if (confirm('确定要退出登录吗？')) {
      logout()
    }
  } else {
    router.push('/login')
  }
}
</script>

<style scoped>
.topbar {
  height: 52px;
  display: flex;
  align-items: center;
  padding: 0 12px;
  background: rgba(255, 255, 255, var(--topbar-opacity));
  border-bottom: 1px solid var(--border);
  backdrop-filter: blur(8px);
}

[data-theme="dark"] .topbar {
  background: rgba(42, 42, 42, var(--topbar-opacity));
}

.topbar .title {
  margin-left: 10px;
  font-weight: bold;
  white-space: nowrap;
}

.window-manager {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 16px;
  overflow-x: auto;
  padding: 4px 0;
}

.window-manager::-webkit-scrollbar {
  height: 4px;
}

.window-manager::-webkit-scrollbar-track {
  background: transparent;
}

.window-manager::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 2px;
}

.window-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 6px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
  border: 1px solid var(--border);
}

[data-theme="dark"] .window-tab {
  background: rgba(60, 60, 60, 0.5);
}

.window-tab:hover {
  background: rgba(255, 255, 255, 0.7);
  transform: translateY(-1px);
}

[data-theme="dark"] .window-tab:hover {
  background: rgba(80, 80, 80, 0.7);
}

.window-tab.active {
  background: rgba(106, 186, 255, 0.8);
  border-color: #4a9aef;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(106, 186, 255, 0.3);
}

[data-theme="dark"] .window-tab.active {
  background: rgba(88, 166, 255, 0.8);
}

.window-tab.minimized {
  opacity: 0.6;
}

.tab-icon {
  font-size: 14px;
}

.tab-title {
  font-size: 13px;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tab-minimize,
.tab-close {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: none;
  padding: 0;
  cursor: pointer;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  transition: all 0.15s ease;
}

.tab-minimize:hover {
  background: #ffbd44;
  transform: scale(1.1);
}

.tab-close:hover {
  background: #ff5f57;
  transform: scale(1.1);
}

.topbar .actions {
  margin-left: auto;
  display: flex;
  align-items: center;
}

.topbar button {
  margin-left: 6px;
  transition: all 0.15s ease;
}

.topbar button:hover {
  transform: translateY(-1px);
}
</style>
