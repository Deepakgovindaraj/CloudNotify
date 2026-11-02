import { createContext, useContext, useEffect, useState, useCallback } from 'react'

const ThemeContext = createContext(null)
const STORAGE_KEY = 'cloudnotify-theme'
const APPEARANCE_KEY = 'cloudnotify-appearance'

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    if (typeof window === 'undefined') return 'light'
    return localStorage.getItem(STORAGE_KEY) || 'light'
  })
  const [appearance, setAppearance] = useState(() => {
    if (typeof window === 'undefined') return 'enhance'
    const storedAppearance = localStorage.getItem(APPEARANCE_KEY)
    return ['normal', 'enhance', 'night'].includes(storedAppearance)
      ? storedAppearance
      : 'enhance'
  })

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark' || appearance === 'night') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    localStorage.setItem(STORAGE_KEY, theme)
  }, [theme, appearance])

  useEffect(() => {
    localStorage.setItem(APPEARANCE_KEY, appearance)
  }, [appearance])

  const setTheme = useCallback((value) => {
    setThemeState(value)
  }, [])

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, isDark: theme === 'dark', appearance, setAppearance }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
