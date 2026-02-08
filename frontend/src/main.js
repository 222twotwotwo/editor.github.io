import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './styles/main.css'
import './styles/community.css'
import config from './config/env'

// 创建Vue应用
const app = createApp(App)

// 使用路由
app.use(router)

// 全局属性 - 配置
app.config.globalProperties.$config = config

// 挂载应用
app.mount('#app')

// 全局错误处理
app.config.errorHandler = (err, instance, info) => {
  console.error('Vue Error:', err)
  console.error('Component:', instance)
  console.error('Error info:', info)
  
  // 在开发模式下显示更详细的错误信息
  if (config.isDevelopment) {
    alert(`Vue Error: ${err.message}\n\nCheck console for details.`)
  }
}

// 全局属性
app.config.globalProperties.$filters = {
  formatDate(value) {
    if (!value) return ''
    return new Date(value).toLocaleDateString()
  },
  
  formatDateTime(value) {
    if (!value) return ''
    return new Date(value).toLocaleString()
  },
  
  truncate(text, length = 100) {
    if (!text) return ''
    if (text.length <= length) return text
    return text.substring(0, length) + '...'
  }
}

// 开发环境配置
if (config.isDevelopment) {
  console.log('Development Mode Enabled')
  console.log('API Base URL:', config.apiBaseUrl)
  console.log('App Config:', config)
}