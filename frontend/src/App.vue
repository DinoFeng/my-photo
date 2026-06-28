<template>
  <div v-if="isSharePage" class="share-root">
    <n-message-provider>
      <router-view />
    </n-message-provider>
  </div>
  <div v-else class="app-layout">
    <aside class="sidebar">
      <div class="logo">
        <Image class="icon" :size="24" />
        <span>{{ t('appTitle') }}</span>
      </div>
      <nav class="nav">
        <router-link to="/" class="nav-item" :class="{ active: $route.name === 'gallery' }">
          <LayoutGrid :size="20" />
          <span>{{ t('gallery') }}</span>
        </router-link>
        <router-link to="/albums" class="nav-item" :class="{ active: $route.name === 'albums' || $route.name === 'album-detail' }">
          <Folder :size="20" />
          <span>相册</span>
        </router-link>
        <router-link to="/settings" class="nav-item" :class="{ active: $route.name === 'settings' }">
          <Settings :size="20" />
          <span>{{ t('settings') }}</span>
        </router-link>
        <router-link v-if="currentUser?.isAdmin" to="/settings/users" class="nav-item" :class="{ active: $route.name === 'user-admin' }">
          <Users :size="20" />
          <span>用户管理</span>
        </router-link>
      </nav>

      <div v-if="currentUser" class="user-section">
        <div class="user-card">
          <div class="user-avatar">{{ currentUser.avatarEmoji }}</div>
          <div class="user-name">{{ currentUser.displayName }}</div>
          <button class="logout-btn" @click="doLogout">退出</button>
        </div>
      </div>
    </aside>
    <main class="main-content">
      <n-message-provider class="message-provider-wrapper">
        <router-view />
      </n-message-provider>
    </main>
    <RecentScanThumbnails />
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { onMounted, onUnmounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Image, LayoutGrid, Settings, Folder, Users } from 'lucide-vue-next'
import { useMonitorStore } from './stores/monitorStore'
import RecentScanThumbnails from './components/RecentScanThumbnails.vue'
import { useAuthStore } from './stores/auth'

const { t } = useI18n()
const monitorStore = useMonitorStore()
const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()

const currentUser = computed(() => authStore.user)
const isSharePage = computed(() => route.name === 'share-viewer')

async function doLogout() {
  await authStore.logout()
  router.push('/login')
}

onMounted(() => {
  monitorStore.connect()
})

onUnmounted(() => {
  monitorStore.disconnect()
})
</script>

<style>
html, body {
  height: 100%;
  overflow: hidden;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
}

.share-root {
  min-height: 100vh;
}

.app-layout {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
}

.sidebar {
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  width: 220px;
  background: #1e1e2e;
  color: #cdd6f4;
  display: flex;
  flex-direction: column;
  padding: 16px;
  overflow: hidden;
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 24px;
  padding: 8px;
}

.icon {
  color: #89b4fa;
}

.nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  color: #cdd6f4;
  text-decoration: none;
  transition: background 0.2s;
  font-size: 14px;
}

.nav-item:hover {
  background: rgba(137, 180, 250, 0.1);
}

.nav-item.active {
  background: rgba(137, 180, 250, 0.2);
  color: #89b4fa;
}

.user-section {
  border-top: 1px solid #313244;
  padding-top: 16px;
}

.user-card {
  background: rgba(0, 0, 0, 0.2);
  padding: 12px;
  border-radius: 8px;
}

.user-avatar {
  font-size: 24px;
  text-align: center;
  margin-bottom: 6px;
}

.user-name {
  text-align: center;
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 10px;
}

.logout-btn {
  width: 100%;
  padding: 6px 12px;
  background: #45475a;
  color: #cdd6f4;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  transition: background 0.2s;
}

.logout-btn:hover {
  background: #585b70;
}

.main-content {
  position: absolute;
  top: 0;
  left: 220px;
  right: 0;
  bottom: 0;
  background: #181825;
  overflow: hidden;
}

.main-content > * {
  height: 100%;
  width: 100%;
}

.message-provider-wrapper {
  height: 100%;
  width: 100%;
  overflow: hidden;
}

/* 穿透：只影响直接的容器层级，不影响内容元素 */
.message-provider-wrapper :deep(.n-message-provider) {
  height: 100%;
  width: 100%;
  overflow: hidden;
}

/* 只影响直接的容器 div，不影响 button/span 等内容元素 */
.message-provider-wrapper :deep(.n-message-provider) > div {
  height: 100%;
  width: 100%;
  overflow: hidden;
}
</style>