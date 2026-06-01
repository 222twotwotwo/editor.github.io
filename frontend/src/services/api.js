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

// 静默刷新状态：刷新进行中时，并发的 401 请求挂起排队，等新 access token 到手后统一重试
let isRefreshing = false
let pendingQueue = []
const flushQueue = (newToken) => {
  pendingQueue.forEach((cb) => cb(newToken))
  pendingQueue = []
}
const clearAuthStorage = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('refresh_token')
  localStorage.removeItem('user')
}

api.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config
    const status = error.response?.status

    // access token 过期：用 refresh token 静默换新并重试原请求
    if (
      status === 401 &&
      error.response?.data?.error === 'token_expired' &&
      originalRequest &&
      !originalRequest._retried &&
      localStorage.getItem('refresh_token')
    ) {
      originalRequest._retried = true

      // 已有刷新在进行：排队等待，拿到新 token 后重试本请求
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingQueue.push((newToken) => {
            if (!newToken) {
              reject(error)
              return
            }
            originalRequest.headers.Authorization = `Bearer ${newToken}`
            resolve(api(originalRequest))
          })
        })
      }

      isRefreshing = true
      try {
        // 用裸 axios 调用，绕过本拦截器，避免刷新失败时递归
        const resp = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {
          refresh_token: localStorage.getItem('refresh_token')
        })
        const newToken = resp.data?.data?.access_token
        if (!newToken) throw new Error('refresh 响应缺少 access_token')
        localStorage.setItem('token', newToken)
        flushQueue(newToken)
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return api(originalRequest)
      } catch (e) {
        flushQueue(null) // 通知排队请求：刷新失败
        clearAuthStorage()
        if (window.location.pathname !== '/login') {
          window.location.href = '/login'
        }
        return Promise.reject({
          success: false,
          error: 'token_expired',
          message: '登录已过期，请重新登录'
        })
      } finally {
        isRefreshing = false
      }
    }

    if (error.response) {
      const { status, data } = error.response
      switch (status) {
        case 401: {
          const hadToken = !!localStorage.getItem('token')
          clearAuthStorage()
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
  // 通知后端吊销 access + refresh token（refresh_token 放 body，access token 由请求拦截器带 header）。
  // 尽力而为：网络/鉴权失败也不应阻塞本地登出，调用方负责清理本地存储。
  logout: async () => {
    const refreshToken = localStorage.getItem('refresh_token')
    try {
      await api.post('/api/auth/logout', { refresh_token: refreshToken })
    } catch (e) {
      /* 忽略：本地登出照常进行 */
    }
    localStorage.removeItem('token')
    localStorage.removeItem('refresh_token')
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

export const tagAPI = {
  list: () => api.get('/api/tags'),
  create: (data) => api.post('/api/tags', data),
  update: (id, data) => api.put(`/api/tags/${id}`, data),
  delete: (id) => api.delete(`/api/tags/${id}`),
  getDocumentTags: (documentId) => api.get(`/api/documents/${documentId}/tags`),
  addDocumentTag: (documentId, tagId) => api.post(`/api/documents/${documentId}/tags`, { tag_id: tagId }),
  removeDocumentTag: (documentId, tagId) => api.delete(`/api/documents/${documentId}/tags/${tagId}`)
}

export const taskAPI = {
  list: (params = {}) => api.get('/api/tasks', { params }),
  create: (data) => api.post('/api/tasks', data),
  update: (id, data) => api.put(`/api/tasks/${id}`, data),
  delete: (id) => api.delete(`/api/tasks/${id}`),
  updateStatus: (id, status) => api.put(`/api/tasks/${id}`, { status })
}

export default api
