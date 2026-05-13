import { defineStore } from 'pinia'
import { ref } from 'vue'
import { apiClient } from '../utils/apiClient'

interface Setting {
  key: string
  value: string
}

export const useSettingsStore = defineStore('settings', () => {
  const importPath = ref('./import')
  const exportPath = ref('./export')
  const organizePattern = ref('date')
  const duplicateStrategy = ref('skip')

  const loadSettings = async () => {
    try {
      const settings = await apiClient.get<Setting[]>('/api/settings')
      settings.forEach((setting) => {
        switch (setting.key) {
          case 'importPath':
            importPath.value = setting.value
            break
          case 'exportPath':
            exportPath.value = setting.value
            break
          case 'organizePattern':
            organizePattern.value = setting.value
            break
          case 'duplicateStrategy':
            duplicateStrategy.value = setting.value
            break
        }
      })
    } catch (error) {
      console.error('Failed to load settings:', error)
    }
  }

  const saveSettings = async () => {
    try {
      await Promise.all([
        saveSetting('importPath', importPath.value),
        saveSetting('exportPath', exportPath.value),
        saveSetting('organizePattern', organizePattern.value),
        saveSetting('duplicateStrategy', duplicateStrategy.value)
      ])
    } catch (error) {
      console.error('Failed to save settings:', error)
    }
  }

  const saveSetting = async (key: string, value: string) => {
    try {
      await apiClient.put(`/api/settings/${key}`, { value })
    } catch {
      await apiClient.post('/api/settings', { key, value })
    }
  }

  return {
    importPath,
    exportPath,
    organizePattern,
    duplicateStrategy,
    loadSettings,
    saveSettings
  }
})