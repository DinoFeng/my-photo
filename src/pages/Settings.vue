<template>
  <q-page class="row q-col-gutter-md">
    <div class="col-12 col-md-8">
      <q-card>
        <q-card-section>
          <h3 class="text-h5">目录设置</h3>
        </q-card-section>
        <q-card-section>
          <q-item>
            <q-item-section>照片源目录</q-item-section>
            <q-item-section side>
              <q-input 
                v-model="settings.photoSourcePath" 
                readonly 
                class="w-64"
              />
              <q-btn label="选择" @click="selectPhotoSource" />
            </q-item-section>
          </q-item>
          <q-item>
            <q-item-section>导入监控目录</q-item-section>
            <q-item-section side>
              <q-input 
                v-model="settings.watchPath" 
                readonly 
                class="w-64"
              />
              <q-btn label="选择" @click="selectWatchPath" />
            </q-item-section>
          </q-item>
        </q-card-section>
      </q-card>

      <q-card>
        <q-card-section>
          <h3 class="text-h5">组织方案</h3>
        </q-card-section>
        <q-card-section>
          <q-select 
            v-model="settings.organizePattern" 
            :options="organizePatterns" 
            label="磁盘组织方案"
          />
        </q-card-section>
      </q-card>

      <q-card>
        <q-card-section>
          <h3 class="text-h5">重复检测</h3>
        </q-card-section>
        <q-card-section>
          <q-select 
            v-model="settings.duplicateDetection" 
            :options="detectionOptions" 
            label="重复检测方式"
          />
        </q-card-section>
      </q-card>

      <q-card>
        <q-card-section>
          <h3 class="text-h5">远程访问</h3>
        </q-card-section>
        <q-card-section>
          <q-toggle v-model="settings.remoteAccess" label="启用远程访问" />
          <q-input 
            v-model="settings.remotePort" 
            label="端口号" 
            type="number"
            :disabled="!settings.remoteAccess"
          />
        </q-card-section>
      </q-card>

      <q-card-actions align="right">
        <q-btn label="保存设置" color="primary" @click="saveSettings" />
      </q-card-actions>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const settings = ref({
  photoSourcePath: '',
  watchPath: '',
  organizePattern: '{year}/{month}/{day}',
  duplicateDetection: 'hash',
  remoteAccess: false,
  remotePort: 3000
})

const organizePatterns = [
  { label: '按日期', value: '{year}/{month}/{day}' },
  { label: '按相机', value: '{camera}/{year}' },
  { label: '按地点', value: 'Locations/{city}' },
  { label: '按事件', value: 'Events/{event}/{date}' }
]

const detectionOptions = [
  { label: '文件哈希 (最准确)', value: 'hash' },
  { label: '文件名+大小', value: 'name_size' },
  { label: 'EXIF+文件名', value: 'exif_name' }
]

onMounted(async () => {
  settings.value = await fetchSettings()
})

async function fetchSettings() {
  try {
    const response = await fetch('/api/settings')
    return await response.json()
  } catch {
    return settings.value
  }
}

function selectPhotoSource() {
  console.log('Select photo source')
}

function selectWatchPath() {
  console.log('Select watch path')
}

async function saveSettings() {
  try {
    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings.value)
    })
    alert('设置已保存')
  } catch (e) {
    console.error('Failed to save settings:', e)
  }
}
</script>
