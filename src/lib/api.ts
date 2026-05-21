import axios from 'axios'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'https://e41cinm9d8.execute-api.ap-northeast-2.amazonaws.com/prod'

export const api = axios.create({
  baseURL: apiBaseUrl,
  timeout: 10000,
})
