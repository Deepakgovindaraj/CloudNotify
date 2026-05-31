import api, { simulateDelay } from './api'
import { mockRecentActivity } from '@/constants/mockData'

let notifications = []

export const notificationService = {
  async getAll() {
    const email = localStorage.getItem('userEmail')

    const response = await api.get('/notifications', {
      params: {
        ownerEmail: email,
      },
    })

    return response.data
  },

  async getStats() {
    const email = localStorage.getItem('userEmail')

    const response = await api.get('/notifications', {
      params: {
        ownerEmail: email,
      },
    })

    const notifications = response.data

    const total = notifications.length

    const scheduled = notifications.filter(
      (n) => n.status === 'PENDING'
    ).length

    const sent = notifications.filter(
      (n) => n.status === 'SENT'
    ).length

    const failed = notifications.filter(
      (n) => n.status === 'FAILED'
    ).length

    return {
      total,
      scheduled,
      sent,
      failed,

      weeklyActivity: [
        { day: 'Mon', sent: 2, failed: 0 },
        { day: 'Tue', sent: 1, failed: 0 },
        { day: 'Wed', sent: 3, failed: 1 },
        { day: 'Thu', sent: 4, failed: 0 },
        { day: 'Fri', sent: 2, failed: 0 },
        { day: 'Sat', sent: 1, failed: 0 },
        { day: 'Sun', sent: 0, failed: 0 },
      ],

      channelDistribution: [
        { channel: 'Gmail', percentage: 70 },
        { channel: 'Telegram', percentage: 20 },
        { channel: 'Both', percentage: 10 },
      ],
    }
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
      ownerEmail: data.ownerEmail,
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