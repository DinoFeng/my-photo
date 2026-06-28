<template>
  <div
    class="recent-scan"
    :class="{ 'recent-scan--collapsed': collapsed }"
  >
    <div class="recent-scan__header" @click="collapsed = !collapsed">
      <div class="recent-scan__title">
        <Sparkles :size="14" class="recent-scan__sparkle" />
        <span v-if="recentlyScanned.length > 0">
          刚扫描到 <strong>{{ recentlyScanned.length }}</strong> 张
        </span>
        <span v-else-if="isScanning">
          扫描中... 已发现 <strong>{{ discoveredCount }}</strong> 个文件
        </span>
        <span v-else class="recent-scan__idle">
          等待扫描
        </span>
      </div>
      <div class="recent-scan__actions" @click.stop>
        <button
          v-if="recentlyScanned.length > 0"
          class="recent-scan__btn"
          @click="clearAll()"
          title="清空"
        >
          <X :size="12" />
        </button>
        <ChevronUp v-if="!collapsed" :size="14" class="recent-scan__toggle" />
        <ChevronDown v-else :size="14" class="recent-scan__toggle" />
      </div>
    </div>

    <div v-if="!collapsed" class="recent-scan__content">
      <div v-if="displayedItems.length > 0" class="recent-scan__grid">
        <div
          v-for="(item, index) in displayedItems"
          :key="item.id"
          class="thumb-card"
          :style="{ animationDelay: `${index * 30}ms` }"
          @click="onThumbClick(item)"
        >
          <img
            :src="getThumbnailUrl(item.id, item.fileType)"
            :alt="item.filename"
            loading="lazy"
            @error="onImageError($event)"
          />
          <div v-if="item.fileType === 'video'" class="thumb-card__video-badge">
            <Play :size="10" />
          </div>
          <div class="thumb-card__glow"></div>
        </div>
      </div>
      <div v-else-if="isScanning" class="recent-scan__empty">
        <div class="recent-scan__spinner"></div>
        <span>正在扫描，新照片会出现在这里</span>
      </div>
      <div v-else class="recent-scan__empty recent-scan__empty--idle">
        <span>扫描开始后，新照片会出现在这里</span>
      </div>
      <div v-if="recentlyScanned.length > 8" class="recent-scan__more">
        还有 {{ recentlyScanned.length - 8 }} 张...
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { Sparkles, X, ChevronUp, ChevronDown, Play } from 'lucide-vue-next'
import { apiClient } from '../utils/apiClient'
import { useMonitorStore } from '../stores/monitorStore'

interface Media {
  id: string
  filename: string
  filepath: string
  fileType: string
  thumbnailPath: string | null
  effectiveTime: string | null
  createdAt: string
}

const monitorStore = useMonitorStore()
const collapsed = ref(false)
const recentlyScanned = ref<Media[]>([])
let lastProcessedEventIndex = -1
let fetching = false
let scanStartTime: number | null = null

const isScanning = computed(() => {
  if (monitorStore.events.length === 0) return false
  const recentEvents = monitorStore.events.slice(0, 20)
  const hasStart = recentEvents.some((e) => e.event === 'task-start')
  const hasComplete = recentEvents.some((e) => e.event === 'task-complete')
  if (hasStart && !hasComplete) return true
  if (hasStart) {
    const lastStart = [...recentEvents].reverse().find((e) => e.event === 'task-start')
    const lastComplete = [...recentEvents].reverse().find((e) => e.event === 'task-complete')
    if (!lastComplete) return true
    if (lastStart && lastComplete && lastStart.timestamp > lastComplete.timestamp) return true
  }
  return false
})

const discoveredCount = computed(() => {
  if (scanStartTime === null) return 0
  const threshold = new Date(scanStartTime).toISOString()
  let count = 0
  for (let i = monitorStore.events.length - 1; i >= 0; i--) {
    const e = monitorStore.events[i]
    if (e.event === 'file-add' || e.event === 'import-file-add') {
      count++
    }
    if (e.event === 'task-start' && new Date(e.timestamp).getTime() >= scanStartTime) {
      break
    }
  }
  return count
})

const displayedItems = computed(() => recentlyScanned.value.slice(0, 8))

function getThumbnailUrl(id: string, fileType?: string | null): string {
  const size = fileType === 'video' ? 200 : 150
  return `/api/media/${id}/thumbnail?size=${size}`
}

function onThumbClick(item: Media) {
  const effectiveDate = item.effectiveTime || item.createdAt
  if (effectiveDate) {
    const d = new Date(effectiveDate)
    const dateLabel = `${d.getUTCFullYear()}年${String(d.getUTCMonth() + 1).padStart(2, '0')}月${String(d.getUTCDate()).padStart(2, '0')}日`
    console.log('[RecentScan] 跳转到:', dateLabel)
    window.dispatchEvent(new CustomEvent('jump-to-date', { detail: dateLabel }))
  }
}

function onImageError(e: Event) {
  const img = e.target as HTMLImageElement
  img.style.display = 'none'
  const parent = img.parentElement
  if (parent) {
    const placeholder = document.createElement('div')
    placeholder.className = 'thumb-card__placeholder'
    placeholder.textContent = '✦'
    parent.appendChild(placeholder)
  }
}

function clearAll() {
  recentlyScanned.value = []
  lastProcessedEventIndex = monitorStore.events.length - 1
}

async function fetchLatestMedia() {
  if (fetching || scanStartTime === null) return
  fetching = true
  try {
    const threshold = new Date(scanStartTime - 5000).toISOString()
    const data = await apiClient.get<{ data: Media[] }>(`/media?limit=30`)
    if (data && data.data) {
      const filtered = data.data.filter((m) => m.createdAt >= threshold)
      const existingIds = new Set(recentlyScanned.value.map((m) => m.id))
      for (const media of filtered) {
        if (!existingIds.has(media.id)) {
          recentlyScanned.value.unshift(media)
        }
      }
    }
  } catch (error) {
    console.error('[RecentScan] 拉取最新媒体失败:', error)
  } finally {
    fetching = false
  }
}

function startNewScan() {
  recentlyScanned.value = []
  scanStartTime = Date.now()
}

watch(
  () => monitorStore.events.length,
  (newLen) => {
    if (newLen > lastProcessedEventIndex + 1) {
      const newEvents = monitorStore.events.slice(lastProcessedEventIndex + 1, newLen)
      for (const e of newEvents) {
        if (e.event === 'task-start') {
          startNewScan()
        } else if (e.event === 'file-add' || e.event === 'import-file-add' || e.event === 'media-added') {
          if (scanStartTime === null) {
            scanStartTime = new Date(e.timestamp).getTime()
          }
          fetchLatestMedia()
        }
      }
      lastProcessedEventIndex = newLen - 1
    }
  }
)

onMounted(() => {
  lastProcessedEventIndex = monitorStore.events.length - 1
})
</script>

<style scoped>
.recent-scan {
  position: fixed;
  right: 24px;
  bottom: 24px;
  width: 320px;
  background: linear-gradient(135deg, rgba(30, 30, 46, 0.95), rgba(30, 30, 46, 0.9));
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(137, 180, 250, 0.3);
  border-radius: 14px;
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.4),
    0 0 0 1px rgba(137, 180, 250, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  z-index: 1000;
  overflow: hidden;
}

.recent-scan__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  cursor: pointer;
  user-select: none;
}

.recent-scan__title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #cdd6f4;
}

.recent-scan__title strong {
  color: #f9e2af;
  font-weight: 600;
}

.recent-scan__idle {
  color: #6c7086;
}

.recent-scan__sparkle {
  color: #f9e2af;
  animation: sparkle-glow 2s ease-in-out infinite;
}

@keyframes sparkle-glow {
  0%, 100% { opacity: 0.8; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.15); }
}

.recent-scan__actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.recent-scan__btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  background: transparent;
  border: none;
  border-radius: 4px;
  color: #6c7086;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.recent-scan__btn:hover {
  background: rgba(243, 138, 168, 0.15);
  color: #f38ba8;
}

.recent-scan__toggle {
  color: #6c7086;
  margin-left: 2px;
}

.recent-scan__content {
  border-top: 1px solid rgba(137, 180, 250, 0.15);
  padding: 12px;
}

.recent-scan__grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
}

.recent-scan__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px 12px;
  gap: 10px;
  font-size: 12px;
  color: #6c7086;
  text-align: center;
}

.recent-scan__spinner {
  width: 24px;
  height: 24px;
  border: 2px solid #89b4fa;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.thumb-card {
  position: relative;
  aspect-ratio: 1;
  border-radius: 8px;
  overflow: hidden;
  background: #313244;
  cursor: pointer;
  animation: thumb-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both;
  transition: transform 0.2s, box-shadow 0.2s;
}

.thumb-card:hover {
  transform: translateY(-2px) scale(1.05);
  z-index: 10;
}

.thumb-card:hover .thumb-card__glow {
  opacity: 1;
}

.thumb-card img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.thumb-card__video-badge {
  position: absolute;
  top: 4px;
  right: 4px;
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  border-radius: 4px;
  padding: 2px 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.thumb-card__glow {
  position: absolute;
  inset: 0;
  border-radius: 8px;
  box-shadow: 0 0 0 2px #89b4fa, 0 0 12px rgba(137, 180, 250, 0.6);
  opacity: 0;
  transition: opacity 0.2s;
  pointer-events: none;
}

.thumb-card__placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: #89b4fa;
  background: linear-gradient(135deg, #313244, #45475a);
}

@keyframes thumb-pop {
  0% {
    opacity: 0;
    transform: scale(0.5);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

.recent-scan__more {
  margin-top: 8px;
  text-align: center;
  font-size: 11px;
  color: #6c7086;
}

@media (max-width: 500px) {
  .recent-scan {
    right: 12px;
    left: 12px;
    width: auto;
  }
}
</style>