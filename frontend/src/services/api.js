import axios from 'axios'

// 从环境变量获取API基础URL
// 注意：后端服务在 localhost:8080，API路径以 /api 开头
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'

// 创建axios实例
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    // 从localStorage获取token
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    // 后端返回的数据结构是 { success, data, error, message }
    return response.data
  },
  (error) => {
    if (error.response) {
      const { status, data } = error.response
      
      switch (status) {
        case 401:
          // 清除token并跳转到登录页
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          if (window.location.pathname !== '/login') {
            window.location.href = '/login'
          }
          break
        case 403:
          console.error('权限不足')
          break
        case 404:
          console.error('请求的资源不存在')
          break
        case 500:
          console.error('服务器内部错误')
          break
        default:
          console.error('请求错误', data)
      }
      
      // 返回统一的错误格式
      return Promise.reject({
        success: false,
        error: data?.error || '请求失败',
        message: data?.message || '网络错误'
      })
    } else if (error.request) {
      console.error('网络错误，请检查网络连接')
      return Promise.reject({
        success: false,
        error: 'network_error',
        message: '网络连接失败，请检查网络'
      })
    } else {
      console.error('请求配置错误', error.message)
      return Promise.reject({
        success: false,
        error: 'config_error',
        message: error.message
      })
    }
  }
)

// 认证相关API - 匹配后端路由结构
export const authAPI = {
  // 注册 - POST /api/auth/register
  register: (data) => api.post('/api/auth/register', data),
  
  // 登录 - POST /api/auth/login
  login: (data) => api.post('/api/auth/login', data),
  
  // 获取用户信息 - GET /api/users/profile
  getProfile: () => api.get('/api/users/profile'),
  
  // 登出（前端清除token即可）
  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }
}

// 健康检查API
export const healthAPI = {
  check: () => api.get('/health')
}

// 导出axios实例以供其他服务使用
export default api