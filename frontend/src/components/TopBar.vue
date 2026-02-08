<template>
  <header class="topbar">
    <button @click="$emit('toggle-left-sidebar')" title="侧边栏">☰</button>
    <div class="title">📝 仓库链接:https://github.com/222twotwotwo/editor.github.io</div>
    <div class="actions">
      <!-- 新增：社区导航按钮 -->
      <button @click="goToCommunity" title="创作社区">💬</button>
      
      <!-- 登录/登出按钮（带图标与文案，与其他按钮一致） -->
      <button @click="handleUserAction" :title="isAuthenticated ? '退出登录' : '去登录'">
        {{ isAuthenticated ? '🚪 登出' : '🔑 登录' }}
      </button>
      
      <!-- 原有按钮保持不变 -->
      <button @click="$emit('toggle-right-sidebar')" title="文件列表">📂</button>
      <button @click="$emit('toggle-sound')">{{ soundIcon }}</button>
      <button @click="$emit('toggle-theme')">{{ themeIcon }}</button>
      <button @click="$emit('export-html')">导出 HTML</button>
      <button @click="$emit('export-md')">导出 MD</button>
      <button @click="$emit('export-pdf')">导出 PDF</button>
    </div>
  </header>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'

const props = defineProps({
  soundEnabled: Boolean,
  theme: {
    type: String,
    default: 'dark'
  }
})

defineEmits([
  'toggle-left-sidebar',
  'toggle-right-sidebar',
  'toggle-sound',
  'toggle-theme',
  'export-html',
  'export-md',
  'export-pdf'
])

const router = useRouter()
const { isAuthenticated, user, logout } = useAuth()

const soundIcon = computed(() => props.soundEnabled ? '🔊' : '🔇')
const themeIcon = computed(() => props.theme === 'dark' ? '☀️' : '🌙')

// 导航到社区页面
const goToCommunity = () => {
  router.push('/community')
}

// 处理用户操作
const handleUserAction = () => {
  if (isAuthenticated.value) {
    // 已登录：可以显示用户菜单或登出
    if (confirm('确定要退出登录吗？')) {
      logout()
    }
  } else {
    // 未登录：跳转到登录页面
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
}

.topbar .actions {
  margin-left: auto;
}

.topbar button {
  margin-left: 6px;
}
</style>