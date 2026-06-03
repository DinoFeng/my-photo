<template>
  <div class="app-layout">
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
        <router-link to="/settings" class="nav-item" :class="{ active: $route.name === 'settings' }">
          <Settings :size="20" />
          <span>{{ t('settings') }}</span>
        </router-link>
      </nav>
    </aside>
    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { onMounted, onUnmounted } from 'vue'
import { Image, LayoutGrid, Settings } from 'lucide-vue-next'
import { useMonitorStore } from './stores/monitorStore'

const { t } = useI18n()
const monitorStore = useMonitorStore()

onMounted(() => {
  monitorStore.connect()
})

onUnmounted(() => {
  monitorStore.disconnect()
})
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
}

.app-layout {
  display: flex;
  height: 100vh;
}

.sidebar {
  width: 200px;
  background: #1e1e2e;
  color: #cdd6f4;
  display: flex;
  flex-direction: column;
  padding: 16px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
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
}

.nav-item:hover {
  background: rgba(137, 180, 250, 0.1);
}

.nav-item.active {
  background: rgba(137, 180, 250, 0.2);
  color: #89b4fa;
}

.main-content {
  flex: 1;
  background: #181825;
  overflow-y: auto;
}
</style>