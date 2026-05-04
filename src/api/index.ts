const BASE_URL = '/api'

async function fetchApi(url: string, options: RequestInit = {}): Promise<any> {
  const response = await fetch(`${BASE_URL}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  })
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }
  
  return await response.json()
}

export const api = {
  settings: {
    get: async () => fetchApi('/settings'),
    update: async (data: any) => fetchApi('/settings', {
      method: 'PUT',
      body: JSON.stringify(data)
    })
  },
  
  import: {
    process: async () => fetchApi('/settings/import/process', {
      method: 'POST'
    }),
    getTasks: async (status?: string) => {
      const params = status ? `?status=${status}` : ''
      return fetchApi(`/settings/import/tasks${params}`)
    },
    createTask: async (data: { sourcePath: string; targetPath?: string }) => fetchApi('/settings/import/tasks', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    deleteTask: async (id: string) => fetchApi(`/settings/import/tasks/${id}`, {
      method: 'DELETE'
    })
  },
  
  duplicates: {
    getAll: async () => fetchApi('/settings/duplicates'),
    delete: async (id: string) => fetchApi(`/settings/duplicates/${id}`, {
      method: 'DELETE'
    }),
    handle: async (taskId: string, action: 'skip' | 'rename' | 'overwrite') => fetchApi(`/settings/duplicates/${taskId}/handle`, {
      method: 'POST',
      body: JSON.stringify({ action })
    })
  },
  
  photos: {
    getAll: async (params?: { limit?: number; offset?: number }) => {
      const query = new URLSearchParams()
      if (params?.limit) query.set('limit', params.limit.toString())
      if (params?.offset) query.set('offset', params.offset.toString())
      return fetchApi(`/photos?${query.toString()}`)
    },
    getById: async (id: string) => fetchApi(`/photos/${id}`),
    delete: async (id: string) => fetchApi(`/photos/${id}`, {
      method: 'DELETE'
    })
  },
  
  albums: {
    getAll: async () => fetchApi('/albums'),
    getById: async (id: string) => fetchApi(`/albums/${id}`),
    create: async (data: { name: string; type?: string }) => fetchApi('/albums', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    update: async (id: string, data: Partial<{ name: string; coverPath: string }>) => fetchApi(`/albums/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
    delete: async (id: string) => fetchApi(`/albums/${id}`, {
      method: 'DELETE'
    }),
    addPhoto: async (albumId: string, photoId: string) => fetchApi(`/albums/${albumId}/photos`, {
      method: 'POST',
      body: JSON.stringify({ photoId })
    }),
    removePhoto: async (albumId: string, photoId: string) => fetchApi(`/albums/${albumId}/photos/${photoId}`, {
      method: 'DELETE'
    })
  }
}
