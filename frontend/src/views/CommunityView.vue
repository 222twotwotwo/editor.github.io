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
        <button class="btn" @click="toggleViewMode" :title="viewMode === 'grid' ? '切换到词云' : '切换到网格'">
          <span class="nav-icon">{{ viewMode === 'grid' ? '☁️' : '📰' }}</span>
          <span>{{ viewMode === 'grid' ? '词云' : '网格' }}</span>
        </button>
        <button class="btn refresh-btn" :disabled="loading" @click="fetchPosts">
          <span class="nav-icon">{{ loading ? '⏳' : '🔄' }}</span>
          <span>刷新</span>
        </button>
        <button
          class="btn login-btn"
          @click="handleAccountAction"
        >
          <span class="nav-icon">{{ isAuthenticated ? '🚪' : '👤' }}</span>
          <span>{{ isAuthenticated ? '登出' : '登录' }}</span>
        </button>
        <button class="btn theme-btn" @click="toggleTheme">
          <span class="nav-icon">{{ themeIcon }}</span>
        </button>
      </div>
    </header>

    <!-- 主内容区（参考根目录 index 的 container + content 结构） -->
    <main class="home-main content">
      <section class="home-banner header">
        <h1 class="header-title">创作者交流社区</h1>
        <p>{{ viewMode === 'cloud' ? '词云模式 · 卡片可带配图背景，点赞越多卡片越大，支持悬浮动画' : '展示所有用户的 Markdown 文档，点击卡片查看详情（支持 MD 渲染），登录后可多次点赞。' }}</p>
      </section>

      <!-- 加载/错误状态 -->
      <div v-if="loading && !posts.length" class="list-state">加载中…</div>
      <div v-else-if="error" class="list-state list-state-error">{{ error }}</div>

      <!-- 网格模式 -->
      <div v-else-if="viewMode === 'grid'" class="list posts-list">
        <div
          v-for="post in posts"
          :key="post.id"
          class="list-item post-card"
          :class="{ 'post-card-has-bg': post.media_type === 'image' && post.media_url }"
          :style="getGridCardStyle(post)"
          @click="openModal(post)"
        >
          <div class="post-card-inner">
          <div class="post-header">
            <img
              :src="post.author_avatar || defaultAvatar(post.author_name)"
              :alt="post.author_name"
              class="avatar"
            />
            <div class="post-info">
              <span class="author-name">{{ post.author_name || '匿名' }}</span>
              <span class="post-time">{{ formatTime(post.created_at) }}</span>
            </div>
            <span v-if="post.media_type" class="post-tag">{{ post.media_type === 'video' ? '视频' : '图片' }}</span>
            <span v-else class="post-tag post-tag-md">MD</span>
          </div>
          <h3 class="item-title">{{ post.title }}</h3>
          <p class="item-desc">{{ shortContent(post.content) }}</p>
          <!-- 列表缩略：有图/视频时显示小图或占位 -->
          <div v-if="post.media_url" class="post-media-thumb">
            <img
              v-if="post.media_type === 'image'"
              :src="post.media_url"
              :alt="post.title"
              class="thumb-img"
              loading="lazy"
            />
            <div v-else-if="post.media_type === 'video'" class="thumb-video">
              <span class="thumb-video-icon">▶</span> 视频
            </div>
          </div>
          <div class="post-footer">
            <button
              class="action-btn"
              :class="{ liked: post._liked }"
              :disabled="!isAuthenticated"
              @click.stop="handleLike(post)"
            >
              <span class="action-icon">❤️</span>
              {{ post.likes_count ?? post.likes }}
            </button>
            <button class="action-btn" disabled>
              <span class="action-icon">💬</span>
              {{ post.comments_count ?? post.comments ?? 0 }}
            </button>
          </div>
          </div>
        </div>
      </div>

      <!-- 词云模式：悬浮卡片、背景图、按点赞缩放 -->
      <div v-else class="cloud-container">
        <div
          v-for="post in posts"
          :key="post.id"
          class="cloud-item"
          :style="getCloudItemStyle(post)"
          @click="openModal(post)"
        >
          <div class="cloud-header">
            <span class="cloud-author">{{ post.author_name || '匿名' }}</span>
            <span v-if="post.media_type" class="cloud-media-tag">{{ post.media_type === 'video' ? '🎬' : '🖼️' }}</span>
            <span v-else class="cloud-media-tag">MD</span>
          </div>
          <h3 class="cloud-title" :style="{ fontSize: `calc(1.1em * ${getFactor(post)})` }">{{ post.title }}</h3>
          <div class="cloud-footer">
            <button
              class="action-btn cloud-like-btn"
              :class="{ liked: post._liked }"
              :disabled="!isAuthenticated"
              @click.stop="handleLike(post)"
            >
              <span class="action-icon">❤️</span>
              {{ post.likes_count ?? post.likes }}
            </button>
          </div>
          <div class="cloud-glow" aria-hidden="true"></div>
        </div>
      </div>

      <!-- 详情弹窗（参考 index 的 modal） -->
      <div
        class="modal"
        :class="{ 'modal-visible': detailPost }"
        @click.self="closeModal"
      >
        <div class="modal-content">
          <span class="close-btn" @click="closeModal">&times;</span>
          <template v-if="detailPost">
            <div class="modal-header">
              <img
                :src="detailPost.author_avatar || defaultAvatar(detailPost.author_name)"
                :alt="detailPost.author_name"
                class="avatar"
              />
              <div class="post-info">
                <span class="author-name">{{ detailPost.author_name || '匿名' }}</span>
                <span class="post-time">{{ formatTime(detailPost.created_at) }}</span>
              </div>
            </div>
            <h2 class="modal-title">{{ detailPost.title }}</h2>
            <div class="modal-desc markdown-body" v-html="markdownToHtml(detailPost.content || '')"></div>
            <!-- 详情中的图片/视频（文档型贴文无此项） -->
            <div v-if="detailPost.media_url" class="modal-media">
              <img
                v-if="detailPost.media_type === 'image'"
                :src="detailPost.media_url"
                :alt="detailPost.title"
                class="modal-media-img"
              />
              <video
                v-else-if="detailPost.media_type === 'video'"
                :src="detailPost.media_url"
                controls
                class="modal-media-video"
              />
            </div>
            <div class="modal-footer">
              <button
                class="action-btn"
                :class="{ liked: detailPost._liked }"
                :disabled="!isAuthenticated"
                @click="handleLike(detailPost)"
              >
                <span class="action-icon">❤️</span>
                {{ detailPost.likes_count ?? detailPost.likes }}
              </button>
              <span class="action-btn static">
                <span class="action-icon">💬</span>
                {{ detailPost.comments_count ?? detailPost.comments ?? 0 }} 评论
              </span>
            </div>
          </template>
        </div>
      </div>
    </main>

    <footer class="home-footer">
      <p>© 2025 轻量编辑器 - 词云悬浮 · 点赞无上限 · 社区交流</p>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { useTheme } from '../composables/useTheme'
import { postAPI } from '../services/api'
import { markdownToHtml } from '../utils/markdownParser'
import '../styles/community.css'

const router = useRouter()
const { isAuthenticated, logout } = useAuth()
const { theme, toggleTheme } = useTheme()
const themeIcon = computed(() => (theme.value === 'dark' ? '☀️' : '🌙'))

const viewMode = ref('cloud') // 'grid' | 'cloud'，默认词云
const posts = ref([])
const loading = ref(false)
const error = ref(null)
const detailPost = ref(null)

function toggleViewMode() {
  viewMode.value = viewMode.value === 'grid' ? 'cloud' : 'grid'
}

const maxLikes = computed(() => {
  if (!posts.value.length) return 1
  return Math.max(...posts.value.map((p) => p.likes_count ?? 0), 1)
})

function getFactor(post) {
  const likes = post.likes_count ?? 0
  const minF = 0.7
  const maxF = 2.3
  const factor = minF + (likes / maxLikes.value) * (maxF - minF)
  return Math.min(Math.max(factor, minF), maxF)
}

function getCloudItemStyle(post) {
  const factor = getFactor(post)
  let width = 180 * factor
  width = Math.min(Math.max(width, 130), 400)
  const baseFont = 14
  const fontSize = baseFont * factor
  const style = {
    width: `${width}px`,
    fontSize: `${fontSize}px`,
    '--rotate': `${post._rotate ?? 0}deg`,
    animationDelay: `${post._delay ?? 0}s`,
  }
  if (post.media_type === 'image' && post.media_url) {
    style.backgroundImage = `url(${post.media_url})`
    style.backgroundColor = 'transparent'
  } else {
    style.backgroundImage = 'none'
    style.backgroundColor = ''
  }
  return style
}

function getGridCardStyle(post) {
  if (post.media_type === 'image' && post.media_url) {
    return {
      backgroundImage: `url(${post.media_url})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundColor: 'transparent',
    }
  }
  return {}
}

const defaultAvatar = (name) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name || '匿名')}&background=random`

// 列表摘要：剥离 Markdown 符号后取前 max 字符
function shortContent(text, max = 60) {
  if (!text) return ''
  const stripped = text
    .replace(/#{1,6}\s?/g, '')
    .replace(/\*\*?([^*]+)\*\*?/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^\s*[-*+]\s/gm, '')
    .replace(/\n+/g, ' ')
    .trim()
  return stripped.length <= max ? stripped : stripped.slice(0, max) + '…'
}

function formatTime(createdAt) {
  if (!createdAt) return ''
  const date = new Date(createdAt)
  const now = new Date()
  const diff = (now - date) / 1000
  if (diff < 60) return '刚刚'
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`
  if (diff < 604800) return `${Math.floor(diff / 86400)} 天前`
  return date.toLocaleDateString('zh-CN')
}

async function fetchPosts() {
  loading.value = true
  error.value = null
  try {
    const res = await postAPI.list({ page: 1, limit: 30 })
    if (res?.success && res?.data?.list) {
      posts.value = (res.data.list || []).map((p) => ({
        ...p,
        _liked: false,
        _rotate: parseFloat((Math.random() * 14 - 7).toFixed(1)),
        _delay: parseFloat((Math.random() * 3).toFixed(1)),
      }))
    } else {
      posts.value = []
      error.value = '加载帖子列表失败'
    }
  } catch (e) {
    posts.value = []
    error.value = e?.message || e?.error || '网络错误，请稍后重试'
  } finally {
    loading.value = false
  }
}

function openModal(post) {
  detailPost.value = post
}

function closeModal() {
  detailPost.value = null
}

async function handleLike(post) {
  if (!isAuthenticated.value) return
  const prevCount = post.likes_count ?? post.likes ?? 0
  const prevLiked = post._liked
  // 即时反馈：先更新 UI
  post._liked = true
  post.likes_count = prevCount + 1
  if (detailPost.value && detailPost.value.id === post.id) {
    detailPost.value._liked = true
    detailPost.value.likes_count = post.likes_count
  }
  try {
    const res = await postAPI.like(post.id)
    if (res?.success && res?.data?.likes_count != null) {
      post.likes_count = res.data.likes_count
      if (detailPost.value && detailPost.value.id === post.id) {
        detailPost.value.likes_count = res.data.likes_count
      }
    } else {
      throw new Error('点赞失败')
    }
  } catch (e) {
    post._liked = prevLiked
    post.likes_count = prevCount
    if (detailPost.value && detailPost.value.id === post.id) {
      detailPost.value._liked = prevLiked
      detailPost.value.likes_count = prevCount
    }
    error.value = e?.message || e?.error || '点赞失败，请重试'
    setTimeout(() => { error.value = null }, 2000)
  }
}

function goToEditor() {
  router.push('/editor')
}

function handleAccountAction() {
  if (isAuthenticated.value) {
    if (confirm('确定要退出登录吗？')) logout()
  } else {
    router.push('/login')
  }
}

onMounted(() => {
  fetchPosts()
})
</script>

<style scoped>
.community-container {
  min-height: 100vh;
  background-color: var(--bg);
  color: var(--text);
}

.list-state {
  text-align: center;
  padding: 40px 20px;
  color: var(--text);
  opacity: 0.8;
}

.list-state-error {
  color: #e74c3c;
}

/* 参考根目录 style.css：列表网格 */
.content {
  min-height: calc(100vh - 120px);
}

.list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.list-item {
  position: relative;
  background: var(--panel);
  background-size: cover;
  background-position: center;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  border: 1px solid var(--border);
  overflow: hidden;
}

.list-item.post-card-has-bg::after {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 8px;
  z-index: 0;
  pointer-events: none;
}

.list-item .post-card-inner {
  position: relative;
  z-index: 1;
}

.list-item.post-card-has-bg .post-header,
.list-item.post-card-has-bg .item-title,
.list-item.post-card-has-bg .item-desc,
.list-item.post-card-has-bg .post-tag,
.list-item.post-card-has-bg .author-name,
.list-item.post-card-has-bg .post-time {
  color: #fff;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
}

.list-item.post-card-has-bg .post-media-thumb {
  display: none;
}

.list-item.post-card-has-bg .action-btn {
  color: rgba(255, 255, 255, 0.95);
  border-color: rgba(255, 255, 255, 0.5);
}

.list-item.post-card-has-bg .action-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
}

.list-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

[data-theme="dark"] .list-item {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
}

[data-theme="dark"] .list-item:hover {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
}

.item-title {
  font-size: 18px;
  font-weight: 500;
  margin-bottom: 10px;
  color: var(--text);
}

.item-desc {
  font-size: 14px;
  color: var(--text);
  opacity: 0.75;
  line-height: 1.5;
}

.post-media-thumb {
  margin: 12px 0;
  border-radius: 8px;
  overflow: hidden;
  background: var(--border);
}

.thumb-img {
  width: 100%;
  height: 140px;
  object-fit: cover;
  display: block;
}

.thumb-video {
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text);
  opacity: 0.8;
}

.thumb-video-icon {
  margin-right: 6px;
  font-size: 1.2rem;
}

.post-footer {
  display: flex;
  gap: 12px;
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid var(--border);
}

.action-btn {
  display: inline-flex;
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
  font-size: 0.9rem;
}

.action-btn:hover:not(:disabled):not(.static) {
  background: var(--bg);
  color: #42b983;
  opacity: 1;
}

.action-btn.liked {
  color: #e74c3c;
  opacity: 1;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.action-btn.static {
  cursor: default;
}

.action-icon {
  font-size: 1rem;
  line-height: 1;
}

/* 弹窗：参考根目录 style.css .modal */
.modal {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  align-items: center;
  justify-content: center;
  padding: 20px;
  box-sizing: border-box;
}

.modal-visible {
  display: flex;
}

.modal-content {
  background: var(--panel);
  border-radius: 12px;
  width: 94%;
  max-width: 1100px;
  max-height: 90vh;
  overflow-y: auto;
  padding: 28px 40px;
  position: relative;
  border: 1px solid var(--border);
}

.close-btn {
  position: absolute;
  top: 16px;
  right: 20px;
  font-size: 24px;
  color: var(--text);
  opacity: 0.7;
  cursor: pointer;
  transition: color 0.2s;
}

.close-btn:hover {
  opacity: 1;
}

.modal-header {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

.modal-header .avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  margin-right: 12px;
}

.modal-title {
  font-size: 22px;
  font-weight: 600;
  margin-bottom: 12px;
  color: var(--text);
}

.modal-desc {
  font-size: 16px;
  color: var(--text);
  opacity: 0.9;
  line-height: 1.7;
  margin-bottom: 16px;
}

/* 弹窗内 Markdown 渲染 */
.modal-desc.markdown-body :deep(p) { margin: 0.6em 0; }
.modal-desc.markdown-body :deep(h1),
.modal-desc.markdown-body :deep(h2),
.modal-desc.markdown-body :deep(h3) { margin: 0.8em 0 0.4em; font-size: 1.1em; color: var(--text); }
.modal-desc.markdown-body :deep(ul),
.modal-desc.markdown-body :deep(ol) { margin: 0.6em 0; padding-left: 1.5em; }
.modal-desc.markdown-body :deep(pre) { overflow-x: auto; border-radius: 6px; margin: 0.8em 0; }
.modal-desc.markdown-body :deep(code) { font-family: inherit; padding: 0.2em 0.4em; border-radius: 4px; background: var(--border); }
.modal-desc.markdown-body :deep(pre code) { padding: 12px; display: block; }
.post-tag-md { opacity: 0.85; }

.modal-media {
  margin: 16px 0;
  border-radius: 8px;
  overflow: hidden;
  background: var(--bg);
}

.modal-media-img {
  width: 100%;
  max-height: 70vh;
  object-fit: contain;
  display: block;
}

.modal-media-video {
  width: 100%;
  max-height: 70vh;
  display: block;
}

.modal-footer {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
  display: flex;
  gap: 12px;
  align-items: center;
}

.refresh-btn:disabled {
  opacity: 0.7;
  cursor: wait;
}

/* ========== 词云模式：悬浮卡片、背景图、按点赞缩放 ========== */
.cloud-container {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 30px 28px;
  min-height: 400px;
  padding: 30px 20px;
  border-radius: 40px;
}

.cloud-item {
  position: relative;
  background-color: var(--panel);
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  border-radius: 24px;
  padding: 20px 18px;
  border: 1px solid var(--border);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  color: white;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.2, 0, 0, 1);
  display: flex;
  flex-direction: column;
  transform: rotate(var(--rotate, 0deg));
  animation: cloud-float 6s infinite ease-in-out;
  will-change: transform, box-shadow;
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.5);
}

.cloud-item::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.35);
  border-radius: 24px;
  z-index: 1;
  pointer-events: none;
  transition: background 0.2s;
}

.cloud-item > * {
  position: relative;
  z-index: 2;
}

@keyframes cloud-float {
  0% { transform: translateY(0) rotate(var(--rotate, 0deg)); }
  50% { transform: translateY(-10px) rotate(var(--rotate, 0deg)); }
  100% { transform: translateY(0) rotate(var(--rotate, 0deg)); }
}

.cloud-item:hover {
  transform: scale(1.02) rotate(var(--rotate, 0deg)) !important;
  box-shadow: 0 20px 40px rgba(66, 185, 131, 0.35);
  border-color: #42b983;
  animation-play-state: paused;
}

.cloud-item:hover::after {
  background: rgba(0, 0, 0, 0.25);
}

.cloud-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-size: 0.9em;
  color: white;
  text-shadow: 0 1px 4px black;
}

.cloud-author {
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 70%;
  background: rgba(0, 0, 0, 0.3);
  padding: 2px 10px;
  border-radius: 30px;
  backdrop-filter: blur(2px);
}

.cloud-media-tag {
  font-size: 1.3em;
  background: rgba(0, 0, 0, 0.3);
  padding: 2px 8px;
  border-radius: 30px;
  backdrop-filter: blur(2px);
}

.cloud-title {
  margin: 8px 0 16px;
  font-weight: 700;
  line-height: 1.35;
  color: white;
  text-shadow: 0 2px 8px black;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
}

.cloud-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 4px;
}

.cloud-like-btn {
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  border: 1px solid rgba(255, 255, 255, 0.5);
  color: white !important;
  border-radius: 40px;
  padding: 6px 16px;
  font-weight: 500;
  text-shadow: none;
}

.cloud-like-btn.liked {
  background: rgba(231, 76, 60, 0.7);
  border-color: #ff8a8a;
  color: white !important;
}

.cloud-like-btn:hover:not(:disabled) {
  background: rgba(0, 0, 0, 0.7);
}

.cloud-glow {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border-radius: 24px;
  pointer-events: none;
  background: radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.1) 0%, transparent 80%);
  z-index: 3;
}

.cloud-item:not([style*="background-image"]) {
  color: var(--text);
  text-shadow: none;
}

.cloud-item:not([style*="background-image"]) .cloud-header,
.cloud-item:not([style*="background-image"]) .cloud-title,
.cloud-item:not([style*="background-image"]) .cloud-author,
.cloud-item:not([style*="background-image"]) .cloud-media-tag {
  color: var(--text);
  text-shadow: none;
  background: none;
  backdrop-filter: none;
}

.cloud-item:not([style*="background-image"]) .cloud-author {
  background: var(--border);
  color: var(--text);
}

.cloud-item:not([style*="background-image"]) .cloud-like-btn {
  background: var(--panel);
  color: var(--text) !important;
  border-color: var(--border);
}

.cloud-item:not([style*="background-image"])::after {
  display: none;
}

/* 响应式 */
@media (max-width: 768px) {
  .list {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .cloud-container {
    gap: 20px;
  }

  .modal-content {
    padding: 22px 24px;
    width: 96%;
    max-width: 96%;
  }

  .home-banner.header .header-title {
    font-size: 1.5rem;
  }
}
</style>
