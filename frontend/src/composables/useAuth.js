import { ref, computed } from 'vue'
import { authAPI } from '@/services/api'

export function useAuth() {
  const user = ref(JSON.parse(localStorage.getItem('user') || 'null'))
  const token = ref(localStorage.getItem('token') || null)
  const loading = ref(false)
  const error = ref(null)

  const isAuthenticated = computed(() => !!token.value)

  // 初始化恢复用户状态由 App.vue 的 onMounted 中调用 fetchProfile 完成，此处不再使用 onMounted，
  // 否则在路由守卫等非组件上下文中调用 useAuth() 时会触发 "no active component instance" 警告。

  const setAuth = (newToken, userData) => {
    token.value = newToken
    user.value = userData
    localStorage.setItem('token', newToken)
    localStorage.setItem('user', JSON.stringify(userData))
    
    // 如果用户选择记住密码，设置更长的存储时间
    if (window.location.href.includes('remember=true')) {
      localStorage.setItem('remember', 'true')
    }
  }

  const clearAuth = () => {
    token.value = null
    user.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('remember')
  }

  const register = async (username, email, password) => {
    loading.value = true
    error.value = null
    try {
      const response = await authAPI.register({
        username,
        email,
        password
      })
      
      // 后端返回格式：{ success: true, data: { token: "...", user: {...} } }
      if (response.success && response.data) {
        const { token, user } = response.data
        setAuth(token, user)
        return { success: true, data: response.data }
      } else {
        error.value = response.error || '注册失败'
        return { success: false, error: error.value }
      }
    } catch (err) {
      error.value = err.error || err.message || '注册失败'
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  const login = async (username, password, remember = false) => {
    loading.value = true
    error.value = null
    try {
      const response = await authAPI.login({
        username,
        password
      })
      
      // 根据后端实际返回的数据结构调整
      if (response.success && response.data) {
        const { token, user } = response.data
        setAuth(token, user)
        
        // 处理记住密码
        if (remember) {
          localStorage.setItem('rememberedUser', JSON.stringify({ username }))
        } else {
          localStorage.removeItem('rememberedUser')
        }
        
        return { success: true, data: response.data }
      } else {
        error.value = response.error || response.message || '登录失败'
        return { success: false, error: error.value }
      }
    } catch (err) {
      error.value = err.error || err.message || '登录失败'
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  const logout = () => {
    authAPI.logout()
    clearAuth()
  }

  const fetchProfile = async () => {
    loading.value = true
    try {
      const response = await authAPI.getProfile()
      
      if (response.success && response.data) {
        user.value = response.data
        localStorage.setItem('user', JSON.stringify(response.data))
        return { success: true, data: response.data }
      } else {
        clearAuth()
        return { success: false, error: response.error }
      }
    } catch (err) {
      clearAuth()
      return { success: false, error: err.error || err.message }
    } finally {
      loading.value = false
    }
  }

  return {
    user,
    token,
    loading,
    error,
    isAuthenticated,
    register,
    login,
    logout,
    fetchProfile,
    clearAuth
  }
}