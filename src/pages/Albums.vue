<template>
  <q-page class="row q-col-gutter-md">
    <div class="col-12">
      <q-card>
        <q-card-section class="flex items-center justify-between">
          <h3 class="text-h5">我的相册</h3>
          <q-btn color="primary" label="创建相册" @click="showCreateDialog = true" />
        </q-card-section>
        <q-card-section class="q-pa-none">
          <div class="row q-col-gutter-sm">
            <div 
              v-for="album in albums" 
              :key="album.id"
              class="col-6 col-sm-4 col-md-3 cursor-pointer"
              @click="openAlbum(album.id)"
            >
              <q-card class="h-full">
                <q-card-section class="q-pa-none">
                  <q-img 
                    :src="getCoverUrl(album.coverPath)" 
                    class="rounded-t-lg"
                    style="height: 120px; object-fit: cover;"
                  />
                </q-card-section>
                <q-card-section class="q-pa-sm">
                  <span class="text-caption">{{ album.name }}</span>
                  <span class="text-xs text-grey-500 ml-2">{{ album.photoCount }} 张照片</span>
                </q-card-section>
              </q-card>
            </div>
          </div>
          <p v-if="albums.length === 0" class="text-center text-grey q-pa-md">暂无相册</p>
        </q-card-section>
      </q-card>
    </div>

    <q-dialog v-model="showCreateDialog">
      <q-card>
        <q-card-section>
          <h4 class="text-h6">创建新相册</h4>
        </q-card-section>
        <q-card-section>
          <q-input v-model="newAlbumName" label="相册名称" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn label="取消" @click="showCreateDialog = false" />
          <q-btn color="primary" label="创建" @click="createAlbum" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { api } from '@/api'

const albums = ref<any[]>([])
const showCreateDialog = ref(false)
const newAlbumName = ref('')

onMounted(async () => {
  await fetchAlbums()
})

async function fetchAlbums() {
  try {
    albums.value = await api.albums.getAll()
  } catch {
    albums.value = []
  }
}

function getCoverUrl(path: string | undefined) {
  if (!path) return 'https://picsum.photos/200/150'
  return `/api/photos/thumbnail/${path}`
}

function openAlbum(id: string) {
  console.log('Open album:', id)
}

async function createAlbum() {
  if (!newAlbumName.value.trim()) return
  
  try {
    await api.albums.create({ name: newAlbumName.value })
    await fetchAlbums()
    newAlbumName.value = ''
    showCreateDialog.value = false
  } catch (e) {
    console.error('Failed to create album:', e)
  }
}
</script>
