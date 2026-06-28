interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: unknown
  headers?: Record<string, string>
  noAuth?: boolean
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {} } = options

  const config: RequestInit = {
    method,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  }

  if (body !== undefined) {
    config.body = JSON.stringify(body)
  }

  const response = await fetch(`/api${endpoint}`, config)

  if (!response.ok) {
    let errorMessage = `请求失败: ${response.status}`
    try {
      const data = await response.json()
      if (data.error) errorMessage = data.error
    } catch {
      // 忽略
    }
    throw new Error(errorMessage)
  }

  const contentType = response.headers.get('content-type')
  if (contentType && contentType.includes('application/json')) {
    return response.json()
  }

  return {} as T
}

export const apiClient = {
  get: <T>(endpoint: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(endpoint, { ...options, method: 'GET' }),

  post: <T>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, 'method'>) =>
    request<T>(endpoint, { ...options, method: 'POST', body }),

  put: <T>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, 'method'>) =>
    request<T>(endpoint, { ...options, method: 'PUT', body }),

  delete: <T>(endpoint: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(endpoint, { ...options, method: 'DELETE' })
}

// === 相册功能新增：认证 API ===
export interface AuthUser {
  id: string
  displayName: string
  avatarEmoji: string
  isAdmin: boolean
  status: string
  mustChangePassword?: boolean
}

export const authApi = {
  getStatus: () => apiClient.get<{ hasAdmin: boolean }>('/auth/status'),
  getCurrentUser: () => apiClient.get<{ user: AuthUser | null }>('/auth/me'),
  login: (data: { username: string; password: string }) =>
    apiClient.post<{ user: AuthUser }>('/auth/login', data),
  loginWithCode: (data: { inviteCode: string }) =>
    apiClient.post<{ user: AuthUser }>('/auth/login-with-code', data),
  changePassword: (data: { newPassword: string; oldPassword?: string }) =>
    apiClient.post<{ user: AuthUser }>('/auth/change-password', data),
  logout: () => apiClient.post<{ ok: boolean }>('/auth/logout'),
}

// === 相册功能新增：用户管理 API ===
export interface UserData {
  id: string
  username: string | null
  displayName: string
  avatarEmoji: string
  isAdmin: boolean
  status: string
  inviteCode: string | null
  createdAt: string
  updatedAt: string
}

export const userApi = {
  getAll: () => apiClient.get<{ users: UserData[] }>('/users'),
  create: (data: { displayName: string; avatarEmoji: string }) =>
    apiClient.post<{ user: UserData }>('/users', data),
  update: (id: string, data: { displayName?: string; avatarEmoji?: string; status?: string; regenerateInviteCode?: boolean }) =>
    apiClient.put<{ user: UserData }>(`/users/${id}`, data),
  remove: (id: string) => apiClient.delete<{ ok: boolean }>(`/users/${id}`),
}

// === 相册功能新增：相册 API ===
export interface AlbumData {
  id: string
  ownerId: string
  ownerName: string
  name: string
  description: string | null
  coverMediaId: string | null
  visibility: 'private' | 'all_users'
  mediaCount: number
  createdAt: string
  updatedAt: string
}

export interface AlbumShareData {
  id: string
  albumId: string
  shareToken: string
  createdBy: string
  createdAt: string
  expiresAt: string | null
}

export const albumApi = {
  getList: (filter?: { owner?: 'me' | 'others' }) => {
    const params = new URLSearchParams()
    if (filter?.owner) params.set('owner', filter.owner)
    const query = params.toString()
    return apiClient.get<{ albums: AlbumData[] }>(`/albums${query ? `?${query}` : ''}`)
  },
  getDetail: (id: string) => apiClient.get<{ album: AlbumData }>(`/albums/${id}`),
  create: (data: { name: string; description?: string; visibility?: 'private' | 'all_users' }) =>
    apiClient.post<{ album: AlbumData }>('/albums', data),
  update: (id: string, data: { name?: string; description?: string; visibility?: 'private' | 'all_users'; coverMediaId?: string }) =>
    apiClient.put<{ album: AlbumData }>(`/albums/${id}`, data),
  remove: (id: string) => apiClient.delete<{ ok: boolean }>(`/albums/${id}`),

  getMedia: (id: string, page = 1, limit = 30) =>
    apiClient.get<{ data: any[]; pagination: any }>(`/albums/${id}/media?page=${page}&limit=${limit}`),
  addMedia: (id: string, mediaIds: string[]) =>
    apiClient.post<{ added: number; skipped: number }>(`/albums/${id}/media`, { mediaIds }),
  removeMedia: (albumId: string, mediaId: string) =>
    apiClient.delete<{ ok: boolean }>(`/albums/${albumId}/media/${mediaId}`),
  batchRemoveMedia: (albumId: string, mediaIds: string[]) =>
    apiClient.post<{ removed: number }>(`/albums/${albumId}/media/batch-remove`, { mediaIds }),

  getShares: (id: string) => apiClient.get<{ shares: AlbumShareData[] }>(`/albums/${id}/shares`),
  createShare: (id: string) => apiClient.post<{ share: AlbumShareData }>(`/albums/${id}/shares`),
  removeShare: (albumId: string, shareId: string) =>
    apiClient.delete<{ ok: boolean }>(`/albums/${albumId}/shares/${shareId}`),
}

// === 相册功能新增：公开分享 API ===
export const shareApi = {
  getAlbum: (token: string) => apiClient.get<{ album: any; ownerName: string }>(`/auth/shares/album/${token}`),
}

// 公开分享需要调用根级别 /share/api/... 路由，不走 /api
export async function shareApiGet<T>(endpoint: string): Promise<T> {
  const response = await fetch(`/share/api/${endpoint}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })

  if (!response.ok) {
    let errorMessage = `请求失败: ${response.status}`
    try {
      const data = await response.json()
      if (data.error) errorMessage = data.error
    } catch {
      // 忽略
    }
    throw new Error(errorMessage)
  }
  return response.json()
}

export const publicShareApi = {
  getAlbum: (token: string) => shareApiGet<{ album: any; ownerName: string }>(`album/${token}`),
  getMedia: (token: string, page = 1, limit = 30) =>
    shareApiGet<{ data: any[]; pagination: any }>(`album/${token}/media?page=${page}&limit=${limit}`),
}

// === 原有 SSE ===
interface SSEEventHandlers<T = any> {
  [eventName: string]: (data: T) => void;
}

export async function sseRequest(
  endpoint: string,
  handlers: SSEEventHandlers,
  abortSignal: AbortSignal
): Promise<void> {
  const response = await fetch(`/sse${endpoint}`, {
    credentials: 'include',
    headers: {
      'Accept': 'text/event-stream'
    },
    signal: abortSignal
  });

  if (!response.ok || !response.body) {
    throw new Error('SSE connection failed');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    let currentEvent = '';
    let currentData = '';

    for (const line of lines) {
      if (line.startsWith('event:')) {
        currentEvent = line.slice('event:'.length).trim();
      } else if (line.startsWith('data:')) {
        currentData = line.slice('data:'.length).trim();
      } else if (line === '') {
        if (currentEvent && currentData) {
          const handler = handlers[currentEvent];
          if (handler) {
            try {
              handler(JSON.parse(currentData));
            } catch {
              // Skip invalid JSON
            }
          }
          currentEvent = '';
          currentData = '';
        }
      }
    }
  }
}