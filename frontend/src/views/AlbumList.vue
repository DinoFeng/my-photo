<template>
  <div class="album-list-page">
    <div class="page-header">
      <h1>📚 相册</h1>
      <div class="header-actions">
        <n-radio-group v-model:value="filterMode" size="medium" @update:value="loadAlbums">
          <n-radio-button value="all">全部</n-radio-button>
          <n-radio-button value="me">我的</n-radio-button>
          <n-radio-button value="others">共享的</n-radio-button>
        </n-radio-group>
        <n-button type="primary" @click="showCreateDialog = true">
          <span style="margin-right: 4px">+</span> 新建相册
        </n-button>
      </div>
    </div>

    <div v-if="loading" class="loading-state">
      <n-spin size="large" />
      <p>加载中...</p>
    </div>

    <div v-else-if="albums.length === 0" class="empty-state">
      <div class="empty-icon">📷</div>
      <h3>还没有相册</h3>
      <p>创建一个相册，开始整理您的美好回忆</p>
      <n-button type="primary" size="large" @click="showCreateDialog = true">
        创建第一个相册
      </n-button>
    </div>

    <div v-else class="album-grid">
      <div
        v-for="album in albums"
        :key="album.id"
        class="album-card"
        @click="openAlbum(album)"
      >
        <div class="album-cover">
          <img v-if="album.coverMediaId && coverThumbnails[album.coverMediaId]"
               :src="coverThumbnails[album.coverMediaId]"
               :alt="album.name"
               class="cover-img" />
          <div v-else class="cover-placeholder">
            <span class="cover-icon">🖼️</span>
          </div>
          <div v-if="album.visibility === 'all_users'" class="visibility-badge" title="所有登录用户可见">
            共享
          </div>
          <span class="media-count">{{ album.mediaCount }} 张</span>
        </div>
        <div class="album-info">
          <div class="album-title">{{ album.name }}</div>
          <div class="album-meta">
            <span class="owner">{{ album.ownerName || '我' }}</span>
            <span class="dot">·</span>
            <span class="date">{{ formatDate(album.updatedAt) }}</span>
          </div>
          <div v-if="album.description" class="album-desc">{{ album.description }}</div>
        </div>
      </div>
    </div>

    <!-- 创建相册对话框 -->
    <n-modal v-model:show="showCreateDialog" preset="card" title="新建相册" :style="{ width: '480px' }">
      <n-form :model="createForm" label-placement="top" style="margin-top: 12px">
        <n-form-item label="相册名称">
          <n-input v-model:value="createForm.name" placeholder="如：2026年春节" />
        </n-form-item>
        <n-form-item label="描述（可选）">
          <n-input v-model:value="createForm.description" type="textarea" placeholder="简短描述这个相册" :autosize="{ minRows: 2, maxRows: 4 }" />
        </n-form-item>
        <n-form-item label="可见性">
          <n-radio-group v-model:value="createForm.visibility">
            <n-radio value="private">仅自己可见</n-radio>
            <n-radio value="all_users">所有登录用户可见</n-radio>
          </n-radio-group>
        </n-form-item>
      </n-form>
      <template #footer>
        <n-button @click="showCreateDialog = false">取消</n-button>
        <n-button type="primary" :disabled="!createForm.name.trim()" :loading="creating" @click="doCreate">
          创建
        </n-button>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import { albumApi, AlbumData } from '../utils/apiClient'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const message = useMessage()
const authStore = useAuthStore()

const albums = ref<AlbumData[]>([])
const loading = ref(true)
const filterMode = ref<'all' | 'me' | 'others'>('all')
const showCreateDialog = ref(false)
const creating = ref(false)
const coverThumbnails = ref<Record<string, string>>({})

const createForm = reactive({
  name: '',
  description: '',
  visibility: 'private' as 'private' | 'all_users',
})

async function loadAlbums() {
  loading.value = true
  try {
    let result
    if (filterMode.value === 'me') {
      result = await albumApi.getList({ owner: 'me' })
    } else if (filterMode.value === 'others') {
      result = await albumApi.getList({ owner: 'others' })
    } else {
      result = await albumApi.getList()
    }
    albums.value = result.albums || []

    // 获取封面缩略图
    for (const album of albums.value) {
      if (album.coverMediaId && !coverThumbnails.value[album.coverMediaId]) {
        try {
          coverThumbnails.value[album.coverMediaId] = `/api/media/preview/${album.coverMediaId}`
        } catch {
          // 忽略
        }
      }
    }
  } catch (err: any) {
    message.error(err.message || '加载失败')
  } finally {
    loading.value = false
  }
}

async function doCreate() {
  if (!createForm.name.trim()) return
  creating.value = true
  try {
    const result = await albumApi.create({
      name: createForm.name.trim(),
      description: createForm.description.trim() || undefined,
      visibility: createForm.visibility,
    })
    message.success('相册创建成功')
    showCreateDialog.value = false
    createForm.name = ''
    createForm.description = ''
    createForm.visibility = 'private'
    await loadAlbums()
    // 跳转到新建的相册
    if (result.album) {
      router.push(`/albums/${result.album.id}`)
    }
  } catch (err: any) {
    message.error(err.message || '创建失败')
  } finally {
    creating.value = false
  }
}

function openAlbum(album: AlbumData) {
  router.push(`/albums/${album.id}`)
}

function formatDate(dateStr: string) {
  try {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    if (days < 1) return '今天'
    if (days < 7) return `${days} 天前`
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  } catch {
    return dateStr
  }
}

onMounted(() => {
  if (!authStore.isAuthenticated) {
    router.push('/login')
    return
  }
  loadAlbums()
})
</script>

<style scoped>
.album-list-page {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;
}

.page-header h1 {
  margin: 0;
  font-size: 28px;
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.loading-state,
.empty-state {
  text-align: center;
  padding: 80px 20px;
  color: #888;
}

.empty-icon {
  font-size: 80px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-state h3 {
  margin: 0 0 8px;
  color: #333;
}

.album-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 20px;
}

.album-card {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: all 0.2s;
  border: 1px solid #eaeaea;
}

.album-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.album-cover {
  position: relative;
  aspect-ratio: 4/3;
  background: #f5f5f5;
  overflow: hidden;
}

.cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%);
}

.cover-icon {
  font-size: 64px;
  opacity: 0.6;
}

.visibility-badge {
  position: absolute;
  top: 10px;
  left: 10px;
  background: rgba(102, 126, 234, 0.9);
  color: white;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.media-count {
  position: absolute;
  bottom: 10px;
  right: 10px;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
}

.album-info {
  padding: 16px;
}

.album-title {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.album-meta {
  font-size: 13px;
  color: #888;
  margin-bottom: 6px;
}

.dot {
  margin: 0 6px;
}

.album-desc {
  font-size: 13px;
  color: #666;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>