import api from './api'

export const telegramService = {
  async createLinkCode(email) {
    const response = await api.post('/telegram/link-code', { email })
    return response.data
  }
}