import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '@/api'

export interface Settings {
  id: string
  photoSourcePath: string
  watchPath: string
  organizePattern: string
  duplicateDetection: 'hash' | 'filename' | 'none'
  thumbnailQuality: 'low' | 'medium' | 'high'
  remoteAccess: boolean
  remotePort: number
  createdAt: string
  updatedAt: string
}

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<Settings | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchSettings() {
    loading.value = true
    error.value = null
    try {
      settings.value = await api.settings.get()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch settings'
      console.error('Failed to fetch settings:', e)
    } finally {
      loading.value = false
    }
  }

  async function updateSettings(updates: Partial<Settings>) {
    loading.value = true
    error.value = null
    try {
      settings.value = await api.settings.update(updates)
      return true
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to update settings'
      console.error('Failed to update settings:', e)
      return false
    } finally {
      loading.value = false
    }
  }

  return {
    settings,
    loading,
    error,
    fetchSettings,
    updateSettings
  }
})
