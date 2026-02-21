<template>
  <div>
    <router-view />
    <DesktopPet />
    <Toast />
  </div>
</template>

<script setup>
import { useAuth } from '@/composables/useAuth'
import { onMounted } from 'vue'
import DesktopPet from './components/DesktopPet.vue'
import Toast from './components/Toast.vue'

// 初始化时检查认证状态
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