<template>
  <div class="import-status">
    <div class="status-header">
      <h3>{{ title }}</h3>
      <div class="status-badge" :class="statusClass">{{ statusText }}</div>
    </div>
    
    <div v-if="progress !== undefined" class="progress-container">
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: `${progress}%` }"></div>
      </div>
      <span class="progress-text">{{ progress }}%</span>
    </div>
    
    <div class="task-info">
      <div class="info-item">
        <span class="label">Total Files:</span>
        <span class="value">{{ totalFiles }}</span>
      </div>
      <div class="info-item">
        <span class="label">Processed:</span>
        <span class="value">{{ processedFiles }}</span>
      </div>
      <div class="info-item">
        <span class="label">Errors:</span>
        <span class="value error">{{ errorCount }}</span>
      </div>
    </div>
    
    <div v-if="message" class="message" :class="{ error: isError }">
      {{ message }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  title?: string
  status?: 'idle' | 'running' | 'completed' | 'failed' | 'paused'
  progress?: number
  totalFiles?: number
  processedFiles?: number
  errorCount?: number
  message?: string
}>()

const title = computed(() => props.title || 'Import Status')
const status = computed(() => props.status || 'idle')
const progress = computed(() => props.progress)
const totalFiles = computed(() => props.totalFiles || 0)
const processedFiles = computed(() => props.processedFiles || 0)
const errorCount = computed(() => props.errorCount || 0)
const message = computed(() => props.message)

const statusClass = computed(() => {
  switch (status.value) {
    case 'running': return 'running'
    case 'completed': return 'completed'
    case 'failed': return 'failed'
    case 'paused': return 'paused'
    default: return 'idle'
  }
})

const statusText = computed(() => {
  switch (status.value) {
    case 'running': return 'Running'
    case 'completed': return 'Completed'
    case 'failed': return 'Failed'
    case 'paused': return 'Paused'
    default: return 'Idle'
  }
})

const isError = computed(() => status.value === 'failed')
</script>

<style scoped>
.import-status {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  background: #fff;
}

.status-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.status-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge.idle {
  background: #f3f4f6;
  color: #6b7280;
}

.status-badge.running {
  background: #dbeafe;
  color: #1d4ed8;
}

.status-badge.completed {
  background: #dcfce7;
  color: #16a34a;
}

.status-badge.failed {
  background: #fee2e2;
  color: #dc2626;
}

.status-badge.paused {
  background: #fef3c7;
  color: #d97706;
}

.progress-container {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.progress-bar {
  flex: 1;
  height: 8px;
  background: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #1d4ed8);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 14px;
  font-weight: 500;
  min-width: 40px;
  text-align: right;
}

.task-info {
  display: flex;
  gap: 24px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-item .label {
  font-size: 12px;
  color: #9ca3af;
}

.info-item .value {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}

.info-item .value.error {
  color: #dc2626;
}

.message {
  margin-top: 12px;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 14px;
}

.message.error {
  background: #fee2e2;
  color: #dc2626;
}
</style>