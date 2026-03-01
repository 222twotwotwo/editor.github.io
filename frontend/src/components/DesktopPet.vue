
<template>
  <!-- 桌宠容器（仅控制位置，transform 只作用于内部图片） -->
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
    @contextmenu.prevent="openContextMenu"
  >
    <!-- 桌宠图片（仅图片添加抖动 transform，容器无 transform） -->
    <img 
      :src="petImage" 
      alt="Desktop Pet"
      class="pet-image"
      draggable="false"
      @dragstart.prevent
      :style="{
        transform: petState.running ? `rotate(${petState.r}deg) translateY(${petState.y}px)` : 'none',
        transition: petState.running ? 'transform 0.1s ease' : 'none'
      }"
    />
    
    <!-- 拉伸手柄（右下角） -->
    <div 
      class="resize-handle"
      @mousedown="startResize"
      @touchstart="handleResizeTouchStart"
      @dragstart.prevent
    ></div>
    
    <!-- 拖拽提示 -->
    <div v-if="showHint" class="pet-hint">
      上半区抖动，下半区拖拽，右下角拉伸，右键打开菜单
    </div>
  </div>

  <!-- 右键菜单：移出桌宠容器，避免受 transform 影响，独立定位 -->
  <div 
    v-if="contextMenuVisible"
    ref="contextMenuRef"
    class="pet-context-menu"
    :style="{
      left: `${contextMenuPosition.x}px`,
      top: `${contextMenuPosition.y}px`,
      width: `${menuWidth}px`,
      borderColor: isDarkTheme ? '#ffffff' : '#000000',
      backgroundColor: isDarkTheme ? '#000000' : '#ffffff',
      color: isDarkTheme ? '#ffffff' : '#000000'
    }"
    @mousedown.stop
  >
    <!-- 1. 切换主题模式 -->
    <div 
      class="menu-item"
      @click="handleToggleTheme"
      :style="{ borderBottomColor: isDarkTheme ? '#ffffff33' : '#00000033' }"
      @mouseenter="hoveredItem = 'theme'"
      @mouseleave="hoveredItem = ''"
    >
      <span :style="{ 
        backgroundColor: hoveredItem === 'theme' ? '#888888' : 'transparent',
        fontSize: menuFontSize
      }">
        {{ isDarkTheme ? '切换为亮色模式' : '切换为暗色模式' }}
      </span>
    </div>

    <!-- 2. 页面导航（排除当前页面，显示其余可跳转页面） -->
    <div
      v-for="nav in navItems"
      :key="nav.path"
      class="menu-item"
      @click="router.push(nav.path)"
      :style="{ borderBottomColor: isDarkTheme ? '#ffffff33' : '#00000033' }"
      @mouseenter="hoveredItem = nav.path"
      @mouseleave="hoveredItem = ''"
    >
      <span :style="{
        backgroundColor: hoveredItem === nav.path ? '#888888' : 'transparent',
        fontSize: menuFontSize
      }">
        {{ nav.label }}
      </span>
    </div>

    <!-- 4. 开启/关闭所有音效 -->
    <div 
      class="menu-item"
      @click="handleToggleSound"
      :style="{ borderBottomColor: isDarkTheme ? '#ffffff33' : '#00000033' }"
      @mouseenter="hoveredItem = 'audioSwitch'"
      @mouseleave="hoveredItem = ''"
    >
      <span :style="{ 
        backgroundColor: hoveredItem === 'audioSwitch' ? '#888888' : 'transparent',
        fontSize: menuFontSize
      }">
        {{ soundEnabled ? '关闭所有音效' : '开启所有音效' }}
      </span>
    </div>

    <!-- 5. 调节音效音量（滑动条） -->
    <div
      class="menu-item menu-item--volume"
      :style="{ borderBottomColor: isDarkTheme ? '#ffffff33' : '#00000033' }"
      @mousedown.stop
    >
      <div class="volume-label" :style="{ fontSize: menuFontSize, color: isDarkTheme ? '#ffffff' : '#000000' }">
        <span>音量</span>
        <span>{{ Math.round(audioVolume * 100) }}%</span>
      </div>
      <input
        type="range"
        min="0"
        max="100"
        :value="Math.round(audioVolume * 100)"
        @input="onVolumeChange"
        class="volume-slider"
        :style="{ '--track-color': isDarkTheme ? '#ffffff' : '#000000' }"
      />
    </div>

    <!-- 6. 退出登录/前往登录 -->
    <div 
      class="menu-item"
      @click="handleAuthAction"
      :style="{ color: isDarkTheme ? '#ffffff' : '#000000' }"
      @mouseenter="hoveredItem = 'auth'"
      @mouseleave="hoveredItem = ''"
    >
      <span :style="{ 
        backgroundColor: hoveredItem === 'auth' ? '#888888' : 'transparent',
        fontSize: menuFontSize
      }">
        {{ isAuthenticated ? '退出登录' : '前往登录' }}
      </span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDesktopPet } from '../composables/useDesktopPet'
import { useAudio } from '../composables/useAudio'
import { useAiContinuationSettings } from '../composables/useAiContinuationSettings'
import { useTheme } from '../composables/useTheme'
import { useAuth } from '../composables/useAuth'

const route = useRoute()
const router = useRouter()

// 核心物理引擎
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

// 图片路径：AI 加载中显示 petthinking.png，否则显示 pet.png
const { aiApiLoading } = useAiContinuationSettings()
const petImage = computed(() =>
  aiApiLoading.value ? './audio/petthinking.png' : './audio/pet.png'
)

// 提示显示
const showHint = ref(true)

// 音频
const { soundEnabled, toggleSound, setVolume, playPetSound } = useAudio()
const playPetAudio = () => {
  try {
    playPetSound()
  } catch (e) {
    console.log('宠物音频播放失败:', e)
  }
}

// 主题
const { theme: themeState, toggleTheme: handleToggleTheme } = useTheme()
const isDarkTheme = computed(() => themeState.value === 'dark')

// 所有可导航页面定义
const ALL_NAV = [
  { path: '/windowed', label: '前往桌面页面' },
  { path: '/editor',   label: '前往编辑页面' },
  { path: '/community', label: '前往社区页面' }
]

// 排除当前所在页面后的导航列表
const navItems = computed(() =>
  ALL_NAV.filter(nav => !route.path.startsWith(nav.path))
)

// 鉴权
const { isAuthenticated, logout } = useAuth()
const handleAuthAction = () => {
  if (isAuthenticated.value) {
    logout()
  }
  router.push('/login')
}

// 音量（本地状态，同步到 useAudio 内部实例）
const audioVolume = ref(0.5)

const handleToggleSound = () => {
  toggleSound()
}

const onVolumeChange = (e) => {
  const volume = Number(e.target.value) / 100
  audioVolume.value = volume
  setVolume(volume)
}

// DOM 引用
const petContainer = ref(null)
const contextMenuRef = ref(null)

// 右键菜单状态
const contextMenuVisible = ref(false)
const contextMenuPosition = ref({ x: 0, y: 0 })
const hoveredItem = ref('')

// 菜单尺寸（随桌宠大小动态缩放）
const menuWidth = computed(() => petSize.value.width * 1.5)
const menuFontSize = computed(() => {
  const size = petSize.value.width * 0.08
  return `${Math.max(10, Math.min(18, size))}px`
})

// 打开右键菜单（优先显示在桌宠右侧，空间不足则显示左侧）
const openContextMenu = () => {
  if (!petContainer.value) return

  const offsetDistance = 10
  const petRect = petContainer.value.getBoundingClientRect()
  const menuHeight = 200

  const menuY = petRect.top + petRect.height / 2 - menuHeight / 2
  const safeMenuY = Math.max(10, Math.min(menuY, window.innerHeight - menuHeight - 10))

  const rightSpace = window.innerWidth - (petRect.left + petRect.width)
  let menuX
  if (rightSpace >= menuWidth.value + offsetDistance) {
    menuX = petRect.left + petRect.width + offsetDistance
  } else {
    menuX = Math.max(10, petRect.left - menuWidth.value - offsetDistance)
  }

  contextMenuPosition.value = { x: menuX, y: safeMenuY }
  contextMenuVisible.value = true

  nextTick(() => {
    const closeMenu = (event) => {
      if (
        !petContainer.value?.contains(event.target) &&
        !contextMenuRef.value?.contains(event.target)
      ) {
        contextMenuVisible.value = false
        document.removeEventListener('click', closeMenu)
      }
    }
    document.addEventListener('click', closeMenu)
  })
}

// 鼠标按下（过滤右键，右键交给 contextmenu 事件处理）
const handleMouseDown = (e) => {
  if (e.button === 2) return
  if (!petContainer.value) return

  const rect = petContainer.value.getBoundingClientRect()
  const isBottom = isBottomHalf(e, rect)
  const isInResizeArea = isInResizeHandle(e, rect)

  if (isInResizeArea) {
    startResize(e)
  } else if (isBottom) {
    startDrag(e, petContainer.value)
  } else {
    startTopHalfInteraction(e, petContainer.value, playPetAudio)
  }
  contextMenuVisible.value = false
}

// 触摸开始
const handleTouchStart = (e) => {
  if (!petContainer.value || !e.touches[0]) return

  const rect = petContainer.value.getBoundingClientRect()
  const isBottom = isBottomHalf(e, rect)
  const isInResizeArea = isInResizeHandle(e, rect, true)

  if (isInResizeArea) {
    handleResizeTouchStart(e)
  } else {
    handlePetTouchStart(e, petContainer.value, isBottom, playPetAudio)
  }
  contextMenuVisible.value = false
}

// 拉伸触摸开始
const handleResizeTouchStart = (e) => {
  e.preventDefault()
  e.stopPropagation()
  if (!e.touches[0]) return
  startResize({
    clientX: e.touches[0].clientX,
    clientY: e.touches[0].clientY,
    preventDefault: () => e.preventDefault(),
    stopPropagation: () => e.stopPropagation()
  })
}

// 检查是否在右下角拉伸区域
const isInResizeHandle = (e, rect, isTouch = false) => {
  const clientX = isTouch ? e.touches[0].clientX : e.clientX
  const clientY = isTouch ? e.touches[0].clientY : e.clientY
  const handleSize = 30
  return (
    clientX >= rect.right - handleSize &&
    clientX <= rect.right &&
    clientY >= rect.bottom - handleSize &&
    clientY <= rect.bottom
  )
}

onMounted(() => {
  setTimeout(() => { showHint.value = false }, 5000)
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

onUnmounted(() => {
  stopDrag()
  stopResize()
  stopRun()
  contextMenuVisible.value = false
})
</script>

<style scoped>
/* 桌宠容器：无 transform，仅控制位置 */
.desktop-pet {
  position: fixed;
  user-select: none;
  overflow: visible;
  pointer-events: auto;
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  outline: none !important;
  padding: 0 !important;
  margin: 0 !important;
}

.desktop-pet:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
}

/* 桌宠图片：仅图片添加抖动 transform */
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

/* 右键菜单：强制取消变形，独立于桌宠容器之外 */
.pet-context-menu {
  position: fixed;
  border: 1px solid;
  border-radius: 4px;
  z-index: 10002;
  padding: 0;
  margin: 0;
  list-style: none;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  transform: none !important;
  transition: none !important;
}

.menu-item {
  width: 100%;
  border-bottom: 1px solid;
  box-sizing: border-box;
}

.menu-item:last-child {
  border-bottom: none;
}

.menu-item span {
  display: block;
  width: 100%;
  padding: 8px 12px;
  text-align: center;
  cursor: pointer;
  transition: background-color 0.1s ease;
  box-sizing: border-box;
  white-space: nowrap;
}

/* 音量滑动条菜单项 */
.menu-item--volume {
  padding: 8px 12px;
  box-sizing: border-box;
  cursor: default;
}

.volume-label {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
  user-select: none;
}

.volume-slider {
  width: 100%;
  height: 4px;
  -webkit-appearance: none;
  appearance: none;
  background: transparent;
  outline: none;
  cursor: pointer;
  padding: 0;
  margin: 0;
  display: block;
}

.volume-slider::-webkit-slider-runnable-track {
  height: 4px;
  border-radius: 2px;
  background: color-mix(in srgb, var(--track-color) 30%, transparent);
}

.volume-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--track-color);
  margin-top: -5px;
  cursor: pointer;
  transition: transform 0.1s ease;
}

.volume-slider::-webkit-slider-thumb:hover {
  transform: scale(1.2);
}

.volume-slider::-moz-range-track {
  height: 4px;
  border-radius: 2px;
  background: color-mix(in srgb, var(--track-color) 30%, transparent);
}

.volume-slider::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: none;
  background: var(--track-color);
  cursor: pointer;
}
</style>
