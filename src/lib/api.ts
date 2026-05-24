import axios from 'axios'
import { useAuthStore } from '@/store/authStore'

const apiBaseUrl =
  import.meta.env.VITE_API_BASE_URL ||
  'https://e41cinm9d8.execute-api.ap-northeast-2.amazonaws.com/prod'

export const api = axios.create({
  baseURL: apiBaseUrl,
  timeout: 10000,
  withCredentials: true,
})

api.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState()
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

let isRefreshing = false
let pendingRequests: Array<{
  resolve: (token: string) => void
  reject: (err: unknown) => void
}> = []

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (
      error.response?.status !== 401 ||
      originalRequest._retry ||
      originalRequest.url?.includes('/auth/')
    ) {
      return Promise.reject(error)
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingRequests.push({
          resolve: (token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            resolve(api(originalRequest))
          },
          reject,
        })
      })
    }

    originalRequest._retry = true
    isRefreshing = true

    try {
      const { data } = await axios.post(
        `${apiBaseUrl}/auth/refresh`,
        {},
        { withCredentials: true },
      )
      const newToken: string = data.accessToken
      useAuthStore.getState().setToken(newToken)
      pendingRequests.forEach(({ resolve }) => resolve(newToken))
      pendingRequests = []
      originalRequest.headers.Authorization = `Bearer ${newToken}`
      return api(originalRequest)
    } catch (refreshError) {
      pendingRequests.forEach(({ reject }) => reject(refreshError))
      pendingRequests = []
      await useAuthStore.getState().logout()
      window.location.hash = '/admin/thelc/login'
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  },
)
