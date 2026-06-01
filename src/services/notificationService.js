import api, { simulateDelay } from './api'
import {
  parseISO,
  subDays,
  startOfDay,
  endOfDay,
  isWithinInterval,
  isValid,
} from 'date-fns'

let notifications = []

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const DAY_TO_INDEX = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 0: 6 }

const CHANNEL_LABELS = [
  { key: 'GMAIL', label: 'Gmail' },
  { key: 'TELEGRAM', label: 'Telegram' },
  { key: 'BOTH', label: 'Both' },
]

function normalizeStatus(status) {
  return (status || '').toUpperCase()
}

function normalizeChannel(channel) {
  return (channel || '').toUpperCase()
}

function parseNotificationDate(dateStr) {
  if (!dateStr) return null
  const parsed = parseISO(dateStr.length === 10 ? dateStr : dateStr.split('T')[0])
  return isValid(parsed) ? parsed : null
}

function buildWeeklyActivity(notificationList) {
  const weeklyActivity = WEEK_DAYS.map((day) => ({ day, sent: 0, failed: 0 }))
  const now = new Date()
  const rangeStart = startOfDay(subDays(now, 6))
  const rangeEnd = endOfDay(now)

  notificationList.forEach((n) => {
    const status = normalizeStatus(n.status)
    if (status !== 'SENT' && status !== 'FAILED') return

    const date = parseNotificationDate(n.date)
    if (!date) return

    const dayDate = startOfDay(date)
    if (!isWithinInterval(dayDate, { start: rangeStart, end: rangeEnd })) return

    const index = DAY_TO_INDEX[date.getDay()]
    if (index === undefined) return

    if (status === 'SENT') weeklyActivity[index].sent += 1
    if (status === 'FAILED') weeklyActivity[index].failed += 1
  })

  return weeklyActivity
}

function buildChannelDistribution(notificationList) {
  const counts = { GMAIL: 0, TELEGRAM: 0, BOTH: 0 }

  notificationList.forEach((n) => {
    const channel = normalizeChannel(n.channel)
    if (channel in counts) counts[channel] += 1
  })

  const total = notificationList.length

  return CHANNEL_LABELS.map(({ key, label }) => ({
    channel: label,
    percentage: total ? Math.round((counts[key] / total) * 100) : 0,
  }))
}

function formatActivityTime(notification) {
  const date = notification.date || ''
  const time = notification.time || ''
  if (date && time) return `${date} ${time}`
  if (date) return date
  return ''
}

function parseNotificationTime(date, timeStr) {
  const trimmed = (timeStr || '').trim()
  if (!trimmed) return date

  const match12 = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (match12) {
    let hours = parseInt(match12[1], 10)
    const minutes = parseInt(match12[2], 10)
    const period = match12[3].toUpperCase()
    if (period === 'PM' && hours !== 12) hours += 12
    if (period === 'AM' && hours === 12) hours = 0
    const result = new Date(date)
    result.setHours(hours, minutes, 0, 0)
    return result
  }

  const match24 = trimmed.match(/^(\d{1,2}):(\d{2})$/)
  if (match24) {
    const result = new Date(date)
    result.setHours(parseInt(match24[1], 10), parseInt(match24[2], 10), 0, 0)
    return result
  }

  return date
}

function parseNotificationDateTime(notification) {
  const date = parseNotificationDate(notification.date)
  if (!date) return null
  return parseNotificationTime(date, notification.time)
}

function getNotificationTimestamp(notification) {
  const dateTime = parseNotificationDateTime(notification)
  return dateTime ? dateTime.getTime() : 0
}

const ACTIVITY_BY_STATUS = {
  SENT: { action: 'Notification Sent', type: 'success' },
  FAILED: { action: 'Notification Failed', type: 'error' },
  PENDING: { action: 'Notification Scheduled', type: 'info' },
}

function buildRecentActivity(notificationList) {
  return [...notificationList]
    .sort((a, b) => getNotificationTimestamp(b) - getNotificationTimestamp(a))
    .slice(0, 5)
    .map((n) => {
      const status = normalizeStatus(n.status)
      const mapping = ACTIVITY_BY_STATUS[status] || ACTIVITY_BY_STATUS.PENDING

      return {
        id: n.notificationId,
        action: mapping.action,
        target: n.title || 'Untitled',
        time: formatActivityTime(n),
        type: mapping.type,
      }
    })
}

async function fetchNotifications() {
  const email = localStorage.getItem('userEmail')

  const response = await api.get('/notifications', {
    params: {
      ownerEmail: email,
    },
  })

  return response.data
}

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

    const notificationList = response.data

    const total = notificationList.length

    const scheduled = notificationList.filter(
      (n) => normalizeStatus(n.status) === 'PENDING'
    ).length

    const sent = notificationList.filter(
      (n) => normalizeStatus(n.status) === 'SENT'
    ).length

    const failed = notificationList.filter(
      (n) => normalizeStatus(n.status) === 'FAILED'
    ).length

    return {
      total,
      scheduled,
      sent,
      failed,
      weeklyActivity: buildWeeklyActivity(notificationList),
      channelDistribution: buildChannelDistribution(notificationList),
    }
  },

  async getRecentActivity() {
    const notificationList = await fetchNotifications()
    return buildRecentActivity(notificationList)
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
    console.log("PAYLOAD SENT:", payload)
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
