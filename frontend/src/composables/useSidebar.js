import { ref, onMounted } from 'vue'

// 模块级共享状态，保证 TopBar 与 EditorView/SidebarRight 使用同一份侧栏状态，点击顶部栏按钮能正确收起/展开
const leftSidebarCollapsed = ref(true)
const rightSidebarCollapsed = ref(true)

// 桌面模式（WindowedEditorView）文档侧边栏状态，供桌宠等全局组件访问
const desktopSidebarCollapsed = ref(true)

const setLeftSidebar = (collapsed) => {
  leftSidebarCollapsed.value = collapsed
  localStorage.setItem('sidebarCollapsed', collapsed ? '1' : '0')
}

const setRightSidebar = (collapsed) => {
  rightSidebarCollapsed.value = collapsed
  localStorage.setItem('rightSidebarCollapsed', collapsed ? '1' : '0')
}

const toggleLeftSidebar = () => {
  setLeftSidebar(!leftSidebarCollapsed.value)
}

const toggleRightSidebar = () => {
  setRightSidebar(!rightSidebarCollapsed.value)
}

const setDesktopSidebar = (collapsed) => {
  desktopSidebarCollapsed.value = collapsed
}

const openDesktopSidebar = () => {
  desktopSidebarCollapsed.value = false
}

const toggleDesktopSidebar = () => {
  desktopSidebarCollapsed.value = !desktopSidebarCollapsed.value
}

function initFromStorage() {
  const savedLeft = localStorage.getItem('sidebarCollapsed')
  setLeftSidebar(savedLeft === null ? true : savedLeft === '1')
  const savedRight = localStorage.getItem('rightSidebarCollapsed')
  setRightSidebar(savedRight === null ? true : savedRight === '1')
}

// 模块加载时同步一次 localStorage，避免首屏与保存状态不一致
if (typeof localStorage !== 'undefined') {
  initFromStorage()
}

export function useSidebar() {
  onMounted(() => {
    initFromStorage()
  })

  return {
    leftSidebarCollapsed,
    rightSidebarCollapsed,
    desktopSidebarCollapsed,
    setLeftSidebar,
    setRightSidebar,
    setDesktopSidebar,
    openDesktopSidebar,
    toggleDesktopSidebar,
    toggleLeftSidebar,
    toggleRightSidebar
  }
}