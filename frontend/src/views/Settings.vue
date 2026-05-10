<template>
  <div class="settings-container">
    <h1>{{ t('settings') }}</h1>
    
    <div class="settings-section">
      <h2>{{ t('import') }}</h2>
      <div class="setting-item">
        <label>{{ t('path') }}</label>
        <input v-model="importPath" type="text" />
      </div>
    </div>

    <div class="settings-section">
      <h2>{{ t('export') }}</h2>
      <div class="setting-item">
        <label>{{ t('path') }}</label>
        <input v-model="exportPath" type="text" />
      </div>
    </div>

    <button class="save-btn" @click="saveSettings">
      {{ t('save') }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const importPath = ref('./import')
const exportPath = ref('./export')

const saveSettings = () => {
  alert(t('success'))
}
</script>

<style>
.settings-container {
  padding: 24px;
}

.settings-container h1 {
  color: #cdd6f4;
  font-size: 24px;
  margin-bottom: 24px;
}

.settings-section {
  background: #1e1e2e;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
}

.settings-section h2 {
  color: #a6adc8;
  font-size: 16px;
  margin-bottom: 16px;
}

.setting-item {
  margin-bottom: 16px;
}

.setting-item:last-child {
  margin-bottom: 0;
}

.setting-item label {
  display: block;
  color: #a6adc8;
  margin-bottom: 8px;
}

.setting-item input {
  width: 100%;
  padding: 10px;
  background: #313244;
  border: 1px solid #45475a;
  border-radius: 8px;
  color: #cdd6f4;
}

.save-btn {
  padding: 12px 24px;
  background: #89b4fa;
  color: #1e1e2e;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
}
</style>