import api, { simulateDelay } from './api'
import { mockStats, mockRecentActivity } from '@/constants/mockData'

let notifications = [];

export const notificationService = {
  async getAll() {
    const response = await api.get('/notifications')
    return response.data
  },

  async getStats() {
    await simulateDelay(400)
    return { ...mockStats }
  },

  async getRecentActivity() {
    await simulateDelay(350)
    return [...mockRecentActivity]
  },

  async create(data) {
    const payload = {
      notificationId: 'ntf_' + Date.now(),
      title: data.title,
      message: data.message,
      email: data.email,
      date: data.date,
      time: data.time,
      channel: data.channel,
      status: 'PENDING',
    }
  
    const response = await api.post('/notifications', payload)
  
    return response.data.notification
  },

  async delete(id) {
    const response = await api.delete(`/notifications/${id}`)
    return response.data
  },

  async updateStatus(id, status) {
    await simulateDelay(300)
    notifications = notifications.map((n) =>
      n.id === id ? { ...n, status } : n
    )
    return notifications.find((n) => n.id === id)
  },
}
