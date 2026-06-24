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
      <div
        v-for="group in mediaStore.mediaGroups"
        :key="group.label"
        class="date-group"
        :style="{ minHeight: `${getGroupMinHeight(group.count)}px` }"
      >
        <div class="date-header">
          <div class="timeline-marker">
            <div
              class="timeline-dot"
              :style="{
                width: `${getDotSize(group.count)}px`,
                height: `${getDotSize(group.count)}px`,
              }"
            ></div>
            <div class="timeline-line" :style="{ minHeight: `${getLineHeight(group.count)}px` }"></div>
          </div>
          <div v-if="groupedMediaMap.has(group.label)" class="date-card">
            <Calendar :size="16" class="date-icon" />
            <span class="date-label">{{ group.label }}</span>
            <span class="date-count">{{ group.count }} {{ t('photos') }}</span>
          </div>
        </div>

        <template v-if="groupedMediaMap.has(group.label)">
          <div
            v-for="sub in groupedMediaMap.get(group.label)!.subGroups"
            :key="sub.label"
            class="sub-group"
          >
            <div class="sub-header">{{ sub.label }}</div>
            <div class="waterfall">
              <div
                v-for="item in sub.items"
                :key="item.id"
                class="waterfall-card"
                @click="openDetail(item)"
              >
                <div class="card-image">
                  <img
                    :src="getThumbnailUrl(item.id, item.fileType)"
                    :alt="item.filename"
                    loading="lazy"
                    @error="onImageError"
                  />
                  <div v-if="item.fileType === 'video'" class="video-badge">
                    <Play :size="16" />
                  </div>
                </div>
                <div class="card-info">
                  <span class="card-name">{{ item.filename }}</span>
                  <span class="card-date">{{ formatDate(item.effectiveTime || item.createdAt) }}</span>
                </div>
              </div>
            </div>
          </div>
        </template>
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
import { Search, Image, Play, Calendar } from 'lucide-vue-next'
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

interface MediaSubGroup {
  label: string
  items: Media[]
}

interface MediaGroup {
  label: string
  count: number
  subGroups: MediaSubGroup[]
}

const groupedMedia = computed<MediaGroup[]>(() => {
  const groupOrder = new Map<string, number>()
  const groupCount = new Map<string, number>()
  mediaStore.mediaGroups.forEach((g, i) => {
    groupOrder.set(g.label, i)
    groupCount.set(g.label, g.count)
  })

  const dayMap = new Map<string, Map<string, Media[]>>()
  for (const item of mediaStore.mediaList) {
    const itemDate = item.effectiveTime || item.createdAt
    const d = new Date(itemDate)
    const itemKey = `${d.getUTCFullYear()}年${String(d.getUTCMonth() + 1).padStart(2, '0')}月${String(d.getUTCDate()).padStart(2, '0')}日`
    const subKey = item.sourcePath || '其他'
    if (!dayMap.has(itemKey)) dayMap.set(itemKey, new Map())
    const subMap = dayMap.get(itemKey)!
    if (!subMap.has(subKey)) subMap.set(subKey, [])
    subMap.get(subKey)!.push(item)
  }

  const result = Array.from(dayMap.entries())
    .sort((a, b) => {
      return (groupOrder.get(a[0]) ?? 999999) - (groupOrder.get(b[0]) ?? 999999)
    })
    .map(([label, subMap]) => ({
      label,
      count: groupCount.get(label) ?? 0,
      subGroups: Array.from(subMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([subLabel, items]) => ({ label: subLabel, items })),
    }))
  return result
})

const groupedMediaMap = computed(() => {
  const map = new Map<string, { subGroups: MediaSubGroup[]; count: number }>()
  for (const g of groupedMedia.value) {
    if (g.subGroups.length > 0) {
      map.set(g.label, { subGroups: g.subGroups, count: g.count })
    }
  }
  return map
})

const maxCount = computed(() => {
  let max = 0
  for (const g of mediaStore.mediaGroups) {
    if (g.count > max) max = g.count
  }
  return max || 1
})

function getDotSize(count: number): number {
  const ratio = count / maxCount.value
  return 8 + Math.round(ratio * 22)
}
function getLineHeight(count: number): number {
  const ratio = count / maxCount.value
  return 20 + Math.round(ratio * 80)
}
function getGroupMinHeight(count: number): number {
  const ratio = count / maxCount.value
  return 60 + Math.round(ratio * 80)
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
  const parent = img.parentElement
  if (parent) {
    const existing = parent.querySelector('.card-placeholder')
    if (!existing) {
      const placeholder = document.createElement('div')
      placeholder.className = 'card-placeholder'
      placeholder.style.display = 'flex'
      placeholder.style.alignItems = 'center'
      placeholder.style.justifyContent = 'center'
      placeholder.style.height = '120px'
      placeholder.style.color = '#585b70'
      placeholder.textContent = '加载失败'
      parent.appendChild(placeholder)
    } else {
      ;(existing as HTMLElement).style.display = 'flex'
    }
  }
}

function getThumbnailUrl(id: string, fileType?: string | null): string {
  const size = fileType === 'video' ? 400 : 300
  return `/api/media/${id}/thumbnail?size=${size}`
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
  margin-bottom: 40px;
  position: relative;
}

.sub-group {
  margin-left: 32px;
  margin-bottom: 24px;
  padding-left: 20px;
  border-left: 2px dashed rgba(137, 180, 250, 0.2);
}

.sub-header {
  font-size: 13px;
  color: #a6adc8;
  margin-bottom: 12px;
  font-family: 'Consolas', 'Monaco', monospace;
  letter-spacing: 0.5px;
}

.date-header {
  display: flex;
  align-items: flex-start;
  margin-bottom: 16px;
  padding: 4px 0;
}

.timeline-marker {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 24px;
  flex-shrink: 0;
  padding-top: 8px;
}

.timeline-dot {
  border-radius: 50%;
  background: linear-gradient(135deg, #89b4fa, #cba6f7);
  border: 2px solid #1e1e2e;
  box-shadow: 0 0 0 2px #89b4fa, 0 0 12px rgba(137, 180, 250, 0.6);
  flex-shrink: 0;
  transition: width 0.2s, height 0.2s;
}

.timeline-line {
  width: 2px;
  background: linear-gradient(to bottom, #89b4fa, rgba(137, 180, 250, 0.15));
  flex-shrink: 0;
  margin-top: 4px;
}

.date-card {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  background: linear-gradient(135deg, rgba(137, 180, 250, 0.08), rgba(203, 166, 247, 0.04));
  border: 1px solid rgba(137, 180, 250, 0.2);
  border-left: 3px solid #89b4fa;
  padding: 12px 20px;
  border-radius: 8px;
  margin-left: 8px;
}

.date-icon {
  color: #89b4fa;
  flex-shrink: 0;
}

.date-label {
  font-size: 18px;
  font-weight: 700;
  color: #cdd6f4;
  letter-spacing: 0.5px;
}

.date-count {
  font-size: 13px;
  color: #a6adc8;
  background: rgba(137, 180, 250, 0.15);
  padding: 4px 12px;
  border-radius: 12px;
  margin-left: auto;
  font-weight: 500;
}

.waterfall {
  column-count: 4;
  column-gap: 12px;
  margin-left: 32px;
}

.waterfall-card {
  break-inside: avoid;
  margin-bottom: 12px;
  background: #1e1e2e;
  border-radius: 10px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  border: 1px solid rgba(49, 50, 68, 0.6);
}

.waterfall-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(137, 180, 250, 0.3);
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
  display: flex;
  align-items: center;
  gap: 4px;
  color: #74c7ec;
  font-size: 11px;
  margin-top: 6px;
  opacity: 0.9;
}

.card-date::before {
  content: '';
  width: 6px;
  height: 6px;
  background: #74c7ec;
  border-radius: 50%;
  opacity: 0.6;
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