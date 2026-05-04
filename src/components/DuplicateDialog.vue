<template>
  <q-dialog v-model="showDialog" persistent>
    <q-card style="min-width: 600px; max-width: 800px">
      <q-card-section>
        <div class="text-h6">重复照片处理</div>
        <p class="text-caption text-grey">
          发现 {{ duplicates.length }} 组重复照片，请选择处理方式
        </p>
      </q-card-section>

      <q-card-section class="q-pt-none">
        <q-list bordered separator class="q-mb-md">
          <q-expansion-item
            v-for="group in duplicates"
            :key="group.fileHash"
            group="duplicates"
            :label="`${group.photos.length} 张重复照片`"
            :caption="formatFileHash(group.fileHash)"
            icon="photo_library"
          >
            <q-card>
              <q-card-section class="q-pa-xs">
                <div class="row q-col-gutter-sm">
                  <div
                    v-for="(photo, index) in group.photos"
                    :key="photo.id"
                    class="col-6 col-md-4"
                  >
                    <q-card flat bordered>
                      <q-img
                        :src="getThumbnailUrl(photo.thumbnailPath)"
                        style="height: 150px"
                        fit="cover"
                      >
                        <div v-if="index === 0" class="absolute-top-left q-pa-xs">
                          <q-badge color="primary" label="原始" />
                        </div>
                      </q-img>
                      <q-card-section class="q-pa-sm">
                        <p class="text-caption text-truncate">{{ photo.fileName }}</p>
                        <p class="text-xs text-grey">{{ formatFileSize(photo.fileSize) }}</p>
                        <p class="text-xs text-grey">{{ formatDate(photo.importedAt) }}</p>
                      </q-card-section>
                      <q-card-actions align="right">
                        <q-btn
                          flat
                          size="sm"
                          color="red"
                          label="删除此副本"
                          @click="deletePhoto(photo.id)"
                        />
                      </q-card-actions>
                    </q-card>
                  </div>
                </div>
              </q-card-section>
            </q-card>
          </q-expansion-item>
        </q-list>

        <q-banner v-if="duplicates.length === 0" class="bg-green-1">
          <template v-slot:avatar>
            <q-icon name="check_circle" color="green" />
          </template>
          没有发现重复照片！
        </q-banner>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat label="全部跳过" @click="skipAll" />
        <q-btn flat label="全部保留最新" @click="keepLatest" />
        <q-btn color="primary" label="完成" @click="closeDialog" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useImportStore } from '@/stores/import'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const importStore = useImportStore()
const showDialog = ref(props.modelValue)

const duplicates = ref(importStore.duplicates)

watch(() => props.modelValue, (val) => {
  showDialog.value = val
  if (val) {
    duplicates.value = importStore.duplicates
  }
})

watch(showDialog, (val) => {
  emit('update:modelValue', val)
})

function getThumbnailUrl(path: string | undefined) {
  if (!path) return 'https://picsum.photos/200/150'
  return `/api/photos/thumbnail/${path}`
}

function formatFileHash(hash: string) {
  if (!hash) return 'Unknown'
  return hash.substring(0, 12) + '...'
}

function formatFileSize(bytes: number) {
  if (!bytes) return 'Unknown'
  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unitIndex = 0
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`
}

function formatDate(dateStr: string | undefined) {
  if (!dateStr) return 'Unknown'
  return new Date(dateStr).toLocaleDateString()
}

async function deletePhoto(photoId: string) {
  try {
    await importStore.deleteDuplicate(photoId)
    duplicates.value = importStore.duplicates
  } catch (error) {
    console.error('Failed to delete photo:', error)
  }
}

async function skipAll() {
  closeDialog()
}

async function keepLatest() {
  for (const group of duplicates.value) {
    if (group.photos.length > 1) {
      const sorted = [...group.photos].sort(
        (a, b) => new Date(b.importedAt).getTime() - new Date(a.importedAt).getTime()
      )
      for (let i = 1; i < sorted.length; i++) {
        await importStore.deleteDuplicate(sorted[i].id)
      }
    }
  }
  await importStore.fetchDuplicates()
  duplicates.value = importStore.duplicates
}

function closeDialog() {
  showDialog.value = false
}
</script>
