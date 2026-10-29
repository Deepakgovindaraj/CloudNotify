import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { authService } from '@/services/authService'
import { channelService } from '@/services/channelService'
import { useAppNotifications } from '@/context/NotificationContext'
import { useLanguage } from '@/context/LanguageContext'

const AuthContext = createContext(null)
const TOKEN_KEY = 'cloudnotify_token'

function telegramIsActive(status) {
  return Boolean(status.telegramConnected && status.telegramNotificationsEnabled !== false)
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const { addNotification } = useAppNotifications()
  const { language, t } = useLanguage()

  const notify = useCallback((title, message) => {
    addNotification({ title, message, language })
  }, [addNotification, language])

  const welcomeIfFirstLogin = useCallback((email) => {
    const key = `cloudnotify_welcome_${email}`
    if (localStorage.getItem(key)) return
    localStorage.setItem(key, 'true')
    notify('Welcome to CloudNotify', 'Your account is ready. Schedule your first notification to get started.')
  }, [notify])

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (token) {
      authService
        .getProfile()
        .then(async (profile) => {
          try {
            const status = await channelService.getStatus(
              profile.email
            )
        
            setUser({
              ...profile,
              gmailConnected: true,
              telegramConnected: telegramIsActive(status)
            })
          } catch {
            setUser({
              ...profile,
              gmailConnected: true
            })
          }
        })
        .catch(() => localStorage.removeItem(TOKEN_KEY))
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = useCallback(async (credentials) => {
    const { user: u, token } = await authService.login(credentials)
  
    localStorage.setItem(TOKEN_KEY, token)
  
    localStorage.setItem('userEmail', u.email)
  
    localStorage.setItem(
      'currentUser',
      JSON.stringify(u)
    )
  
    setUser({
      ...u,
      gmailConnected: true
    })
    welcomeIfFirstLogin(u.email)
    notify('Gmail connected', 'Your Gmail channel is connected and ready.')
    return u
  }, [notify, welcomeIfFirstLogin])


  const register = useCallback(async (data) => {
    const { user: u, token } = await authService.register(data)
    localStorage.setItem(TOKEN_KEY, token)
localStorage.setItem('userEmail', u.email)
setUser({
  ...u,
  gmailConnected: true
})
localStorage.setItem(
  'currentUser',
  JSON.stringify(u)
)
welcomeIfFirstLogin(u.email)
notify('Gmail connected', 'Your Gmail channel is connected and ready.')
    return u
  }, [notify, welcomeIfFirstLogin])

  const googleLogin = useCallback(async (googleUser) => {
    localStorage.setItem(
      'currentUser',
      JSON.stringify(googleUser)
    )
  
    localStorage.setItem(
      'userEmail',
      googleUser.email
    )
  
    localStorage.setItem(
      TOKEN_KEY,
      'google_oauth_token'
    )

    setUser({
      ...googleUser,
      gmailConnected: true,
      telegramConnected: false
    })
    welcomeIfFirstLogin(googleUser.email)
    notify('Gmail connected', 'Your Gmail channel is connected and ready.')

    channelService
      .getStatus(googleUser.email)
      .then((status) => {
        setUser((currentUser) => (
          currentUser
            ? {
                ...currentUser,
                telegramConnected: telegramIsActive(status)
              }
            : currentUser
        ))
      })
      .catch((err) => {
        console.error('Failed to load Telegram status', err)
      })

    return googleUser
  }, [notify, welcomeIfFirstLogin])

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem('userEmail')
    localStorage.removeItem('currentUser')
    setUser(null)
  }, [])

  const updateUser = useCallback((updates) => {
    setUser((prev) => {
      if (!prev) return prev
      const next = { ...prev, ...updates }
      localStorage.setItem('currentUser', JSON.stringify(next))
      return next
    })
  }, [])
  const refreshTelegramStatus = useCallback(async () => {
    if (!user?.email) return
  
    try {
      const status = await channelService.getStatus(user.email)
  
      setUser((prev) => {
        const wasConnected = Boolean(prev?.telegramConnected)
        const isConnected = telegramIsActive(status)
        if (!wasConnected && isConnected) {
          notify('Telegram connected', 'Your Telegram channel is connected and ready.')
        } else if (wasConnected && !isConnected) {
          notify(t('Telegram disconnected'), t('Your Telegram channel has been disconnected.'))
        }
        return {
        ...prev,
          telegramConnected: isConnected
        }
      })
    } catch (err) {
      console.error('Failed to load Telegram status', err)
    }
  }, [user?.email, notify, t])

  useEffect(() => {
    if (!user?.email) return undefined
    const interval = window.setInterval(refreshTelegramStatus, 5000)
    return () => window.clearInterval(interval)
  }, [user?.email, refreshTelegramStatus])
  return (
    <AuthContext.Provider
    value={{
      user,
      loading,
      isAuthenticated: !!user,
      login,
      register,
      googleLogin,
      logout,
      updateUser,
      refreshTelegramStatus,
    }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
