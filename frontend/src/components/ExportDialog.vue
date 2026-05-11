<template>
  <div v-if="visible" class="export-dialog-overlay" @click.self="$emit('close')">
    <div class="export-dialog">
      <div class="dialog-header">
        <h3>Export Photos</h3>
        <button class="close-btn" @click="$emit('close')">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      
      <div class="dialog-body">
        <div class="form-group">
          <label>Export Path</label>
          <input 
            v-model="exportPath" 
            type="text" 
            placeholder="/path/to/export"
            class="form-input"
          />
        </div>
        
        <div class="form-group">
          <label>Organize Pattern</label>
          <select v-model="organizePattern" class="form-select">
            <option value="{year}/{month}/{day}">By Date (YYYY/MM/DD)</option>
            <option value="{camera}/{year}/{month}">By Camera & Date</option>
            <option value="{type}/{year}">By Type & Year</option>
            <option value="flat">Flat (No Subfolders)</option>
          </select>
        </div>
        
        <div class="form-group">
          <label>Duplicate Policy</label>
          <select v-model="duplicatePolicy" class="form-select">
            <option value="skip">Skip duplicates</option>
            <option value="rename">Rename duplicates</option>
            <option value="overwrite">Overwrite duplicates</option>
          </select>
        </div>
        
        <div class="form-group">
          <label class="checkbox-label">
            <input type="checkbox" v-model="includeSubfolders" />
            <span>Include subfolders structure</span>
          </label>
        </div>
        
        <div class="selected-info">
          <p>{{ selectedCount }} photos selected</p>
        </div>
      </div>
      
      <div class="dialog-footer">
        <button class="btn btn-secondary" @click="$emit('close')">Cancel</button>
        <button 
          class="btn btn-primary" 
          @click="startExport"
          :disabled="!exportPath || selectedCount === 0"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          Export
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

defineProps<{
  visible: boolean
  selectedCount: number
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'export', options: {
    path: string
    pattern: string
    duplicatePolicy: string
    includeSubfolders: boolean
  }): void
}>()

const exportPath = ref('')
const organizePattern = ref('{year}/{month}/{day}')
const duplicatePolicy = ref('skip')
const includeSubfolders = ref(false)

function startExport() {
  if (!exportPath.value) return
  
  emit('export', {
    path: exportPath.value,
    pattern: organizePattern.value,
    duplicatePolicy: duplicatePolicy.value,
    includeSubfolders: includeSubfolders.value
  })
}
</script>

<style scoped>
.export-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.export-dialog {
  width: 480px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e5e7eb;
}

.dialog-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: #f3f4f6;
  cursor: pointer;
  color: #6b7280;
}

.close-btn:hover {
  background: #e5e7eb;
}

.dialog-body {
  padding: 20px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.form-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  box-sizing: border-box;
}

.form-input:focus {
  outline: none;
  border-color: #3b82f6;
}

.form-select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  background: #fff;
  cursor: pointer;
}

.form-select:focus {
  outline: none;
  border-color: #3b82f6;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
  color: #374151;
}

.selected-info {
  margin-top: 16px;
  padding: 12px;
  background: #f9fafb;
  border-radius: 8px;
}

.selected-info p {
  margin: 0;
  font-size: 14px;
  color: #6b7280;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid #e5e7eb;
  background: #f9fafb;
}

.btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: #3b82f6;
  color: #fff;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: #f3f4f6;
  color: #374151;
}

.btn-secondary:hover {
  background: #e5e7eb;
}
</style>