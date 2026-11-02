import api from './api'

export const campaignService = {
  async getAll() {
    const response = await api.get('/campaigns')
    return response.data
  },

  async getById(campaignId) {
    const response = await api.get(`/campaigns/${encodeURIComponent(campaignId)}`)
    return response.data
  },

  async createDraft(campaign) {
    const response = await api.post('/campaigns', campaign)
    return response.data
  },

  async updateTemplates(campaignId, templates) {
    const response = await api.patch(
      `/campaigns/${encodeURIComponent(campaignId)}`,
      templates
    )
    return response.data
  },
}
