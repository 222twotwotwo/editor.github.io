<template>
  <div class="community-container" :data-theme="theme">
    <!-- 顶部导航栏 -->
    <header class="top-bar">
      <div class="logo">
        <span class="logo-icon">💬</span>
        <span>创作社区</span>
      </div>
      <div class="nav-btns">
        <button class="btn" @click="goToEditor">
          <span class="nav-icon">✏️</span>
          <span>去编辑</span>
        </button>
        <button 
          class="btn login-btn"
          @click="goToLogin"
        >
          <span class="nav-icon">👤</span>
          <span>{{ isAuthenticated ? '我的账号' : '登录' }}</span>
        </button>
        <button 
          class="btn theme-btn"
          @click="toggleTheme"
        >
          <span class="nav-icon">{{ themeIcon }}</span>
        </button>
      </div>
    </header>

    <!-- 主内容区 -->
    <main class="home-main">
      <!-- 社区横幅 -->
      <section class="home-banner">
        <h1>创作者交流社区</h1>
        <p>分享你的创作，发现灵感，与其他创作者互动交流。登录后可以发表评论和分享内容。</p>
      </section>

      <!-- 功能卡片 -->
      <section class="function-cards">
        <!-- 热门文章 -->
        <div class="card">
          <div class="card-icon">🔥</div>
          <h3>热门文章</h3>
          <p>浏览社区中最受欢迎的创作内容</p>
        </div>
        
        <!-- 技术分享 -->
        <div class="card">
          <div class="card-icon">💻</div>
          <h3>技术分享</h3>
          <p>编程技巧、工具推荐、经验分享</p>
        </div>
        
        <!-- 灵感展示 -->
        <div class="card">
          <div class="card-icon">✨</div>
          <h3>灵感展示</h3>
          <p>查看其他创作者的作品，获取灵感</p>
        </div>
        
        <!-- 问答互助 -->
        <div class="card" :class="{ 'disabled': !isAuthenticated }">
          <div class="card-icon">❓</div>
          <h3>问答互助</h3>
          <p>{{ isAuthenticated ? '提问或回答技术问题' : '登录后参与问答讨论' }}</p>
        </div>
      </section>

      <!-- 帖子列表 -->
      <section class="posts-section">
        <h2>最新动态</h2>
        <div class="posts-list">
          <div v-for="post in posts" :key="post.id" class="post-card">
            <div class="post-header">
              <img :src="post.author.avatar" :alt="post.author.name" class="avatar">
              <div class="post-info">
                <span class="author-name">{{ post.author.name }}</span>
                <span class="post-time">{{ post.time }}</span>
              </div>
              <span class="post-tag">{{ post.tag }}</span>
            </div>
            <div class="post-content">
              <h3>{{ post.title }}</h3>
              <p>{{ post.content }}</p>
            </div>
            <div class="post-footer">
              <button class="action-btn" :disabled="!isAuthenticated">
                <span class="action-icon">❤️</span>
                {{ post.likes }}
              </button>
              <button class="action-btn" :disabled="!isAuthenticated">
                <span class="action-icon">💬</span>
                {{ post.comments }}
              </button>
              <button class="action-btn" :disabled="!isAuthenticated">
                <span class="action-icon">🔗</span>
                分享
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>

    <!-- 底部版权 -->
    <footer class="home-footer">
      <p>© 2025 轻量编辑器 - 社区交流，灵感碰撞</p>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { useTheme } from '../composables/useTheme'
import '../styles/community.css'

const router = useRouter()
const { isAuthenticated, user } = useAuth()
const { theme, toggleTheme } = useTheme()
const themeIcon = computed(() => theme.value === 'dark' ? '☀️' : '🌙')

// 模拟社区帖子数据
const posts = ref([
  {
    id: 1,
    title: 'Markdown 高级技巧分享',
    content: '分享一些提高写作效率的 Markdown 技巧，包括自定义样式和扩展语法...',
    author: {
      name: '技术达人',
      avatar: 'https://ui-avatars.com/api/?name=技术达人&background=random'
    },
    time: '2小时前',
    tag: '技术',
    likes: 42,
    comments: 8
  },
  {
    id: 2,
    title: '我的第一个 Vue 项目心得',
    content: '记录从零开始搭建 Vue 项目的整个过程和遇到的问题...',
    author: {
      name: 'Vue新手',
      avatar: 'https://ui-avatars.com/api/?name=Vue新手&background=random'
    },
    time: '1天前',
    tag: '学习',
    likes: 28,
    comments: 5
  },
  {
    id: 3,
    title: '如何设计优雅的代码高亮',
    content: '探讨不同编程语言的代码高亮方案和颜色搭配技巧...',
    author: {
      name: '设计师',
      avatar: 'https://ui-avatars.com/api/?name=设计师&background=random'
    },
    time: '3天前',
    tag: '设计',
    likes: 56,
    comments: 12
  }
])

const goToEditor = () => {
  router.push('/editor')
}

const goToLogin = () => {
  if (isAuthenticated.value) {
    // 已登录，可以跳转到个人中心或其他页面
    alert('已登录，用户: ' + (user.value?.username || '用户'))
  } else {
    router.push('/login')
  }
}
</script>

<style scoped>
.community-container {
  min-height: 100vh;
  background-color: var(--bg);
  color: var(--text);
}

.disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.disabled:hover {
  transform: none !important;
}

.posts-section {
  margin-top: 60px;
}

.posts-section h2 {
  font-size: 1.8rem;
  margin-bottom: 30px;
  color: var(--text);
}

.posts-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.post-card {
  background: var(--panel);
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
  transition: all 0.3s ease;
}

.post-card:hover {
  box-shadow: 0 4px 20px rgba(0,0,0,0.1);
}

.post-header {
  display: flex;
  align-items: center;
  margin-bottom: 15px;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  margin-right: 12px;
}

.post-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.author-name {
  font-weight: 600;
  color: var(--text);
}

.post-time {
  font-size: 0.85rem;
  color: var(--text);
  opacity: 0.7;
}

.post-tag {
  background: var(--border);
  color: var(--text);
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.85rem;
  opacity: 0.8;
}

.post-content h3 {
  margin: 0 0 10px 0;
  color: var(--text);
}

.post-content p {
  color: var(--text);
  opacity: 0.8;
  line-height: 1.6;
  margin: 0;
}

.post-footer {
  display: flex;
  gap: 20px;
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid var(--border);
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: 1px solid var(--border);
  color: var(--text);
  opacity: 0.7;
  cursor: pointer;
  padding: 6px 12px;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.action-btn:hover:not(:disabled) {
  background: var(--bg);
  color: #42b983;
  opacity: 1;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn {
  display: flex;
  align-items: center;
  gap: 6px;
}

.nav-icon {
  font-size: 1.1rem;
  line-height: 1;
}

.action-icon {
  font-size: 1rem;
  line-height: 1;
}

.login-btn {
  background: #42b983 !important;
  color: white !important;
  border: 1px solid #42b983 !important;
}

.login-btn:hover {
  background: #3aa876 !important;
}
</style>