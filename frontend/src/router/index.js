import { createRouter, createWebHistory } from 'vue-router'
import { useAuth } from '@/composables/useAuth'

// 懒加载组件
const LoginView = () => import('@/views/LoginView.vue')
const EditorView = () => import('@/views/EditorView.vue')
const CommunityView = () => import('@/views/CommunityView.vue')

const routes = [
  {
    path: '/',
    redirect: '/editor',
    meta: { requiresAuth: true }
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
    component: EditorView,
    meta: { requiresAuth: true }
  },
  {
    path: '/community',
    name: 'Community',
    component: CommunityView,
    meta: { requiresAuth: true }
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/editor'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
  const { isAuthenticated } = useAuth()
  
  // 检查路由是否需要认证
  if (to.meta.requiresAuth && !isAuthenticated.value) {
    next('/login')
    return
  }
  
  // 检查路由是否要求未登录（如登录页）
  if (to.meta.requiresGuest && isAuthenticated.value) {
    next('/editor')
    return
  }
  
  next()
})

export default router