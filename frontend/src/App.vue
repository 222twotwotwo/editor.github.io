<template>
  <div>
    <router-view />
    <!-- 保留原有桌宠组件 -->
    <DesktopPet />
    <!-- 新增AnotherDeskPet组件 -->
    <AnotherDeskPet />
  </div>
</template>

<script setup>
import { useAuth } from '@/composables/useAuth'
import { onMounted } from 'vue'
// 保留原有组件导入
import DesktopPet from './components/DesktopPet.vue'
// 新增AnotherDeskPet组件导入
import AnotherDeskPet from './components/AnotherDeskPet.vue'

// 初始化时检查认证状态（原有逻辑保持不变）
const { fetchProfile } = useAuth()

onMounted(() => {
  const token = localStorage.getItem('token')
  if (token) {
    fetchProfile()
  }
})
</script>

<style>
/* 全局样式 - 与 alone 一致 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}
</style>