<template>
  <div v-if="photo" class="photo-detail">
    <div class="detail-header">
      <button class="close-btn" @click="$emit('close')">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
      <h2>{{ photo.filename }}</h2>
    </div>
    
    <div class="detail-content">
      <div class="preview-section">
        <div class="preview-container">
          <img 
            :src="previewUrl" 
            :alt="photo.filename" 
            class="preview-image"
            @load="imageLoaded = true"
          />
          <div v-if="!imageLoaded" class="loading-spinner">
            <svg class="spinner" viewBox="0 0 50 50">
              <circle class="path" cx="25" cy="25" r="20" fill="none" stroke-width="4"></circle>
            </svg>
          </div>
        </div>
      </div>
      
      <div class="info-section">
        <div class="info-card">
          <h3>File Info</h3>
          <div class="info-grid">
            <div class="info-row">
              <span class="info-label">Type</span>
              <span class="info-value">{{ photo.fileType === 'photo' ? 'Photo' : 'Video' }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Size</span>
              <span class="info-value">{{ formatFileSize(photo.fileSize) }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Path</span>
              <span class="info-value">{{ photo.filepath }}</span>
            </div>
            <div v-if="photo.width" class="info-row">
              <span class="info-label">Dimensions</span>
              <span class="info-value">{{ photo.width }} x {{ photo.height }}px</span>
            </div>
            <div v-if="photo.duration" class="info-row">
              <span class="info-label">Duration</span>
              <span class="info-value">{{ formatDuration(photo.duration) }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Status</span>
              <span class="info-value" :class="statusClass">{{ photo.status }}</span>
            </div>
          </div>
        </div>
        
        <div v-if="photo.metadata" class="info-card">
          <h3>Metadata</h3>
          <div class="metadata-content">
            <pre>{{ formatMetadata(photo.metadata) }}</pre>
          </div>
        </div>
        
        <div class="info-card">
          <h3>Actions</h3>
          <div class="action-buttons">
            <button class="btn btn-primary" @click="$emit('download', photo)">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              Download
            </button>
            <button class="btn btn-secondary" @click="$emit('delete', photo)">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 6h18"></path>
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
              </svg>
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface Photo {
  id: string
  filename: string
  filepath: string
  fileType: string
  fileSize: bigint | number
  width?: number
  height?: number
  duration?: number
  status: string
  metadata?: string
}

const props = defineProps<{
  photo: Photo | null
}>()

defineEmits<{
  (e: 'close'): void
  (e: 'download', photo: Photo): void
  (e: 'delete', photo: Photo): void
}>()

const imageLoaded = ref(false)

const previewUrl = computed(() => {
  if (!props.photo) return ''
  return `/api/media/${props.photo.id}/preview`
})

const statusClass = computed(() => {
  if (!props.photo) return ''
  switch (props.photo.status) {
    case 'active': return 'status-active'
    case 'missing': return 'status-missing'
    case 'removed': return 'status-removed'
    default: return ''
  }
})

function formatFileSize(size: bigint | number): string {
  const num = typeof size === 'bigint' ? Number(size) : size
  if (num < 1024) return `${num} B`
  if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`
  if (num < 1024 * 1024 * 1024) return `${(num / (1024 * 1024)).toFixed(1)} MB`
  return `${(num / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function formatMetadata(metadata: string): string {
  try {
    const parsed = JSON.parse(metadata)
    return JSON.stringify(parsed, null, 2)
  } catch {
    return metadata
  }
}
</script>

<style scoped>
.photo-detail {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fff;
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border-bottom: 1px solid #e5e7eb;
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
  transition: all 0.2s;
}

.close-btn:hover {
  background: #e5e7eb;
  color: #1f2937;
}

.detail-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.detail-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.preview-section {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: #f9fafb;
}

.preview-container {
  position: relative;
  max-width: 100%;
  max-height: 100%;
}

.preview-image {
  max-width: 100%;
  max-height: calc(100vh - 180px);
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.loading-spinner {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.spinner {
  width: 50px;
  height: 50px;
  animation: spin 1s linear infinite;
}

.spinner .path {
  stroke: #3b82f6;
  stroke-linecap: round;
  animation: dash 1.5s ease-in-out infinite;
}

@keyframes spin {
  100% { transform: rotate(360deg); }
}

@keyframes dash {
  0% { stroke-dasharray: 1, 150; stroke-dashoffset: 0; }
  50% { stroke-dasharray: 90, 150; stroke-dashoffset: -35; }
  100% { stroke-dasharray: 90, 150; stroke-dashoffset: -124; }
}

.info-section {
  width: 360px;
  overflow-y: auto;
  padding: 16px;
  border-left: 1px solid #e5e7eb;
}

.info-card {
  margin-bottom: 16px;
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.info-card h3 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
}

.info-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.info-label {
  font-size: 13px;
  color: #6b7280;
}

.info-value {
  font-size: 13px;
  font-weight: 500;
  color: #1f2937;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.info-value.status-active {
  color: #16a34a;
}

.info-value.status-missing {
  color: #d97706;
}

.info-value.status-removed {
  color: #dc2626;
}

.metadata-content {
  max-height: 200px;
  overflow-y: auto;
}

.metadata-content pre {
  margin: 0;
  padding: 8px;
  background: #f9fafb;
  border-radius: 4px;
  font-size: 12px;
  line-height: 1.5;
  color: #374151;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 16px;
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

.btn-primary:hover {
  background: #2563eb;
}

.btn-secondary {
  background: #f3f4f6;
  color: #374151;
}

.btn-secondary:hover {
  background: #e5e7eb;
}
</style>