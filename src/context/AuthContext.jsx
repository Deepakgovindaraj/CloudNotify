import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { authService } from '@/services/authService'
import { channelService } from '@/services/channelService'

const AuthContext = createContext(null)
const TOKEN_KEY = 'cloudnotify_token'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

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
              telegramConnected: status.telegramConnected
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
  
    return u
  }, [])


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
    return u
  }, [])

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
  
    const status = await channelService.getStatus(
      googleUser.email
    )
    
    setUser({
      ...googleUser,
      gmailConnected: true,
      telegramConnected: status.telegramConnected
    })
  
    return googleUser
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem('userEmail')
    localStorage.removeItem('currentUser')
    setUser(null)
  }, [])

  const updateUser = useCallback((updates) => {
    setUser((prev) => (prev ? { ...prev, ...updates } : prev))
  }, [])
  const refreshTelegramStatus = useCallback(async () => {
    if (!user?.email) return
  
    try {
      const status = await channelService.getStatus(user.email)
  
      setUser((prev) => ({
        ...prev,
        telegramConnected: status.telegramConnected
      }))
    } catch (err) {
      console.error('Failed to load Telegram status', err)
    }
  }, [user])
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
