<template>
  <q-page>
    <q-card>
      <q-card-section>
        <h3 class="text-h5">照片导入</h3>
        <p class="text-caption">导入监控目录: {{ settings.watchPath || '未设置' }}</p>
      </q-card-section>
      <q-card-section>
        <q-btn label="手动选择文件导入" color="primary" @click="selectFiles" />
        <q-btn label="扫描导入监控目录" @click="scanWatchDir" class="ml-2" />
        <q-btn label="查看导入任务" @click="showTasks = true" class="ml-2" />
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
          <q-item v-for="dup in duplicates" :key="dup.fileHash">
            <q-item-section avatar>
              <q-icon name="alert-circle" color="orange" />
            </q-item-section>
            <q-item-section>
              <q-item-label>{{ dup.photos[0]?.fileName }}</q-item-label>
              <q-item-label caption>{{ dup.photos.length }} 个重复</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-btn flat color="red" @click="removeDuplicate(dup.photos[0]?.id)">删除</q-btn>
            </q-item-section>
          </q-item>
        </q-list>
      </q-card-section>
      <q-card-actions align="right">
        <q-btn label="刷新重复列表" @click="loadDuplicates" />
      </q-card-actions>
    </q-card>

    <q-dialog v-model="showTasks">
      <q-card class="col-12 sm:col-6 md:col-4">
        <q-card-header>
          <q-card-title>导入任务</q-card-title>
          <q-card-actions>
            <q-btn flat @click="showTasks = false">关闭</q-btn>
          </q-card-actions>
        </q-card-header>
        <q-card-section>
          <q-list>
            <q-item v-for="task in importTasks" :key="task.id">
              <q-item-section avatar>
                <q-icon 
                  :name="getStatusIcon(task.status)" 
                  :color="getStatusColor(task.status)" 
                />
              </q-item-section>
              <q-item-section>
                <q-item-label>{{ task.fileName }}</q-item-label>
                <q-item-label caption>{{ getStatusText(task.status) }}</q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-btn flat @click="deleteTask(task.id)" v-if="task.status !== 'processing'">删除</q-btn>
              </q-item-section>
            </q-item>
          </q-list>
          <p v-if="importTasks.length === 0" class="text-center text-grey">暂无导入任务</p>
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { api } from '@/api'

const settings = ref({
  watchPath: ''
})
const importing = ref(false)
const progress = ref(0)
const statusText = ref('')
const duplicates = ref<any[]>([])
const importTasks = ref<any[]>([])
const showTasks = ref(false)

onMounted(async () => {
  await fetchSettings()
  await loadDuplicates()
})

async function fetchSettings() {
  try {
    settings.value = await api.settings.get()
  } catch {}
}

async function loadDuplicates() {
  try {
    duplicates.value = await api.duplicates.getAll()
  } catch (error) {
    console.error('Failed to load duplicates:', error)
  }
}

async function loadImportTasks() {
  try {
    importTasks.value = await api.import.getTasks()
  } catch (error) {
    console.error('Failed to load import tasks:', error)
  }
}

function selectFiles() {
  const electronAPI = window.electronAPI as ElectronAPI
  electronAPI.selectMultipleFiles([
    { name: '图片', extensions: ['jpg', 'jpeg', 'png', 'gif', 'heic', 'heif'] }
  ]).then(async (files) => {
    if (files && files.length > 0) {
      importing.value = true
      progress.value = 0
      statusText.value = '正在创建导入任务...'
      
      for (let i = 0; i < files.length; i++) {
        await api.import.createTask({ sourcePath: files[i] })
        progress.value = ((i + 1) / files.length) * 50
      }
      
      statusText.value = '正在处理导入...'
      const result = await api.import.process()
      progress.value = 100
      statusText.value = `导入完成: ${result.imported} 张新照片, ${result.duplicates} 张重复`
      
      await loadDuplicates()
      
      setTimeout(() => {
        importing.value = false
      }, 2000)
    }
  })
}

async function scanWatchDir() {
  importing.value = true
  progress.value = 0
  statusText.value = '正在扫描目录...'
  
  try {
    const result = await api.import.process()
    progress.value = 100
    statusText.value = `扫描完成: ${result.imported} 张新照片, ${result.duplicates} 张重复`
    await loadDuplicates()
  } catch (e) {
    console.error('Scan failed:', e)
    statusText.value = '扫描失败'
  }
  
  setTimeout(() => {
    importing.value = false
  }, 2000)
}

async function removeDuplicate(photoId: string) {
  if (!photoId) return
  
  try {
    await api.duplicates.delete(photoId)
    await loadDuplicates()
  } catch (error) {
    console.error('Failed to delete duplicate:', error)
  }
}

async function deleteTask(taskId: string) {
  try {
    await api.import.deleteTask(taskId)
    await loadImportTasks()
  } catch (error) {
    console.error('Failed to delete task:', error)
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'pending': return 'clock'
    case 'processing': return 'loading'
    case 'completed': return 'check'
    case 'failed': return 'alert-circle'
    case 'duplicate': return 'copy'
    default: return 'help'
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case 'pending': return 'grey'
    case 'processing': return 'blue'
    case 'completed': return 'green'
    case 'failed': return 'red'
    case 'duplicate': return 'orange'
    default: return 'grey'
  }
}

function getStatusText(status: string) {
  switch (status) {
    case 'pending': return '等待导入'
    case 'processing': return '处理中...'
    case 'completed': return '已完成'
    case 'failed': return '失败'
    case 'duplicate': return '重复'
    default: return status
  }
}
</script>
