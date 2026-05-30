import { useState, useEffect, useCallback } from 'react'
import { notificationService } from '@/services/notificationService'

export function useNotifications() {
  const [notifications, setNotifications] = useState([])
  const [stats, setStats] = useState(null)
  const [activity, setActivity] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [list, statsData, activityData] = await Promise.all([
        notificationService.getAll(),
        notificationService.getStats(),
        notificationService.getRecentActivity(),
      ])
      setNotifications(list)
      setStats(statsData)
      setActivity(activityData)
    } catch (err) {
      setError(err.isNetworkError ? 'network' : err.message || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const createNotification = useCallback(async (data) => {
    const created = await notificationService.create(data)
    setNotifications((prev) => [created, ...prev])
    if (stats) {
      setStats((s) => ({
        ...s,
        total: s.total + 1,
        scheduled: s.scheduled + 1,
      }))
    }
    return created
  }, [stats])

  const deleteNotification = useCallback(async (id) => {
    await notificationService.delete(id)
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  return {
    notifications,
    stats,
    activity,
    loading,
    error,
    refetch: fetchAll,
    createNotification,
    deleteNotification,
  }
}
