
<template>
  <div 
    ref="petContainer"
    class="desktop-pet"
    :style="{
      left: `${petPosition.x}px`,
      top: `${petPosition.y}px`,
      width: `${petSize.width}px`,
      height: `${petSize.height}px`,
      cursor: isDragging ? 'grabbing' : 'grab',
      zIndex: 9999
    }"
    @mousedown="handleMouseDown"
    @touchstart="handleTouchStart"
  >
    <!-- 桌宠图片 -->
    <img 
      :src="petImage" 
      alt="Desktop Pet"
      class="pet-image"
      draggable="false"
      @dragstart.prevent
    />
    
    <!-- 拉伸手柄（右下角） -->
    <div 
      class="resize-handle"
      @mousedown="startResize"
      @touchstart="handleResizeTouchStart"
      @dragstart.prevent
    ></div>
    
    <!-- 拖拽提示（可选） -->
    <div v-if="showHint" class="pet-hint">
      上半区抖动，下半区拖拽，右下角拉伸
    </div>

    <!-- 上下半区指示（调试用，可移除） -->
    <!-- <div class="half-indicator top"></div>
    <div class="half-indicator bottom"></div> -->
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useDesktopPet } from '../composables/useDesktopPet'
import { useAudio } from '../composables/useAudio'
import { useAiContinuationSettings } from '../composables/useAiContinuationSettings'

// 导入组合式函数
const {
  petPosition,
  petSize,
  isDragging,
  isResizing,
  petState,
  startDrag,
  startResize,
  startTopHalfInteraction,
  handleTouchStart: handlePetTouchStart,
  stopDrag,
  stopResize,
  stopRun,
  isBottomHalf
} = useDesktopPet()

// 图片路径：调用 AI 续写 API 未返回时显示 petthinking.png，否则显示 pet.png
const { aiApiLoading } = useAiContinuationSettings()
const petImage = computed(() =>
  aiApiLoading.value ? './audio/petthinking.png' : './audio/pet.png'
)

// 提示显示
const showHint = ref(true)

// 音频相关
const { playSound } = useAudio()
const playPetAudio = () => {
  try {
    playSound('./audio/pet.mp3')
  } catch (e) {
    console.log('宠物音频播放失败，可能文件不存在')
  }
}

// DOM 引用
const petContainer = ref(null)

// 鼠标按下事件处理
const handleMouseDown = (e) => {
  if (!petContainer.value) return
  
  const rect = petContainer.value.getBoundingClientRect()
  const isBottom = isBottomHalf(e, rect)
  
  // 检查是否在拉伸区域
  const isInResizeArea = isInResizeHandle(e, rect)
  
  if (isInResizeArea) {
    startResize(e)
  } else if (isBottom) {
    // 下半区：拖拽移动
    startDrag(e, petContainer.value)
  } else {
    // 上半区：抖动交互
    startTopHalfInteraction(e, petContainer.value, playPetAudio)
  }
}

// 触摸开始事件处理
const handleTouchStart = (e) => {
  if (!petContainer.value || !e.touches[0]) return
  
  const rect = petContainer.value.getBoundingClientRect()
  const isBottom = isBottomHalf(e, rect)
  
  // 检查是否在拉伸区域
  const isInResizeArea = isInResizeHandle(e, rect, true)
  
  if (isInResizeArea) {
    handleResizeTouchStart(e)
  } else {
    handlePetTouchStart(e, petContainer.value, isBottom, playPetAudio)
  }
}

// 拉伸触摸开始
const handleResizeTouchStart = (e) => {
  e.preventDefault()
  e.stopPropagation()
  
  if (!e.touches[0]) return
  
  // 模拟鼠标事件
  const fakeEvent = {
    clientX: e.touches[0].clientX,
    clientY: e.touches[0].clientY,
    preventDefault: () => e.preventDefault(),
    stopPropagation: () => e.stopPropagation()
  }
  
  startResize(fakeEvent)
}

// 检查是否在拉伸区域
const isInResizeHandle = (e, rect, isTouch = false) => {
  const clientX = isTouch ? e.touches[0].clientX : e.clientX
  const clientY = isTouch ? e.touches[0].clientY : e.clientY
  
  const handleSize = 30
  const handleRight = rect.right
  const handleBottom = rect.bottom
  const handleLeft = handleRight - handleSize
  const handleTop = handleBottom - handleSize
  
  return (
    clientX >= handleLeft &&
    clientX <= handleRight &&
    clientY >= handleTop &&
    clientY <= handleBottom
  )
}

// 显示提示一段时间后自动隐藏
onMounted(() => {
  setTimeout(() => {
    showHint.value = false
  }, 5000)
  
  // 初始轻微抖动
  nextTick(() => {
    if (petContainer.value) {
      setTimeout(() => {
        petState.value.r = 5
        petState.value.y = 3
        petState.value.running = true
      }, 1500)
    }
  })
})

// 处理组件卸载
onUnmounted(() => {
  stopDrag()
  stopResize()
  stopRun()
})
</script>

<style scoped>
.desktop-pet {
  position: fixed;
  user-select: none;
  transition: transform 0.1s ease;
  overflow: visible;
  pointer-events: auto;
  /* 去除所有边框和背景色 */
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  outline: none !important;
  /* 确保没有内边距和边距 */
  padding: 0 !important;
  margin: 0 !important;
}

.desktop-pet:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
}

.pet-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  pointer-events: none;
  background: transparent;
}

.resize-handle {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 30px;
  height: 30px;
  cursor: nwse-resize;
  background: rgba(0, 0, 0, 0.2);
  border-top-left-radius: 50%;
  transition: background 0.2s;
  z-index: 10000;
}

.resize-handle:hover {
  background: rgba(0, 0, 0, 0.4);
}

.pet-hint {
  position: absolute;
  top: -35px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.85);
  color: white;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  white-space: nowrap;
  animation: fadeInOut 5s ease-in-out;
  z-index: 10001;
  pointer-events: none;
  font-weight: 500;
}

@keyframes fadeInOut {
  0% { opacity: 0; }
  15% { opacity: 1; }
  85% { opacity: 1; }
  100% { opacity: 0; }
}

/* 上下半区指示器（调试用） */
.half-indicator {
  position: absolute;
  left: 0;
  width: 100%;
  height: 50%;
  opacity: 0.1;
  pointer-events: none;
}

.half-indicator.top {
  top: 0;
  background-color: #ff6b6b;
}

.half-indicator.bottom {
  bottom: 0;
  background-color: #4ecdc4;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .desktop-pet {
    width: 120px !important;
    height: 120px !important;
  }
  
  .pet-hint {
    font-size: 10px;
    top: -30px;
    padding: 4px 8px;
  }
}
</style>
