<template>
  <div class="gallery-container">
    <div class="search-bar">
      <Search :size="20" />
      <input v-model="searchQuery" type="text" :placeholder="t('search')" @input="handleSearch" />
    </div>

    <div v-if="loading" class="loading">{{ t('loading') }}</div>

    <div v-else-if="mediaList.length === 0" class="empty-state">
      <Image :size="48" />
      <p>{{ t('noResults') }}</p>
    </div>

    <div v-else class="media-grid">
      <div v-for="media in mediaList" :key="media.id" class="media-card">
        <div class="media-thumbnail">
          <Image :size="48" />
        </div>
        <div class="media-info">
          <span class="media-name">{{ media.filename }}</span>
          <span class="media-type">{{ media.fileType }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Search, Image } from 'lucide-vue-next'

const { t } = useI18n()

const loading = ref(true)
const searchQuery = ref('')
const mediaList = ref<Array<{ id: string; filename: string; fileType: string }>>([])

const handleSearch = () => {
  loadMedia()
}

const loadMedia = async () => {
  loading.value = true
  try {
    const response = await fetch('http://localhost:3000/api/media', {
      headers: {
        'Authorization': 'Basic ' + btoa('admin:password')
      }
    })
    const data = await response.json()
    mediaList.value = data.data
  } catch (error) {
    console.error('Failed to load media:', error)
  }
  loading.value = false
}

onMounted(() => {
  loadMedia()
})
</script>

<style>
.gallery-container {
  padding: 24px;
}

.search-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #1e1e2e;
  padding: 12px 16px;
  border-radius: 12px;
  margin-bottom: 24px;
  color: #a6adc8;
}

.search-bar input {
  flex: 1;
  background: transparent;
  border: none;
  color: #cdd6f4;
  font-size: 14px;
}

.search-bar input:focus {
  outline: none;
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

.media-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}

.media-card {
  background: #1e1e2e;
  border-radius: 12px;
  overflow: hidden;
}

.media-thumbnail {
  height: 150px;
  background: #313244;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #a6adc8;
}

.media-info {
  padding: 12px;
}

.media-name {
  display: block;
  color: #cdd6f4;
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.media-type {
  display: block;
  color: #a6adc8;
  font-size: 12px;
  margin-top: 4px;
}
</style>