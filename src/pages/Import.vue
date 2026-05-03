<template>
  <q-page>
    <q-card>
      <q-card-section>
        <h3 class="text-h5">照片导入</h3>
        <p class="text-caption">导入监控目录: {{ settings.watchPath }}</p>
      </q-card-section>
      <q-card-section>
        <q-btn label="手动选择文件导入" color="primary" @click="selectFiles" />
        <q-btn label="扫描导入监控目录" @click="scanWatchDir" class="ml-2" />
      </q-card-section>
    </q-card>

    <q-card v-if="importing">
      <q-card-section>
        <q-linear-progress :value="progress" />
        <p class="text-center mt-2">{{ progress }}% - {{ statusText }}</p>
      </q-card-section>
    </q-card>

    <q-card v-if="duplicates.length > 0">
      <q-card-section>
        <h4 class="text-h6">检测到重复照片 ({{ duplicates.length }})</h4>
      </q-card-section>
      <q-card-section class="q-pa-none">
        <q-list>
          <q-item v-for="dup in duplicates" :key="dup.id">
            <q-item-section avatar>
              <q-icon name="alert-circle" color="orange" />
            </q-item-section>
            <q-item-section>{{ dup.fileName }}</q-item-section>
            <q-item-section side>
              <q-select 
                v-model="dup.action" 
                :options="actions"
                class="w-32"
              />
            </q-item-section>
          </q-item>
        </q-list>
      </q-card-section>
      <q-card-actions align="right">
        <q-btn label="处理重复项" color="primary" @click="handleDuplicates" />
      </q-card-actions>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const settings = ref({
  watchPath: ''
})
const importing = ref(false)
const progress = ref(0)
const statusText = ref('')
const duplicates = ref([])

const actions = [
  { label: '跳过', value: 'skip' },
  { label: '重命名', value: 'rename' },
  { label: '覆盖', value: 'overwrite' }
]

onMounted(async () => {
  await fetchSettings()
})

async function fetchSettings() {
  try {
    const response = await fetch('/api/settings')
    settings.value = await response.json()
  } catch {}
}

function selectFiles() {
  console.log('Select files')
}

async function scanWatchDir() {
  importing.value = true
  progress.value = 0
  statusText.value = '正在扫描目录...'
  
  try {
    const response = await fetch('/api/import/scan')
    const result = await response.json()
    duplicates.value = result.duplicates || []
    statusText.value = '扫描完成'
    progress.value = 100
  } catch (e) {
    console.error('Scan failed:', e)
    statusText.value = '扫描失败'
  }
  
  setTimeout(() => {
    importing.value = false
  }, 2000)
}

async function handleDuplicates() {
  console.log('Handle duplicates:', duplicates.value)
}
</script>
