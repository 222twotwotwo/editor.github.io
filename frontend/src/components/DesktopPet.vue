<template>
  <!-- 桌宠容器（仅控制位置，transform只作用于内部图片） -->
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
    <!-- 桌宠图片（仅图片添加抖动transform，容器无transform） -->
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
    
    <!-- 拖拽提示（可选） -->
    <div v-if="showHint" class="pet-hint">
      上半区抖动，下半区拖拽，右下角拉伸，右键打开菜单
    </div>
  </div>

  <!-- 右键菜单：移出桌宠容器，避免受transform影响，独立定位 -->
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
      :style="{
        borderBottomColor: isDarkTheme ? '#ffffff33' : '#00000033',
        color: isDarkTheme ? '#ffffff' : '#000000'
      }"
      @mouseenter="hoveredItem = 'theme'"
      @mouseleave="hoveredItem = ''"
    >
      <span :style="{ 
        backgroundColor: hoveredItem === 'theme' ? '#888888' : 'transparent',
        fontSize: menuFontSize // 动态字体大小
      }">
        {{ isDarkTheme ? '切换为亮色模式' : '切换为暗色模式' }}
      </span>
    </div>

    <!-- 2. 收起/展开侧边栏 -->
    <div 
      class="menu-item"
      @click="handleToggleSidebar"
      :style="{
        borderBottomColor: isDarkTheme ? '#ffffff33' : '#00000033',
        color: isDarkTheme ? '#ffffff' : '#000000'
      }"
      @mouseenter="hoveredItem = 'sidebar'"
      @mouseleave="hoveredItem = ''"
    >
      <span :style="{ 
        backgroundColor: hoveredItem === 'sidebar' ? '#888888' : 'transparent',
        fontSize: menuFontSize // 动态字体大小
      }">
        {{ isSidebarOpen ? '收起侧边栏' : '展开侧边栏' }}
      </span>
    </div>

    <!-- 3. 切换视图模式 -->
    <div 
      class="menu-item"
      @click="handleToggleViewMode"
      :style="{
        borderBottomColor: isDarkTheme ? '#ffffff33' : '#00000033',
        color: isDarkTheme ? '#ffffff' : '#000000'
      }"
      @mouseenter="hoveredItem = 'view'"
      @mouseleave="hoveredItem = ''"
    >
      <span :style="{ 
        backgroundColor: hoveredItem === 'view' ? '#888888' : 'transparent',
        fontSize: menuFontSize // 动态字体大小
      }">
        {{ isEditorView ? '切换为社区视图' : '切换为编辑器视图' }}
      </span>
    </div>

    <!-- 4. 播放/暂停音效 -->
    <div 
      class="menu-item"
      @click="handleToggleSound"
      :style="{
        borderBottomColor: isDarkTheme ? '#ffffff33' : '#00000033',
        color: isDarkTheme ? '#ffffff' : '#000000'
      }"
      @mouseenter="hoveredItem = 'audioSwitch'"
      @mouseleave="hoveredItem = ''"
    >
      <span :style="{ 
        backgroundColor: hoveredItem === 'audioSwitch' ? '#888888' : 'transparent',
        fontSize: menuFontSize // 动态字体大小
      }">
        {{ soundEnabled ? '关闭所有音效' : '开启所有音效' }}
      </span>
    </div>

    <!-- 5. 调节音效音量 -->
    <div 
      class="menu-item"
      @click="handleAdjustVolume"
      :style="{
        borderBottomColor: isDarkTheme ? '#ffffff33' : '#00000033',
        color: isDarkTheme ? '#ffffff' : '#000000'
      }"
      @mouseenter="hoveredItem = 'volume'"
      @mouseleave="hoveredItem = ''"
    >
      <span :style="{ 
        backgroundColor: hoveredItem === 'volume' ? '#888888' : 'transparent',
        fontSize: menuFontSize // 动态字体大小
      }">
        调节音效音量（当前：{{ audioVolume * 100 }}%）
      </span>
    </div>

    <!-- 6. 静音/取消静音 -->
    <div 
      class="menu-item"
      @click="handleToggleMute"
      :style="{
        borderBottomColor: isDarkTheme ? '#ffffff33' : '#00000033',
        color: isDarkTheme ? '#ffffff' : '#000000'
      }"
      @mouseenter="hoveredItem = 'mute'"
      @mouseleave="hoveredItem = ''"
    >
      <span :style="{ 
        backgroundColor: hoveredItem === 'mute' ? '#888888' : 'transparent',
        fontSize: menuFontSize // 动态字体大小
      }">
        {{ isMuted ? '取消静音' : '静音所有音效' }}
      </span>
    </div>

    <!-- 7. 退出登录/个人中心 -->
    <div 
      class="menu-item"
      @click="handleAuthAction"
      :style="{
        color: isDarkTheme ? '#ffffff' : '#000000'
      }"
      @mouseenter="hoveredItem = 'auth'"
      @mouseleave="hoveredItem = ''"
    >
      <span :style="{ 
        backgroundColor: hoveredItem === 'auth' ? '#888888' : 'transparent',
        fontSize: menuFontSize // 动态字体大小
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
import { useSidebar } from '../composables/useSidebar'
import { useTheme } from '../composables/useTheme'
import { useAuth } from '../composables/useAuth'

// 路由与导航
const route = useRoute()
const router = useRouter()

// 导入核心组合式函数
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

const { aiApiLoading } = useAiContinuationSettings()
const { theme: themeState, toggleTheme: handleToggleTheme } = useTheme()
// 解构侧边栏函数（适配useSidebar.js的真实结构）
const { desktopSidebarCollapsed, toggleDesktopSidebar: handleToggleSidebar } = useSidebar()
// 解构音频函数（适配useAudio.js的真实结构）
const { soundEnabled, toggleSound, playPetSound, playSound, audioUnlocked } = useAudio()
const { isAuthenticated, logout } = useAuth()

// 桌宠图片路径
const petImage = computed(() =>
  aiApiLoading.value ? './audio/petthinking.png' : './audio/pet.png'
)

// 提示显示
const showHint = ref(true)

// 播放宠物音频（适配useAudio.js的playPetSound）
const playPetAudio = () => {
  try {
    playPetSound() // 改用useAudio的playPetSound，而非通用playSound
  } catch (e) {
    console.log('宠物音频播放失败:', e)
  }
}

// DOM 引用
const petContainer = ref(null)
const contextMenuRef = ref(null)

// 右键菜单状态
const contextMenuVisible = ref(false)
const contextMenuPosition = ref({ x: 0, y: 0 })
const hoveredItem = ref('')

// 菜单宽度（桌宠的1.5倍）
const menuWidth = computed(() => petSize.value.width * 1.5)
// 新增：菜单字体大小（桌宠宽度的8%，限制10-18px避免溢出/过小）
const menuFontSize = computed(() => {
  const baseSize = petSize.value.width * 0.08
  return `${Math.max(10, Math.min(18, baseSize))}px`
})

// 主题状态计算
const isDarkTheme = computed(() => themeState.value === 'dark')

// 侧边栏状态计算（适配desktopSidebarCollapsed）
const isSidebarOpen = computed(() => !desktopSidebarCollapsed.value)

// 视图模式状态计算
const isEditorView = computed(() => {
  const currentPath = route.path
  return currentPath.includes('editor') || currentPath.includes('windowed')
})

// 音量与静音状态（全局维护，与音频实例同步）
const audioVolume = ref(0.5) // 默认音量50%（对应useAudio的0.4/0.6基准）
const isMuted = ref(false)   // 静音状态

// 切换视图模式
const handleToggleViewMode = () => {
  if (isEditorView.value) {
    router.push('/community')
  } else {
    router.push('/windowed')
  }
}

// 修复：调节音效音量（适配useAudio的音频实例）
const handleAdjustVolume = () => {
  const newVolume = prompt('请输入音量（0-100）', Math.round(audioVolume.value * 100))
  if (newVolume !== null && !isNaN(newVolume)) {
    const volume = Math.max(0, Math.min(100, Number(newVolume))) / 100
    audioVolume.value = volume
    
    // 同步到全局音频实例（适配useAudio的实例挂载）
    if (audioUnlocked.value && soundEnabled.value) {
      if (window.editAudio) window.editAudio.volume = volume * 0.4 // 保持useAudio的基准比例
      if (window.exportAudio) window.exportAudio.volume = volume * 0.6
      if (window.petAudio) window.petAudio.volume = volume * 0.4
    }
  }
}

// 修复：静音/取消静音（适配useAudio的音频实例）
const handleToggleMute = () => {
  isMuted.value = !isMuted.value
  
  // 仅当音频解锁且音效开启时，同步静音状态
  if (audioUnlocked.value && soundEnabled.value) {
    if (window.editAudio) window.editAudio.muted = isMuted.value
    if (window.exportAudio) window.exportAudio.muted = isMuted.value
    if (window.petAudio) window.petAudio.muted = isMuted.value
  }
}

// 修复：开启/关闭所有音效（适配useAudio的toggleSound）
const handleToggleSound = () => {
  // 调用useAudio的toggleSound更新状态并持久化到localStorage
  toggleSound()
  
  // 同步音频实例状态
  if (audioUnlocked.value) {
    const isSoundOn = soundEnabled.value
    if (window.editAudio) {
      window.editAudio.muted = !isSoundOn // 关闭音效时静音，开启时恢复原静音状态
      if (isSoundOn) window.editAudio.volume = audioVolume.value * 0.4
    }
    if (window.exportAudio) {
      window.exportAudio.muted = !isSoundOn
      if (isSoundOn) window.exportAudio.volume = audioVolume.value * 0.6
    }
    if (window.petAudio) {
      window.petAudio.muted = !isSoundOn
      if (isSoundOn) window.petAudio.volume = audioVolume.value * 0.4
    }
  }
}

// 鉴权操作（退出登录/前往登录）
const handleAuthAction = () => {
  if (isAuthenticated.value) {
    logout()
    router.push('/login')
  } else {
    router.push('/login')
  }
}

// 打开右键菜单（基于实时DOM位置计算）
const openContextMenu = () => {
  if (!petContainer.value) return
  
  const offsetDistance = 10
  const petRect = petContainer.value.getBoundingClientRect()
  const petX = petRect.left
  const petY = petRect.top
  const petWidth = petRect.width
  const petHeight = petRect.height
  
  const menuHeight = 200
  const menuY = petY + (petHeight / 2) - (menuHeight / 2)
  const safeMenuY = Math.max(10, Math.min(menuY, window.innerHeight - menuHeight - 10))
  
  const rightAvailableSpace = window.innerWidth - (petX + petWidth)
  
  let menuX = 0
  if (rightAvailableSpace >= menuWidth.value + 10) {
    menuX = petX + petWidth + offsetDistance
  } else {
    menuX = petX - menuWidth.value - offsetDistance
    menuX = Math.max(10, menuX)
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

// 鼠标按下事件处理（过滤右键）
const handleMouseDown = (e) => {
  if (e.button === 2) return // 过滤右键
  
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
    if (route.path === '/windowed') {
      handleToggleSidebar() // 调用正确的侧边栏切换函数
    }
  }
  contextMenuVisible.value = false
}

// 触摸开始事件处理
const handleTouchStart = (e) => {
  if (!petContainer.value || !e.touches[0]) return
  
  const rect = petContainer.value.getBoundingClientRect()
  const isBottom = isBottomHalf(e, rect)
  const isInResizeArea = isInResizeHandle(e, rect, true)
  
  if (isInResizeArea) {
    handleResizeTouchStart(e)
  } else {
    handlePetTouchStart(e, petContainer.value, isBottom, playPetAudio)
    if (!isBottom && route.path === '/windowed') {
      handleToggleSidebar()
    }
  }
  contextMenuVisible.value = false
}

// 拉伸触摸开始
const handleResizeTouchStart = (e) => {
  e.preventDefault()
  e.stopPropagation()
  
  if (!e.touches[0]) return
  
  const fakeEvent = {
    clientX: e.touches[0].clientX,
    clientY: e.touches[0].clientY,
    preventDefault: () => e.preventDefault(),
    stopPropagation: () => e.stopPropagation()
  }
  
  startResize(fakeEvent)
  contextMenuVisible.value = false
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

// 生命周期
onMounted(() => {
  // 暴露音频实例到window（适配useAudio的实例）
  const { playEditSound, playExportSound, playPetSound } = useAudio()
  setTimeout(() => {
    showHint.value = false
  }, 5000)
  
  nextTick(() => {
    if (petContainer.value) {
      setTimeout(() => {
        petState.value.r = 5
        petState.value.y = 3
        petState.value.running = true
      }, 1500)
    }
  })

  // 初始化音频实例到window（确保全局可访问）
  if (!window.editAudio) {
    window.editAudio = new Audio('/audio/edit.mp3')
    window.editAudio.volume = audioVolume.value * 0.4
  }
  if (!window.exportAudio) {
    window.exportAudio = new Audio('/audio/export.mp3')
    window.exportAudio.volume = audioVolume.value * 0.6
  }
  if (!window.petAudio) {
    window.petAudio = new Audio('/audio/pet.mp3')
    window.petAudio.volume = audioVolume.value * 0.4
  }
})

onUnmounted(() => {
  stopDrag()
  stopResize()
  stopRun()
  contextMenuVisible.value = false
})
</script>

<style scoped>
/* 桌宠容器：无transform，仅控制位置 */
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

/* 桌宠图片：仅图片添加抖动transform */
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

/* 右键菜单样式：强制取消变形 */
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
  -webkit-transform: none !important;
  -moz-transform: none !important;
  -ms-transform: none !important;
  -o-transform: none !important;
  transform-origin: center center !important;
  will-change: transform;
  transition: none !important;
}

/* 菜单项样式：移除固定字体大小 */
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
  /* 移除固定font-size，改为动态绑定 */
  white-space: nowrap;
}
</style>