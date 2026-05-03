<template>
  <q-page>
    <q-card v-if="photo">
      <q-card-section class="q-pa-none">
        <q-img 
          :src="photo.filePath" 
          class="w-full"
          style="max-height: 70vh; object-fit: contain;"
        />
      </q-card-section>
      <q-card-section>
        <div class="flex items-start justify-between">
          <div>
            <h3 class="text-h5">{{ photo.fileName }}</h3>
            <span class="text-caption text-grey-500">{{ photo.filePath }}</span>
          </div>
          <q-btn icon="download" @click="downloadPhoto" />
        </div>
      </q-card-section>
      <q-card-section v-if="photo.exif">
        <h4 class="text-h6">EXIF 信息</h4>
        <div class="row">
          <div class="col-6">
            <q-item class="q-pa-none">
              <q-item-section>拍摄日期</q-item-section>
              <q-item-section side>{{ formatDate(photo.exif.date) }}</q-item-section>
            </q-item>
            <q-item class="q-pa-none">
              <q-item-section>相机型号</q-item-section>
              <q-item-section side>{{ photo.exif.camera }}</q-item-section>
            </q-item>
            <q-item class="q-pa-none">
              <q-item-section>光圈</q-item-section>
              <q-item-section side>{{ photo.exif.aperture }}</q-item-section>
            </q-item>
          </div>
          <div class="col-6">
            <q-item class="q-pa-none">
              <q-item-section>快门速度</q-item-section>
              <q-item-section side>{{ photo.exif.shutterSpeed }}</q-item-section>
            </q-item>
            <q-item class="q-pa-none">
              <q-item-section>ISO</q-item-section>
              <q-item-section side>{{ photo.exif.iso }}</q-item-section>
            </q-item>
            <q-item class="q-pa-none">
              <q-item-section>焦距</q-item-section>
              <q-item-section side>{{ photo.exif.focalLength }}</q-item-section>
            </q-item>
          </div>
        </div>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const photo = ref(null)

onMounted(async () => {
  const id = route.params.id
  photo.value = await fetchPhoto(id)
})

async function fetchPhoto(id: string) {
  try {
    const response = await fetch(`/api/photos/${id}`)
    return await response.json()
  } catch {
    return null
  }
}

function formatDate(dateStr: string) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString()
}

function downloadPhoto() {
  if (!photo.value) return
  const link = document.createElement('a')
  link.href = `/api/photos/${photo.value.id}/download`
  link.download = photo.value.fileName
  link.click()
}
</script>
