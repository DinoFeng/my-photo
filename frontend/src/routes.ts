import { RouteRecordRaw } from 'vue-router'
import Gallery from './views/Gallery.vue'
import Settings from './views/Settings.vue'
import Login from './views/Login.vue'
import ChangePassword from './views/ChangePassword.vue'
import AlbumList from './views/AlbumList.vue'
import AlbumDetail from './views/AlbumDetail.vue'
import UserAdmin from './views/UserAdmin.vue'
import ShareViewer from './views/ShareViewer.vue'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: Login,
    meta: { noAuth: true },
  },
  {
    path: '/change-password',
    name: 'change-password',
    component: ChangePassword,
    meta: { requiresAuth: true },
  },
  {
    path: '/',
    name: 'gallery',
    component: Gallery,
    meta: { requiresAuth: true },
  },
  {
    path: '/albums',
    name: 'albums',
    component: AlbumList,
    meta: { requiresAuth: true },
  },
  {
    path: '/albums/:id',
    name: 'album-detail',
    component: AlbumDetail,
    meta: { requiresAuth: true },
  },
  {
    path: '/settings',
    name: 'settings',
    component: Settings,
    meta: { requiresAuth: true },
  },
  {
    path: '/settings/users',
    name: 'user-admin',
    component: UserAdmin,
    meta: { requiresAuth: true, requiresAdmin: true },
  },
  {
    path: '/share/album/:token',
    name: 'share-viewer',
    component: ShareViewer,
    meta: { noAuth: true },
  },
]

export default routes