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

    <!-- 滚动容器始终存在（ref 稳定），内容用 v-show 控制可见性 -->
    <div ref="scrollContainer" class="waterfall-wrapper">
      <div v-if="mediaStore.loading && mediaStore.mediaList.length === 0" class="loading">
        <Spinner :size="32" />
        <span>{{ t('loading') }}</span>
      </div>

      <div v-else-if="groupedMedia.length === 0" class="empty-state">
        <Image :size="48" />
        <p>{{ t('noResults') }}</p>
      </div>

      <template v-else>
        <aside class="timeline-column">
          <div
            v-for="group in mediaStore.mediaGroups"
            :key="'tl-' + group.label"
            class="timeline-item"
            :style="{ minHeight: `${getGroupMinHeight(group.count) + 40}px` }"
            :title="group.label"
            @click="scrollToGroup(group.label)"
          >
            <div
              class="timeline-dot"
              :class="{
                'timeline-dot--empty': group.label !== mediaStore.activeDate,
                'timeline-dot--active': group.label === mediaStore.activeDate,
              }"
              :style="{
                width: `${getDotSize(group.count)}px`,
                height: `${getDotSize(group.count)}px`,
              }"
            ></div>
          </div>
        </aside>

        <div class="gallery-content">
          <!-- 顶部区域：锚点模式时显示加载状态 -->
          <div v-if="mediaStore.loadingNewer" class="loading-more loading-more--top">
            <Spinner :size="24" />
            <span>加载更近期的图片...</span>
          </div>
          <div v-else-if="!mediaStore.hasMoreNewer && mediaStore.anchorDateIso" class="end-marker end-marker--top">
            已到最新日期
          </div>

          <!-- 只渲染实际有图片的日期分组（groupedMedia 按 DESC 排序） -->
          <div
            v-for="group in groupedMedia"
            :key="group.label"
            :id="'group-' + group.label"
            class="date-group"
          >
            <div class="date-header">
              <div class="date-card">
                <Calendar :size="16" class="date-icon" />
                <span class="date-label">{{ group.label }}</span>
                <span class="date-count">{{ group.count }} {{ t('photos') }}</span>
              </div>
            </div>

            <div
              v-for="sub in group.subGroups"
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
          </div>

          <div v-if="mediaStore.loadingMore" class="loading-more">
            <Spinner :size="24" />
          </div>

          <div v-if="!hasMoreBottom && mediaStore.mediaList.length > 0" class="end-marker">
            {{ t('allLoaded') }}
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch, watchEffect } from 'vue'
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

// 加载与跳转状态管理
// isJumping: 锚点跳转期间，禁止所有滚动加载
// topLoadingBusy: 向上滚加载时的锁，避免重复触发
let isJumping = false
let topLoadingBusy = false
let lastPrependScrollHeight = 0
let lastPrependScrollTop = 0

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



const maxCount = computed(() => {
  let max = 0
  for (const g of mediaStore.mediaGroups) {
    if (g.count > max) max = g.count
  }
  return max || 1
})

function getDotSize(_count: number): number {
  return 16
}
function getGroupMinHeight(count: number): number {
  const ratio = count / maxCount.value
  return 40 + Math.round(ratio * 100)
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
  console.log('Open detail:', item.id)
}

// ===== 核心滚动逻辑 =====

// 自动预加载：当 scrollTop 为 0 时，用户无法向上滚动触发 loadNewer
// 此函数在有更多更新数据时自动加载，确保用户始终有上滚空间
function autoPreloadNewer() {
  if (topLoadingBusy || mediaStore.loadingNewer || !mediaStore.hasMoreNewer) return
  topLoadingBusy = true
  const c = scrollContainer.value
  lastPrependScrollTop = c?.scrollTop ?? 0
  lastPrependScrollHeight = c?.scrollHeight ?? 0
  mediaStore.loadNewer().then(() => {
    nextTick(() => {
      if (!scrollContainer.value) return
      const cc = scrollContainer.value
      const added = cc.scrollHeight - lastPrependScrollHeight
      if (added > 0) {
        cc.scrollTop = lastPrependScrollTop + added
      }
      setTimeout(() => { topLoadingBusy = false }, 300)
    })
  })
}

// 跳转到指定日期：只加载锚点及更旧的图片，然后滚动到目标位置
// 关键：更新日期的图片留给用户向上滚动时加载，避免跳转期间内容被大幅改变
function scrollToGroup(label: string) {
  console.debug('[scrollToGroup] 开始', { label, activeDate: mediaStore.activeDate })

  // 检查目标日期是否已在当前列表中，如果已加载就直接滚动定位，不重新加载
  const dateAlreadyLoaded = groupedMedia.value.some((g) => g.label === label)
  if (dateAlreadyLoaded) {
    console.debug('[scrollToGroup] 日期已加载，直接滚动', { label })
    const el = document.getElementById('group-' + label)
    const container = scrollContainer.value
    if (el && container) {
      const containerRect = container.getBoundingClientRect()
      const elRect = el.getBoundingClientRect()
      const offset = elRect.top - containerRect.top + container.scrollTop - 300
      container.scrollTo({ top: Math.max(0, offset), behavior: 'instant' })
      mediaStore.setActiveDate(label)
      // 自动预加载更多更新数据，确保有上滚空间
      if (mediaStore.hasMoreNewer && mediaStore.anchorDateIso) {
        autoPreloadNewer()
      }
    }
    return
  }

  // 新日期：需要重新加载
  isJumping = true
  mediaStore.jumpToDate(label).then((loadedLabel) => {
    if (!loadedLabel) {
      console.debug('[scrollToGroup] 未加载到数据', { label })
      isJumping = false
      return
    }
    // 等 Vue 渲染新列表后再滚动
    nextTick(() => {
      nextTick(() => {
        const el = document.getElementById('group-' + loadedLabel)
        const container = scrollContainer.value
        if (!el || !container) {
          console.debug('[scrollToGroup] 元素不存在', { hasEl: !!el, hasContainer: !!container })
          isJumping = false
          return
        }
        const containerRect = container.getBoundingClientRect()
        const elRect = el.getBoundingClientRect()
        // 目标位置：目标日期距容器顶部 300px，留出足够的向上滚动空间
        const offset = elRect.top - containerRect.top + container.scrollTop - 300
        console.debug('[scrollToGroup] 滚动', {
          label: loadedLabel,
          scrollBefore: container.scrollTop,
          scrollHeight: container.scrollHeight,
          targetOffset: Math.max(0, offset),
          mediaListLength: mediaStore.mediaList.length,
          groupedDateCount: groupedMedia.value.length,
        })
        // 用 instant 而不是 smooth，避免滚动过程中触发多次加载
        container.scrollTo({ top: Math.max(0, offset), behavior: 'instant' })

        // 滚动完成后再延迟解锁，确保滚动稳定
        setTimeout(() => {
          isJumping = false
          console.debug('[scrollToGroup] 解锁完成')
          // 跳转后自动预加载更多更新数据，确保用户有足够的上滚空间
          if (mediaStore.hasMoreNewer && mediaStore.anchorDateIso) {
            autoPreloadNewer()
          }
        }, 200)
      })
    })
  })
}

// 向下滚动到底部 → 加载更旧的图片
useInfiniteScroll(
  scrollContainer,
  () => {
    // 跳转期间禁止加载
    if (isJumping) {
      console.debug('[useInfiniteScroll] 跳转中，跳过')
      return
    }
    console.debug('[useInfiniteScroll] 触发底部加载', {
      anchorDateIso: mediaStore.anchorDateIso,
      loadingMore: mediaStore.loadingMore,
      hasMoreOlder: mediaStore.hasMoreOlder,
    })
    mediaStore.loadMore()
  },
  { distance: 300 },
)

// 向上滚动 → 加载更新日期的图片（仅锚点模式）
function onScrollTopLoad() {
  const container = scrollContainer.value
  if (!container) return

  // 只有锚点模式才需要向上加载
  if (!mediaStore.anchorDateIso) return

  // 跳转期间禁止加载
  if (isJumping) return

  // 基本条件：不在加载中 & 还有更多 & 未在 busy 状态
  if (mediaStore.loadingNewer || !mediaStore.hasMoreNewer || topLoadingBusy) return

  // 关键条件：scrollTop 接近顶部就触发（200px 内都可以触发，降低触发门槛）
  // 同时处理特殊情况：如果内容本身不够高（clientHeight >= scrollHeight），也触发
  const notEnoughToScroll = container.scrollHeight - container.clientHeight < 200
  if (container.scrollTop > 200 && !notEnoughToScroll) return

  topLoadingBusy = true
  lastPrependScrollTop = container.scrollTop
  lastPrependScrollHeight = container.scrollHeight

  console.debug('[onScrollTopLoad] 触发 loadNewer', {
    scrollTop: container.scrollTop,
    scrollHeight: container.scrollHeight,
    clientHeight: container.clientHeight,
    anchorDateIso: mediaStore.anchorDateIso,
    newerPage: mediaStore.newerPage,
    hasMoreNewer: mediaStore.hasMoreNewer,
    mediaListLength: mediaStore.mediaList.length,
    groupedDateCount: groupedMedia.value.length,
  })

  mediaStore.loadNewer().then(() => {
    nextTick(() => {
      if (!scrollContainer.value) return
      const c = scrollContainer.value
      const addedHeight = c.scrollHeight - lastPrependScrollHeight

      // 核心修复：新图片被 prepend 到内容顶部（位置 0 ~ addedHeight 都是新内容）
      // 用户当前 scrollTop 本来就在顶部附近（< 200px），不需要补偿！
      // 现在 scrollTop 附近的内容自动就是新加载的图片了
      //
      // 只需要做一件事：把 scrollTop 轻轻推到 250px，刚好高于触发阈值（200px）
      // 这样：
      //   1. 用户看到的全是新图片（250 ~ 1050px 位置，都在 0~addedHeight 范围内）
      //   2. scrollTop = 250 > 200，不会立即再次触发加载
      //   3. 用户向上滚（scrollTop ↓）→ 经过 200 → 触发下一次加载
      //
      // 特殊情况：如果新加内容非常短（addedHeight < 300），则推到新加内容底部
      if (addedHeight > 0) {
        const target = Math.max(
          Math.min(250, addedHeight - 50),  // 250 或新加内容底部-50（取小的）
          50  // 至少 50，保证不会滚到顶部以下
        )
        c.scrollTop = target
        console.debug('[onScrollTopLoad] 新内容已在顶部，轻轻推到', {
          addedHeight,
          targetScrollTop: target,
          scrollTopNow: c.scrollTop,
        })
      } else if (notEnoughToScroll && c.scrollTop < c.clientHeight) {
        // 内容不够高但刚加了一点内容：推到新加内容顶部偏下位置
        c.scrollTop = 250
      }
      setTimeout(() => {
        topLoadingBusy = false
      }, 300)
    })
  })
}

// 滚动联动高亮：根据当前可见的日期分组，更新时间线圆点
// 参考线：内容区顶部下 200px 位置，穿过这个位置的日期分组就是"正在看"的日期
let lastSpyDate = ''
function onScrollSpy() {
  const container = scrollContainer.value
  if (!container) return
  if (isJumping) return // 跳转期间不更新，避免闪烁

  const groups = container.querySelectorAll<HTMLDivElement>('.date-group')
  if (groups.length === 0) return

  // 用 getBoundingClientRect 获取可靠的相对位置
  const containerRect = container.getBoundingClientRect()
  const refY = containerRect.top + 200 // 参考线：容器顶部下200px

  // 找到最后一个顶部位置 <= 参考线的日期分组
  let currentLabel = ''
  for (const g of groups) {
    const rect = g.getBoundingClientRect()
    if (rect.top <= refY) {
      currentLabel = g.id.replace('group-', '')
    } else {
      break
    }
  }

  if (currentLabel && currentLabel !== lastSpyDate) {
    lastSpyDate = currentLabel
    mediaStore.setActiveDate(currentLabel)
  }
}

// 统一的 scroll 处理器：先 spy 更新高亮，再处理加载
let scrollSpyThrottle = 0
function onGalleryScroll() {
  const now = Date.now()
  if (now - scrollSpyThrottle > 100) {
    onScrollSpy()
    scrollSpyThrottle = now
  }
  onScrollTopLoad()
}

// 绑定 scroll 事件：用 watchEffect 确保 ref 变化时重新绑定
let scrollHandlerAttached = false
function setupScrollHandler() {
  if (scrollHandlerAttached) return
  if (!scrollContainer.value) return
  scrollContainer.value.addEventListener('scroll', onGalleryScroll, { passive: true })
  scrollHandlerAttached = true
  console.debug('[Gallery] scrollHandler 绑定成功', {
    scrollHeight: scrollContainer.value.scrollHeight,
    clientHeight: scrollContainer.value.clientHeight,
  })
}

watchEffect(() => {
  // 只要 scrollContainer.value 存在就绑定
  if (scrollContainer.value) {
    setupScrollHandler()
  }
})

// 当锚点日期变化时，重置 busy 状态（新的锚点可能重新有更新数据可加载）
watch(
  () => mediaStore.anchorDateIso,
  () => {
    topLoadingBusy = false
    console.debug('[Gallery] anchorDateIso 变化，重置 busy 状态')
  },
)

const hasMoreBottom = computed(() => {
  if (mediaStore.anchorDateIso) return mediaStore.hasMoreOlder
  return true
})

onMounted(async () => {
  console.debug('[Gallery] onMounted')
  await mediaStore.resetAndLoad()
  await nextTick()
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
  position: relative;
  flex: 1;
  display: flex;
  gap: 16px;
  overflow-y: auto;
  padding: 0 24px 24px;
}

.waterfall-wrapper::before {
  content: '';
  position: absolute;
  left: 54px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: linear-gradient(to bottom, #89b4fa, rgba(137, 180, 250, 0.15));
  pointer-events: none;
}

.timeline-column {
  position: sticky;
  top: 0;
  align-self: flex-start;
  width: 60px;
  flex-shrink: 0;
  padding-top: 16px;
  z-index: 1;
}

.timeline-item {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  cursor: pointer;
  padding-top: 8px;
  transition: transform 0.15s ease;
}

.timeline-item:hover {
  transform: scale(1.15);
}

.timeline-item:hover .timeline-dot {
  box-shadow: 0 0 0 3px rgba(137, 180, 250, 0.6), 0 0 16px rgba(137, 180, 250, 0.9);
}

.timeline-dot {
  border-radius: 50%;
  background: linear-gradient(135deg, #89b4fa, #cba6f7);
  border: 2px solid #181825;
  box-shadow: 0 0 0 2px #89b4fa, 0 0 12px rgba(137, 180, 250, 0.6);
  flex-shrink: 0;
  transition: width 0.2s, height 0.2s, box-shadow 0.2s, opacity 0.2s;
}

.timeline-dot--empty {
  opacity: 0.35;
  background: #45475a;
  border-color: #181825;
  box-shadow: 0 0 0 2px #45475a;
}

.timeline-dot--active {
  opacity: 1;
  background: linear-gradient(135deg, #f9e2af, #fab387);
  border-color: #181825;
  box-shadow: 0 0 0 3px rgba(250, 179, 135, 0.8), 0 0 20px rgba(250, 179, 135, 0.7);
  animation: timeline-pulse 1.8s ease-in-out infinite;
}

@keyframes timeline-pulse {
  0%, 100% {
    box-shadow: 0 0 0 3px rgba(250, 179, 135, 0.8), 0 0 20px rgba(250, 179, 135, 0.7);
  }
  50% {
    box-shadow: 0 0 0 4px rgba(250, 179, 135, 0.6), 0 0 28px rgba(250, 179, 135, 0.5);
  }
}

.gallery-content {
  flex: 1;
  min-width: 0;
}

.date-group {
  margin-bottom: 40px;
  position: relative;
}

.sub-group {
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
  margin-bottom: 16px;
  padding: 4px 0;
}

.date-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: linear-gradient(135deg, rgba(137, 180, 250, 0.08), rgba(203, 166, 247, 0.04));
  border: 1px solid rgba(137, 180, 250, 0.2);
  border-left: 3px solid #89b4fa;
  padding: 12px 20px;
  border-radius: 8px;
}

.date-card--placeholder {
  opacity: 0.35;
  background: transparent;
  border-color: rgba(137, 180, 250, 0.1);
  border-left-color: rgba(137, 180, 250, 0.25);
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
  align-items: center;
  gap: 8px;
  padding: 16px;
  color: #a6adc8;
  font-size: 13px;
}

.loading-more--top {
  padding-top: 8px;
  padding-bottom: 8px;
  color: #89b4fa;
}

.end-marker {
  text-align: center;
  padding: 24px;
  color: #585b70;
  font-size: 13px;
}

.end-marker--top {
  padding: 8px;
  color: #6c7086;
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
  .timeline-column {
    width: 44px;
  }
  .waterfall-wrapper::before {
    left: 46px;
  }
}

@media (max-width: 500px) {
  .waterfall {
    column-count: 1;
  }
}
</style>