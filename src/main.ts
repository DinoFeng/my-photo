import { createApp } from 'vue'
import { Quasar, Dialog, Notify, Loading } from 'quasar'
import { createPinia } from 'pinia'
import { createRouter, createWebHashHistory } from 'vue-router'
import App from './App.vue'
import 'quasar/dist/quasar.css'
import '@quasar/extras/roboto-font/roboto-font.css'
import '@quasar/extras/material-icons/material-icons.css'
import './css/app.scss'

const routes = [
  { path: '/', component: () => import('./pages/Index.vue') },
  { path: '/albums', component: () => import('./pages/Albums.vue') },
  { path: '/photo/:id', component: () => import('./pages/PhotoDetail.vue') },
  { path: '/settings', component: () => import('./pages/Settings.vue') },
  { path: '/import', component: () => import('./pages/Import.vue') }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

const app = createApp(App)
const pinia = createPinia()

app.use(Quasar, {
  plugins: {
    Dialog,
    Notify,
    Loading
  }
})
app.use(pinia)
app.use(router)

app.mount('#q-app')
