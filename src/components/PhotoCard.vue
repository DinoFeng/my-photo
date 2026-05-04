<template>
  <q-card
    class="photo-card cursor-pointer"
    :class="{ 'photo-card--selected': selected }"
    :draggable="draggable"
    @click="$emit('click', photo)"
    @dragstart="onDragStart"
    @dragend="onDragEnd"
  >
    <q-img
      :src="thumbnailUrl"
      :ratio="photo.width && photo.height ? photo.width / photo.height : 1"
      fit="cover"
      class="photo-card__image"
    >
      <template v-slot:loading>
        <div class="absolute-full flex flex-center bg-grey-3">
          <q-spinner-dots color="primary" size="40px" />
        </div>
      </template>

      <div v-if="selected" class="photo-card__selected-overlay absolute-full flex flex-center">
        <q-icon name="check_circle" color="primary" size="48px" />
      </div>

      <div v-if="showInfo" class="photo-card__info absolute-bottom q-pa-xs">
        <div class="text-caption text-white ellipsis">{{ photo.fileName }}</div>
        <div class="text-xs text-grey-4">{{ formattedDate }}</div>
      </div>

      <q-badge
        v-if="showBadge && badgeText"
        class="photo-card__badge"
        :color="badgeColor"
        floating
      >
        {{ badgeText }}
      </q-badge>
    </q-img>

    <q-separator v-if="showActions" />

    <q-card-actions v-if="showActions" class="photo-card__actions" align="right">
      <q-btn flat round size="sm" icon="visibility" @click.stop="$emit('view', photo)">
        <q-tooltip>查看</q-tooltip>
      </q-btn>
      <q-btn flat round size="sm" icon="add" @click.stop="$emit('add-to-album', photo)">
        <q-tooltip>添加到相册</q-tooltip>
      </q-btn>
      <q-btn flat round size="sm" icon="delete" color="negative" @click.stop="$emit('delete', photo)">
        <q-tooltip>删除</q-tooltip>
      </q-btn>
    </q-card-actions>
  </q-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Photo {
  id: string
  filePath: string
  fileName: string
  thumbnailPath?: string | null
  takenDate?: string | null
  fileSize?: number
  width?: number
  height?: number
}

const props = withDefaults(defineProps<{
  photo: Photo
  selected?: boolean
  draggable?: boolean
  showInfo?: boolean
  showActions?: boolean
  showBadge?: boolean
  badgeText?: string
  badgeColor?: string
}>(), {
  selected: false,
  draggable: false,
  showInfo: true,
  showActions: false,
  showBadge: false,
  badgeText: '',
  badgeColor: 'primary'
})

const emit = defineEmits<{
  (e: 'click', photo: Photo): void
  (e: 'view', photo: Photo): void
  (e: 'add-to-album', photo: Photo): void
  (e: 'delete', photo: Photo): void
  (e: 'dragstart', event: DragEvent, photo: Photo): void
  (e: 'dragend', event: DragEvent): void
}>()

const thumbnailUrl = computed(() => {
  if (props.photo.thumbnailPath) {
    if (props.photo.thumbnailPath.startsWith('http')) {
      return props.photo.thumbnailPath
    }
    return `/api/photos/thumbnail/${props.photo.thumbnailPath}`
  }
  return 'https://picsum.photos/400/300'
})

const formattedDate = computed(() => {
  if (!props.photo.takenDate) return ''
  const date = new Date(props.photo.takenDate)
  return date.toLocaleDateString()
})

function onDragStart(event: DragEvent) {
  if (props.draggable && event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('application/json', JSON.stringify(props.photo))
    event.dataTransfer.setData('text/plain', props.photo.id)
  }
  emit('dragstart', event, props.photo)
}

function onDragEnd(event: DragEvent) {
  emit('dragend', event)
}
</script>

<style scoped lang="scss">
.photo-card {
  transition: transform 0.2s, box-shadow 0.2s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  }

  &--selected {
    border: 2px solid var(--q-primary);
  }

  &__image {
    background-color: #f5f5f5;
  }

  &__selected-overlay {
    background-color: rgba(255, 255, 255, 0.7);
  }

  &__info {
    background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
  }

  &__badge {
    top: 4px;
    right: 4px;
  }

  &__actions {
    opacity: 0;
    transition: opacity 0.2s;
  }

  &:hover &__actions {
    opacity: 1;
  }
}
</style>
