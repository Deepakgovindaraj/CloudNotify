import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Menu, Bell, Sun, Moon, LogOut, User, Settings, ChevronDown, Trash2 } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/utils/cn'
import { ROUTES } from '@/constants/routes'
import { useLanguage } from '@/context/LanguageContext'
import { useAppNotifications } from '@/context/NotificationContext'

export function Navbar({ onMenuClick }) {
  const { theme, toggleTheme } = useTheme()
  const { user, logout } = useAuth()
  const { t } = useLanguage()
  const { items, unreadCount, markAllRead, removeNotification, restoreNotification, clearAll } = useAppNotifications()
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [deletingNotificationIds, setDeletingNotificationIds] = useState(() => new Set())
  const [undoNotification, setUndoNotification] = useState(null)
  const navigate = useNavigate()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)
  const notificationsRef = useRef(null)
  const undoTimerRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
      if (notificationsRef.current && !notificationsRef.current.contains(e.target)) {
        setNotificationsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => () => {
    if (undoTimerRef.current) window.clearTimeout(undoTimerRef.current)
  }, [])

  const handleLogout = () => {
    logout()
    navigate(ROUTES.AUTH)
  }

  const handleDeleteNotification = (id) => {
    const item = items.find((notification) => notification.id === id)
    if (!item) return
    setDeletingNotificationIds((current) => new Set(current).add(id))
    window.setTimeout(() => {
      removeNotification(id)
      setDeletingNotificationIds((current) => {
        const next = new Set(current)
        next.delete(id)
        return next
      })
      setUndoNotification(item)
      if (undoTimerRef.current) window.clearTimeout(undoTimerRef.current)
      undoTimerRef.current = window.setTimeout(() => setUndoNotification(null), 4000)
    }, 420)
  }

  const handleUndoNotification = () => {
    if (!undoNotification) return
    restoreNotification(undoNotification)
    setUndoNotification(null)
    if (undoTimerRef.current) window.clearTimeout(undoTimerRef.current)
  }

  const initials = user?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'CN'

  const [pictureError, setPictureError] = useState(false)

  useEffect(() => {
    setPictureError(false)
  }, [user?.picture])

  return (
    <header className="sticky top-0 z-30 h-16 glass border-b border-slate-200/50 dark:border-slate-800/50">
      <div className="flex h-full items-center justify-between px-4 lg:px-6">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="hidden lg:block" />

        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>

          <div className="relative" ref={notificationsRef}>
            <button
              onClick={() => {
                setNotificationsOpen((open) => !open)
                markAllRead()
              }}
              className="relative p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Notifications"
              aria-expanded={notificationsOpen}
              aria-haspopup="true"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 rounded-full bg-primary-500 px-1 text-[10px] leading-4 text-white ring-2 ring-white dark:ring-slate-900">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            {notificationsOpen && (
              <div className="absolute right-0 top-12 z-50 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="font-semibold">{t('Notifications')}</p>
                  <div className="flex items-center gap-3">
                    <button className="text-xs text-primary-600" onClick={markAllRead}>{t('Mark read')}</button>
                    {items.length > 0 && (
                      <button className="text-xs text-red-600 hover:text-red-700" onClick={clearAll}>
                        {t('Clear all')}
                      </button>
                    )}
                  </div>
                </div>
                {items.length ? (
                  <div className="space-y-2">
                    {items.slice(0, 6).map((item) => (
                      <div
                        key={item.id}
                        className={cn(
                          'flex items-start gap-2 rounded-xl border border-violet-300/60 bg-gradient-to-br from-violet-100 via-indigo-100 to-purple-100 px-3 py-3 shadow-sm shadow-violet-200/50 dark:border-violet-800/70 dark:from-violet-950/80 dark:via-indigo-950/80 dark:to-purple-950/80 dark:shadow-black/20',
                          deletingNotificationIds.has(item.id) && 'animate-notification-remove'
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{item.title}</p>
                          <p className="text-xs text-slate-500">{item.message}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteNotification(item.id)}
                          className="notification-delete-button shrink-0 rounded-md p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                          aria-label={t('Delete notification')}
                          title={t('Delete notification')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : <p className="py-4 text-center text-sm text-slate-500">{t('No notifications')}</p>}
                {undoNotification && (
                  <div className="mt-2 flex items-center justify-between gap-3 rounded-xl bg-violet-100 px-3 py-2 text-xs text-violet-900 dark:bg-violet-900/50 dark:text-violet-100">
                    <span>{t('Notification deleted')}</span>
                    <button
                      type="button"
                      onClick={handleUndoNotification}
                      className="font-semibold text-violet-700 underline underline-offset-2 hover:text-violet-900 dark:text-violet-200 dark:hover:text-white"
                    >
                      {t('Undo')}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 rounded-xl p-1.5 pr-3 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-expanded={dropdownOpen}
              aria-haspopup="true"
            >
              {user?.picture && !pictureError ? (
               <img
               src={user.picture}
               alt={user.name}
               referrerPolicy="no-referrer"
               className="h-10 w-10 rounded-full object-cover border border-slate-200"
               onError={() => {
                 console.log('IMAGE FAILED')
                 setPictureError(true)
               }}
             />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 text-xs font-bold text-white">
                  {initials}
                </div>
              )}
              <span className="hidden sm:block text-sm font-medium max-w-[120px] truncate">
                {user?.name}
              </span>
              <ChevronDown className={cn('h-4 w-4 text-slate-400 transition-transform', dropdownOpen && 'rotate-180')} />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl border border-violet-300/60 bg-gradient-to-br from-violet-100 via-indigo-100 to-purple-100 py-2 shadow-xl shadow-violet-200/50 animate-scale-in dark:border-violet-800/70 dark:from-violet-950/80 dark:via-indigo-950/80 dark:to-purple-950/80 dark:shadow-black/20">
                <div className="px-4 py-2 border-b border-violet-200/70 dark:border-violet-800/60">
                  <p className="text-sm font-medium truncate">{user?.name}</p>
                  <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                </div>
                <Link
                  to={ROUTES.PROFILE}
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <User className="h-4 w-4" /> {t('Profile')}
                </Link>
                <Link
                  to={ROUTES.SETTINGS}
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <Settings className="h-4 w-4" /> {t('Settings')}
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
                >
                  <LogOut className="h-4 w-4" /> {t('Log out')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
