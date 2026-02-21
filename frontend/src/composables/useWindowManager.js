import { ref, computed, watch } from 'vue'

const STORAGE_KEY = 'windowManagerState'
const ICONS_STORAGE_KEY = 'desktopIcons'

let idCounter = 1
let zIndexCounter = 100

const DEFAULT_APPEARANCE = {
  fontSize: 16,
  lineHeight: 1.8,
  fontWeight: 400,
  fontFamily: 'system-ui, -apple-system, sans-serif',
  letterSpacing: 0,
  padding: 24
}

const DEFAULT_ICONS = [
  { id: 'new-editor', icon: '📝', label: '新建编辑器', x: 20, y: 20, action: 'new-editor' },
  { id: 'community', icon: '🏠', label: '社区', x: 20, y: 120, action: 'go-community' },
  { id: 'files', icon: '📁', label: '文件管理', x: 20, y: 220, action: 'file-manager' },
  { id: 'settings', icon: '⚙️', label: '设置', x: 20, y: 320, action: 'settings' },
  { id: 'trash', icon: '🗑️', label: '垃圾桶', x: 20, y: 420, action: 'trash' }
]

export function useWindowManager() {
  const windows = ref([])
  const activeWindowId = ref(null)
  const desktopIcons = ref([...DEFAULT_ICONS])

  const windowsList = computed(() => {
    return windows.value.slice()
  })

  const saveState = () => {
    const state = {
      idCounter,
      zIndexCounter,
      windows: windows.value.map(w => ({
        id: w.id,
        title: w.title,
        x: w.x,
        y: w.y,
        width: w.width,
        height: w.height,
        isMaximized: w.isMaximized,
        isMinimized: w.isMinimized,
        zIndex: w.zIndex,
        isActive: w.isActive,
        content: w.content || '',
        savedContent: w.savedContent || '',
        previewContent: w.previewContent || '',
        appearance: w.appearance || { ...DEFAULT_APPEARANCE }
      })),
      activeWindowId: activeWindowId.value
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }

  const saveDesktopIcons = () => {
    localStorage.setItem(ICONS_STORAGE_KEY, JSON.stringify(desktopIcons.value))
  }

  const restoreState = () => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const state = JSON.parse(saved)
        idCounter = state.idCounter || 1
        zIndexCounter = state.zIndexCounter || 100
        windows.value = (state.windows || []).map(w => ({
          ...w,
          savedContent: w.savedContent !== undefined ? w.savedContent : w.content || '',
          appearance: w.appearance || { ...DEFAULT_APPEARANCE }
        }))
        activeWindowId.value = state.activeWindowId || null
        return true
      } catch (e) {
        console.error('Failed to restore window state:', e)
      }
    }
    return false
  }

  const restoreDesktopIcons = () => {
    const oldSaved = localStorage.getItem('desktopIconPosition')
    if (oldSaved) {
      try {
        const pos = JSON.parse(oldSaved)
        DEFAULT_ICONS[0].x = pos.x
        DEFAULT_ICONS[0].y = pos.y
        localStorage.removeItem('desktopIconPosition')
      } catch (e) {}
    }
    
    const saved = localStorage.getItem(ICONS_STORAGE_KEY)
    if (saved) {
      try {
        const savedIcons = JSON.parse(saved)
        const mergedIcons = [...DEFAULT_ICONS]
        
        savedIcons.forEach(savedIcon => {
          const existingIndex = mergedIcons.findIndex(i => i.id === savedIcon.id)
          if (existingIndex !== -1) {
            mergedIcons[existingIndex] = { ...mergedIcons[existingIndex], ...savedIcon }
          } else {
            mergedIcons.push(savedIcon)
          }
        })
        
        desktopIcons.value = mergedIcons
        return true
      } catch (e) {
        console.error('Failed to restore desktop icons:', e)
      }
    }
    return false
  }

  const updateIconPosition = (iconId, x, y) => {
    const icon = desktopIcons.value.find(i => i.id === iconId)
    if (icon) {
      icon.x = x
      icon.y = y
    }
  }

  const addDesktopIcon = (icon) => {
    desktopIcons.value.push({
      id: icon.id || `icon-${Date.now()}`,
      icon: icon.icon,
      label: icon.label,
      x: icon.x || 20,
      y: icon.y || 20 + desktopIcons.value.length * 100,
      action: icon.action
    })
  }

  const removeDesktopIcon = (iconId) => {
    const index = desktopIcons.value.findIndex(i => i.id === iconId)
    if (index !== -1) {
      desktopIcons.value.splice(index, 1)
    }
  }

  const createWindow = (options = {}) => {
    const id = idCounter++
    zIndexCounter++
    const initialContent = options.content || ''
    const newWindow = {
      id,
      title: options.title || '未命名文档',
      x: options.x !== undefined ? options.x : 100 + ((id - 1) % 5) * 40,
      y: options.y !== undefined ? options.y : 100 + ((id - 1) % 5) * 40,
      width: options.width || 900,
      height: options.height || 600,
      isMaximized: !!options.isMaximized,
      isMinimized: !!options.isMinimized,
      zIndex: options.zIndex || zIndexCounter,
      isActive: true,
      content: initialContent,
      savedContent: initialContent,
      previewContent: options.previewContent || '',
      appearance: options.appearance || { ...DEFAULT_APPEARANCE }
    }
    windows.value.forEach(w => w.isActive = false)
    windows.value.push(newWindow)
    activeWindowId.value = id
    return id
  }

  const updateWindowAppearance = (id, key, value) => {
    const win = windows.value.find(w => w.id === id)
    if (win && win.appearance && key in win.appearance) {
      win.appearance[key] = value
    }
  }

  const resetWindowAppearance = (id) => {
    const win = windows.value.find(w => w.id === id)
    if (win) {
      win.appearance = { ...DEFAULT_APPEARANCE }
    }
  }

  const markWindowSaved = (id) => {
    const win = windows.value.find(w => w.id === id)
    if (win) {
      win.savedContent = win.content
    }
  }

  const closeWindow = (id) => {
    const index = windows.value.findIndex(w => w.id === id)
    if (index !== -1) {
      windows.value.splice(index, 1)
      if (activeWindowId.value === id && windows.value.length > 0) {
        setActiveWindow(windows.value[windows.value.length - 1].id)
      } else if (windows.value.length === 0) {
        activeWindowId.value = null
      }
    }
  }

  const setActiveWindow = (id) => {
    zIndexCounter++
    windows.value.forEach(w => {
      if (w.id === id) {
        w.isActive = true
        w.zIndex = zIndexCounter
      } else {
        w.isActive = false
      }
    })
    activeWindowId.value = id
  }

  const toggleMaximize = (id) => {
    const win = windows.value.find(w => w.id === id)
    if (win) {
      win.isMaximized = !win.isMaximized
    }
  }

  const toggleMinimize = (id) => {
    const win = windows.value.find(w => w.id === id)
    if (win) {
      win.isMinimized = !win.isMinimized
      if (win.isMinimized) {
        const nextActive = windows.value.find(w => !w.isMinimized && w.id !== id)
        if (nextActive) {
          setActiveWindow(nextActive.id)
        } else {
          activeWindowId.value = null
        }
      } else {
        setActiveWindow(id)
      }
    }
  }

  const updateWindowPosition = (id, x, y) => {
    const win = windows.value.find(w => w.id === id)
    if (win) {
      win.x = x
      win.y = y
    }
  }

  const updateWindowSize = (id, x, y, width, height) => {
    const win = windows.value.find(w => w.id === id)
    if (win) {
      win.x = x
      win.y = y
      win.width = width
      win.height = height
    }
  }

  const updateWindowContent = (id, content) => {
    const win = windows.value.find(w => w.id === id)
    if (win) {
      win.content = content
    }
  }

  const updateWindowTitle = (id, title) => {
    const win = windows.value.find(w => w.id === id)
    if (win) {
      win.title = title
    }
  }

  const getWindowById = (id) => {
    return windows.value.find(w => w.id === id)
  }

  const arrangeWindowsCascade = () => {
    const visibleWindows = windows.value.filter(w => !w.isMinimized)
    const offsetX = 30
    const offsetY = 30
    const baseX = 50
    const baseY = 80
    const width = 800
    const height = 500
    
    visibleWindows.forEach((win, index) => {
      win.x = baseX + index * offsetX
      win.y = baseY + index * offsetY
      win.width = width
      win.height = height
      win.isMaximized = false
    })
  }

  const arrangeWindowsHorizontal = () => {
    const visibleWindows = windows.value.filter(w => !w.isMinimized)
    if (visibleWindows.length === 0) return
    
    const desktopWidth = window.innerWidth - 280
    const desktopHeight = window.innerHeight - 52
    const winWidth = Math.floor(desktopWidth / visibleWindows.length)
    const winHeight = desktopHeight - 20
    
    visibleWindows.forEach((win, index) => {
      win.x = 280 + index * winWidth
      win.y = 52
      win.width = winWidth
      win.height = winHeight
      win.isMaximized = false
    })
  }

  const arrangeWindowsVertical = () => {
    const visibleWindows = windows.value.filter(w => !w.isMinimized)
    if (visibleWindows.length === 0) return
    
    const desktopWidth = window.innerWidth - 280
    const desktopHeight = window.innerHeight - 52
    const winWidth = desktopWidth
    const winHeight = Math.floor((desktopHeight - 20) / visibleWindows.length)
    
    visibleWindows.forEach((win, index) => {
      win.x = 280
      win.y = 52 + index * winHeight
      win.width = winWidth
      win.height = winHeight
      win.isMaximized = false
    })
  }

  const arrangeWindowsGrid = () => {
    const visibleWindows = windows.value.filter(w => !w.isMinimized)
    if (visibleWindows.length === 0) return
    
    const desktopWidth = window.innerWidth - 280
    const desktopHeight = window.innerHeight - 52
    const cols = visibleWindows.length <= 2 ? 2 : Math.ceil(Math.sqrt(visibleWindows.length))
    const rows = Math.ceil(visibleWindows.length / cols)
    const winWidth = Math.floor(desktopWidth / cols)
    const winHeight = Math.floor((desktopHeight - 20) / rows)
    
    visibleWindows.forEach((win, index) => {
      const col = index % cols
      const row = Math.floor(index / cols)
      win.x = 280 + col * winWidth
      win.y = 52 + row * winHeight
      win.width = winWidth
      win.height = winHeight
      win.isMaximized = false
    })
  }

  watch(windows, saveState, { deep: true })
  watch(activeWindowId, saveState)
  watch(desktopIcons, saveDesktopIcons, { deep: true })

  return {
    windows,
    activeWindowId,
    desktopIcons,
    windowsList,
    createWindow,
    closeWindow,
    setActiveWindow,
    toggleMaximize,
    toggleMinimize,
    updateWindowPosition,
    updateWindowSize,
    updateWindowContent,
    updateWindowTitle,
    getWindowById,
    arrangeWindowsCascade,
    arrangeWindowsHorizontal,
    arrangeWindowsVertical,
    arrangeWindowsGrid,
    updateIconPosition,
    addDesktopIcon,
    removeDesktopIcon,
    markWindowSaved,
    saveState,
    restoreState,
    restoreDesktopIcons,
    updateWindowAppearance,
    resetWindowAppearance
  }
}
