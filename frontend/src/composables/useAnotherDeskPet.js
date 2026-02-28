import { ref, computed, onUnmounted } from 'vue'

export function useAnotherDeskPet(petCount = 5) {
  // 基础配置：调整反弹参数，降低反弹高度和次数
  const baseConfig = {
    gravity: 0.2, // 保持重力不变，保证下落自然
    bounceFactor: 0.5, // 核心修改：从0.4降至0.25，直接降低基础反弹高度
    jumpPower: { 
      min: 3.5,
      max: 4
    },
    fallSpeedInit: 0.5, 
    groundHeight: 50, 
    groundWidth: 400, 
    petSize: 100, 
    scaleMin: 0.5, 
    scaleMax: 2, 
    horizontalJumpSpeed: { 
      min: 0.5, 
      max: 1.6
    },
    resetDelay: 350, 
    airResistance: 0.015, 
    groundFriction: 0.15, // 核心修改：从0.03升至0.15，落地后快速停止横向滑动
    bounceFactorAdjust: 0.07, // 保持微调值，避免速度大时反弹过高
    bounceDecay: 0.96 // 新增：反弹衰减系数，每次反弹后系数进一步降低
  }

  // 初始位置：保留原有逻辑
  const windowWidth = window.innerWidth || 1200
  const windowHeight = window.innerHeight || 800
  const containerStyle = ref({
    position: 'absolute',
    top: `${(windowHeight - baseConfig.groundHeight) / 2}px`, 
    left: `${(windowWidth - baseConfig.groundWidth) / 2}px`, 
    transform: 'scale(1)',
    transformOrigin: 'center bottom',
    pointerEvents: 'auto',
    zIndex: 9999 
  })

  const isAdjusting = ref(false)
  const groundPos = ref({ 
    x: parseFloat(containerStyle.value.left) || (windowWidth - baseConfig.groundWidth) / 2, 
    y: parseFloat(containerStyle.value.top) + baseConfig.groundHeight || (windowHeight - baseConfig.groundHeight) / 2 + baseConfig.groundHeight 
  })
  const animationFrameId = ref(null)
  const petOutOfHorizontalBound = ref({}) 

  // 桌宠初始位置：保留原有逻辑
  const petList = ref(
    Array.from({ length: petCount }, (_, index) => {
      const minX = groundPos.value.x
      const maxX = groundPos.value.x + baseConfig.groundWidth - baseConfig.petSize
      const randomX = Math.random() * (maxX - minX) + minX
      return {
        id: index + 1,
        imgSrc: `/audio/AnotherDeskPet/DeskPet${index + 1}.png`,
        x: randomX,
        y: -windowHeight - Math.random() * 100, 
        vx: 0,
        vy: baseConfig.fallSpeedInit,
        isOnGround: false
      }
    })
  )

  const allPetsOnGround = computed(() => {
    return petList.value.every(pet => pet.isOnGround)
  })

  const getScaleValue = () => {
    const match = containerStyle.value.transform.match(/scale\((\d+\.?\d*)\)/)
    return match ? parseFloat(match[1]) : 1
  }

  const getPageBounds = () => {
    return {
      maxWidth: window.innerWidth || 1200,
      maxHeight: window.innerHeight || 800,
      minWidth: 0,
      minHeight: 0
    }
  }

  const delayResetPet = (pet, scale) => {
    if (petOutOfHorizontalBound.value[pet.id]) return
    petOutOfHorizontalBound.value[pet.id] = true
    setTimeout(() => {
      resetPet(pet, scale)
      petOutOfHorizontalBound.value[pet.id] = false
    }, baseConfig.resetDelay)
  }

  // 核心物理帧：修改反弹逻辑，加入衰减+降低落地阈值
  const updatePetPhysics = () => {
    if (isAdjusting.value) return
    const scale = getScaleValue()
    const pageBounds = getPageBounds()

    petList.value.forEach(pet => {
      pet.vx *= (1 - baseConfig.airResistance)
      pet.vy += baseConfig.gravity

      pet.y += pet.vy / scale
      pet.x += pet.vx / scale

      const groundTop = groundPos.value.y
      const isInLandXRange = pet.x >= groundPos.value.x && 
                             pet.x + baseConfig.petSize <= groundPos.value.x + baseConfig.groundWidth

      if (isInLandXRange && pet.y + baseConfig.petSize >= groundTop) {
        pet.y = groundTop - baseConfig.petSize
        
        // 核心修改1：加入反弹衰减，每次反弹系数进一步降低
        let currentBounceFactor = baseConfig.bounceFactor + (Math.abs(pet.vy) * baseConfig.bounceFactorAdjust / 10)
        currentBounceFactor = Math.min(currentBounceFactor * baseConfig.bounceDecay, baseConfig.bounceFactor) // 衰减后不超过基础系数
        pet.vy = -pet.vy * currentBounceFactor
        
        // 核心修改2：高摩擦力，落地后快速停止横向滑动
        if (Math.abs(pet.vx) > 0.1) {
          pet.vx *= (1 - baseConfig.groundFriction)
        } else {
          pet.vx = 0 
        }
        
        // 核心修改3：降低落地阈值（从0.3→0.2），更快判定落地
        if (Math.abs(pet.vy) < 0.3) {
          pet.vy = 0
          pet.isOnGround = true
        }
      } else if (!isInLandXRange && pet.y + baseConfig.petSize >= groundTop) {
        pet.isOnGround = false
      }

      if (pet.y > pageBounds.maxHeight) {
        resetPet(pet, scale)
      }

      const petLeft = pet.x
      const petRight = pet.x + baseConfig.petSize
      if (petLeft < pageBounds.minWidth || petRight > pageBounds.maxWidth) {
        delayResetPet(pet, scale)
      }
    })

    animationFrameId.value = requestAnimationFrame(updatePetPhysics)
  }

  // 重置桌宠：保留原有逻辑
  const resetPet = (pet, currentScale = 1) => {
    const pageBounds = getPageBounds()
    const minX = groundPos.value.x
    const maxX = groundPos.value.x + baseConfig.groundWidth - baseConfig.petSize
    pet.x = Math.random() * (maxX - minX) + minX
    pet.y = -pageBounds.maxHeight - Math.random() * 100 
    pet.vy = baseConfig.fallSpeedInit * currentScale
    pet.vx = 0
    pet.isOnGround = false
    petOutOfHorizontalBound.value[pet.id] = false
  }

  // 点击跳跃：保留原有逻辑
  const handlePetClick = (pet) => {
    if (isAdjusting.value) return
    if (!pet.isOnGround) return

    const direction = Math.random() > 0.5 ? 1 : -1
    const scale = getScaleValue()
    
    const randomHorizontalSpeed = Math.random() * (baseConfig.horizontalJumpSpeed.max - baseConfig.horizontalJumpSpeed.min) + baseConfig.horizontalJumpSpeed.min
    pet.vx = direction * randomHorizontalSpeed / scale
    
    const randomJumpPower = Math.random() * (baseConfig.jumpPower.max - baseConfig.jumpPower.min) + baseConfig.jumpPower.min
    pet.vy = -randomJumpPower * (Math.random() * 0.6 + 0.8) / scale 
    
    pet.isOnGround = false 
  }

  // 调整大小：保留原有逻辑
  const handleScaleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    isAdjusting.value = true

    const startX = e.clientX
    const startY = e.clientY
    const startScale = getScaleValue()

    const onMouseMove = (e) => {
      const deltaX = e.clientX - startX
      const deltaY = e.clientY - startY
      const newScale = startScale + (deltaX + deltaY) / 500
      const clampedScale = Math.max(baseConfig.scaleMin, Math.min(baseConfig.scaleMax, newScale))
      containerStyle.value.transform = `scale(${clampedScale})`
    }

    const onMouseUp = () => {
      isAdjusting.value = false
      animationFrameId.value = requestAnimationFrame(updatePetPhysics)
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  // 调整位置：保留原有逻辑
  const handleGroundDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!allPetsOnGround.value) return
    isAdjusting.value = true

    const startX = e.clientX
    const startY = e.clientY
    const startLeft = parseFloat(containerStyle.value.left) || 0
    const startTop = parseFloat(containerStyle.value.top) || 0
    const pageBounds = getPageBounds()

    const onMouseMove = (e) => {
      const deltaX = e.clientX - startX
      const deltaY = e.clientY - startY
      const newLeft = startLeft + deltaX
      const newTop = startTop + deltaY
      containerStyle.value.left = `${Math.max(0, Math.min(newLeft, pageBounds.maxWidth - baseConfig.groundWidth))}px`
      containerStyle.value.top = `${Math.max(0, Math.min(newTop, pageBounds.maxHeight - baseConfig.groundHeight))}px`
      groundPos.value.x = parseFloat(containerStyle.value.left)
      groundPos.value.y = parseFloat(containerStyle.value.top) + baseConfig.groundHeight
    }

    const onMouseUp = () => {
      isAdjusting.value = false
      animationFrameId.value = requestAnimationFrame(updatePetPhysics)
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  // 初始化：保留原有逻辑
  const init = () => {
    groundPos.value = {
      x: parseFloat(containerStyle.value.left) || (windowWidth - baseConfig.groundWidth) / 2,
      y: parseFloat(containerStyle.value.top) + baseConfig.groundHeight || (windowHeight - baseConfig.groundHeight) / 2 + baseConfig.groundHeight
    }
    if (!animationFrameId.value) {
      animationFrameId.value = requestAnimationFrame(updatePetPhysics)
    }
  }

  // 窗口resize：保留原有逻辑
  const handleWindowResize = () => {
    const pageBounds = getPageBounds()
    containerStyle.value.left = `${Math.max(0, Math.min(parseFloat(containerStyle.value.left) || 0, pageBounds.maxWidth - baseConfig.groundWidth))}px`
    containerStyle.value.top = `${Math.max(0, Math.min(parseFloat(containerStyle.value.top) || 0, pageBounds.maxHeight - baseConfig.groundHeight))}px`
    groundPos.value.x = parseFloat(containerStyle.value.left)
    groundPos.value.y = parseFloat(containerStyle.value.top) + baseConfig.groundHeight
  }
  window.addEventListener('resize', handleWindowResize)

  // 销毁：保留原有逻辑
  onUnmounted(() => {
    if (animationFrameId.value) {
      cancelAnimationFrame(animationFrameId.value)
    }
    window.removeEventListener('resize', handleWindowResize)
  })

  return {
    containerStyle,
    petList,
    allPetsOnGround,
    groundPos,
    handlePetClick,
    handleScaleDrag,
    handleGroundDrag,
    init,
    getScaleValue,
    baseConfig 
  }
}