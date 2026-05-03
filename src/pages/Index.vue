<template>
  <q-page class="row q-col-gutter-md">
    <div class="col-12">
      <q-card>
        <q-card-section>
          <h3 class="text-h5">最近照片</h3>
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
                :src="photo.thumbnailPath" 
                class="rounded-lg"
                style="height: 150px; object-fit: cover;"
              />
            </div>
          </div>
        </q-card-section>
      </q-card>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const photos = ref([])

onMounted(async () => {
  photos.value = await fetchPhotos()
})

async function fetchPhotos() {
  try {
    const response = await fetch('/api/photos?limit=24')
    return await response.json()
  } catch {
    return []
  }
}

function openPhoto(id: string) {
  router.push(`/photo/${id}`)
}
</script>
