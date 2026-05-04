<template>
  <q-page class="row q-col-gutter-md q-pa-md">
    <div class="col-12">
      <q-card>
        <q-card-section>
          <div class="row items-center justify-between">
            <div class="col">
              <h3 class="text-h5 q-my-none">照片</h3>
            </div>
            <div class="col-auto">
              <q-input
                v-model="searchQuery"
                outlined
                dense
                placeholder="搜索照片..."
                class="search-input"
              >
                <template v-slot:prepend>
                  <q-icon name="search" />
                </template>
                <template v-slot:append v-if="searchQuery">
                  <q-icon name="clear" class="cursor-pointer" @click="searchQuery = ''" />
                </template>
              </q-input>
            </div>
          </div>
        </q-card-section>

        <q-card-section v-if="hasFilters" class="q-py-sm">
          <div class="row q-gutter-sm items-center">
            <q-chip
              v-if="filters.dateFrom || filters.dateTo"
              removable
              color="primary"
              text-color="white"
              @remove="clearDateFilter"
            >
              {{ formatDateRange(filters.dateFrom, filters.dateTo) }}
            </q-chip>

            <q-chip
              v-if="filters.camera"
              removable
              color="primary"
              text-color="white"
              @remove="filters.camera = ''"
            >
              {{ filters.camera }}
            </q-chip>

            <q-chip
              v-if="filters.location"
              removable
              color="primary"
              text-color="white"
              @remove="filters.location = ''"
            >
              {{ filters.location }}
            </q-chip>

            <q-btn flat size="sm" label="清除所有" @click="clearAllFilters" />
          </div>
        </q-card-section>

        <q-card-section class="q-pa-none">
          <div v-if="loading" class="flex flex-center q-pa-xl">
            <q-spinner-dots size="50px" color="primary" />
          </div>

          <div v-else-if="filteredPhotos.length === 0" class="flex flex-center q-pa-xl">
            <div class="text-center text-grey">
              <q-icon name="photo_library" size="64px" class="q-mb-md" />
              <p>暂无照片</p>
            </div>
          </div>

          <div v-else class="row q-col-gutter-sm q-pa-sm">
            <div
              v-for="photo in filteredPhotos"
              :key="photo.id"
              class="col-6 col-sm-4 col-md-3 col-lg-2"
            >
              <PhotoCard
                :photo="photo"
                show-info
                show-actions
                @click="openPhoto(photo)"
                @view="openPhoto(photo)"
                @add-to-album="showAddToAlbumDialog(photo)"
                @delete="confirmDelete(photo)"
              />
            </div>
          </div>
        </q-card-section>

        <q-card-section v-if="filteredPhotos.length > 0" class="text-center">
          <q-pagination
            v-model="currentPage"
            :max="totalPages"
            :max-pages="6"
            boundary-numbers
          />
        </q-card-section>
      </q-card>
    </div>

    <PhotoViewer
      v-model="showViewer"
      :photo="selectedPhoto"
      :photos="filteredPhotos"
      @change="selectedPhoto = $event"
    />

    <q-dialog v-model="showAlbumDialog">
      <q-card>
        <q-card-section>
          <h4 class="text-h6">添加到相册</h4>
        </q-card-section>
        <q-card-section>
          <q-list>
            <q-item
              v-for="album in albums"
              :key="album.id"
              clickable
              @click="addToAlbum(album.id)"
            >
              <q-item-section avatar>
                <q-icon name="photo_album" />
              </q-item-section>
              <q-item-section>
                <q-item-label>{{ album.name }}</q-item-label>
                <q-item-label caption>{{ album.type === 'system' ? '系统相册' : '自定义相册' }}</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="取消" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="showDeleteDialog">
      <q-card>
        <q-card-section>
          <h4 class="text-h6">确认删除</h4>
        </q-card-section>
        <q-card-section>
          确定要删除照片 "{{ photoToDelete?.fileName }}" 吗？此操作不可撤销。
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="取消" v-close-popup />
          <q-btn flat color="negative" label="删除" @click="deletePhoto" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { usePhotoStore } from '@/stores/photo'
import { useAlbumStore } from '@/stores/album'
import PhotoCard from '@/components/PhotoCard.vue'
import PhotoViewer from '@/components/PhotoViewer.vue'

const router = useRouter()
const photoStore = usePhotoStore()
const albumStore = useAlbumStore()

const searchQuery = ref('')
const currentPage = ref(1)
const perPage = 24
const showViewer = ref(false)
const selectedPhoto = ref<any>(null)
const showAlbumDialog = ref(false)
const photoToAdd = ref<any>(null)
const showDeleteDialog = ref(false)
const photoToDelete = ref<any>(null)

const filters = ref({
  dateFrom: '',
  dateTo: '',
  camera: '',
  location: ''
})

const loading = computed(() => photoStore.loading)
const photos = computed(() => photoStore.photos)
const albums = computed(() => albumStore.albums)

const hasFilters = computed(() =>
  filters.value.dateFrom || filters.value.dateTo || filters.value.camera || filters.value.location
)

const filteredPhotos = computed(() => {
  let result = [...photos.value]

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(p =>
      p.fileName.toLowerCase().includes(query)
    )
  }

  if (filters.value.dateFrom) {
    const from = new Date(filters.value.dateFrom)
    result = result.filter(p => new Date(p.takenDate || p.importedAt) >= from)
  }

  if (filters.value.dateTo) {
    const to = new Date(filters.value.dateTo)
    result = result.filter(p => new Date(p.takenDate || p.importedAt) <= to)
  }

  if (filters.value.camera) {
    result = result.filter(p => p.exif?.camera === filters.value.camera)
  }

  if (filters.value.location) {
    result = result.filter(p =>
      p.exif?.gps?.city === filters.value.location ||
      p.exif?.gps?.country === filters.value.location
    )
  }

  return result
})

const totalPages = computed(() => Math.ceil(filteredPhotos.value.length / perPage))

onMounted(async () => {
  await photoStore.fetchPhotos()
  await albumStore.fetchAlbums()
})

watch(searchQuery, () => {
  currentPage.value = 1
})

function openPhoto(photo: any) {
  selectedPhoto.value = photo
  showViewer.value = true
}

function showAddToAlbumDialog(photo: any) {
  photoToAdd.value = photo
  showAlbumDialog.value = true
}

async function addToAlbum(albumId: string) {
  if (photoToAdd.value) {
    await albumStore.addPhotoToAlbum(albumId, photoToAdd.value.id)
    showAlbumDialog.value = false
    photoToAdd.value = null
  }
}

function confirmDelete(photo: any) {
  photoToDelete.value = photo
  showDeleteDialog.value = true
}

async function deletePhoto() {
  if (photoToDelete.value) {
    await photoStore.deletePhoto(photoToDelete.value.id)
    showDeleteDialog.value = false
    photoToDelete.value = null
  }
}

function clearDateFilter() {
  filters.value.dateFrom = ''
  filters.value.dateTo = ''
}

function clearAllFilters() {
  filters.value = {
    dateFrom: '',
    dateTo: '',
    camera: '',
    location: ''
  }
  searchQuery.value = ''
}

function formatDateRange(from?: string, to?: string): string {
  if (from && to) return `${from} ~ ${to}`
  if (from) return `从 ${from}`
  if (to) return `到 ${to}`
  return ''
}
</script>

<style scoped lang="scss">
.search-input {
  width: 300px;
}
</style>
