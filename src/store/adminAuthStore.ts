import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AdminUser {
  id: string
  email: string
  name: string | null
  role: string
}

interface AdminAuthState {
  accessToken: string | null
  user: AdminUser | null
  setAuth: (token: string, user: AdminUser) => void
  clearAuth: () => void
  isAuthenticated: () => boolean
}

export const useAdminAuthStore = create<AdminAuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      user: null,
      setAuth: (accessToken, user) => set({ accessToken, user }),
      clearAuth: () => set({ accessToken: null, user: null }),
      isAuthenticated: () => !!get().accessToken,
    }),
    { name: 'admin-auth' },
  ),
)
