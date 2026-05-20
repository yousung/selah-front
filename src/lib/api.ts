import axios from 'axios'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api'

export const api = axios.create({
  baseURL: apiBaseUrl,
  timeout: 10000,
})
