<template>
  <header class="topbar" :class="{ 'topbar-simple': isWindowedMode }">
    <!-- 桌面模式：社区风格简洁顶部栏 -->
    <template v-if="isWindowedMode">
      <div class="logo">
        <span class="logo-icon">🪟</span>
        <span>桌面模式</span>
      </div>
      <div class="nav-btns">
        <button class="btn" @click="goToEditor" title="返回编辑器">
          <span class="nav-icon">🎯</span>
          <span>专注</span>
        </button>
        <button class="btn" @click="goToCommunity" title="创作社区">
          <span class="nav-icon">💬</span>
          <span>社区</span>
        </button>
        <button
          class="btn login-btn"
          @click="handleUserAction"
          :title="isAuthenticated ? '退出登录' : '去登录'"
        >
          <span class="nav-icon">{{ isAuthenticated ? '🚪' : '👤' }}</span>
          <span>{{ isAuthenticated ? '登出' : '登录' }}</span>
        </button>
        <button class="btn theme-btn" @click="$emit('toggle-theme')" :title="theme === 'dark' ? '切换浅色' : '切换深色'">
          <span class="nav-icon">{{ themeIcon }}</span>
        </button>
      </div>
    </template>

    <!-- 编辑器模式：完整功能顶部栏 -->
    <template v-else>
      <button type="button" @click="handleToggleLeft" title="侧边栏">☰</button>
      <div class="title">📝 Markdown 编辑器</div>
      <div class="actions">
        <button @click="goToWindowed" title="桌面模式">🪟 桌面</button>
        <button @click="goToCommunity" title="创作社区">💬 社区</button>
        <button @click="handleUserAction" :title="isAuthenticated ? '退出登录' : '去登录'">
          {{ isAuthenticated ? '🚪 登出' : '🔑 登录' }}
        </button>
        <button type="button" @click="toggleRightSidebar" title="文件列表">📂</button>
        <button @click="$emit('toggle-sound')">{{ soundIcon }}</button>
        <button @click="$emit('toggle-theme')">{{ themeIcon }}</button>
        <button @click="$emit('export-html')">导出 HTML</button>
        <button @click="$emit('export-md')">导出 MD</button>
        <button @click="$emit('export-pdf')">导出 PDF</button>
      </div>
    </template>
  </header>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { useSidebar } from '../composables/useSidebar'

const props = defineProps({
  soundEnabled: { type: Boolean, default: false },
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
  'go-to-editor',
  'go-to-windowed'
])

const router = useRouter()
const route = useRoute()
const { isAuthenticated, logout } = useAuth()
const { toggleLeftSidebar: sidebarToggleLeft, toggleRightSidebar } = useSidebar()

const isWindowedMode = computed(() => route.path === '/windowed')

const goToEditor = () => {
  emit('go-to-editor')
}

const goToWindowed = () => {
  emit('go-to-windowed')
}

const handleToggleLeft = () => {
  if (typeof props.onToggleLeftSidebar === 'function') {
    props.onToggleLeftSidebar()
  } else {
    sidebarToggleLeft()
  }
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
  display: flex;
  align-items: center;
  gap: 8px;
}

.unsaved-indicator {
  font-size: 12px;
  color: #f59e0b;
  font-weight: 500;
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

/* 桌面模式：适配项目主题的简洁顶部栏 */
.topbar-simple {
  justify-content: space-between;
}

.topbar-simple .logo {
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--text);
  display: flex;
  align-items: center;
  gap: 8px;
}

.topbar-simple .logo-icon {
  font-size: 1.5rem;
}

.topbar-simple .nav-btns {
  display: flex;
  gap: 10px;
}

.topbar-simple .btn {
  padding: 6px 12px;
  border: 1px solid var(--border);
  background-color: transparent;
  color: var(--text);
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s ease;
  margin-left: 0;
  outline: none;
}

.topbar-simple .btn:hover {
  background-color: var(--border);
  color: var(--text);
}

.topbar-simple .login-btn {
  background-color: var(--text);
  color: var(--bg);
  border: 1px solid var(--text);
}

.topbar-simple .login-btn:hover {
  opacity: 0.85;
  color: var(--bg);
}

.topbar-simple .theme-btn {
  background-color: transparent;
  color: var(--text);
  border: 1px solid var(--border);
}

.topbar-simple .theme-btn:hover {
  background-color: var(--border);
  color: var(--text);
}
</style>
