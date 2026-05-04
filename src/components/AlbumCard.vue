<template>
  <q-card
    class="album-card cursor-pointer"
    :class="{ 'album-card--selected': selected }"
    @click="$emit('click', album)"
  >
    <q-card-section class="q-pa-none">
      <q-img
        :src="coverUrl"
        fit="cover"
        class="album-card__cover"
        :height="coverHeight"
      >
        <template v-slot:loading>
          <div class="absolute-full flex flex-center bg-grey-3">
            <q-spinner-dots color="primary" size="40px" />
          </div>
        </template>

        <div v-if="album.type === 'system'" class="album-card__type-badge">
          <q-icon name="auto_awesome" size="12px" />
          系统
        </div>

        <div v-if="selected" class="album-card__selected-overlay absolute-full flex flex-center">
          <q-icon name="check_circle" color="primary" size="48px" />
        </div>
      </q-img>
    </q-card-section>

    <q-card-section class="q-pa-sm">
      <div class="text-subtitle2 ellipsis">{{ album.name }}</div>
      <div class="text-caption text-grey">
        {{ album.photoCount }} 张照片
      </div>
    </q-card-section>

    <q-card-actions v-if="showActions" class="album-card__actions" align="right">
      <q-btn
        v-if="album.type === 'custom'"
        flat
        round
        size="sm"
        icon="edit"
        @click.stop="$emit('edit', album)"
      >
        <q-tooltip>编辑</q-tooltip>
      </q-btn>
      <q-btn
        v-if="album.type === 'custom'"
        flat
        round
        size="sm"
        icon="delete"
        color="negative"
        @click.stop="$emit('delete', album)"
      >
        <q-tooltip>删除</q-tooltip>
      </q-btn>
      <q-btn
        flat
        round
        size="sm"
        icon="photo"
        @click.stop="$emit('view', album)"
      >
        <q-tooltip>浏览</q-tooltip>
      </q-btn>
    </q-card-actions>
  </q-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Album {
  id: string
  name: string
  type: 'system' | 'custom'
  rule?: string
  coverPath?: string | null
  photoCount: number
}

const props = withDefaults(defineProps<{
  album: Album
  selected?: boolean
  showActions?: boolean
  coverHeight?: string
}>(), {
  selected: false,
  showActions: true,
  coverHeight: '120px'
})

const emit = defineEmits<{
  (e: 'click', album: Album): void
  (e: 'view', album: Album): void
  (e: 'edit', album: Album): void
  (e: 'delete', album: Album): void
}>()

const coverUrl = computed(() => {
  if (props.album.coverPath) {
    if (props.album.coverPath.startsWith('http')) {
      return props.album.coverPath
    }
    return `/api/photos/thumbnail/${props.album.coverPath}`
  }
  return 'https://picsum.photos/200/150?grayscale'
})
</script>

<style scoped lang="scss">
.album-card {
  transition: transform 0.2s, box-shadow 0.2s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  }

  &--selected {
    border: 2px solid var(--q-primary);
  }

  &__cover {
    background-color: #f5f5f5;
  }

  &__type-badge {
    position: absolute;
    top: 4px;
    left: 4px;
    background-color: rgba(0, 0, 0, 0.6);
    color: white;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 10px;
    display: flex;
    align-items: center;
    gap: 2px;
  }

  &__selected-overlay {
    background-color: rgba(255, 255, 255, 0.7);
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
