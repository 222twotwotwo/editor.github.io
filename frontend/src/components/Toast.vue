<template>
  <Teleport to="body">
    <div class="toast-container">
      <TransitionGroup name="toast-list">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="toast"
          :class="[toast.type, { leaving: toast.leaving }]"
        >
          <span class="toast-icon">{{ getIcon(toast.type) }}</span>
          <span class="toast-message">{{ toast.message }}</span>
          <button class="toast-close" @click="removeToast(toast.id)">×</button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup>
import { useToast } from '../composables/useToast'
import { onMounted } from 'vue'

const { toasts, removeToast, clearAll } = useToast()

const getIcon = (type) => {
  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  }
  return icons[type] || icons.info
}

onMounted(() => {
  clearAll()
})
</script>

<style scoped>
.toast-container {
  position: fixed;
  top: 70px;
  right: 24px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 12px;
  pointer-events: none;
}

.toast {
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
  min-width: 280px;
  max-width: 400px;
  animation: toastIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}

[data-theme="dark"] .toast {
  background: rgba(31, 41, 55, 0.95);
  border-color: rgba(255, 255, 255, 0.1);
}

.toast.leaving {
  animation: toastOut 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

.toast.success {
  border-left: 4px solid #22c55e;
}

.toast.error {
  border-left: 4px solid #ef4444;
}

.toast.warning {
  border-left: 4px solid #f59e0b;
}

.toast.info {
  border-left: 4px solid #3b82f6;
}

.toast-icon {
  font-size: 18px;
  flex-shrink: 0;
}

.toast-message {
  flex: 1;
  font-size: 14px;
  color: #1f2937;
  line-height: 1.5;
  font-weight: 500;
}

[data-theme="dark"] .toast-message {
  color: #f9fafb;
}

.toast-close {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  border: none;
  background: rgba(0, 0, 0, 0.05);
  color: #6b7280;
  border-radius: 6px;
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}

[data-theme="dark"] .toast-close {
  background: rgba(255, 255, 255, 0.08);
  color: #9ca3af;
}

.toast-close:hover {
  background: rgba(0, 0, 0, 0.1);
  color: #1f2937;
}

[data-theme="dark"] .toast-close:hover {
  background: rgba(255, 255, 255, 0.15);
  color: #f9fafb;
}

@keyframes toastIn {
  from {
    opacity: 0;
    transform: translateX(100%) scale(0.9);
  }
  to {
    opacity: 1;
    transform: translateX(0) scale(1);
  }
}

@keyframes toastOut {
  from {
    opacity: 1;
    transform: translateX(0) scale(1);
  }
  to {
    opacity: 0;
    transform: translateX(100%) scale(0.9);
  }
}

.toast-list-enter-active {
  animation: toastIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.toast-list-leave-active {
  animation: toastOut 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
</style>
