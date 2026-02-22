import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

api.interceptors.request.use(
  (config) => {
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

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response) {
      const { status, data } = error.response
      switch (status) {
        case 401: {
          const hadToken = !!localStorage.getItem('token')
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          // 仅当用户曾登录（有 token）却收到 401 时跳转登录页；游客模式不跳转，可继续浏览
          if (hadToken && window.location.pathname !== '/login') {
            window.location.href = '/login'
          }
          break
        }
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

export const authAPI = {
  register: (data) => api.post('/api/auth/register', data),
  login: (data) => api.post('/api/auth/login', data),
  getProfile: () => api.get('/api/users/profile'),
  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }
}

export const healthAPI = { check: () => api.get('/health') }

export const documentAPI = {
  upload: (data) => api.post('/api/documents/upload', data),
  uploadImage: (formData) => {
    const token = localStorage.getItem('token')
    return api.post('/api/documents/upload-image', formData, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      // 不设置 Content-Type，由浏览器为 FormData 自动添加 multipart/form-data; boundary=...
      transformRequest: [(data, headers) => {
        if (data instanceof FormData) delete headers['Content-Type']
        return data
      }]
    })
  },
  list: () => api.get('/api/documents/list'),
  get: (id) => api.get(`/api/documents/${id}`),
  update: (id, data) => api.put(`/api/documents/${id}`, data),
  delete: (id) => api.delete(`/api/documents/${id}`),
  search: (q) => api.get('/api/documents/search', { params: { q } }),
  stats: () => api.get('/api/documents/stats')
}

export const postAPI = {
  list: (params = {}) => api.get('/api/posts', { params: { page: params.page || 1, limit: params.limit || 20 } }),
  get: (id) => api.get(`/api/posts/${id}`),
  like: (id) => api.post(`/api/posts/${id}/like`)
}

export default api
