import { create } from 'zustand'
import { authApi, type UserInfo } from '../api/auth'

interface AuthState {
  user: UserInfo | null
  isAuthenticated: boolean
  isLoading: boolean

  login: (username: string, password: string) => Promise<void>
  register: (username: string, email: string, password: string) => Promise<void>
  logout: () => void
  fetchUser: () => Promise<void>
  init: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: !!localStorage.getItem('access_token'),
  isLoading: true,

  login: async (username, password) => {
    const { data } = await authApi.login({ username, password })
    if (data.data) {
      localStorage.setItem('access_token', data.data.access_token)
      localStorage.setItem('refresh_token', data.data.refresh_token)
      set({ isAuthenticated: true })
      const userRes = await authApi.me()
      set({ user: userRes.data.data })
    }
  },

  register: async (username, email, password) => {
    await authApi.register({ username, email, password })
  },

  logout: () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    set({ user: null, isAuthenticated: false })
  },

  fetchUser: async () => {
    try {
      const { data } = await authApi.me()
      set({ user: data.data, isAuthenticated: true })
    } catch {
      set({ user: null, isAuthenticated: false })
    }
  },

  init: async () => {
    const token = localStorage.getItem('access_token')
    if (token) {
      try {
        const { data } = await authApi.me()
        set({ user: data.data, isAuthenticated: true, isLoading: false })
      } catch {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        set({ user: null, isAuthenticated: false, isLoading: false })
      }
    } else {
      set({ isLoading: false })
    }
  },
}))
