<template>
  <div class="gallery-container">
    <div class="gallery-toolbar">
      <div class="search-bar">
        <Search :size="20" />
        <input
          v-model="localSearch"
          type="text"
          :placeholder="t('search')"
          @input="onSearchInput"
        />
      </div>
      <div class="filter-bar">
        <select v-model="mediaStore.fileTypeFilter" @change="mediaStore.resetAndLoad()">
          <option value="">{{ t('allTypes') }}</option>
          <option value="photo">{{ t('photo') }}</option>
          <option value="video">{{ t('video') }}</option>
        </select>
        <button class="test-btn" @click="testApi">
          {{ testResult || 'Test API' }}
        </button>
      </div>
    </div>

    <div v-if="mediaStore.loading && mediaStore.mediaList.length === 0" class="loading">
      <Spinner :size="32" />
      <span>{{ t('loading') }}</span>
    </div>

    <div v-else-if="groupedMedia.length === 0" class="empty-state">
      <Image :size="48" />
      <p>{{ t('noResults') }}</p>
    </div>

    <div v-else ref="scrollContainer" class="waterfall-wrapper">
      <div v-for="group in groupedMedia" :key="group.label" class="date-group">
        <div class="date-header">
          <span class="date-label">{{ group.label }}</span>
          <span class="date-count">{{ group.items.length }}</span>
        </div>

        <div class="waterfall">
          <div
            v-for="item in group.items"
            :key="item.id"
            class="waterfall-card"
            @click="openDetail(item)"
          >
            <div class="card-image">
              <img
                v-if="item.thumbnailPath"
                :src="`/${item.thumbnailPath}`"
                :alt="item.filename"
                loading="lazy"
                @error="onImageError"
              />
              <div v-else class="card-placeholder">
                <Image :size="32" />
              </div>
              <div v-if="item.fileType === 'video'" class="video-badge">
                <Play :size="16" />
              </div>
            </div>
            <div class="card-info">
              <span class="card-name">{{ item.filename }}</span>
              <span v-if="item.dateTaken" class="card-date">{{ formatDate(item.dateTaken) }}</span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="mediaStore.loadingMore" class="loading-more">
        <Spinner :size="24" />
      </div>

      <div v-if="!mediaStore.hasMore && mediaStore.mediaList.length > 0" class="end-marker">
        {{ t('allLoaded') }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useInfiniteScroll } from '@vueuse/core'
import { Search, Image, Play } from 'lucide-vue-next'
import { NSpin as Spinner } from 'naive-ui'
import { useMediaStore, type Media } from '../stores/mediaStore'

const { t } = useI18n()
const mediaStore = useMediaStore()

const localSearch = ref('')
const scrollContainer = ref<HTMLElement | null>(null)
const testResult = ref('')
let searchTimer: ReturnType<typeof setTimeout> | null = null

async function testApi() {
  testResult.value = '...'
  const start = Date.now()
  try {
    const res = await fetch('/api/test')
    const data = await res.json()
    testResult.value = `${data.status} ${Date.now() - start}ms`
  } catch {
    testResult.value = 'FAIL'
  }
}

interface MediaGroup {
  label: string
  items: Media[]
}

const groupedMedia = computed<MediaGroup[]>(() => {
  const groups = new Map<string, Media[]>()

  for (const item of mediaStore.mediaList) {
    const date = item.dateTaken || item.createdAt
    const label = formatGroupLabel(date)
    if (!groups.has(label)) {
      groups.set(label, [])
    }
    groups.get(label)!.push(item)
  }

  return Array.from(groups.entries()).map(([label, items]) => ({ label, items }))
})

function formatGroupLabel(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getFullYear()}年${d.getMonth() + 1}月`
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function onSearchInput() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    mediaStore.setSearchQuery(localSearch.value)
  }, 300)
}

function onImageError(e: Event) {
  const img = e.target as HTMLImageElement
  img.style.display = 'none'
  const placeholder = img.parentElement?.querySelector('.card-placeholder')
  if (placeholder) {
    ;(placeholder as HTMLElement).style.display = 'flex'
  }
}

function openDetail(item: Media) {
  // TODO: 打开详情弹窗或跳转详情页
  console.log('Open detail:', item.id)
}

useInfiniteScroll(
  scrollContainer,
  () => {
    mediaStore.loadMore()
  },
  { distance: 200 },
)

onMounted(async () => {
  await mediaStore.resetAndLoad()
  await mediaStore.connectMediaSSE()
})

onUnmounted(() => {
  mediaStore.disconnectMediaSSE()
  if (searchTimer) clearTimeout(searchTimer)
})
</script>

<style>
.gallery-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.gallery-toolbar {
  padding: 16px 24px;
  display: flex;
  gap: 12px;
  flex-shrink: 0;
}

.search-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #1e1e2e;
  padding: 10px 16px;
  border-radius: 10px;
  color: #a6adc8;
  flex: 1;
}

.search-bar input {
  flex: 1;
  background: transparent;
  border: none;
  color: #cdd6f4;
  font-size: 14px;
}

.search-bar input:focus {
  outline: none;
}

.filter-bar select {
  background: #1e1e2e;
  border: 1px solid #313244;
  color: #cdd6f4;
  padding: 10px 16px;
  border-radius: 10px;
  font-size: 14px;
  cursor: pointer;
}

.loading,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 24px;
  color: #a6adc8;
  gap: 16px;
}

.waterfall-wrapper {
  flex: 1;
  overflow-y: auto;
  padding: 0 24px 24px;
}

.date-group {
  margin-bottom: 32px;
}

.date-header {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 12px;
  padding: 0 4px;
}

.date-label {
  font-size: 16px;
  font-weight: 600;
  color: #cdd6f4;
}

.date-count {
  font-size: 12px;
  color: #585b70;
}

.waterfall {
  column-count: 4;
  column-gap: 12px;
}

.waterfall-card {
  break-inside: avoid;
  margin-bottom: 12px;
  background: #1e1e2e;
  border-radius: 10px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s;
}

.waterfall-card:hover {
  transform: scale(1.02);
}

.card-image {
  position: relative;
  width: 100%;
  background: #313244;
  min-height: 80px;
}

.card-image img {
  width: 100%;
  display: block;
}

.card-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
  color: #585b70;
}

.video-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 6px;
  padding: 4px;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-info {
  padding: 10px 12px;
}

.card-name {
  display: block;
  color: #cdd6f4;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-date {
  display: block;
  color: #585b70;
  font-size: 11px;
  margin-top: 4px;
}

.loading-more {
  display: flex;
  justify-content: center;
  padding: 16px;
  color: #a6adc8;
}

.end-marker {
  text-align: center;
  padding: 24px;
  color: #585b70;
  font-size: 13px;
}

@media (max-width: 1200px) {
  .waterfall {
    column-count: 3;
  }
}

@media (max-width: 800px) {
  .waterfall {
    column-count: 2;
  }
}

@media (max-width: 500px) {
  .waterfall {
    column-count: 1;
  }
}
</style>