import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import { createI18n } from 'vue-i18n'
import naive from 'naive-ui'
import App from './App.vue'
import routes from './routes'
import { setupErrorHandler } from './utils/errorHandler'
import './styles/responsive.css'
import { useAuthStore } from './stores/auth'

const i18n = createI18n({
  legacy: false,
  locale: 'zh-CN',
  messages: {
    'zh-CN': {
      appTitle: 'NAS 照片管理',
      settings: '设置',
      gallery: '照片库',
      import: '导入',
      export: '导出',
      name: '名称',
      cancel: '取消',
      confirm: '确认',
      delete: '删除',
      save: '保存',
      ok: '确定',
      error: '错误',
      success: '成功',
      loading: '加载中...',
      search: '搜索...',
      noResults: '暂无数据',
      organizePattern: '目录组织方式',
      organizeByDate: '按日期',
      organizeByType: '按类型',
      keepOriginal: '保持原结构',
      duplicateStrategy: '重复文件处理',
      skipDuplicate: '跳过',
      overwriteDuplicate: '覆盖',
      renameDuplicate: '重命名',
      allTypes: '全部类型',
      photo: '图片',
      video: '视频',
      photos: '张',
      allLoaded: '已加载全部'
    },
    'en': {
      appTitle: 'NAS Photo Manager',
      settings: 'Settings',
      gallery: 'Gallery',
      import: 'Import',
      export: 'Export',
      name: 'Name',
      cancel: 'Cancel',
      confirm: 'Confirm',
      delete: 'Delete',
      save: 'Save',
      ok: 'OK',
      error: 'Error',
      success: 'Success',
      loading: 'Loading...',
      search: 'Search...',
      noResults: 'No results',
      organizePattern: 'Organize Pattern',
      organizeByDate: 'By Date',
      organizeByType: 'By Type',
      keepOriginal: 'Keep Original',
      duplicateStrategy: 'Duplicate Handling',
      skipDuplicate: 'Skip',
      overwriteDuplicate: 'Overwrite',
      renameDuplicate: 'Rename',
      allTypes: 'All Types',
      photo: 'Photo',
      video: 'Video',
      photos: 'items',
      allLoaded: 'All Loaded'
    }
  }
})

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫 - 认证检查
router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore()

  // 公开访问的页面
  if (to.meta.noAuth) {
    next()
    return
  }

  // 还没加载用户信息时，先加载
  if (!authStore.user && !authStore.loading) {
    try {
      const hasUsers = await authStore.checkSystemStatus()
      // 还没初始化，跳转到登录页（初始化向导）
      if (!hasUsers) {
        next('/login')
        return
      }
      const user = await authStore.fetchCurrentUser()
      if (!user) {
        next('/login')
        return
      }
    } catch {
      // 出错时让用户去登录页
      next('/login')
      return
    }
  }

  // 需要认证但没登录
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next('/login')
    return
  }

  // 需要管理员权限
  if (to.meta.requiresAdmin && !authStore.user?.isAdmin) {
    next('/')
    return
  }

  next()
})

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(i18n)
app.use(naive)
setupErrorHandler(app)

app.mount('#app')