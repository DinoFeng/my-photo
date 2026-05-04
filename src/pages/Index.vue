<template>
  <q-page class="row q-col-gutter-md">
    <div class="col-12">
      <q-card>
        <q-card-section>
          <h3 class="text-h5">最近照片</h3>
          <q-btn flat label="查看全部" @click="viewAll" class="float-right" />
        </q-card-section>
        <q-card-section class="q-pa-none">
          <div class="row q-col-gutter-sm">
            <div 
              v-for="photo in photos" 
              :key="photo.id"
              class="col-6 col-sm-4 col-md-3 col-lg-2 cursor-pointer"
              @click="openPhoto(photo.id)"
            >
              <q-img 
                :src="getThumbnailUrl(photo.thumbnailPath)" 
                class="rounded-lg"
                style="height: 150px; object-fit: cover;"
              />
            </div>
          </div>
          <p v-if="photos.length === 0" class="text-center text-grey q-pa-md">暂无照片</p>
        </q-card-section>
      </q-card>

      <q-card class="q-mt-md">
        <q-card-section>
          <h3 class="text-h5">相册</h3>
          <q-btn flat label="查看全部" @click="viewAlbums" class="float-right" />
        </q-card-section>
        <q-card-section class="q-pa-none">
          <div class="row q-col-gutter-sm">
            <div 
              v-for="album in albums" 
              :key="album.id"
              class="col-6 col-sm-4 col-md-3 cursor-pointer"
              @click="openAlbum(album.id)"
            >
              <q-card class="full-width">
                <q-card-section class="q-pa-0">
                  <q-img 
                    :src="album.coverPath ? getThumbnailUrl(album.coverPath) : 'https://picsum.photos/200/150'" 
                    style="height: 120px; object-fit: cover;"
                  />
                </q-card-section>
                <q-card-section class="q-pa-sm">
                  <p class="text-sm">{{ album.name }}</p>
                  <p class="text-xs text-grey">{{ album.photoCount }} 张照片</p>
                </q-card-section>
              </q-card>
            </div>
          </div>
          <p v-if="albums.length === 0" class="text-center text-grey q-pa-md">暂无相册</p>
        </q-card-section>
      </q-card>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '@/api'

const router = useRouter()
const photos = ref<any[]>([])
const albums = ref<any[]>([])

onMounted(async () => {
  await fetchPhotos()
  await fetchAlbums()
})

async function fetchPhotos() {
  try {
    photos.value = await api.photos.getAll({ limit: 12 })
  } catch {
    photos.value = []
  }
}

async function fetchAlbums() {
  try {
    albums.value = await api.albums.getAll()
  } catch {
    albums.value = []
  }
}

function getThumbnailUrl(path: string | undefined) {
  if (!path) return 'https://picsum.photos/200/150'
  return `/api/photos/thumbnail/${path}`
}

function openPhoto(id: string) {
  router.push(`/photo/${id}`)
}

function openAlbum(id: string) {
  router.push(`/albums/${id}`)
}

function viewAll() {
  router.push('/photos')
}

function viewAlbums() {
  router.push('/albums')
}
</script>
