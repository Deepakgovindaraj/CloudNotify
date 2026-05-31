import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { authService } from '@/services/authService'

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
        .then(setUser)
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
setUser(u)
    return u
  }, [])

  const register = useCallback(async (data) => {
    const { user: u, token } = await authService.register(data)
    localStorage.setItem(TOKEN_KEY, token)
localStorage.setItem('userEmail', u.email)
setUser(u)
    return u
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem('userEmail')
    setUser(null)
}, [])

  const updateUser = useCallback((updates) => {
    setUser((prev) => (prev ? { ...prev, ...updates } : prev))
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        updateUser,
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
