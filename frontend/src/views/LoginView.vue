<template>
  <div class="login-container">
    <div class="login-page">
      <div class="login-card">
        <!-- 登录标题+图标 -->
        <div class="login-header">
          <div class="login-icon">✏️</div>
          <h1>Editor 编辑器</h1>
          <p>欢迎登录，开始你的编辑工作</p>
        </div>

        <!-- 登录表单 -->
        <form @submit.prevent="handleSubmit" class="login-form">
          <!-- 用户名输入框 -->
          <div class="form-group">
            <label for="username">
              <span class="label-icon">👤</span>
              用户名
            </label>
            <input 
              type="text" 
              v-model="form.username"
              id="username" 
              name="username" 
              placeholder="请输入用户名/手机号"
              autocomplete="off"
              class="login-input"
            >
            <p class="error-message">{{ errors.username }}</p>
          </div>

          <!-- 密码输入框 -->
          <div class="form-group">
            <div class="password-header">
              <label for="password">
                <span class="label-icon">🔒</span>
                密码
              </label>
              <a href="#" class="forgot-password">忘记密码？</a>
            </div>
            <div class="password-input-wrapper">
              <input 
                :type="showPassword ? 'text' : 'password'"
                v-model="form.password"
                id="password" 
                name="password" 
                placeholder="请输入6-16位密码"
                class="login-input"
              >
              <button 
                type="button" 
                @click="togglePassword"
                class="toggle-password"
              >
                {{ showPassword ? '🙈' : '👁️' }}
              </button>
            </div>
            <p class="error-message">{{ errors.password }}</p>
          </div>

          <!-- 记住密码 -->
          <div class="remember-me">
            <input type="checkbox" v-model="form.remember" id="remember">
            <label for="remember">记住密码（7天内免登）</label>
          </div>

          <!-- 登录按钮 -->
          <button 
            type="submit"
            :disabled="loading"
            class="login-button"
          >
            <span class="button-icon">{{ loading ? '⏳' : '🚪' }}</span>
            {{ loading ? '登录中...' : '登录' }}
          </button>

          <!-- 注册入口 -->
          <div class="register-link">
            还没有账号？<a href="#">立即注册</a>
          </div>
        </form>

        <!-- 快速导航：放在表单外，避免被表单拦截点击 -->
        <div class="quick-navigation">
          <button
            type="button"
            @click.prevent="goToEditor"
            class="guest-button"
          >
            继续浏览而不登录 →
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'

const router = useRouter()
const { login, loading } = useAuth()

const form = reactive({
  username: '',
  password: '',
  remember: false
})

const errors = reactive({
  username: '',
  password: ''
})

const showPassword = ref(false)

const togglePassword = () => {
  showPassword.value = !showPassword.value
}

const validateForm = () => {
  let isValid = true
  errors.username = ''
  errors.password = ''

  if (!form.username.trim()) {
    errors.username = '用户名不能为空'
    isValid = false
  } else if (form.username.trim().length < 3) {
    errors.username = '用户名至少3个字符'
    isValid = false
  }

  if (!form.password.trim()) {
    errors.password = '密码不能为空'
    isValid = false
  } else if (form.password.trim().length < 6 || form.password.trim().length > 16) {
    errors.password = '密码长度需在6-16位之间'
    isValid = false
  }

  return isValid
}

const handleSubmit = async () => {
  if (!validateForm()) return

  const result = await login(form.username, form.password, form.remember)

  if (result.success) {
    router.push('/editor')
  } else {
    alert(result.error || '登录失败，请检查用户名和密码')
  }
}

const goToEditor = () => {
  router.push('/editor')
}
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}

.login-page {
  width: 100%;
  max-width: 400px;
  padding: 20px;
}

.login-card {
  background: rgba(30, 41, 59, 0.95);
  border-radius: 16px;
  padding: 40px 32px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
}

.login-header {
  text-align: center;
  margin-bottom: 40px;
}

.login-icon {
  font-size: 48px;
  margin-bottom: 20px;
  display: block;
}

.login-header h1 {
  font-size: 28px;
  font-weight: 700;
  color: white;
  margin: 0 0 10px 0;
}

.login-header p {
  color: #94a3b8;
  font-size: 15px;
  margin: 0;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group label {
  color: #cbd5e1;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.label-icon {
  font-size: 16px;
}

.password-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.forgot-password {
  color: #60a5fa;
  font-size: 13px;
  text-decoration: none;
}

.forgot-password:hover {
  text-decoration: underline;
}

.password-input-wrapper {
  position: relative;
}

.login-input {
  width: 100%;
  padding: 14px 16px;
  background: rgba(15, 23, 42, 0.9);
  border: 1px solid #334155;
  border-radius: 8px;
  color: #f1f5f9;
  font-size: 15px;
  transition: all 0.2s;
  box-sizing: border-box;
}

.login-input::placeholder {
  color: #64748b;
}

.login-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
}

.toggle-password {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  font-size: 18px;
  padding: 4px;
}

.toggle-password:hover {
  color: #cbd5e1;
}

.error-message {
  color: #f87171;
  font-size: 12px;
  margin: 6px 0 0 0;
  min-height: 20px;
}

.remember-me {
  display: flex;
  align-items: center;
  gap: 10px;
}

.remember-me input[type="checkbox"] {
  width: 18px;
  height: 18px;
  accent-color: #3b82f6;
}

.remember-me label {
  color: #94a3b8;
  font-size: 14px;
  cursor: pointer;
  margin: 0;
}

.login-button {
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 16px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.login-button:hover:not(:disabled) {
  background: #2563eb;
  transform: translateY(-1px);
}

.login-button:active:not(:disabled) {
  transform: translateY(0);
}

.login-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.button-icon {
  font-size: 18px;
}

.register-link {
  text-align: center;
  color: #94a3b8;
  font-size: 14px;
}

.register-link a {
  color: #60a5fa;
  text-decoration: none;
  font-weight: 500;
}

.register-link a:hover {
  text-decoration: underline;
}

.quick-navigation {
  text-align: center;
}

.guest-button {
  background: transparent;
  border: none;
  color: #94a3b8;
  font-size: 14px;
  cursor: pointer;
  padding: 8px;
  transition: color 0.2s;
}

.guest-button:hover {
  color: #60a5fa;
}

/* 响应式调整 */
@media (max-width: 480px) {
  .login-page {
    padding: 10px;
  }
  
  .login-card {
    padding: 30px 20px;
  }
  
  .login-header h1 {
    font-size: 24px;
  }
  
  .login-icon {
    font-size: 40px;
  }
}
</style>