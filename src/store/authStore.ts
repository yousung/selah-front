import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api } from '@/lib/api'

export interface AuthUser {
  id: string
  email: string
  name: string
  role: string
}

export interface AuthError {
  status?: number
  message: string
}

export interface AuthState {
  accessToken: string | null
  user: AuthUser | null
  setToken: (accessToken: string) => void
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      setToken: (accessToken: string) => set({ accessToken }),
      login: async (email: string, password: string) => {
        try {
          const response = await api.post('/auth/admin-login', { email, password })
          const { accessToken, user } = response.data
          set({ accessToken, user })
        } catch (error: any) {
          const authError: AuthError = {
            status: error.response?.status,
            message: error.message || '로그인 중 오류가 발생했습니다.',
          }
          throw authError
        }
      },
      logout: async () => {
        set({ accessToken: null, user: null })
        try {
          await api.post('/auth/admin-logout')
        } catch {
          // ignore
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ accessToken: state.accessToken, user: state.user }),
    }
  )
)
