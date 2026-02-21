<template>
  <div
    class="desktop-icon"
    :style="iconStyle"
    @mousedown="startDrag"
    @click="handleClick"
  >
    <div class="icon-wrapper">{{ icon }}</div>
    <div class="icon-label">{{ label }}</div>
  </div>
</template>

<script setup>
import { ref, onUnmounted, computed } from 'vue'

const props = defineProps({
  icon: { type: String, default: '📄' },
  label: { type: String, default: '' },
  initialX: { type: Number, default: 0 },
  initialY: { type: Number, default: 0 }
})

const emit = defineEmits(['click', 'move'])

const x = ref(props.initialX)
const y = ref(props.initialY)
const isDragging = ref(false)
let dragStartX = 0
let dragStartY = 0
let iconStartX = 0
let iconStartY = 0

const iconStyle = computed(() => ({
  left: `${x.value}px`,
  top: `${y.value}px`
}))

const handleClick = (e) => {
  if (!isDragging.value) {
    emit('click')
  }
}

const startDrag = (e) => {
  isDragging.value = false
  dragStartX = e.clientX
  dragStartY = e.clientY
  iconStartX = x.value
  iconStartY = y.value

  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
}

const onDrag = (e) => {
  const dx = e.clientX - dragStartX
  const dy = e.clientY - dragStartY

  if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
    isDragging.value = true
  }

  if (isDragging.value) {
    x.value = Math.max(0, iconStartX + dx)
    y.value = Math.max(0, iconStartY + dy)
    emit('move', x.value, y.value)
  }
}

const stopDrag = () => {
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
  setTimeout(() => {
    isDragging.value = false
  }, 0)
}

onUnmounted(() => {
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
})
</script>

<style scoped>
.desktop-icon {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 90px;
  padding: 8px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s ease, transform 0.15s ease;
  user-select: none;
  z-index: 10;
}

.desktop-icon:hover {
  background: rgba(255, 255, 255, 0.25);
  backdrop-filter: blur(4px);
}

.desktop-icon:active {
  background: rgba(255, 255, 255, 0.35);
  transform: scale(0.98);
}

.icon-wrapper {
  font-size: 48px;
  line-height: 1;
  margin-bottom: 6px;
  pointer-events: none;
}

.icon-label {
  font-size: 13px;
  color: white;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.7);
  text-align: center;
  word-wrap: break-word;
  max-width: 100%;
  pointer-events: none;
}
</style>
