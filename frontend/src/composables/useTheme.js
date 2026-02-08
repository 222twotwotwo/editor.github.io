import { ref } from 'vue'

// 在模块级别维护单例状态，确保各页面主题同步
const theme = ref(localStorage.getItem('theme') || 'dark')
let initialized = false

const setTheme = (newTheme) => {
  theme.value = newTheme
  document.documentElement.setAttribute('data-theme', newTheme)
  localStorage.setItem('theme', newTheme)
  
  // 更新代码高亮主题
  const hljsLight = document.getElementById('hljs-light')
  const hljsDark = document.getElementById('hljs-dark')
  if (hljsLight && hljsDark) {
    hljsLight.disabled = newTheme === 'dark'
    hljsDark.disabled = newTheme !== 'dark'
  }
}

const toggleTheme = () => {
  setTheme(theme.value === 'dark' ? 'light' : 'dark')
}

export function useTheme() {
  if (!initialized) {
    setTheme(theme.value)
    initialized = true
  }

  return {
    theme,
    setTheme,
    toggleTheme
  }
}