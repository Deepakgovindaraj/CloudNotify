import { simulateDelay } from './api'
import { mockNotifications, mockStats, mockRecentActivity } from '@/constants/mockData'

let notifications = [...mockNotifications]

export const notificationService = {
  async getAll() {
    await simulateDelay(500)
    return [...notifications]
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
    await simulateDelay(700)
    const newNotification = {
      id: 'ntf_' + Date.now(),
      ...data,
      status: 'pending',
      createdAt: new Date().toISOString(),
    }
    notifications = [newNotification, ...notifications]
    return newNotification
  },

  async delete(id) {
    await simulateDelay(400)
    notifications = notifications.filter((n) => n.id !== id)
    return { success: true }
  },

  async updateStatus(id, status) {
    await simulateDelay(300)
    notifications = notifications.map((n) =>
      n.id === id ? { ...n, status } : n
    )
    return notifications.find((n) => n.id === id)
  },
}
