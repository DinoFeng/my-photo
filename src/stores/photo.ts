import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '@/api'

export interface Photo {
  id: string
  filePath: string
  fileName: string
  fileHash: string | null
  thumbnailPath: string | null
  exif: any
  takenDate: string | null
  fileSize: number
  width: number
  height: number
  importedAt: string
  updatedAt: string | null
}

export interface PhotoFilters {
  search?: string
  dateFrom?: string
  dateTo?: string
  camera?: string
  location?: string
  tags?: string[]
  albumId?: string
}

export const usePhotoStore = defineStore('photo', () => {
  const photos = ref<Photo[]>([])
  const currentPhoto = ref<Photo | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const filters = ref<PhotoFilters>({})

  const filteredPhotos = computed(() => {
    let result = [...photos.value]

    if (filters.value.search) {
      const search = filters.value.search.toLowerCase()
      result = result.filter(p =>
        p.fileName.toLowerCase().includes(search) ||
        p.fileHash?.toLowerCase().includes(search)
      )
    }

    if (filters.value.dateFrom) {
      const from = new Date(filters.value.dateFrom)
      result = result.filter(p => new Date(p.takenDate || p.importedAt) >= from)
    }

    if (filters.value.dateTo) {
      const to = new Date(filters.value.dateTo)
      result = result.filter(p => new Date(p.takenDate || p.importedAt) <= to)
    }

    if (filters.value.camera) {
      result = result.filter(p => p.exif?.camera === filters.value.camera)
    }

    if (filters.value.location) {
      result = result.filter(p =>
        p.exif?.gps?.city === filters.value.location ||
        p.exif?.gps?.country === filters.value.location
      )
    }

    return result
  })

  async function fetchPhotos(params?: { limit?: number; offset?: number }) {
    loading.value = true
    error.value = null
    try {
      photos.value = await api.photos.getAll(params)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch photos'
      console.error('Failed to fetch photos:', e)
    } finally {
      loading.value = false
    }
  }

  async function fetchPhotoById(id: string) {
    loading.value = true
    error.value = null
    try {
      currentPhoto.value = await api.photos.getById(id)
      return currentPhoto.value
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch photo'
      console.error('Failed to fetch photo:', e)
      return null
    } finally {
      loading.value = false
    }
  }

  async function deletePhoto(id: string) {
    try {
      await api.photos.delete(id)
      photos.value = photos.value.filter(p => p.id !== id)
      if (currentPhoto.value?.id === id) {
        currentPhoto.value = null
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to delete photo'
      throw e
    }
  }

  function setFilters(newFilters: PhotoFilters) {
    filters.value = { ...newFilters }
  }

  function clearFilters() {
    filters.value = {}
  }

  function reset() {
    photos.value = []
    currentPhoto.value = null
    loading.value = false
    error.value = null
    filters.value = {}
  }

  return {
    photos,
    currentPhoto,
    loading,
    error,
    filters,
    filteredPhotos,
    fetchPhotos,
    fetchPhotoById,
    deletePhoto,
    setFilters,
    clearFilters,
    reset
  }
})
