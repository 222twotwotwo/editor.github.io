// 环境配置
export const config = {
  // API基础URL
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080',
  
  // 应用配置
  appName: import.meta.env.VITE_APP_TITLE || 'Markdown Editor',
  appVersion: import.meta.env.VITE_APP_VERSION || '1.0.0',
  
  // 调试模式
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
  
  // 获取完整API路径
  getApiUrl(path) {
    return `${this.apiBaseUrl}${path.startsWith('/') ? path : '/' + path}`
  }
}

// 导出默认配置
export default config