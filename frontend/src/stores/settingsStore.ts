import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSettingsStore = defineStore('settings', () => {
  const importPath = ref('./import')
  const exportPath = ref('./export')
  const organizePattern = ref('date')
  const duplicateStrategy = ref('skip')

  const loadSettings = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/settings', {
        headers: {
          'Authorization': 'Basic ' + btoa('admin:password')
        }
      })
      const settings = await response.json()
      settings.forEach((setting: { key: string; value: string }) => {
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
    const response = await fetch(`http://localhost:3000/api/settings/${key}`, {
      method: 'PUT',
      headers: {
        'Authorization': 'Basic ' + btoa('admin:password'),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ value })
    })
    if (!response.ok) {
      await fetch('http://localhost:3000/api/settings', {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa('admin:password'),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ key, value })
      })
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