<template>
  <div class="share-page">
    <div class="share-header">
      <div class="share-icon">🔗</div>
      <h1>分享相册</h1>
    </div>

    <div v-if="loading" class="loading-state">
      <n-spin size="large" />
      <p>加载中...</p>
    </div>

    <div v-else-if="error" class="error-state">
      <div class="error-icon">⚠️</div>
      <h2>{{ error }}</h2>
      <p>分享链接可能已被撤销，或者您输入的链接无效。</p>
    </div>

    <template v-else-if="album">
      <div class="album-info">
        <h2>{{ album.name }}</h2>
        <p v-if="album.description" class="description">{{ album.description }}</p>
        <div class="meta">
          <span>由 <strong>{{ ownerName }}</strong> 分享</span>
          <span class="dot">·</span>
          <span>{{ album.mediaCount }} 张照片</span>
        </div>
      </div>

      <div v-if="mediaLoading && mediaList.length === 0" class="loading-state small">
        <n-spin size="large" />
        <p>加载照片中...</p>
      </div>

      <div v-else class="media-grid">
        <div
          v-for="item in mediaList"
          :key="item.id"
          class="media-item"
        >
          <img
            :src="getThumbnailUrl(item)"
            :alt="item.filename"
            loading="lazy"
          />
          <div class="media-overlay">
            <span class="media-name">{{ item.filename }}</span>
          </div>
        </div>
      </div>

      <div v-if="mediaLoading && mediaList.length > 0" class="loading-more">
        <n-spin size="small" /> 加载中...
      </div>

      <div v-if="!mediaLoading && hasMore" class="load-more-section">
        <n-button size="large" @click="loadMore">加载更多</n-button>
      </div>

      <div v-if="!mediaLoading && mediaList.length === 0" class="empty-state">
        <div class="empty-icon">📷</div>
        <p>这个相册还没有照片</p>
      </div>

      <div class="footer-note">
        <p>此分享链接由 NAS 照片管理系统生成。</p>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { publicShareApi } from '../utils/apiClient'

const route = useRoute()
const token = computed(() => route.params.token as string)

const loading = ref(true)
const error = ref('')
const album = ref<any>(null)
const ownerName = ref('')
const mediaList = ref<any[]>([])
const mediaLoading = ref(false)
const mediaPage = ref(1)
const hasMore = ref(true)

async function loadAlbum() {
  loading.value = true
  error.value = ''
  try {
    const result = await publicShareApi.getAlbum(token.value)
    album.value = result.album
    ownerName.value = result.ownerName
    mediaPage.value = 1
    mediaList.value = []
    await loadMedia()
  } catch (err: any) {
    error.value = err.message || '无法加载分享内容'
  } finally {
    loading.value = false
  }
}

async function loadMedia() {
  mediaLoading.value = true
  try {
    const result = await publicShareApi.getMedia(token.value, mediaPage.value, 30)
    mediaList.value = mediaPage.value === 1 ? result.data : [...mediaList.value, ...result.data]
    hasMore.value = mediaPage.value < result.pagination.totalPages
  } catch {
    // 忽略
  } finally {
    mediaLoading.value = false
  }
}

function loadMore() {
  mediaPage.value++
  loadMedia()
}

function getThumbnailUrl(item: any) {
  if (item.thumbnailPath) return item.thumbnailPath
  return `/api/media/preview/${item.id}`
}

onMounted(() => {
  loadAlbum()
})
</script>

<style scoped>
.share-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 24px;
}

.share-header {
  text-align: center;
  color: white;
  padding: 20px 0 40px;
}

.share-icon {
  font-size: 48px;
  margin-bottom: 8px;
}

.share-header h1 {
  margin: 0;
  font-size: 28px;
}

.loading-state,
.error-state,
.empty-state {
  background: white;
  border-radius: 16px;
  padding: 60px 20px;
  text-align: center;
  max-width: 600px;
  margin: 0 auto;
  color: #666;
}

.loading-state.small {
  padding: 40px 20px;
}

.error-icon,
.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.error-state h2 {
  color: #d32f2f;
  margin: 0 0 12px;
}

.album-info {
  background: white;
  border-radius: 16px;
  padding: 24px 32px;
  max-width: 1200px;
  margin: 0 auto 24px;
  text-align: center;
}

.album-info h2 {
  margin: 0 0 8px;
  font-size: 24px;
  color: #1a1a1a;
}

.album-info .description {
  color: #666;
  margin: 0 0 12px;
}

.album-info .meta {
  color: #888;
  font-size: 14px;
}

.album-info .dot {
  margin: 0 8px;
}

.media-grid {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 8px;
}

.media-item {
  position: relative;
  aspect-ratio: 1;
  overflow: hidden;
  border-radius: 8px;
  background: white;
}

.media-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.media-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.7), transparent);
  padding: 20px 8px 8px;
  opacity: 0;
  transition: opacity 0.2s;
}

.media-item:hover .media-overlay {
  opacity: 1;
}

.media-name {
  color: white;
  font-size: 11px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
}

.loading-more,
.load-more-section {
  text-align: center;
  padding: 24px;
}

.footer-note {
  text-align: center;
  color: rgba(255, 255, 255, 0.7);
  font-size: 13px;
  margin-top: 40px;
  padding: 20px;
}

.empty-state p {
  margin: 0;
}
</style>