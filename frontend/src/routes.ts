import { RouteRecordRaw } from 'vue-router'
import Gallery from './views/Gallery.vue'
import Settings from './views/Settings.vue'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'gallery',
    component: Gallery
  },
  {
    path: '/settings',
    name: 'settings',
    component: Settings
  }
]

export default routes