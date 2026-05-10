import { RouteRecordRaw } from 'vue-router'
import SourceDirs from './views/SourceDirs.vue'
import Gallery from './views/Gallery.vue'
import Settings from './views/Settings.vue'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'gallery',
    component: Gallery
  },
  {
    path: '/source-dirs',
    name: 'sourceDirs',
    component: SourceDirs
  },
  {
    path: '/settings',
    name: 'settings',
    component: Settings
  }
]

export default routes