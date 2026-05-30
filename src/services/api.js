import axios from 'axios'
import { API_BASE_URL } from '@/constants/config'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cloudnotify_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      error.isNetworkError = true
    }
    return Promise.reject(error)
  }
)

export default api

export function simulateDelay(ms = 600) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
