<template>
  <q-page class="row q-col-gutter-md q-pa-md">
    <div class="col-12">
      <q-card>
        <q-card-section>
          <h3 class="text-h5">搜索与筛选</h3>
        </q-card-section>

        <q-card-section>
          <q-input
            v-model="searchQuery"
            outlined
            placeholder="输入搜索关键词..."
            class="q-mb-md"
            @keyup.enter="performSearch"
          >
            <template v-slot:prepend>
              <q-icon name="search" />
            </template>
            <template v-slot:append>
              <q-btn flat round icon="clear" @click="searchQuery = ''" />
            </template>
          </q-input>

          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-6">
              <q-select
                v-model="selectedDateRange"
                outlined
                label="日期范围"
                :options="dateRangeOptions"
                clearable
              />
            </div>

            <div class="col-12 col-md-6">
              <q-select
                v-model="selectedCamera"
                outlined
                label="相机型号"
                :options="cameraOptions"
                clearable
                use-input
                input-debounce="300"
                @filter="filterCameras"
              />
            </div>

            <div class="col-12 col-md-6">
              <q-select
                v-model="selectedLocation"
                outlined
                label="拍摄地点"
                :options="locationOptions"
                clearable
                use-input
                input-debounce="300"
                @filter="filterLocations"
              />
            </div>

            <div class="col-12">
              <q-btn-group spread>
                <q-btn color="primary" label="搜索" @click="performSearch" />
                <q-btn flat color="grey" label="重置" @click="resetFilters" />
              </q-btn-group>
            </div>
          </div>
        </q-card-section>
      </q-card>

      <q-card class="q-mt-md">
        <q-card-section>
          <div class="row items-center justify-between">
            <div class="text-h6">搜索结果</div>
            <div class="text-caption text-grey">{{ filteredPhotos.length }} 张照片</div>
          </div>
        </q-card-section>

        <q-card-section v-if="loading" class="flex flex-center q-pa-xl">
          <q-spinner-dots size="50px" color="primary" />
        </q-card-section>

        <q-card-section v-else-if="filteredPhotos.length === 0" class="flex flex-center q-pa-xl">
          <div class="text-center text-grey">
            <q-icon name="search_off" size="64px" class="q-mb-md" />
            <p>没有找到匹配的照片</p>
          </div>
        </q-card-section>

        <q-card-section v-else class="q-pa-none">
          <div class="row q-col-gutter-sm q-pa-sm">
            <div
              v-for="photo in filteredPhotos"
              :key="photo.id"
              class="col-6 col-sm-4 col-md-3 col-lg-2"
            >
              <PhotoCard
                :photo="photo"
                show-info
                @click="openPhoto(photo)"
              />
            </div>
          </div>
        </q-card-section>
      </q-card>
    </div>

    <PhotoViewer
      v-model="showViewer"
      :photo="selectedPhoto"
      :photos="filteredPhotos"
      @change="selectedPhoto = $event"
    />
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import PhotoCard from '@/components/PhotoCard.vue'
import PhotoViewer from '@/components/PhotoViewer.vue'
import { usePhotoStore } from '@/stores/photo'

const photoStore = usePhotoStore()

const searchQuery = ref('')
const selectedDateRange = ref(null)
const selectedCamera = ref(null)
const selectedLocation = ref(null)
const showViewer = ref(false)
const selectedPhoto = ref<any>(null)
const loading = computed(() => photoStore.loading)

const cameraOptions = ref<string[]>([])
const locationOptions = ref<string[]>([])

const dateRangeOptions = [
  '今天',
  '最近 7 天',
  '最近 30 天',
  '本月',
  '今年',
  '自定义'
]

const filteredPhotos = computed(() => {
  let result = [...photoStore.photos]

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(p =>
      p.fileName.toLowerCase().includes(query)
    )
  }

  if (selectedCamera.value) {
    result = result.filter(p => p.exif?.camera === selectedCamera.value)
  }

  if (selectedLocation.value) {
    result = result.filter(p =>
      p.exif?.gps?.city === selectedLocation.value ||
      p.exif?.gps?.country === selectedLocation.value
    )
  }

  return result
})

onMounted(async () => {
  await photoStore.fetchPhotos()
  await loadFilterOptions()
})

async function loadFilterOptions() {
  try {
    const camerasRes = await fetch('/api/search/cameras')
    cameraOptions.value = await camerasRes.json()

    const locationsRes = await fetch('/api/search/locations')
    locationOptions.value = await locationsRes.json()
  } catch (error) {
    console.error('Failed to load filter options:', error)
  }
}

function filterCameras(val: string, update: Function) {
  update(() => {
    const needle = val.toLowerCase()
    // Filter logic would happen here with actual camera data
  })
}

function filterLocations(val: string, update: Function) {
  update(() => {
    const needle = val.toLowerCase()
    // Filter logic would happen here with actual location data
  })
}

async function performSearch() {
  photoStore.setFilters({
    search: searchQuery.value || undefined,
    camera: selectedCamera.value || undefined,
    location: selectedLocation.value || undefined
  })
  await photoStore.fetchPhotos()
}

function resetFilters() {
  searchQuery.value = ''
  selectedDateRange.value = null
  selectedCamera.value = null
  selectedLocation.value = null
  photoStore.clearFilters()
}

function openPhoto(photo: any) {
  selectedPhoto.value = photo
  showViewer.value = true
}
</script>
