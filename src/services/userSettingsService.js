import api from './api'

export const userSettingsService = {
  async getPreferences(timezone) {
    const response = await api.get('/user/preferences', { params: { timezone } })
    return response.data
  },

  async updatePreferences(preferences) {
    const response = await api.put('/user/preferences', preferences)
    return response.data
  },
}
