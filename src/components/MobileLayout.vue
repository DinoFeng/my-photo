<template>
  <div class="mobile-layout">
    <q-footer v-if="showFooter" class="mobile-footer">
      <q-tabs
        v-model="activeTab"
        class="bg-primary text-white"
        active-color="white"
        indicator-color="white"
        narrow-indicator
      >
        <q-tab name="photos" icon="photo" label="照片" />
        <q-tab name="albums" icon="photo_album" label="相册" />
        <q-tab name="search" icon="search" label="搜索" />
        <q-tab name="settings" icon="settings" label="设置" />
      </q-tabs>
    </q-footer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const activeTab = computed({
  get: () => route.name?.toString() || 'photos',
  set: (val) => router.push({ name: val })
})

const showFooter = computed(() => {
  return route.name !== 'photo-detail'
})
</script>

<style scoped lang="scss">
.mobile-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.mobile-footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
}
</style>
