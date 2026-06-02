import api from './api'

export const telegramService = {
  async connect(data) {
    const response = await api.post('/telegram/connect', data)
    return response.data
  }
}