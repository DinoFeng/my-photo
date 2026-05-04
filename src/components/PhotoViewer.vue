<template>
  <q-dialog
    v-model="showDialog"
    maximized
    transition-show="fade"
    transition-hide="fade"
    @hide="$emit('close')"
  >
    <q-card class="photo-viewer" dark>
      <q-bar class="photo-viewer__bar">
        <div class="text-subtitle1">{{ currentPhoto?.fileName }}</div>
        <q-space />

        <q-btn flat round icon="zoom_in" @click="zoomIn">
          <q-tooltip>放大</q-tooltip>
        </q-btn>
        <q-btn flat round icon="zoom_out" @click="zoomOut">
          <q-tooltip>缩小</q-tooltip>
        </q-btn>
        <q-btn flat round icon="fit_screen" @click="resetZoom">
          <q-tooltip>重置</q-tooltip>
        </q-btn>

        <q-separator vertical class="q-mx-sm" />

        <q-btn flat round :icon="rotationIcon" @click="rotate">
          <q-tooltip>旋转</q-tooltip>
        </q-btn>
        <q-btn flat round icon="flip" @click="flip">
          <q-tooltip>翻转</q-tooltip>
        </q-btn>

        <q-separator vertical class="q-mx-sm" />

        <q-btn flat round icon="info" @click="showInfo = !showInfo">
          <q-tooltip>照片信息</q-tooltip>
        </q-btn>
        <q-btn flat round icon="close" @click="close">
          <q-tooltip>关闭</q-tooltip>
        </q-btn>
      </q-bar>

      <q-card-section class="photo-viewer__content flex flex-center">
        <div
          class="photo-viewer__image-container"
          :style="containerStyle"
          @wheel="onWheel"
          @mousedown="onMouseDown"
          @mousemove="onMouseMove"
          @mouseup="onMouseUp"
        >
          <img
            ref="imageRef"
            :src="imageUrl"
            class="photo-viewer__image"
            :style="imageStyle"
            @load="onImageLoad"
          />
        </div>
      </q-card-section>

      <q-card-section v-if="showInfo && currentPhoto" class="photo-viewer__info">
        <div class="row q-col-gutter-md">
          <div class="col-6">
            <div class="text-caption text-grey">文件名</div>
            <div>{{ currentPhoto.fileName }}</div>
          </div>
          <div class="col-6">
            <div class="text-caption text-grey">拍摄日期</div>
            <div>{{ formatDate(currentPhoto.takenDate) }}</div>
          </div>
          <div class="col-6">
            <div class="text-caption text-grey">文件大小</div>
            <div>{{ formatFileSize(currentPhoto.fileSize) }}</div>
          </div>
          <div class="col-6">
            <div class="text-caption text-grey">分辨率</div>
            <div>{{ currentPhoto.width }} × {{ currentPhoto.height }}</div>
          </div>
          <div v-if="currentPhoto.exif?.camera" class="col-6">
            <div class="text-caption text-grey">相机</div>
            <div>{{ currentPhoto.exif.camera }}</div>
          </div>
          <div v-if="currentPhoto.exif?.gps" class="col-6">
            <div class="text-caption text-grey">位置</div>
            <div>{{ currentPhoto.exif.gps.city }}, {{ currentPhoto.exif.gps.country }}</div>
          </div>
        </div>
      </q-card-section>

      <q-card-actions v-if="photos.length > 1" class="photo-viewer__nav">
        <q-btn
          flat
          round
          icon="chevron_left"
          :disable="currentIndex <= 0"
          @click="previous"
        />
        <span class="text-center flex-1">
          {{ currentIndex + 1 }} / {{ photos.length }}
        </span>
        <q-btn
          flat
          round
          icon="chevron_right"
          :disable="currentIndex >= photos.length - 1"
          @click="next"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

interface Photo {
  id: string
  filePath: string
  fileName: string
  thumbnailPath?: string | null
  takenDate?: string | null
  fileSize?: number
  width?: number
  height?: number
  exif?: any
}

const props = defineProps<{
  modelValue: boolean
  photo: Photo | null
  photos?: Photo[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'close'): void
  (e: 'change', photo: Photo): void
}>()

const showDialog = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const currentPhoto = computed(() => props.photo)
const photos = computed(() => props.photos || [])
const currentIndex = computed(() =>
  photos.value.findIndex(p => p.id === currentPhoto.value?.id)
)

const imageRef = ref<HTMLImageElement | null>(null)
const showInfo = ref(false)

const scale = ref(1)
const rotation = ref(0)
const flipH = ref(false)
const flipV = ref(false)
const position = ref({ x: 0, y: 0 })
const isDragging = ref(false)
const dragStart = ref({ x: 0, y: 0 })

const rotationIcon = computed(() => {
  const angles = [0, 90, 180, 270]
  const iconMap = ['rotate_90_degrees_cw', 'rotate_180_degrees_cw', 'rotate_90_degrees_ccw']
  const angle = rotation.value % 360
  if (angle === 0) return 'rotate_90_degrees_cw'
  if (angle === 90) return 'rotate_180_degrees_cw'
  if (angle === 180) return 'rotate_90_degrees_ccw'
  if (angle === 270) return 'rotate_90_degrees_cw'
  return 'rotate_90_degrees_cw'
})

const imageUrl = computed(() => {
  if (!currentPhoto.value) return ''
  if (currentPhoto.value.thumbnailPath?.startsWith('http')) {
    return currentPhoto.value.thumbnailPath
  }
  return currentPhoto.value.thumbnailPath
    ? `/api/photos/thumbnail/${currentPhoto.value.thumbnailPath}`
    : currentPhoto.value.filePath
})

const imageStyle = computed(() => ({
  transform: `scale(${scale.value}) rotate(${rotation.value}deg) scaleX(${flipH.value ? -1 : 1}) scaleY(${flipV.value ? -1 : 1})`,
  transition: isDragging.value ? 'none' : 'transform 0.2s ease'
}))

const containerStyle = computed(() => ({
  transform: `translate(${position.value.x}px, ${position.value.y}px)`,
  transition: isDragging.value ? 'none' : 'transform 0.2s ease',
  cursor: isDragging.value ? 'grabbing' : 'grab'
}))

watch(currentPhoto, (newPhoto) => {
  if (newPhoto) {
    resetZoom()
    emit('change', newPhoto)
  }
})

function zoomIn() {
  scale.value = Math.min(scale.value * 1.2, 5)
}

function zoomOut() {
  scale.value = Math.max(scale.value / 1.2, 0.2)
}

function resetZoom() {
  scale.value = 1
  rotation.value = 0
  flipH.value = false
  flipV.value = false
  position.value = { x: 0, y: 0 }
}

function rotate() {
  rotation.value = (rotation.value + 90) % 360
}

function flip() {
  flipH.value = !flipH.value
}

function onWheel(event: WheelEvent) {
  event.preventDefault()
  if (event.deltaY < 0) {
    zoomIn()
  } else {
    zoomOut()
  }
}

function onMouseDown(event: MouseEvent) {
  isDragging.value = true
  dragStart.value = { x: event.clientX - position.value.x, y: event.clientY - position.value.y }
}

function onMouseMove(event: MouseEvent) {
  if (!isDragging.value) return
  position.value = {
    x: event.clientX - dragStart.value.x,
    y: event.clientY - dragStart.value.y
  }
}

function onMouseUp() {
  isDragging.value = false
}

function onImageLoad() {
  resetZoom()
}

function previous() {
  if (currentIndex.value > 0) {
    emit('change', photos.value[currentIndex.value - 1])
  }
}

function next() {
  if (currentIndex.value < photos.value.length - 1) {
    emit('change', photos.value[currentIndex.value + 1])
  }
}

function close() {
  showDialog.value = false
}

function formatDate(date: string | null | undefined): string {
  if (!date) return '未知'
  return new Date(date).toLocaleString()
}

function formatFileSize(bytes: number | undefined): string {
  if (!bytes) return '未知'
  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unitIndex = 0
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`
}
</script>

<style scoped lang="scss">
.photo-viewer {
  background-color: rgba(0, 0, 0, 0.95) !important;

  &__bar {
    background-color: rgba(0, 0, 0, 0.8);
  }

  &__content {
    height: calc(100vh - 100px);
    overflow: hidden;
  }

  &__image-container {
    max-width: 100%;
    max-height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__image {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    user-select: none;
  }

  &__info {
    background-color: rgba(0, 0, 0, 0.8);
    max-height: 200px;
    overflow-y: auto;
  }

  &__nav {
    background-color: rgba(0, 0, 0, 0.8);
  }
}
</style>
