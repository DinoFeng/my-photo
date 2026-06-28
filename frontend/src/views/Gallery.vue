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
        <select v-model="fileTypeLocal" @change="onFileTypeChange">
          <option value="">{{ t('allTypes') }}</option>
          <option value="photo">{{ t('photo') }}</option>
          <option value="video">{{ t('video') }}</option>
        </select>
      </div>
    </div>

    <div ref="scrollContainer" class="waterfall-wrapper">
      <!-- 初始加载中 -->
      <div v-if="loadingInitial" class="loading">
        <Spinner :size="32" />
        <span>{{ t('loading') }}</span>
      </div>

      <!-- 空状态 -->
      <div v-else-if="mediaList.length === 0" class="empty-state">
        <Image :size="48" />
        <p>{{ t('noResults') }}</p>
      </div>

      <template v-else>
        <!-- 时间线 -->
        <aside class="timeline-column">
          <div class="timeline-toolbar">
            <button
              v-for="g in granularities"
              :key="g.value"
              class="timeline-gran-btn"
              :class="{ 'timeline-gran-btn--active': groupGranularity === g.value }"
              @click="changeGranularity(g.value)"
            >
              {{ g.label }}
            </button>
          </div>

          <div
            v-for="group in mediaGroups"
            :key="'tl-' + group.label"
            class="timeline-item"
            :title="group.label"
            @click="jumpToGroup(group.label)"
          >
            <div
              class="timeline-dot"
              :class="{ 'timeline-dot--active': group.label === activeDate }"
            ></div>
            <span class="timeline-label">{{ group.label }}</span>
            <span class="timeline-count">{{ group.count }}</span>
          </div>

          <div v-if="loadingMoreGroups" class="timeline-more">
            <Spinner :size="16" />
          </div>
          <div v-else-if="hasMoreGroups" class="timeline-more">
            <button class="timeline-more-btn" @click="store.loadMoreGroups()">加载更多年份</button>
          </div>
        </aside>

        <!-- 图片区 -->
        <div class="gallery-content">
          <div v-if="groupFilterLabel" class="current-filter">
            <span>当前：{{ groupFilterLabel }}</span>
          </div>

          <div
            v-for="group in groupedMedia"
            :key="group.label"
            class="date-group"
          >
            <div class="date-header">
              <div class="date-card">
                <Calendar :size="16" class="date-icon" />
                <span class="date-label">{{ group.label }}</span>
                <span class="date-count">{{ group.items.length }} {{ t('photos') }}</span>
              </div>
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

          <div v-if="loadingMore" class="loading-more">
            <Spinner :size="24" />
          </div>

          <div v-else-if="!hasMoreNormal && mediaList.length > 0" class="end-marker">
            {{ t('allLoaded') }}
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { Search, Image, Play, Calendar } from 'lucide-vue-next'
import { NSpin as Spinner } from 'naive-ui'
import { useMediaStore, type Media, type GroupGranularity } from '../stores/mediaStore'

const { t } = useI18n()
const store = useMediaStore()

// ===== UI 状态 =====
const localSearch = ref('')
const fileTypeLocal = ref('')
const scrollContainer = ref<HTMLElement | null>(null)
let searchTimer: ReturnType<typeof setTimeout> | null = null

// 简化：直接用 Pinia 的响应式属性
const mediaList = computed(() => store.mediaList)
const mediaGroups = computed(() => store.mediaGroups)
const loadingMore = computed(() => store.loadingMore)
const loadingMoreGroups = computed(() => store.loadingMoreGroups)
const hasMoreNormal = computed(() => store.hasMoreNormal)
const hasMoreGroups = computed(() => store.hasMoreGroups)
const groupGranularity = computed(() => store.groupGranularity)
const activeDate = computed(() => store.activeDate)
const groupFilterLabel = computed(() => store.groupFilterLabel)
const loadingInitial = computed(() => store.loading && mediaList.value.length === 0)

const granularities: { value: GroupGranularity; label: string }[] = [
  { value: 'year', label: '年' },
  { value: 'month', label: '月' },
  { value: 'day', label: '日' },
]

// ===== 图片按日期分组 =====
const groupedMedia = computed(() => {
  const dayMap = new Map<string, Media[]>()
  for (const item of mediaList.value) {
    const itemDate = item.effectiveTime || item.createdAt
    const d = new Date(itemDate)
    const key = `${d.getFullYear()}年${String(d.getMonth() + 1).padStart(2, '0')}月${String(d.getDate()).padStart(2, '0')}日`
    if (!dayMap.has(key)) dayMap.set(key, [])
    dayMap.get(key)!.push(item)
  }
  return Array.from(dayMap.entries())
    .map(([label, items]) => ({ label, items }))
})

// ===== 工具函数 =====
function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getThumbnailUrl(id: string, fileType?: string | null): string {
  const size = fileType === 'video' ? 400 : 300
  return `/api/media/${id}/thumbnail?size=${size}`
}

function onImageError(e: Event) {
  const img = e.target as HTMLImageElement
  img.style.display = 'none'
}

function openDetail(item: Media) {
  console.log('Open detail:', item.id)
}

// ===== 交互 =====
function onSearchInput() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    store.setSearchQuery(localSearch.value)
  }, 300)
}

function onFileTypeChange() {
  store.fileTypeFilter = fileTypeLocal.value
  store.resetAndLoad()
}

function changeGranularity(g: GroupGranularity) {
  store.setGroupGranularity(g)
}

function jumpToGroup(label: string) {
  store.jumpToGroup(label)
  if (scrollContainer.value) {
    scrollContainer.value.scrollTop = 0
  }
}

// ===== 滚动加载 —— 极简版 =====
// 核心原则：检测到底部附近（300px内），且不在加载中，且还有更多数据 → 触发加载
let lastLoadAt = 0

function onScroll() {
  const container = scrollContainer.value
  if (!container) return

  const { scrollTop, scrollHeight, clientHeight } = container
  const distanceToBottom = scrollHeight - scrollTop - clientHeight

  // 条件 1：距离底部 <= 300px
  if (distanceToBottom > 300) return

  // 条件 2：不是正在加载中
  if (loadingMore.value) return

  // 条件 3：还有更多数据
  if (!hasMoreNormal.value) return

  // 条件 4：上次加载超过 1 秒（防抖）
  const now = Date.now()
  if (now - lastLoadAt < 1000) return

  lastLoadAt = now
  console.debug('[Gallery] 滚动触发加载', {
    scrollTop, scrollHeight, clientHeight,
    page: store.normalPage, totalPages: store.normalTotalPages,
    filter: groupFilterLabel.value,
  })
  store.loadMore()
}

// ===== 生命周期 =====
onMounted(async () => {
  await nextTick()
  if (scrollContainer.value) {
    scrollContainer.value.addEventListener('scroll', onScroll, { passive: true })
    const el = scrollContainer.value
    console.debug('[Gallery] 容器已绑定', {
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
    })
  }
  await store.resetAndLoad()
  // 加载完再检查一下，如果内容不够长，自动再加载一页
  await nextTick()
  if (scrollContainer.value) {
    const { scrollHeight, clientHeight } = scrollContainer.value
    if (scrollHeight <= clientHeight + 100 && hasMoreNormal.value) {
      console.debug('[Gallery] 内容不够长，自动加载下一页')
      store.loadMore()
    }
  }
  await store.connectMediaSSE()
})

onUnmounted(() => {
  if (searchTimer) clearTimeout(searchTimer)
  if (scrollContainer.value) {
    scrollContainer.value.removeEventListener('scroll', onScroll)
  }
  store.disconnectMediaSSE()
})
</script>

<style>
.gallery-container {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
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
  display: flex;
  gap: 16px;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0 24px 24px;
  min-height: 0;
}

/* ============ 时间线 ============ */

.timeline-column {
  width: 140px;
  flex-shrink: 0;
  padding-top: 16px;
}

.timeline-toolbar {
  display: flex;
  gap: 4px;
  padding-bottom: 12px;
  margin-bottom: 8px;
  border-bottom: 1px solid rgba(69, 71, 90, 0.5);
}

.timeline-gran-btn {
  padding: 6px 10px;
  background: transparent;
  border: 1px solid transparent;
  color: #a6adc8;
  font-size: 12px;
  cursor: pointer;
  border-radius: 6px;
  transition: background 0.15s, color 0.15s;
}

.timeline-gran-btn:hover {
  background: rgba(137, 180, 250, 0.15);
  color: #cdd6f4;
}

.timeline-gran-btn--active {
  background: rgba(137, 180, 250, 0.25);
  border-color: rgba(137, 180, 250, 0.5);
  color: #89b4fa;
}

.timeline-item {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 6px 4px;
  border-radius: 6px;
  transition: background 0.15s;
}

.timeline-item:hover {
  background: rgba(137, 180, 250, 0.1);
}

.timeline-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #45475a;
  flex-shrink: 0;
}

.timeline-dot--active {
  background: #89b4fa;
  box-shadow: 0 0 0 3px rgba(137, 180, 250, 0.3);
}

.timeline-label {
  flex: 1;
  font-size: 13px;
  color: #cdd6f4;
}

.timeline-count {
  font-size: 12px;
  color: #6c7086;
  background: rgba(69, 71, 90, 0.3);
  padding: 2px 6px;
  border-radius: 10px;
}

.timeline-more {
  padding: 12px 4px;
  display: flex;
  justify-content: center;
}

.timeline-more-btn {
  padding: 6px 10px;
  background: rgba(69, 71, 90, 0.5);
  border: 1px solid rgba(69, 71, 90, 0.8);
  color: #bac2de;
  font-size: 12px;
  cursor: pointer;
  border-radius: 6px;
}

.timeline-more-btn:hover {
  background: rgba(137, 180, 250, 0.2);
  color: #89b4fa;
}

/* ============ 图片区 ============ */

.gallery-content {
  flex: 1;
  min-width: 0;
}

.current-filter {
  padding: 8px 12px;
  background: rgba(137, 180, 250, 0.1);
  border-left: 3px solid #89b4fa;
  border-radius: 4px;
  margin-bottom: 16px;
  font-size: 13px;
  color: #89b4fa;
}

.date-group {
  margin-bottom: 40px;
}

.date-header {
  margin-bottom: 16px;
}

.date-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: linear-gradient(135deg, rgba(137, 180, 250, 0.08), rgba(203, 166, 247, 0.04));
  border: 1px solid rgba(137, 180, 250, 0.2);
  border-left: 3px solid #89b4fa;
  padding: 10px 16px;
  border-radius: 8px;
}

.date-icon {
  color: #89b4fa;
  flex-shrink: 0;
}

.date-label {
  font-size: 16px;
  font-weight: 600;
  color: #cdd6f4;
}

.date-count {
  font-size: 12px;
  color: #a6adc8;
  background: rgba(137, 180, 250, 0.15);
  padding: 4px 10px;
  border-radius: 12px;
  margin-left: auto;
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
}

.card-image img {
  width: 100%;
  display: block;
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
  color: #74c7ec;
  font-size: 11px;
  margin-top: 4px;
}

.loading-more {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 24px;
  color: #a6adc8;
}

.end-marker {
  text-align: center;
  padding: 24px;
  color: #585b70;
  font-size: 13px;
}

@media (max-width: 1200px) {
  .waterfall { column-count: 3; }
}

@media (max-width: 800px) {
  .waterfall { column-count: 2; }
  .timeline-column { width: 110px; }
}

@media (max-width: 500px) {
  .waterfall { column-count: 1; }
}
</style>