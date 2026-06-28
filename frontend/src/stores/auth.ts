import { defineStore } from 'pinia'
import { authApi, AuthUser } from '../utils/apiClient'

interface AuthState {
  user: AuthUser | null
  isAuthenticated: boolean
  loading: boolean
  systemInitialized: boolean | null
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    user: null,
    isAuthenticated: false,
    loading: false,
    systemInitialized: null,
  }),

  actions: {
    async checkSystemStatus(): Promise<boolean> {
      try {
        const result = await authApi.getStatus()
        this.systemInitialized = result.hasAdmin
        return result.hasAdmin
      } catch {
        this.systemInitialized = false
        return false
      }
    },

    async fetchCurrentUser(): Promise<AuthUser | null> {
      try {
        const result = await authApi.getCurrentUser()
        this.user = result.user
        this.isAuthenticated = result.user !== null
        return result.user
      } catch {
        this.user = null
        this.isAuthenticated = false
        return null
      }
    },

    async login(username: string, password: string) {
      this.loading = true
      try {
        const result = await authApi.login({ username, password })
        this.user = result.user
        this.isAuthenticated = true
        return result.user
      } finally {
        this.loading = false
      }
    },

    async loginWithCode(inviteCode: string) {
      this.loading = true
      try {
        const result = await authApi.loginWithCode({ inviteCode })
        this.user = result.user
        this.isAuthenticated = true
        return result.user
      } finally {
        this.loading = false
      }
    },

    async changePassword(newPassword: string, oldPassword?: string) {
      this.loading = true
      try {
        const result = await authApi.changePassword({ newPassword, oldPassword })
        this.user = result.user
        return result.user
      } finally {
        this.loading = false
      }
    },

    async logout() {
      try {
        await authApi.logout()
      } catch {
        // 忽略
      }
      this.user = null
      this.isAuthenticated = false
    },
  },
})