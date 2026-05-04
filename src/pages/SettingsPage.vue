<template>
  <q-page class="q-pa-md">
    <q-card>
      <q-card-section>
        <h3 class="text-h5 q-my-none">设置</h3>
      </q-card-section>

      <q-card-section>
        <q-tabs
          v-model="activeTab"
          class="text-primary"
          align="justify"
          narrow-indicator
        >
          <q-tab name="general" label="通用" icon="settings" />
          <q-tab name="import" label="导入" icon="file_upload" />
          <q-tab name="organize" label="整理" icon="folder" />
          <q-tab name="remote" label="远程访问" icon="cloud" />
        </q-tabs>

        <q-separator />

        <q-tab-panels v-model="activeTab" animated>
          <q-tab-panel name="general">
            <div class="column q-gutter-md">
              <q-input
                v-model="settings.photoSourcePath"
                label="照片源目录"
                readonly
              >
                <template v-slot:append>
                  <q-btn flat round icon="folder_open" @click="selectPhotoSource" />
                </template>
              </q-input>

              <q-input
                v-model="settings.watchPath"
                label="监控目录"
                hint="新照片将自动导入"
                readonly
              >
                <template v-slot:append>
                  <q-btn flat round icon="folder_open" @click="selectWatchPath" />
                </template>
              </q-input>

              <q-select
                v-model="settings.thumbnailQuality"
                label="缩略图质量"
                :options="thumbnailQualityOptions"
                emit-value
                map-options
              />

              <q-select
                v-model="settings.duplicateDetection"
                label="重复检测模式"
                :options="duplicateDetectionOptions"
                emit-value
                map-options
              />
            </div>
          </q-tab-panel>

          <q-tab-panel name="import">
            <div class="column q-gutter-md">
              <q-input
                v-model="settings.organizePattern"
                label="文件组织模式"
                hint="支持 {year}, {month}, {day}, {camera}, {city}"
              />

              <q-banner class="bg-grey-2">
                <template v-slot:avatar>
                  <q-icon name="info" />
                </template>
                <p class="q-mb-none">
                  <b>可用变量：</b><br />
                  {year} - 年份 (2024)<br />
                  {month} - 月份 (01-12)<br />
                  {day} - 日期 (01-31)<br />
                  {camera} - 相机品牌<br />
                  {model} - 相机型号<br />
                  {city} - 城市<br />
                  {country} - 国家
                </p>
              </q-banner>
            </div>
          </q-tab-panel>

          <q-tab-panel name="organize">
            <div class="column q-gutter-md">
              <OrganizePreview
                v-model="showOrganizePreview"
                @organized="onOrganized"
              />

              <q-banner v-if="organizeStats.totalPhotos > 0" class="bg-grey-2 q-mb-md">
                <template v-slot:avatar>
                  <q-icon name="folder" />
                </template>
                <p class="q-mb-sm">
                  照片总数：{{ organizeStats.totalPhotos }}<br />
                  已整理：{{ organizeStats.organized }}<br />
                  待整理：{{ organizeStats.toOrganize }}
                </p>
              </q-banner>

              <q-btn
                color="primary"
                label="预览整理"
                icon="preview"
                @click="showOrganizePreview = true"
              />

              <q-btn
                color="secondary"
                label="执行整理"
                icon="check"
                :disable="organizeStats.toOrganize === 0"
                @click="executeOrganize"
              />
            </div>
          </q-tab-panel>

          <q-tab-panel name="remote">
            <div class="column q-gutter-md">
              <q-toggle
                v-model="settings.remoteAccess"
                label="启用远程访问"
              />

              <q-input
                v-model.number="settings.remotePort"
                label="远程访问端口"
                type="number"
                :disable="!settings.remoteAccess"
              />

              <q-banner v-if="settings.remoteAccess" class="bg-green-1">
                <template v-slot:avatar>
                  <q-icon name="cloud_done" color="green" />
                </template>
                <p class="q-mb-none">
                  远程访问已启用<br />
                  访问地址：<code>{{ remoteAccessUrl }}</code>
                </p>
              </q-banner>
            </div>
          </q-tab-panel>
        </q-tab-panels>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat label="取消" @click="resetSettings" />
        <q-btn color="primary" label="保存" @click="saveSettings" />
      </q-card-actions>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import OrganizePreview from '@/components/OrganizePreview.vue'

const settingsStore = useSettingsStore()

const activeTab = ref('general')
const showOrganizePreview = ref(false)
const organizeStats = ref({
  totalPhotos: 0,
  organized: 0,
  toOrganize: 0
})

const settings = ref<{
  photoSourcePath: string
  watchPath: string
  organizePattern: string
  duplicateDetection: 'hash' | 'filename' | 'none'
  thumbnailQuality: 'low' | 'medium' | 'high'
  remoteAccess: boolean
  remotePort: number
}>({
  photoSourcePath: '',
  watchPath: '',
  organizePattern: '{year}/{month}/{day}',
  duplicateDetection: 'hash',
  thumbnailQuality: 'medium',
  remoteAccess: false,
  remotePort: 3000
})

const thumbnailQualityOptions = [
  { label: '低 (更快)', value: 'low' },
  { label: '中 (平衡)', value: 'medium' },
  { label: '高 (最佳质量)', value: 'high' }
]

const duplicateDetectionOptions = [
  { label: '基于哈希 (推荐)', value: 'hash' },
  { label: '基于文件名', value: 'filename' },
  { label: '不检测', value: 'none' }
]

const remoteAccessUrl = computed(() => {
  if (!settings.value.remoteAccess) return ''
  const host = window.location.hostname
  return `http://${host}:${settings.value.remotePort}`
})

onMounted(async () => {
  await settingsStore.fetchSettings()
  if (settingsStore.settings) {
    settings.value = { ...settingsStore.settings }
  }
  await loadOrganizeStats()
})

watch(() => settingsStore.settings, (newSettings) => {
  if (newSettings) {
    settings.value = { ...newSettings }
  }
}, { deep: true })

async function selectPhotoSource() {
  const electronAPI = (window as any).electronAPI
  if (electronAPI) {
    const path = await electronAPI.selectDirectory()
    if (path) {
      settings.value.photoSourcePath = path
    }
  }
}

async function selectWatchPath() {
  const electronAPI = (window as any).electronAPI
  if (electronAPI) {
    const path = await electronAPI.selectDirectory()
    if (path) {
      settings.value.watchPath = path
    }
  }
}

async function loadOrganizeStats() {
  try {
    const response = await fetch('/api/organize/stats')
    organizeStats.value = await response.json()
  } catch (error) {
    console.error('Failed to load organize stats:', error)
  }
}

async function saveSettings() {
  await settingsStore.updateSettings(settings.value)
}

function resetSettings() {
  if (settingsStore.settings) {
    settings.value = { ...settingsStore.settings }
  }
}

async function executeOrganize() {
  try {
    const response = await fetch('/api/organize/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ createBackup: true })
    })
    const result = await response.json()
    if (result.success) {
      await loadOrganizeStats()
    }
  } catch (error) {
    console.error('Failed to execute organize:', error)
  }
}

function onOrganized(result: any) {
  if (result.success) {
    loadOrganizeStats()
  }
}
</script>
