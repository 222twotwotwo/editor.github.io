<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="context-menu-overlay"
      @click="handleOverlayClick"
      @contextmenu.prevent="handleOverlayClick"
    >
      <div
        class="context-menu"
        :style="{ left: `${position.x}px`, top: `${position.y}px` }"
      >
        <div
          v-for="(item, index) in items"
          :key="index"
          class="context-menu-item"
          :class="{ disabled: item.disabled, divider: item.divider }"
          @click="handleItemClick(item)"
        >
          <span class="item-icon">{{ item.icon }}</span>
          <span class="item-label">{{ item.label }}</span>
          <span v-if="item.shortcut" class="item-shortcut">{{ item.shortcut }}</span>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  visible: Boolean,
  position: Object,
  items: Array
})

const emit = defineEmits(['close', 'select'])

const handleItemClick = (item) => {
  if (!item.disabled && !item.divider) {
    emit('select', item)
    emit('close')
  }
}

const handleOverlayClick = () => {
  emit('close')
}

const handleKeyDown = (e) => {
  if (e.key === 'Escape') {
    emit('close')
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown)
})
</script>

<style scoped>
.context-menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
}

.context-menu {
  position: fixed;
  min-width: 220px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25), 0 8px 24px rgba(0, 0, 0, 0.15);
  padding: 8px;
  z-index: 10000;
  border: 1px solid rgba(0, 0, 0, 0.08);
  backdrop-filter: blur(20px);
  animation: menuFadeIn 0.15s ease-out;
}

[data-theme="dark"] .context-menu {
  background: rgba(42, 42, 42, 0.95);
  border-color: rgba(255, 255, 255, 0.1);
}

@keyframes menuFadeIn {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(-5px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.context-menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
  font-size: 14px;
  line-height: 1.4;
}

.context-menu-item:hover:not(.disabled):not(.divider) {
  background: rgba(59, 130, 246, 0.1);
  transform: translateX(2px);
}

[data-theme="dark"] .context-menu-item:hover:not(.disabled):not(.divider) {
  background: rgba(59, 130, 246, 0.2);
}

.context-menu-item.disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.context-menu-item.divider {
  height: 1px;
  background: var(--border);
  margin: 6px 4px;
  padding: 0;
}

.item-icon {
  width: 22px;
  text-align: center;
  font-size: 16px;
}

.item-label {
  flex: 1;
  font-weight: 500;
}

.item-shortcut {
  font-size: 12px;
  opacity: 0.5;
  font-family: 'Consolas', 'Monaco', monospace;
  padding: 2px 8px;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 4px;
}

[data-theme="dark"] .item-shortcut {
  background: rgba(255, 255, 255, 0.08);
}
</style>
