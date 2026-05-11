import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import { createI18n } from 'vue-i18n'
import App from './App.vue'
import routes from './routes'
import { setupErrorHandler } from './utils/errorHandler'
import './styles/responsive.css'

const i18n = createI18n({
  legacy: false,
  locale: 'zh-CN',
  messages: {
    'zh-CN': {
      appTitle: 'NAS 照片管理',
      sourceDirs: '源目录管理',
      settings: '设置',
      gallery: '照片库',
      import: '导入',
      export: '导出',
      addDirectory: '添加目录',
      scan: '扫描',
      name: '名称',
      path: '路径',
      status: '状态',
      progress: '进度',
      lastScanned: '最后扫描',
      actions: '操作',
      cancel: '取消',
      confirm: '确认',
      delete: '删除',
      edit: '编辑',
      save: '保存',
      ok: '确定',
      error: '错误',
      success: '成功',
      loading: '加载中...',
      search: '搜索...',
      noResults: '暂无数据',
      scanInProgress: '扫描进行中',
      scanCompleted: '扫描完成',
      scanFailed: '扫描失败',
      idle: '空闲'
    },
    'en': {
      appTitle: 'NAS Photo Manager',
      sourceDirs: 'Source Directories',
      settings: 'Settings',
      gallery: 'Gallery',
      import: 'Import',
      export: 'Export',
      addDirectory: 'Add Directory',
      scan: 'Scan',
      name: 'Name',
      path: 'Path',
      status: 'Status',
      progress: 'Progress',
      lastScanned: 'Last Scanned',
      actions: 'Actions',
      cancel: 'Cancel',
      confirm: 'Confirm',
      delete: 'Delete',
      edit: 'Edit',
      save: 'Save',
      ok: 'OK',
      error: 'Error',
      success: 'Success',
      loading: 'Loading...',
      search: 'Search...',
      noResults: 'No results',
      scanInProgress: 'Scanning',
      scanCompleted: 'Scan Completed',
      scanFailed: 'Scan Failed',
      idle: 'Idle'
    }
  }
})

const router = createRouter({
  history: createWebHistory(),
  routes
})

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(i18n)
setupErrorHandler(app)

app.mount('#app')