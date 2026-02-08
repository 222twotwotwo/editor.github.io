import { ref, onMounted } from 'vue'

export function useSidebar() {
  const leftSidebarCollapsed = ref(true)
  const rightSidebarCollapsed = ref(true)

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

  onMounted(() => {
    // 初始化左侧侧边栏状态
    const savedLeftState = localStorage.getItem('sidebarCollapsed')
    if (savedLeftState === null) {
      setLeftSidebar(true) // 默认折叠
    } else {
      setLeftSidebar(savedLeftState === '1')
    }

    // 初始化右侧侧边栏状态
    const savedRightState = localStorage.getItem('rightSidebarCollapsed')
    if (savedRightState === null) {
      setRightSidebar(true) // 默认折叠
    } else {
      setRightSidebar(savedRightState === '1')
    }
  })

  return {
    leftSidebarCollapsed,
    rightSidebarCollapsed,
    setLeftSidebar,
    setRightSidebar,
    toggleLeftSidebar,
    toggleRightSidebar
  }
}