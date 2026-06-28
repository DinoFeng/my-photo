<template>
  <div class="album-detail-page">
    <!-- 返回和基本信息 -->
    <div class="page-header">
      <button class="back-btn" @click="router.back()">← 返回</button>
      <div v-if="loading" class="loading-small"><n-spin size="small" /> 加载中...</div>
      <template v-else-if="album">
        <h1>{{ album.name }}</h1>
        <div class="header-meta">
          <span>👤 {{ album.ownerName }}</span>
          <span>·</span>
          <span>🖼️ {{ album.mediaCount }} 张</span>
          <span v-if="album.visibility === 'all_users'">· 🔓 共享</span>
        </div>
        <div class="header-actions" v-if="isOwner">
          <n-button @click="showEditDialog = true">编辑</n-button>
          <n-button @click="showShareDialog = true">分享</n-button>
          <n-button type="primary" @click="showAddMediaDialog = true">+ 添加照片</n-button>
        </div>
      </template>
    </div>

    <div v-if="error" class="error-box">
      {{ error }}
      <n-button @click="router.push('/albums')" size="small" style="margin-left: 16px">返回相册列表</n-button>
    </div>

    <template v-else-if="album">
      <div v-if="album.description" class="album-description">{{ album.description }}</div>

      <!-- 照片工具栏 -->
      <div class="toolbar" v-if="mediaList.length > 0 && isOwner">
        <span v-if="selectedIds.length > 0">已选中 {{ selectedIds.length }} 张</span>
        <div class="toolbar-right" v-if="selectedIds.length > 0">
          <n-button size="small" @click="clearSelection">取消选择</n-button>
          <n-button size="small" type="error" @click="doRemoveSelected">从相册移除</n-button>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="!mediaLoading && mediaList.length === 0" class="empty-state">
        <div class="empty-icon">📷</div>
        <h3>这个相册还没有照片</h3>
        <p v-if="isOwner">点击下方按钮，把您的美好回忆添加进来</p>
        <p v-else>等所有者添加照片后再来看看吧</p>
        <n-button v-if="isOwner" type="primary" size="large" @click="showAddMediaDialog = true">
          + 添加第一张照片
        </n-button>
      </div>

      <!-- 照片网格 -->
      <div v-else class="media-grid">
        <div
          v-for="item in mediaList"
          :key="item.id"
          :class="['media-item', { selected: selectedIds.includes(item.id) }]"
          @click="toggleSelect(item.id)"
        >
          <img
            :src="getThumbnailUrl(item)"
            :alt="item.filename"
            loading="lazy"
          />
          <div v-if="isOwner && selectedIds.includes(item.id)" class="check-mark">✓</div>
          <div class="media-overlay">
            <span class="media-name">{{ item.filename }}</span>
          </div>
        </div>
      </div>

      <!-- 加载更多 -->
      <div v-if="mediaLoading && mediaList.length > 0" class="loading-more">
        <n-spin size="small" /> 加载中...
      </div>

      <div v-if="!mediaLoading && hasMore && mediaList.length > 0" class="load-more-section">
        <n-button size="large" @click="loadMore">加载更多</n-button>
      </div>
    </template>

    <!-- 编辑相册对话框 -->
    <n-modal v-model:show="showEditDialog" preset="card" title="编辑相册" :style="{ width: '480px' }">
      <n-form v-if="album" :model="editForm" label-placement="top" style="margin-top: 12px">
        <n-form-item label="相册名称">
          <n-input v-model:value="editForm.name" />
        </n-form-item>
        <n-form-item label="描述">
          <n-input v-model:value="editForm.description" type="textarea" :autosize="{ minRows: 2, maxRows: 4 }" />
        </n-form-item>
        <n-form-item label="可见性">
          <n-radio-group v-model:value="editForm.visibility">
            <n-radio value="private">仅自己可见</n-radio>
            <n-radio value="all_users">所有登录用户可见</n-radio>
          </n-radio-group>
        </n-form-item>
      </n-form>
      <template #footer>
        <n-button @click="showEditDialog = false">取消</n-button>
        <n-button type="primary" :loading="editing" @click="doEdit">保存</n-button>
        <n-button type="error" ghost :loading="deleting" @click="doDelete">删除相册</n-button>
      </template>
    </n-modal>

    <!-- 添加照片对话框 -->
    <n-modal v-model:show="showAddMediaDialog" preset="card" title="添加照片到相册" :style="{ width: '800px', maxWidth: '90vw', height: '70vh' }">
      <div class="add-media-panel">
        <div class="search-section">
          <h4>选择要添加的照片</h4>
          <p class="hint">点击照片进行选择，然后点击"确认添加"</p>
          <div class="picker-actions">
            <span v-if="pickerSelectedIds.length > 0">已选 {{ pickerSelectedIds.length }} 张</span>
            <n-button v-if="pickerSelectedIds.length > 0" size="small" @click="pickerSelectedIds = []">清空</n-button>
            <n-button
              type="primary"
              size="large"
              :disabled="pickerSelectedIds.length === 0"
              :loading="addingMedia"
              @click="doAddMedia"
            >
              确认添加 ({{ pickerSelectedIds.length }})
            </n-button>
          </div>
        </div>

        <div v-if="pickerLoading" class="picker-loading">
          <n-spin size="large" /> 加载照片列表...
        </div>

        <div v-else class="picker-grid">
          <div
            v-for="item in pickerMediaList"
            :key="item.id"
            :class="['picker-item', { selected: pickerSelectedIds.includes(item.id), disabled: albumMediaIds.has(item.id) }]"
            @click="togglePickerSelect(item.id)"
          >
            <img
              :src="getThumbnailUrl(item)"
              :alt="item.filename"
              loading="lazy"
            />
            <div v-if="pickerSelectedIds.includes(item.id)" class="check-mark">✓</div>
            <div v-if="albumMediaIds.has(item.id)" class="in-album-badge">已在相册</div>
          </div>
        </div>

        <div v-if="pickerHasMore && !pickerLoading" class="picker-loadmore">
          <n-button @click="loadMorePickerMedia">加载更多</n-button>
        </div>
      </div>
    </n-modal>

    <!-- 分享管理对话框 -->
    <n-modal v-model:show="showShareDialog" preset="card" title="相册分享" :style="{ width: '600px' }">
      <div class="share-panel">
        <p class="hint">
          生成分享链接，任何人通过链接都可以查看此相册的照片。您随时可以撤销分享。
        </p>

        <div class="share-actions" style="margin: 16px 0">
          <n-button type="primary" :loading="creatingShare" @click="doCreateShare">
            + 生成新的分享链接
          </n-button>
        </div>

        <div v-if="sharesLoading" class="shares-loading">
          <n-spin size="small" />
        </div>

        <div v-else-if="shares.length === 0" class="no-shares">
          <p>暂无分享链接</p>
        </div>

        <div v-else class="shares-list">
          <div v-for="share in shares" :key="share.id" class="share-item">
            <div class="share-info">
              <div class="share-url">
                <input type="text" readonly :value="buildShareUrl(share.shareToken)" />
                <n-button size="small" @click="copyShareLink(share.shareToken)">复制</n-button>
              </div>
              <div class="share-meta">创建于 {{ formatDate(share.createdAt) }}</div>
            </div>
            <n-button size="small" type="error" @click="doDeleteShare(share.id)">撤销</n-button>
          </div>
        </div>
      </div>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import { albumApi, AlbumData, AlbumShareData } from '../utils/apiClient'
import { useAuthStore } from '../stores/auth'
import { apiClient } from '../utils/apiClient'

const route = useRoute()
const router = useRouter()
const message = useMessage()
const authStore = useAuthStore()

const albumId = computed(() => route.params.id as string)

const loading = ref(true)
const error = ref('')
const album = ref<AlbumData | null>(null)
const mediaList = ref<any[]>([])
const mediaLoading = ref(false)
const mediaPage = ref(1)
const hasMore = ref(true)
const selectedIds = ref<string[]>([])

const showEditDialog = ref(false)
const showAddMediaDialog = ref(false)
const showShareDialog = ref(false)
const editing = ref(false)
const deleting = ref(false)
const addingMedia = ref(false)
const creatingShare = ref(false)

const editForm = reactive({
  name: '',
  description: '',
  visibility: 'private' as 'private' | 'all_users',
})

const shares = ref<AlbumShareData[]>([])
const sharesLoading = ref(false)

const pickerMediaList = ref<any[]>([])
const pickerSelectedIds = ref<string[]>([])
const pickerLoading = ref(false)
const pickerPage = ref(1)
const pickerHasMore = ref(true)
const albumMediaIds = computed(() => new Set(mediaList.value.map((m) => m.id)))

const isOwner = computed(() => {
  if (!album.value || !authStore.user) return false
  return album.value.ownerId === authStore.user.id
})

async function loadAlbum() {
  loading.value = true
  error.value = ''
  try {
    const result = await albumApi.getDetail(albumId.value)
    album.value = result.album
    editForm.name = result.album.name
    editForm.description = result.album.description || ''
    editForm.visibility = result.album.visibility
    mediaPage.value = 1
    mediaList.value = []
    await loadMedia()
  } catch (err: any) {
    error.value = err.message || '加载失败'
  } finally {
    loading.value = false
  }
}

async function loadMedia() {
  mediaLoading.value = true
  try {
    const result = await albumApi.getMedia(albumId.value, mediaPage.value, 30)
    mediaList.value = mediaPage.value === 1 ? result.data : [...mediaList.value, ...result.data]
    hasMore.value = mediaPage.value < result.pagination.totalPages
  } catch (err: any) {
    message.error(err.message || '加载照片失败')
  } finally {
    mediaLoading.value = false
  }
}

function loadMore() {
  mediaPage.value++
  loadMedia()
}

function toggleSelect(id: string) {
  if (!isOwner.value) return
  const idx = selectedIds.value.indexOf(id)
  if (idx >= 0) {
    selectedIds.value.splice(idx, 1)
  } else {
    selectedIds.value.push(id)
  }
}

function clearSelection() {
  selectedIds.value = []
}

async function doRemoveSelected() {
  if (selectedIds.value.length === 0) return
  if (!confirm(`确定要从相册中移除 ${selectedIds.value.length} 张照片吗？（不会删除原始照片）`)) {
    return
  }
  try {
    await albumApi.batchRemoveMedia(albumId.value, [...selectedIds.value])
    message.success(`已移除 ${selectedIds.value.length} 张照片`)
    mediaList.value = mediaList.value.filter((m) => !selectedIds.value.includes(m.id))
    selectedIds.value = []
    if (album.value) album.value.mediaCount = mediaList.value.length
  } catch (err: any) {
    message.error(err.message || '移除失败')
  }
}

async function doEdit() {
  if (!editForm.name.trim()) return
  editing.value = true
  try {
    const result = await albumApi.update(albumId.value, {
      name: editForm.name.trim(),
      description: editForm.description.trim() || undefined,
      visibility: editForm.visibility,
    })
    album.value = result.album
    message.success('已保存')
    showEditDialog.value = false
  } catch (err: any) {
    message.error(err.message || '保存失败')
  } finally {
    editing.value = false
  }
}

async function doDelete() {
  if (!confirm('确定要删除这个相册吗？相册内的照片不会被删除。')) return
  deleting.value = true
  try {
    await albumApi.remove(albumId.value)
    message.success('相册已删除')
    router.push('/albums')
  } catch (err: any) {
    message.error(err.message || '删除失败')
  } finally {
    deleting.value = false
  }
}

function getThumbnailUrl(item: any) {
  if (item.thumbnailPath) return item.thumbnailPath
  return `/api/media/preview/${item.id}`
}

async function loadPickerMediaList() {
  pickerLoading.value = true
  try {
    const result = await apiClient.get<{ data: any[]; pagination: any }>(`/media/list?page=${pickerPage.value}&limit=30`)
    pickerMediaList.value = pickerPage.value === 1 ? result.data : [...pickerMediaList.value, ...result.data]
    pickerHasMore.value = pickerPage.value < result.pagination.totalPages
  } catch (err: any) {
    message.error(err.message || '加载照片列表失败')
  } finally {
    pickerLoading.value = false
  }
}

function togglePickerSelect(id: string) {
  if (albumMediaIds.value.has(id)) return
  const idx = pickerSelectedIds.value.indexOf(id)
  if (idx >= 0) {
    pickerSelectedIds.value.splice(idx, 1)
  } else {
    pickerSelectedIds.value.push(id)
  }
}

function loadMorePickerMedia() {
  pickerPage.value++
  loadPickerMediaList()
}

async function doAddMedia() {
  if (pickerSelectedIds.value.length === 0) return
  addingMedia.value = true
  try {
    const result = await albumApi.addMedia(albumId.value, pickerSelectedIds.value)
    message.success(`成功添加 ${result.added} 张照片`)
    showAddMediaDialog.value = false
    pickerSelectedIds.value = []
    mediaPage.value = 1
    mediaList.value = []
    loadMedia()
    if (album.value) album.value.mediaCount = mediaList.value.length
  } catch (err: any) {
    message.error(err.message || '添加失败')
  } finally {
    addingMedia.value = false
  }
}

async function loadShares() {
  sharesLoading.value = true
  try {
    const result = await albumApi.getShares(albumId.value)
    shares.value = result.shares || []
  } catch (err: any) {
    message.error(err.message || '加载分享列表失败')
  } finally {
    sharesLoading.value = false
  }
}

async function doCreateShare() {
  creatingShare.value = true
  try {
    const result = await albumApi.createShare(albumId.value)
    message.success('已生成分享链接')
    shares.value.unshift(result.share)
  } catch (err: any) {
    message.error(err.message || '生成失败')
  } finally {
    creatingShare.value = false
  }
}

async function doDeleteShare(shareId: string) {
  if (!confirm('确定要撤销此分享链接吗？撤销后链接将失效。')) return
  try {
    await albumApi.removeShare(albumId.value, shareId)
    message.success('已撤销分享')
    shares.value = shares.value.filter((s) => s.id !== shareId)
  } catch (err: any) {
    message.error(err.message || '撤销失败')
  }
}

function buildShareUrl(token: string) {
  return `${window.location.origin}/share/album/${token}`
}

function copyShareLink(token: string) {
  const url = buildShareUrl(token)
  navigator.clipboard.writeText(url).then(
    () => message.success('已复制到剪贴板'),
    () => {
      // 兜底：选中让用户手动复制
      const input = document.createElement('input')
      input.value = url
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      message.success('已复制到剪贴板')
    }
  )
}

function formatDate(dateStr: string) {
  try {
    const date = new Date(dateStr)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  } catch {
    return dateStr
  }
}

onMounted(async () => {
  if (!authStore.isAuthenticated) {
    router.push('/login')
    return
  }
  await loadAlbum()
})

// 打开分享对话框时刷新分享列表
function onShareDialogOpen() {
  loadShares()
}

// 监听 showShareDialog 变化
watchModal(showShareDialog, onShareDialogOpen)

// 打开添加照片时加载列表
function onAddMediaDialogOpen() {
  if (pickerMediaList.value.length === 0) {
    pickerPage.value = 1
    loadPickerMediaList()
  }
}
watchModal(showAddMediaDialog, onAddMediaDialogOpen)

function watchModal(ref: { value: boolean }, handler: () => void) {
  let prev = false
  setInterval(() => {
    if (ref.value && !prev) {
      handler()
    }
    prev = ref.value
  }, 200)
}
</script>

<style scoped>
.album-detail-page {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 24px;
}

.back-btn {
  align-self: flex-start;
  background: transparent;
  border: none;
  color: #667eea;
  font-size: 14px;
  cursor: pointer;
  padding: 6px 0;
}

.back-btn:hover {
  color: #5a67d8;
}

.page-header h1 {
  margin: 0;
  font-size: 28px;
}

.header-meta {
  color: #666;
  font-size: 14px;
}

.header-meta span {
  margin-right: 4px;
}

.header-actions {
  display: flex;
  gap: 12px;
  margin-top: 8px;
}

.error-box {
  background: #ffebee;
  color: #c62828;
  padding: 16px;
  border-radius: 8px;
  display: flex;
  align-items: center;
}

.album-description {
  background: #f5f5f5;
  padding: 16px;
  border-radius: 8px;
  color: #555;
  margin-bottom: 20px;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: #eef2ff;
  border-radius: 8px;
  margin-bottom: 16px;
}

.toolbar-right {
  display: flex;
  gap: 8px;
}

.empty-state {
  text-align: center;
  padding: 80px 20px;
  color: #888;
  background: white;
  border-radius: 12px;
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

.media-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 8px;
}

.media-item {
  position: relative;
  aspect-ratio: 1;
  overflow: hidden;
  border-radius: 8px;
  cursor: pointer;
  border: 3px solid transparent;
  transition: all 0.15s;
}

.media-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.media-item.selected {
  border-color: #667eea;
}

.check-mark {
  position: absolute;
  top: 6px;
  left: 6px;
  background: #667eea;
  color: white;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: bold;
}

.media-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.7), transparent);
  padding: 24px 8px 8px;
  opacity: 0;
  transition: opacity 0.2s;
}

.media-item:hover .media-overlay {
  opacity: 1;
}

.media-name {
  color: white;
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
}

.loading-small {
  color: #888;
  display: flex;
  align-items: center;
  gap: 8px;
}

.loading-more,
.load-more-section {
  text-align: center;
  padding: 24px;
  color: #888;
}

/* 添加照片对话框 */
.add-media-panel {
  height: calc(70vh - 140px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.search-section {
  border-bottom: 1px solid #eaeaea;
  padding-bottom: 16px;
  margin-bottom: 16px;
}

.search-section h4 {
  margin: 0 0 4px;
}

.hint {
  color: #888;
  font-size: 13px;
  margin: 0 0 12px;
}

.picker-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.picker-loading {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.picker-grid {
  flex: 1;
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 6px;
  align-content: flex-start;
  padding: 4px;
}

.picker-item {
  position: relative;
  aspect-ratio: 1;
  overflow: hidden;
  border-radius: 6px;
  cursor: pointer;
  border: 3px solid transparent;
  transition: all 0.15s;
}

.picker-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.picker-item.selected {
  border-color: #667eea;
}

.picker-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.in-album-badge {
  position: absolute;
  bottom: 4px;
  left: 4px;
  right: 4px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  text-align: center;
}

.picker-loadmore {
  padding: 16px 0 0;
  text-align: center;
}

/* 分享 */
.share-panel .share-actions {
  margin: 16px 0;
}

.shares-loading {
  padding: 20px;
  text-align: center;
}

.no-shares {
  padding: 40px;
  text-align: center;
  color: #888;
}

.shares-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 300px;
  overflow-y: auto;
}

.share-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: #f5f5f5;
  border-radius: 8px;
  gap: 12px;
}

.share-info {
  flex: 1;
  min-width: 0;
}

.share-url {
  display: flex;
  gap: 8px;
  margin-bottom: 6px;
}

.share-url input {
  flex: 1;
  padding: 6px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 13px;
  background: white;
}

.share-meta {
  color: #888;
  font-size: 12px;
}
</style>