<template>
  <q-dialog v-model="showDialog" persistent>
    <q-card style="min-width: 400px">
      <q-card-section>
        <div class="text-h6">导入照片</div>
      </q-card-section>

      <q-card-section class="q-pt-none">
        <div v-if="!importStore.importing && !importStore.duplicates.length" class="column q-gutter-md">
          <q-input
            v-model="sourcePath"
            label="照片源目录"
            readonly
            filled
          >
            <template v-slot:append>
              <q-btn flat icon="folder_open" @click="selectSourcePath" />
            </template>
          </q-input>

          <q-input
            v-model="targetPath"
            label="目标目录（可选）"
            hint="留空则使用默认目录"
            readonly
            filled
          >
            <template v-slot:append>
              <q-btn flat icon="folder_open" @click="selectTargetPath" />
            </template>
          </q-input>

          <q-checkbox v-model="recursive" label="递归扫描子目录" />

          <q-checkbox v-model="skipDuplicates" label="跳过重复照片" />
        </div>

        <div v-if="importStore.importing" class="column q-gutter-md q-pa-md">
          <q-linear-progress :value="importStore.progress / 100" />
          <p class="text-center">{{ importStore.statusText }}</p>
        </div>

        <div v-if="importStore.duplicates.length > 0" class="column q-gutter-md">
          <p class="text-warning">发现 {{ importStore.duplicates.length }} 组重复照片</p>
          <q-list bordered separator>
            <q-item v-for="dup in importStore.duplicates" :key="dup.fileHash">
              <q-item-section avatar>
                <q-icon name="copy" color="warning" />
              </q-item-section>
              <q-item-section>
                <q-item-label>{{ dup.photos[0]?.fileName || 'Unknown' }}</q-item-label>
                <q-item-label caption>{{ dup.photos.length }} 个重复</q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-btn flat size="sm" color="red" @click="removeDuplicate(dup.photos[0]?.id)">
                  删除
                </q-btn>
              </q-item-section>
            </q-item>
          </q-list>
        </div>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn
          v-if="!importStore.importing && !importStore.duplicates.length"
          flat
          label="取消"
          @click="closeDialog"
        />
        <q-btn
          v-if="!importStore.importing && !importStore.duplicates.length"
          color="primary"
          label="开始导入"
          @click="startImport"
        />
        <q-btn
          v-if="importStore.duplicates.length > 0"
          flat
          label="跳过"
          @click="skipDuplicatesAction"
        />
        <q-btn
          v-if="importStore.duplicates.length > 0"
          color="primary"
          label="处理完成"
          @click="finishImport"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useImportStore } from '@/stores/import'
import { useSettingsStore } from '@/stores/settings'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const importStore = useImportStore()
const settingsStore = useSettingsStore()

const showDialog = ref(props.modelValue)
const sourcePath = ref('')
const targetPath = ref('')
const recursive = ref(true)
const skipDuplicates = ref(true)

watch(() => props.modelValue, (val) => {
  showDialog.value = val
  if (val) {
    loadInitialData()
  }
})

watch(showDialog, (val) => {
  emit('update:modelValue', val)
})

async function loadInitialData() {
  await settingsStore.fetchSettings()
  sourcePath.value = settingsStore.settings?.photoSourcePath || ''
}

async function selectSourcePath() {
  const electronAPI = window.electronAPI as any
  const path = await electronAPI.selectDirectory()
  if (path) {
    sourcePath.value = path
  }
}

async function selectTargetPath() {
  const electronAPI = window.electronAPI as any
  const path = await electronAPI.selectDirectory()
  if (path) {
    targetPath.value = path
  }
}

async function startImport() {
  if (!sourcePath.value) return

  await importStore.fetchTasks()
  
  if (targetPath.value) {
    await settingsStore.updateSettings({ photoSourcePath: sourcePath.value })
  }
  
  try {
    await importStore.processTasks()
  } catch (error) {
    console.error('Import failed:', error)
  }
}

async function skipDuplicatesAction() {
  for (const dup of importStore.duplicates) {
    if (dup.photos.length > 1) {
      for (let i = 1; i < dup.photos.length; i++) {
        await importStore.deleteDuplicate(dup.photos[i].id)
      }
    }
  }
  await importStore.fetchDuplicates()
}

async function removeDuplicate(photoId?: string) {
  if (photoId) {
    await importStore.deleteDuplicate(photoId)
  }
}

function finishImport() {
  closeDialog()
}

function closeDialog() {
  showDialog.value = false
  importStore.reset()
}
</script>
