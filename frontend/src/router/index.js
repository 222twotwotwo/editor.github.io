import { createRouter, createWebHistory } from 'vue-router'
import { useAuth } from '@/composables/useAuth'

// 懒加载组件
const LoginView = () => import('@/views/LoginView.vue')
const EditorView = () => import('@/views/EditorView.vue')
const WindowedEditorView = () => import('@/views/WindowedEditorView.vue')
const CommunityView = () => import('@/views/CommunityView.vue')

const routes = [
  {
    path: '/',
    redirect: '/windowed'
  },
  {
    path: '/login',
    name: 'Login',
    component: LoginView,
    meta: { requiresGuest: true }
  },
  {
    path: '/editor',
    name: 'Editor',
    component: EditorView
  },
  {
    path: '/windowed',
    name: 'WindowedEditor',
    component: WindowedEditorView
  },
  {
    path: '/community',
    name: 'Community',
    component: CommunityView
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/windowed'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫：仅登录页要求未登录时才能访问（已登录则跳转编辑页）
router.beforeEach((to, from, next) => {
  const { isAuthenticated } = useAuth()
  if (to.meta.requiresGuest && isAuthenticated.value) {
    next('/editor')
    return
  }
  next()
})

export default router