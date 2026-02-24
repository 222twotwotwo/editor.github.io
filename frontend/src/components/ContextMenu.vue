<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="context-menu-overlay"
      @click="handleOverlayClick"
      @contextmenu.prevent="handleOverlayClick"
    >
      <div
        ref="menuRef"
        class="context-menu"
        :style="menuStyle"
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
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  visible: Boolean,
  position: Object,
  items: Array
})

const emit = defineEmits(['close', 'select'])

const menuRef = ref(null)

const menuStyle = computed(() => {
  let x = props.position?.x || 0
  let y = props.position?.y || 0
  
  if (menuRef.value) {
    const menuWidth = menuRef.value.offsetWidth
    const menuHeight = menuRef.value.offsetHeight
    const windowWidth = window.innerWidth
    const windowHeight = window.innerHeight
    
    if (x + menuWidth > windowWidth) {
      x = windowWidth - menuWidth - 8
    }
    
    if (y + menuHeight > windowHeight) {
      y = windowHeight - menuHeight - 8
    }
  }
  
  return {
    left: `${Math.max(4, x)}px`,
    top: `${Math.max(4, y)}px`
  }
})

watch(() => props.visible, (val) => {
  if (val) {
    nextTick(() => {})
  }
})

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
  min-width: 200px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  padding: 6px;
  z-index: 10000;
  border: 1px solid var(--border);
}

[data-theme="dark"] .context-menu {
  background: #2a2a2a;
  border-color: #444;
}

.context-menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.15s;
  font-size: 13px;
}

.context-menu-item:hover:not(.disabled):not(.divider) {
  background: rgba(0, 0, 0, 0.08);
}

[data-theme="dark"] .context-menu-item:hover:not(.disabled):not(.divider) {
  background: rgba(255, 255, 255, 0.1);
}

.context-menu-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.context-menu-item.divider {
  height: 1px;
  background: var(--border);
  margin: 4px 0;
  padding: 0;
}

.item-icon {
  width: 18px;
  text-align: center;
  font-size: 14px;
}

.item-label {
  flex: 1;
}

.item-shortcut {
  font-size: 11px;
  opacity: 0.6;
}
</style>
