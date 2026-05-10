<template>
  <div class="source-dirs-container">
    <div class="header">
      <h1>{{ t('sourceDirs') }}</h1>
      <button class="add-btn" @click="showAddModal = true">
        <Plus :size="18" />
        {{ t('addDirectory') }}
      </button>
    </div>

    <div v-if="loading" class="loading">{{ t('loading') }}</div>

    <div v-else-if="directories.length === 0" class="empty-state">
      <Folder :size="48" />
      <p>{{ t('noResults') }}</p>
    </div>

    <table v-else class="dir-table">
      <thead>
        <tr>
          <th>{{ t('name') }}</th>
          <th>{{ t('path') }}</th>
          <th>{{ t('status') }}</th>
          <th>{{ t('progress') }}</th>
          <th>{{ t('lastScanned') }}</th>
          <th>{{ t('actions') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="dir in directories" :key="dir.id">
          <td>{{ dir.name }}</td>
          <td class="path-cell">{{ dir.path }}</td>
          <td>
            <span :class="['status-badge', getStatusClass(dir)]">
              {{ getStatusText(dir) }}
            </span>
          </td>
          <td>
            <div v-if="dir.scanCheckpoint && dir.scanCheckpoint.status === 'scanning'" class="progress-wrapper">
              <div class="progress-bar" :style="{ width: dir.scanCheckpoint.progress + '%' }"></div>
              <span class="progress-text">{{ dir.scanCheckpoint.progress }}%</span>
            </div>
            <span v-else>-</span>
          </td>
          <td>{{ formatDate(dir.lastScanned) }}</td>
          <td class="actions-cell">
            <button class="action-btn scan-btn" @click="startScan(dir.id)">
              <RefreshCw :size="16" />
            </button>
            <button class="action-btn edit-btn" @click="editDirectory(dir)">
              <Edit3 :size="16" />
            </button>
            <button class="action-btn delete-btn" @click="confirmDelete(dir.id)">
              <Trash2 :size="16" />
            </button>
          </td>
        </tr>
      </tbody>
    </table>

    <div v-if="showAddModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal">
        <h2>{{ editingDirectory ? t('edit') : t('addDirectory') }}</h2>
        <form @submit.prevent="saveDirectory">
          <div class="form-group">
            <label>{{ t('name') }}</label>
            <input v-model="formData.name" type="text" placeholder="目录名称" />
          </div>
          <div class="form-group">
            <label>{{ t('path') }}</label>
            <input v-model="formData.path" type="text" placeholder="目录路径" />
          </div>
          <div class="form-actions">
            <button type="button" class="btn-cancel" @click="closeModal">{{ t('cancel') }}</button>
            <button type="submit" class="btn-confirm">{{ t('save') }}</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Plus, RefreshCw, Edit3, Trash2, Folder } from 'lucide-vue-next'
import { useSourceDirStore } from '../stores/sourceDirStore'

const { t } = useI18n()
const sourceDirStore = useSourceDirStore()

const loading = ref(true)
const showAddModal = ref(false)
const editingDirectory = ref<{ id: string; name: string; path: string } | null>(null)
const formData = ref({ name: '', path: '' })

const directories = sourceDirStore.directories

onMounted(async () => {
  await sourceDirStore.loadDirectories()
  loading.value = false
})

const getStatusClass = (dir: typeof directories[0]) => {
  if (!dir.scanCheckpoint) return 'status-idle'
  return `status-${dir.scanCheckpoint.status}`
}

const getStatusText = (dir: typeof directories[0]) => {
  if (!dir.scanCheckpoint) return t('idle')
  switch (dir.scanCheckpoint.status) {
    case 'scanning': return t('scanInProgress')
    case 'completed': return t('scanCompleted')
    case 'failed': return t('scanFailed')
    default: return t('idle')
  }
}

const formatDate = (date?: string) => {
  if (!date) return '-'
  return new Date(date).toLocaleString()
}

const startScan = async (id: string) => {
  await sourceDirStore.startScan(id)
}

const editDirectory = (dir: typeof directories[0]) => {
  editingDirectory.value = { id: dir.id, name: dir.name, path: dir.path }
  formData.value = { name: dir.name, path: dir.path }
  showAddModal.value = true
}

const closeModal = () => {
  showAddModal.value = false
  editingDirectory.value = null
  formData.value = { name: '', path: '' }
}

const saveDirectory = async () => {
  if (!formData.value.path) return
  if (editingDirectory.value) {
    await sourceDirStore.updateDirectory(editingDirectory.value.id, formData.value)
  } else {
    await sourceDirStore.createDirectory(formData.value)
  }
  closeModal()
}

const confirmDelete = async (id: string) => {
  if (confirm(t('confirm') + ' ' + t('delete') + '?')) {
    await sourceDirStore.deleteDirectory(id)
  }
}
</script>

<style>
.source-dirs-container {
  padding: 24px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.header h1 {
  color: #cdd6f4;
  font-size: 24px;
}

.add-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: #89b4fa;
  color: #1e1e2e;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.2s;
}

.add-btn:hover {
  background: #94bfff;
}

.loading, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px;
  color: #a6adc8;
}

.empty-state {
  gap: 16px;
}

.dir-table {
  width: 100%;
  border-collapse: collapse;
  background: #1e1e2e;
  border-radius: 12px;
  overflow: hidden;
}

.dir-table th, .dir-table td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid #313244;
}

.dir-table th {
  background: #313244;
  color: #a6adc8;
  font-weight: 500;
}

.dir-table tr:hover {
  background: #313244;
}

.path-cell {
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #a6adc8;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.status-idle {
  background: #45475a;
  color: #a6adc8;
}

.status-scanning {
  background: #f9e2af;
  color: #9a7a00;
}

.status-completed {
  background: #a6e3a1;
  color: #1a5f1a;
}

.status-failed {
  background: #f38ba8;
  color: #9a1a3a;
}

.progress-wrapper {
  position: relative;
  height: 20px;
  width: 100px;
  background: #45475a;
  border-radius: 10px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: #89b4fa;
  transition: width 0.3s;
}

.progress-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 12px;
  color: #cdd6f4;
}

.actions-cell {
  display: flex;
  gap: 8px;
}

.action-btn {
  padding: 8px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
}

.scan-btn {
  background: #89b4fa22;
  color: #89b4fa;
}

.scan-btn:hover {
  background: #89b4fa44;
}

.edit-btn {
  background: #a6e3a122;
  color: #a6e3a1;
}

.edit-btn:hover {
  background: #a6e3a144;
}

.delete-btn {
  background: #f38ba822;
  color: #f38ba8;
}

.delete-btn:hover {
  background: #f38ba844;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal {
  background: #1e1e2e;
  padding: 24px;
  border-radius: 12px;
  width: 400px;
}

.modal h2 {
  color: #cdd6f4;
  margin-bottom: 20px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  color: #a6adc8;
  margin-bottom: 8px;
}

.form-group input {
  width: 100%;
  padding: 10px;
  background: #313244;
  border: 1px solid #45475a;
  border-radius: 8px;
  color: #cdd6f4;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}

.btn-cancel {
  padding: 10px 20px;
  background: #45475a;
  color: #cdd6f4;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

.btn-confirm {
  padding: 10px 20px;
  background: #89b4fa;
  color: #1e1e2e;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
}
</style>