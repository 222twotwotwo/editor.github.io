
import { ref, onMounted, onUnmounted } from 'vue'

export function useDesktopPet() {
  // 桌宠的位置和尺寸
  const petPosition = ref({ x: window.innerWidth - 200, y: window.innerHeight - 200 })
  const petSize = ref({ width: 150, height: 150 })
  
  // 拖拽状态
  const isDragging = ref(false)
  const dragOffset = ref({ x: 0, y: 0 })
  
  // 拉伸状态
  const isResizing = ref(false)
  const resizeStart = ref({ x: 0, y: 0 })
  const originalSize = ref({ width: 0, height: 0 })
  
  // ========== 新增：抖动物理效果状态 ==========
  const physicsConfig = {
    sticky: 0.05,
    maxR: 60,
    maxY: 110,
    cut: 0.1,
    inertia: 0.04,
    decay: 0.98,
    defaultFrameUnix: 1000/60
  }
  
  const petState = ref({
    r: 12,        // 旋转角度
    y: 2,         // 垂直位移
    t: 0,         // 垂直速度
    w: 0,         // 角速度
    running: false, // 是否在抖动
    originRotate: 0 // 初始旋转
  })
  
  let animationFrameId = null
  let lastRunUnix = +new Date()
  
  // ========== 新增：上下半区判断 ==========
  const isBottomHalf = (e, rect) => {
    const clickY = e.type.includes('mouse') ? e.clientY - rect.top : e.touches[0].clientY - rect.top
    return clickY > rect.height / 2
  }
  
  // 鼠标事件处理函数
  let mouseMoveHandler = null
  let mouseUpHandler = null
  
  // ========== 新增：抖动物理引擎 ==========
  const updatePetStyle = (element) => {
    if (element) {
      element.style.transform = `rotate(${petState.value.r}deg) translateY(${petState.value.y}px)`
      element.style.transition = 'none'
    }
  }
  
  const runPhysics = (element) => {
    if (!petState.value.running || !element) return
    
    const runUnix = +new Date()
    const lastRunUnixDiff = runUnix - lastRunUnix
    let inertia = physicsConfig.inertia
    
    if (lastRunUnixDiff < 16) {
      inertia = physicsConfig.inertia / physicsConfig.defaultFrameUnix * lastRunUnixDiff
    }
    lastRunUnix = runUnix

    // 物理计算
    petState.value.w = petState.value.w - petState.value.r * 2 - petState.value.originRotate
    petState.value.r = petState.value.r + petState.value.w * inertia * 1.2
    petState.value.w = petState.value.w * physicsConfig.decay

    petState.value.t = petState.value.t - petState.value.y * 2
    petState.value.y = petState.value.y + petState.value.t * inertia * 2
    petState.value.t = petState.value.t * physicsConfig.decay

    // 判断是否需要停止抖动
    const maxAbsValue = Math.max(
      Math.abs(petState.value.w),
      Math.abs(petState.value.r),
      Math.abs(petState.value.t),
      Math.abs(petState.value.y)
    )
    
    if (maxAbsValue < physicsConfig.cut) {
      petState.value.running = false
      return
    }
    
    updatePetStyle(element)
    animationFrameId = requestAnimationFrame(() => runPhysics(element))
  }

  const movePet = (x, y, element) => {
    let r = x * physicsConfig.sticky
    r = Math.max(-physicsConfig.maxR, Math.min(physicsConfig.maxR, r))
    let dy = y * physicsConfig.sticky * 2
    dy = Math.max(-physicsConfig.maxY, Math.min(physicsConfig.maxY, dy))
    
    petState.value.r = r
    petState.value.y = dy
    petState.value.w = 0
    petState.value.t = 0
    petState.value.running = false
    
    updatePetStyle(element)
  }

  const startRun = (element) => {
    if (petState.value.running || !element) return
    petState.value.running = true
    lastRunUnix = +new Date()
    animationFrameId = requestAnimationFrame(() => runPhysics(element))
  }

  const stopRun = () => {
    petState.value.running = false
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = null
    }
  }

  // ========== 修改：开始拖拽（针对下半区） ==========
  const startDrag = (e, element) => {
    e.preventDefault()
    e.stopPropagation()
    
    // 如果是下半区，停止抖动
    const rect = element.getBoundingClientRect()
    if (isBottomHalf(e, rect)) {
      stopRun()
    }
    
    if (isResizing.value) return
    
    isDragging.value = true
    dragOffset.value = {
      x: e.clientX - petPosition.value.x,
      y: e.clientY - petPosition.value.y
    }
    
    // 添加全局鼠标事件监听
    mouseMoveHandler = (moveE) => handleMouseMove(moveE, element)
    mouseUpHandler = stopDrag
    document.addEventListener('mousemove', mouseMoveHandler)
    document.addEventListener('mouseup', mouseUpHandler)
  }
  
  // ========== 新增：开始上半区交互（抖动） ==========
  const startTopHalfInteraction = (e, element, playAudio) => {
    e.preventDefault()
    e.stopPropagation()
    
    // 播放音频
    if (playAudio) {
      playAudio()
    }
    
    const startX = e.pageX
    const startY = e.pageY
    
    // 上半区交互：移动时更新抖动参数
    const handleMouseMove = (moveE) => {
      const x = moveE.pageX - startX
      const y = moveE.pageY - startY
      movePet(x, y, element)
    }
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      startRun(element)
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }
  
  // ========== 新增：处理触摸事件 ==========
  const handleTouchStart = (e, element, isBottom, playAudio) => {
    e.preventDefault()
    
    if (!e.touches[0]) return
    
    if (isBottom) {
      // 下半区：拖拽移动
      stopRun()
      const rect = element.getBoundingClientRect()
      const startX = e.touches[0].clientX - rect.left
      const startY = e.touches[0].clientY - rect.top
      
      const handleTouchMove = (moveE) => {
        if (!moveE.touches[0]) return
        const clientX = moveE.touches[0].clientX
        const clientY = moveE.touches[0].clientY
        const newLeft = clientX - startX
        const newTop = clientY - startY
        
        petPosition.value.x = Math.max(0, Math.min(newLeft, window.innerWidth - petSize.value.width))
        petPosition.value.y = Math.max(0, Math.min(newTop, window.innerHeight - petSize.value.height))
        element.style.transform = 'none'
      }
      
      const handleTouchEnd = () => {
        document.removeEventListener('touchmove', handleTouchMove)
        document.removeEventListener('touchend', handleTouchEnd)
      }
      
      document.addEventListener('touchmove', handleTouchMove)
      document.addEventListener('touchend', handleTouchEnd)
    } else {
      // 上半区：抖动交互
      if (playAudio) {
        playAudio()
      }
      
      const startX = e.touches[0].pageX
      const startY = e.touches[0].pageY
      
      const handleTouchMove = (moveE) => {
        if (!moveE.touches[0]) return
        const x = moveE.touches[0].pageX - startX
        const y = moveE.touches[0].pageY - startY
        movePet(x, y, element)
      }
      
      const handleTouchEnd = () => {
        document.removeEventListener('touchmove', handleTouchMove)
        document.removeEventListener('touchend', handleTouchEnd)
        startRun(element)
      }
      
      document.addEventListener('touchmove', handleTouchMove)
      document.addEventListener('touchend', handleTouchEnd)
    }
  }

  // ========== 修改：处理拖拽移动 ==========
  const handleMouseMove = (e, element) => {
    if (!isDragging.value) return
    
    petPosition.value = {
      x: e.clientX - dragOffset.value.x,
      y: e.clientY - dragOffset.value.y
    }
    
    // 限制在窗口范围内
    const maxX = window.innerWidth - petSize.value.width
    const maxY = window.innerHeight - petSize.value.height
    
    petPosition.value.x = Math.max(0, Math.min(petPosition.value.x, maxX))
    petPosition.value.y = Math.max(0, Math.min(petPosition.value.y, maxY))
    
    // 拖拽时重置变形
    if (element) {
      element.style.transform = 'none'
    }
  }

  // 处理拉伸移动
  const handleResizeMove = (e) => {
    if (!isResizing.value) return
    
    const deltaX = e.clientX - resizeStart.value.x
    const deltaY = e.clientY - resizeStart.value.y
    
    // 保持宽高比例，或者可以自由拉伸（这里使用自由拉伸）
    const newWidth = Math.max(50, originalSize.value.width + deltaX)
    const newHeight = Math.max(50, originalSize.value.height + deltaY)
    
    petSize.value = {
      width: newWidth,
      height: newHeight
    }
    
    // 确保不超过窗口范围
    const maxX = window.innerWidth - petPosition.value.x
    const maxY = window.innerHeight - petPosition.value.y
    
    petSize.value.width = Math.min(petSize.value.width, maxX)
    petSize.value.height = Math.min(petSize.value.height, maxY)
  }

  // 开始拉伸
  const startResize = (e) => {
    e.preventDefault()
    e.stopPropagation()
    
    isResizing.value = true
    resizeStart.value = {
      x: e.clientX,
      y: e.clientY
    }
    originalSize.value = { ...petSize.value }
    
    // 添加全局鼠标事件监听
    mouseMoveHandler = handleResizeMove
    mouseUpHandler = stopResize
    document.addEventListener('mousemove', mouseMoveHandler)
    document.addEventListener('mouseup', mouseUpHandler)
  }

  // 停止拖拽
  const stopDrag = () => {
    if (!isDragging.value) return
    
    isDragging.value = false
    removeEventListeners()
  }

  // 停止拉伸
  const stopResize = () => {
    if (!isResizing.value) return
    
    isResizing.value = false
    removeEventListeners()
  }

  // 移除事件监听
  const removeEventListeners = () => {
    if (mouseMoveHandler) {
      document.removeEventListener('mousemove', mouseMoveHandler)
    }
    if (mouseUpHandler) {
      document.removeEventListener('mouseup', mouseUpHandler)
    }
    mouseMoveHandler = null
    mouseUpHandler = null
  }

  // 窗口大小改变时调整位置
  const handleResize = () => {
    const maxX = window.innerWidth - petSize.value.width
    const maxY = window.innerHeight - petSize.value.height
    
    petPosition.value.x = Math.min(petPosition.value.x, maxX)
    petPosition.value.y = Math.min(petPosition.value.y, maxY)
  }

  // 生命周期
  onMounted(() => {
    window.addEventListener('resize', handleResize)
    // 初始抖动
    setTimeout(() => {
      const element = document.querySelector('.desktop-pet')
      if (element) {
        startRun(element)
      }
    }, 1000)
  })

  onUnmounted(() => {
    stopRun()
    removeEventListeners()
    window.removeEventListener('resize', handleResize)
  })

  return {
    petPosition,
    petSize,
    isDragging,
    isResizing,
    petState,
    startDrag,
    startResize,
    startTopHalfInteraction,
    handleTouchStart,
    stopDrag,
    stopResize,
    stopRun,
    isBottomHalf
  }
}
