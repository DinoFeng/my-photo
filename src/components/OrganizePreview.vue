<template>
  <q-dialog v-model="showDialog" persistent>
    <q-card style="min-width: 600px; max-width: 800px">
      <q-card-section>
        <div class="text-h6">整理预览</div>
        <p class="text-caption text-grey">
          以下照片将被移动到新的位置
        </p>
      </q-card-section>

      <q-card-section class="q-pt-none">
        <q-list v-if="previews.length > 0" bordered separator>
          <q-item v-for="(preview, index) in previews" :key="index">
            <q-item-section avatar>
              <q-icon name="photo" />
            </q-item-section>
            <q-item-section>
              <q-item-label class="text-truncate">{{ getFileName(preview.oldPath) }}</q-item-label>
              <q-item-label caption>
                <span class="text-negative">{{ preview.oldPath }}</span>
              </q-item-label>
              <q-item-label caption>
                <span class="text-positive">→ {{ preview.newPath }}</span>
              </q-item-label>
            </q-item-section>
          </q-item>
        </q-list>

        <q-banner v-else-if="loading" class="bg-grey-2">
          <q-spinner-dots class="q-mr-md" />
          正在分析照片位置...
        </q-banner>

        <q-banner v-else class="bg-green-1">
          <template v-slot:avatar>
            <q-icon name="check_circle" color="green" />
          </template>
          所有照片都已经整理好了！
        </q-banner>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat label="取消" @click="close" />
        <q-btn
          v-if="previews.length > 0 && !loading"
          color="primary"
          label="开始整理"
          @click="executeOrganize"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'organized', result: any): void
}>()

const showDialog = ref(props.modelValue)
const previews = ref<{ oldPath: string; newPath: string }[]>([])
const loading = ref(false)

watch(() => props.modelValue, (val) => {
  showDialog.value = val
  if (val) {
    loadPreviews()
  }
})

watch(showDialog, (val) => {
  emit('update:modelValue', val)
})

async function loadPreviews() {
  loading.value = true
  try {
    const response = await fetch('/api/organize/preview')
    const data = await response.json()
    previews.value = data.previews || []
  } catch (error) {
    console.error('Failed to load previews:', error)
  } finally {
    loading.value = false
  }
}

async function executeOrganize() {
  loading.value = true
  try {
    const response = await fetch('/api/organize/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ createBackup: true })
    })
    const result = await response.json()
    emit('organized', result)
    close()
  } catch (error) {
    console.error('Failed to execute organize:', error)
  } finally {
    loading.value = false
  }
}

function getFileName(path: string): string {
  return path.split(/[/\\]/).pop() || path
}

function close() {
  showDialog.value = false
  previews.value = []
}
</script>
