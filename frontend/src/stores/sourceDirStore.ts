import { defineStore } from 'pinia'
import { ref } from 'vue'

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

  const loadDirectories = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/source-dirs', {
        headers: {
          'Authorization': 'Basic ' + btoa('admin:password')
        }
      })
      directories.value = await response.json()
    } catch (error) {
      console.error('Failed to load directories:', error)
    }
  }

  const createDirectory = async (data: { name: string; path: string }) => {
    try {
      const response = await fetch('http://localhost:3000/api/source-dirs', {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa('admin:password'),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })
      const newDir = await response.json()
      directories.value.push(newDir)
    } catch (error) {
      console.error('Failed to create directory:', error)
    }
  }

  const updateDirectory = async (id: string, data: { name: string; path: string }) => {
    try {
      const response = await fetch(`http://localhost:3000/api/source-dirs/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': 'Basic ' + btoa('admin:password'),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })
      const updatedDir = await response.json()
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
      await fetch(`http://localhost:3000/api/source-dirs/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': 'Basic ' + btoa('admin:password')
        }
      })
      directories.value = directories.value.filter(d => d.id !== id)
    } catch (error) {
      console.error('Failed to delete directory:', error)
    }
  }

  const startScan = async (id: string) => {
    try {
      await fetch(`http://localhost:3000/api/source-dirs/${id}/scan`, {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa('admin:password')
        }
      })
      await loadDirectories()
    } catch (error) {
      console.error('Failed to start scan:', error)
    }
  }

  return {
    directories,
    loadDirectories,
    createDirectory,
    updateDirectory,
    deleteDirectory,
    startScan
  }
})