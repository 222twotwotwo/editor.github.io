import { ref, computed, watch } from 'vue'

const STORAGE_KEY = 'windowManagerState'
const ICON_STORAGE_KEY = 'desktopIconPosition'

let idCounter = 1
let zIndexCounter = 100

export function useWindowManager() {
  const windows = ref([])
  const activeWindowId = ref(null)
  const iconPosition = ref({ x: 20, y: 20 })

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
        previewContent: w.previewContent || '',
        documentId: w.documentId || null
      })),
      activeWindowId: activeWindowId.value
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }

  const saveIconPosition = () => {
    localStorage.setItem(ICON_STORAGE_KEY, JSON.stringify(iconPosition.value))
  }

  const restoreState = () => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const state = JSON.parse(saved)
        idCounter = state.idCounter || 1
        zIndexCounter = state.zIndexCounter || 100
        windows.value = state.windows || []
        activeWindowId.value = state.activeWindowId || null
        return true
      } catch (e) {
        console.error('Failed to restore window state:', e)
      }
    }
    return false
  }

  const restoreIconPosition = () => {
    const saved = localStorage.getItem(ICON_STORAGE_KEY)
    if (saved) {
      try {
        const pos = JSON.parse(saved)
        iconPosition.value = pos
        return true
      } catch (e) {
        console.error('Failed to restore icon position:', e)
      }
    }
    return false
  }

  const createWindow = (options = {}) => {
    const id = idCounter++
    zIndexCounter++
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
      content: options.content || '',
      previewContent: options.previewContent || '',
      documentId: options.documentId || null
    }
    windows.value.forEach(w => w.isActive = false)
    windows.value.push(newWindow)
    activeWindowId.value = id
    return id
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

  watch(windows, saveState, { deep: true })
  watch(activeWindowId, saveState)
  watch(iconPosition, saveIconPosition, { deep: true })

  return {
    windows,
    activeWindowId,
    iconPosition,
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
    saveState,
    restoreState,
    restoreIconPosition
  }
}
