import api from './api'

export const gmailService = {
  async getConnection() {
    const response = await api.get('/gmail/connection')
    return response.data
  },

  async startConnection() {
    const response = await api.post('/gmail/connect')
    return response.data
  },

  async disconnect() {
    const response = await api.delete('/gmail/connection')
    return response.data
  },

  async sync() {
    const response = await api.post('/gmail/sync')
    return response.data
  },

  async getPreferences(timezone) {
    const response = await api.get('/user/preferences', { params: { timezone } })
    return response.data
  },

  async updatePreferences(preferences) {
    const response = await api.put('/user/preferences', preferences)
    return response.data
  },
}

export const interviewEventService = {
  async getAll() {
    const response = await api.get('/interview-events')
    return response.data
  },

  async update(eventId, changes) {
    const response = await api.patch(`/interview-events/${encodeURIComponent(eventId)}`, changes)
    return response.data
  },

  async confirm(eventId, event) {
    const response = await api.post(
      `/interview-events/${encodeURIComponent(eventId)}/confirm`,
      event
    )
    return response.data
  },

  async reject(eventId) {
    const response = await api.post(
      `/interview-events/${encodeURIComponent(eventId)}/reject`
    )
    return response.data
  },

  async delete(eventId) {
    const response = await api.delete(`/interview-events/${encodeURIComponent(eventId)}`)
    return response.data
  },
}
