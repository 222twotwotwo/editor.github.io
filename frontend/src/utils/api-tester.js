import { authAPI, healthAPI } from '@/services/api'

export const testBackendConnection = async () => {
  console.log('🧪 开始测试前后端连接...')
  
  try {
    // 1. 测试健康检查
    console.log('1️⃣ 测试健康检查...')
    const healthResult = await healthAPI.check()
    console.log('✅ 健康检查结果:', healthResult)
    
    // 2. 测试登录
    console.log('2️⃣ 测试用户登录...')
    const loginResult = await authAPI.login({
      username: 'admin',
      password: 'password123'
    })
    
    console.log('登录响应:', loginResult)
    
    if (loginResult.success) {
      console.log('✅ 登录成功！')
      console.log('用户信息:', loginResult.data.user)
      
      // 3. 测试获取用户信息
      console.log('3️⃣ 测试获取用户信息...')
      const profileResult = await authAPI.getProfile()
      console.log('✅ 用户信息:', profileResult.data)
      
      return {
        success: true,
        health: healthResult,
        login: loginResult,
        profile: profileResult
      }
    } else {
      console.error('❌ 登录失败:', loginResult.error)
      return {
        success: false,
        error: loginResult.error
      }
    }
  } catch (error) {
    console.error('❌ 连接测试失败:', error)
    return {
      success: false,
      error: error.message || error
    }
  }
}

// 在浏览器控制台使用
window.testConnection = testBackendConnection