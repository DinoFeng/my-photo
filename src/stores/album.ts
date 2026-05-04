import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '@/api'

export interface Album {
  id: string
  name: string
  type: 'system' | 'custom'
  rule?: string
  coverPath: string | null
  photoCount: number
  createdAt: string
  updatedAt: string | null
}

export const useAlbumStore = defineStore('album', () => {
  const albums = ref<Album[]>([])
  const currentAlbum = ref<Album | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const systemAlbums = computed(() => albums.value.filter(a => a.type === 'system'))
  const customAlbums = computed(() => albums.value.filter(a => a.type === 'custom'))

  async function fetchAlbums() {
    loading.value = true
    error.value = null
    try {
      albums.value = await api.albums.getAll()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch albums'
      console.error('Failed to fetch albums:', e)
    } finally {
      loading.value = false
    }
  }

  async function fetchAlbumById(id: string) {
    loading.value = true
    error.value = null
    try {
      currentAlbum.value = await api.albums.getById(id)
      return currentAlbum.value
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch album'
      console.error('Failed to fetch album:', e)
      return null
    } finally {
      loading.value = false
    }
  }

  async function createAlbum(name: string) {
    try {
      const newAlbum = await api.albums.create({ name, type: 'custom' })
      albums.value.unshift(newAlbum)
      return newAlbum
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to create album'
      throw e
    }
  }

  async function updateAlbum(id: string, updates: Partial<{ name: string; coverPath: string }>) {
    try {
      const updated = await api.albums.update(id, updates)
      const index = albums.value.findIndex(a => a.id === id)
      if (index !== -1) {
        albums.value[index] = updated
      }
      if (currentAlbum.value?.id === id) {
        currentAlbum.value = updated
      }
      return updated
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to update album'
      throw e
    }
  }

  async function deleteAlbum(id: string) {
    try {
      await api.albums.delete(id)
      albums.value = albums.value.filter(a => a.id !== id)
      if (currentAlbum.value?.id === id) {
        currentAlbum.value = null
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to delete album'
      throw e
    }
  }

  async function addPhotoToAlbum(albumId: string, photoId: string) {
    try {
      await api.albums.addPhoto(albumId, photoId)
      const album = albums.value.find(a => a.id === albumId)
      if (album) {
        album.photoCount++
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to add photo to album'
      throw e
    }
  }

  async function removePhotoFromAlbum(albumId: string, photoId: string) {
    try {
      await api.albums.removePhoto(albumId, photoId)
      const album = albums.value.find(a => a.id === albumId)
      if (album && album.photoCount > 0) {
        album.photoCount--
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to remove photo from album'
      throw e
    }
  }

  function reset() {
    albums.value = []
    currentAlbum.value = null
    loading.value = false
    error.value = null
  }

  return {
    albums,
    currentAlbum,
    loading,
    error,
    systemAlbums,
    customAlbums,
    fetchAlbums,
    fetchAlbumById,
    createAlbum,
    updateAlbum,
    deleteAlbum,
    addPhotoToAlbum,
    removePhotoFromAlbum,
    reset
  }
})
