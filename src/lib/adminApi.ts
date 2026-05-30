import axios from 'axios'
import type { AxiosError, InternalAxiosRequestConfig } from 'axios'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'https://e41cinm9d8.execute-api.ap-northeast-2.amazonaws.com/prod'

export const adminApi = axios.create({
  baseURL: apiBaseUrl,
  timeout: 15000,
  withCredentials: true,
})

// Inject Bearer token
adminApi.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const raw = localStorage.getItem('admin-auth')
  if (raw) {
    try {
      const state = JSON.parse(raw)
      const token = state?.state?.accessToken
      if (token) config.headers.Authorization = `Bearer ${token}`
    } catch {}
  }
  return config
})

let isRefreshing = false
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = []

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach(p => error ? p.reject(error) : p.resolve(token!))
  failedQueue = []
}

// 401 → refresh → retry
adminApi.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean }
    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error)
    }
    if (original.url?.includes('/admin/thelc/auth/')) {
      window.location.hash = '#/admin/thelc/login'
      return Promise.reject(error)
    }
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({
          resolve: (token) => {
            original.headers.Authorization = `Bearer ${token}`
            resolve(adminApi(original))
          },
          reject,
        })
      })
    }
    original._retry = true
    isRefreshing = true
    try {
      const res = await axios.post(
        `${apiBaseUrl}/admin/thelc/auth/refresh`,
        {},
        { withCredentials: true },
      )
      const newToken: string = res.data.accessToken
      // Update store
      const raw = localStorage.getItem('admin-auth')
      if (raw) {
        try {
          const parsed = JSON.parse(raw)
          parsed.state.accessToken = newToken
          localStorage.setItem('admin-auth', JSON.stringify(parsed))
        } catch {}
      }
      processQueue(null, newToken)
      original.headers.Authorization = `Bearer ${newToken}`
      return adminApi(original)
    } catch (err) {
      processQueue(err, null)
      localStorage.removeItem('admin-auth')
      window.location.hash = '#/admin/thelc/login'
      return Promise.reject(err)
    } finally {
      isRefreshing = false
    }
  },
)
