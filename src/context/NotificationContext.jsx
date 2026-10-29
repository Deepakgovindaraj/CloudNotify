import { createContext, useCallback, useContext, useMemo, useState } from 'react'

const NotificationContext = createContext(null)

function storageKey() {
  return `cloudnotify_app_notifications_${localStorage.getItem('userEmail') || 'guest'}`
}

export function NotificationProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(storageKey()) || '[]')
    } catch {
      return []
    }
  })

  const addNotification = useCallback((notification) => {
    setItems((current) => {
      const next = [{
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        read: false,
        ...notification,
      }, ...current].slice(0, 30)
      localStorage.setItem(storageKey(), JSON.stringify(next))
      return next
    })
  }, [])

  const markAllRead = useCallback(() => {
    setItems((current) => {
      const next = current.map((item) => ({ ...item, read: true }))
      localStorage.setItem(storageKey(), JSON.stringify(next))
      return next
    })
  }, [])

  const removeNotification = useCallback((id) => {
    setItems((current) => {
      const next = current.filter((item) => item.id !== id)
      localStorage.setItem(storageKey(), JSON.stringify(next))
      return next
    })
  }, [])

  const restoreNotification = useCallback((notification) => {
    setItems((current) => {
      if (current.some((item) => item.id === notification.id)) return current
      const next = [notification, ...current].slice(0, 30)
      localStorage.setItem(storageKey(), JSON.stringify(next))
      return next
    })
  }, [])

  const clearAll = useCallback(() => {
    localStorage.removeItem(storageKey())
    setItems([])
  }, [])

  const value = useMemo(() => ({
    items,
    unreadCount: items.filter((item) => !item.read).length,
    addNotification,
    markAllRead,
    removeNotification,
    restoreNotification,
    clearAll,
  }), [items, addNotification, markAllRead, removeNotification, restoreNotification, clearAll])

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
}

export function useAppNotifications() {
  const context = useContext(NotificationContext)
  if (!context) throw new Error('useAppNotifications must be used within NotificationProvider')
  return context
}
