import { ref, computed, watch } from 'vue'

const STORAGE_KEY = 'windowManagerState'
const ICON_STORAGE_KEY = 'desktopIconPosition'
const DOC_ICON_STORAGE_KEY = 'docIconPosition'
const GROUPS_STORAGE_KEY = 'windowGroups'

let idCounter = 1
let zIndexCounter = 100
let groupIdCounter = 1

const DEFAULT_GROUPS = [
  { id: 'default', name: '默认组', color: '#3b82f6' }
]

export function useWindowManager() {
  const windows = ref([])
  const activeWindowId = ref(null)
  const iconPosition = ref({ x: 20, y: 20 })
  const docIconPosition = ref({ x: 120, y: 20 })
  const windowGroups = ref([...DEFAULT_GROUPS])

  const windowsList = computed(() => {
    return windows.value.slice()
  })

  const saveState = () => {
    const state = {
      idCounter,
      zIndexCounter,
      groupIdCounter,
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
        documentId: w.documentId || null,
        groupId: w.groupId || 'default',
        isDocumentExplorer: w.isDocumentExplorer || false,
        sidebarMode: w.sidebarMode || false,
        sidebarSide: w.sidebarSide || null
      })),
      activeWindowId: activeWindowId.value,
      groups: windowGroups.value
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }

  const saveIconPosition = () => {
    localStorage.setItem(ICON_STORAGE_KEY, JSON.stringify(iconPosition.value))
  }

  const saveDocIconPosition = () => {
    localStorage.setItem(DOC_ICON_STORAGE_KEY, JSON.stringify(docIconPosition.value))
  }

  const restoreState = () => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const state = JSON.parse(saved)
        idCounter = state.idCounter || 1
        zIndexCounter = state.zIndexCounter || 100
        groupIdCounter = state.groupIdCounter || 1
        windows.value = (state.windows || []).map(w => ({
          ...w,
          groupId: w.groupId || 'default'
        }))
        windowGroups.value = state.groups || [...DEFAULT_GROUPS]
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

  const restoreDocIconPosition = () => {
    const saved = localStorage.getItem(DOC_ICON_STORAGE_KEY)
    if (saved) {
      try {
        const pos = JSON.parse(saved)
        docIconPosition.value = pos
        return true
      } catch (e) {
        console.error('Failed to restore doc icon position:', e)
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
      documentId: options.documentId || null,
      isDocumentExplorer: !!options.isDocumentExplorer,
      sidebarMode: !!options.sidebarMode,
      sidebarSide: options.sidebarSide || null
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

  const createGroup = (name, color = '#3b82f6') => {
    const id = `group-${groupIdCounter++}`
    const newGroup = { id, name, color }
    windowGroups.value.push(newGroup)
    return id
  }

  const deleteGroup = (groupId) => {
    if (groupId === 'default') return
    const index = windowGroups.value.findIndex(g => g.id === groupId)
    if (index !== -1) {
      windows.value.forEach(w => {
        if (w.groupId === groupId) {
          w.groupId = 'default'
        }
      })
      windowGroups.value.splice(index, 1)
    }
  }

  const updateGroup = (groupId, updates) => {
    const group = windowGroups.value.find(g => g.id === groupId)
    if (group) {
      Object.assign(group, updates)
    }
  }

  const moveWindowToGroup = (windowId, groupId) => {
    const win = windows.value.find(w => w.id === windowId)
    const group = windowGroups.value.find(g => g.id === groupId)
    if (win && group) {
      win.groupId = groupId
    }
  }

  const getGroupById = (groupId) => {
    return windowGroups.value.find(g => g.id === groupId)
  }

  const groupedWindows = computed(() => {
    const groups = {}
    windowGroups.value.forEach(group => {
      groups[group.id] = {
        ...group,
        windows: []
      }
    })
    
    windows.value.forEach(win => {
      const groupId = win.groupId || 'default'
      if (groups[groupId]) {
        groups[groupId].windows.push(win)
      }
    })
    
    return Object.values(groups).filter(g => g.windows.length > 0 || g.id === 'default')
  })

  watch(windows, saveState, { deep: true })
  watch(activeWindowId, saveState)
  watch(iconPosition, saveIconPosition, { deep: true })
  watch(docIconPosition, saveDocIconPosition, { deep: true })
  watch(windowGroups, saveState, { deep: true })

  return {
    windows,
    activeWindowId,
    iconPosition,
    docIconPosition,
    windowGroups,
    windowsList,
    groupedWindows,
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
    restoreIconPosition,
    restoreDocIconPosition,
    createGroup,
    deleteGroup,
    updateGroup,
    moveWindowToGroup,
    getGroupById
  }
}
