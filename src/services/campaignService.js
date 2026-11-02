import api from './api'

export const campaignService = {
  async createDraft(campaign) {
    const response = await api.post('/campaigns', campaign)
    return response.data
  },
}
