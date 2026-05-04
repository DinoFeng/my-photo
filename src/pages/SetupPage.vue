<template>
  <q-page class="row q-pa-md">
    <div class="col-12">
      <q-card class="q-mb-md">
        <q-card-header>
          <q-card-title class="text-h5">首次配置</q-card-title>
          <q-card-subtitle>设置照片存储目录和监控目录</q-card-subtitle>
        </q-card-header>
        
        <q-card-section>
          <q-form @submit="saveSettings" class="q-gutter-md">
            <q-input
              filled
              v-model="form.photoSourcePath"
              label="照片源目录"
              hint="选择存储照片的主目录"
              :error="errors.photoSourcePath"
            >
              <template v-slot:append>
                <q-btn flat icon="folder_open" @click="selectPhotoSourcePath" />
              </template>
            </q-input>

            <q-input
              filled
              v-model="form.watchPath"
              label="导入监控目录"
              hint="选择自动导入照片的目录（可选）"
              :error="errors.watchPath"
            >
              <template v-slot:append>
                <q-btn flat icon="folder_open" @click="selectWatchPath" />
              </template>
            </q-input>

            <q-input
              filled
              v-model="form.organizePattern"
              label="文件组织模式"
              hint="支持 {year}, {month}, {day}, {camera}, {city}"
              :error="errors.organizePattern"
            >
              <template v-slot:append>
                <q-btn flat icon="help" @click="showPatternHelp = true" />
              </template>
            </q-input>

            <q-select
              filled
              v-model="form.duplicateDetection"
              label="重复检测方式"
              :options="[
                { label: '基于文件哈希', value: 'hash' },
                { label: '基于文件名', value: 'filename' },
                { label: '不检测', value: 'none' }
              ]"
            />

            <q-select
              filled
              v-model="form.thumbnailQuality"
              label="缩略图质量"
              :options="[
                { label: '低', value: 'low' },
                { label: '中', value: 'medium' },
                { label: '高', value: 'high' }
              ]"
            />

            <div class="q-mt-md">
              <q-btn label="保存配置" type="submit" color="primary" />
              <q-btn label="跳过" flat @click="skipSetup" class="q-ml-sm" />
            </div>
          </q-form>
        </q-card-section>
      </q-card>

      <q-card v-if="importProgress > 0">
        <q-card-header>
          <q-card-title>导入进度</q-card-title>
        </q-card-header>
        <q-card-section>
          <q-progress-bar :value="importProgress" class="q-mb-md" />
          <p class="text-center">{{ importStatus }}</p>
        </q-card-section>
      </q-card>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '@/api'

const router = useRouter()

const form = reactive({
  photoSourcePath: '',
  watchPath: '',
  organizePattern: '{year}/{month}/{day}',
  duplicateDetection: 'hash',
  thumbnailQuality: 'medium'
})

const errors = reactive({
  photoSourcePath: false,
  watchPath: false,
  organizePattern: false
})

const importProgress = ref(0)
const importStatus = ref('')
const showPatternHelp = ref(false)

onMounted(async () => {
  try {
    const settings = await api.settings.get()
    Object.assign(form, settings)
  } catch (error) {
    console.error('Failed to load settings:', error)
  }
})

async function selectPhotoSourcePath() {
  const electronAPI = window.electronAPI as ElectronAPI
  const path = await electronAPI.selectDirectory()
  if (path) {
    form.photoSourcePath = path
  }
}

async function selectWatchPath() {
  const electronAPI = window.electronAPI as ElectronAPI
  const path = await electronAPI.selectDirectory()
  if (path) {
    form.watchPath = path
  }
}

async function saveSettings() {
  errors.photoSourcePath = false
  errors.watchPath = false
  
  if (!form.photoSourcePath) {
    errors.photoSourcePath = true
    return
  }
  
  try {
    await api.settings.update(form)
    
    if (form.watchPath) {
      importStatus.value = '正在扫描监控目录...'
      importProgress.value = 30
      
      const result = await api.import.process()
      importProgress.value = 100
      importStatus.value = `导入完成: ${result.imported} 张新照片, ${result.duplicates} 张重复`
      
      setTimeout(() => {
        router.push('/photos')
      }, 2000)
    } else {
      router.push('/photos')
    }
  } catch (error) {
    console.error('Failed to save settings:', error)
  }
}

function skipSetup() {
  router.push('/photos')
}
</script>
