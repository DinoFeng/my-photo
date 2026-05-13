import { defineStore } from 'pinia'
import { ref } from 'vue'
import { apiClient, sseRequest } from '../utils/apiClient'

export interface SourceDirectory {
  id: string
  path: string
  name: string
  enabled: boolean
  lastScanned?: string
  createdAt: string
  updatedAt: string
  scanCheckpoint?: {
    status: string
    progress: number
    totalFiles: number
    scannedFiles: number
    errorCount: number
  }
}

export const useSourceDirStore = defineStore('sourceDir', () => {
  const directories = ref<SourceDirectory[]>([])
  const sseAbortControllers = ref<Map<string, AbortController>>(new Map())

  const loadDirectories = async () => {
    try {
      directories.value = await apiClient.get<SourceDirectory[]>('/api/source-dirs')
    } catch (error) {
      console.error('Failed to load directories:', error)
    }
  }

  const createDirectory = async (data: { name: string; path: string }): Promise<SourceDirectory | undefined> => {
    try {
      const newDir = await apiClient.post<SourceDirectory>('/api/source-dirs', data)
      directories.value.push(newDir)
      return newDir
    } catch (error) {
      console.error('Failed to create directory:', error)
      return undefined
    }
  }

  const updateDirectory = async (id: string, data: { name: string; path: string }) => {
    try {
      const updatedDir = await apiClient.put<SourceDirectory>(`/api/source-dirs/${id}`, data)
      const index = directories.value.findIndex(d => d.id === id)
      if (index !== -1) {
        directories.value[index] = updatedDir
      }
    } catch (error) {
      console.error('Failed to update directory:', error)
    }
  }

  const deleteDirectory = async (id: string) => {
    try {
      await apiClient.delete(`/api/source-dirs/${id}`)
      directories.value = directories.value.filter(d => d.id !== id)
      disconnectSSE(id)
    } catch (error) {
      console.error('Failed to delete directory:', error)
    }
  }

  const startScan = async (id: string) => {
    try {
      await apiClient.post(`/api/source-dirs/${id}/scan`)
    } catch (error) {
      console.error('Failed to start scan:', error)
    }
  }

  const connectSSE = async (sourceDirectoryId: string) => {
    if (sseAbortControllers.value.has(sourceDirectoryId)) return
    
    const controller = new AbortController()
    sseAbortControllers.value.set(sourceDirectoryId, controller)
    
    try {
      await sseRequest(
        `/api/sse/scan-progress/${sourceDirectoryId}`,
        {
          progress: async () => {
            await loadDirectories()
          }
        },
        controller.signal
      )
    } catch {
      // Connection closed or error
    } finally {
      sseAbortControllers.value.delete(sourceDirectoryId)
    }
  }

  const disconnectSSE = (sourceDirectoryId: string) => {
    const controller = sseAbortControllers.value.get(sourceDirectoryId)
    if (controller) {
      controller.abort()
      sseAbortControllers.value.delete(sourceDirectoryId)
    }
  }

  const disconnectAllSSE = () => {
    sseAbortControllers.value.forEach(controller => controller.abort())
    sseAbortControllers.value.clear()
  }

  return {
    directories,
    loadDirectories,
    createDirectory,
    updateDirectory,
    deleteDirectory,
    startScan,
    connectSSE,
    disconnectSSE,
    disconnectAllSSE
  }
})