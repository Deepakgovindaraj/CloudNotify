import { useEffect, useState } from 'react'
import { GoogleLogin } from '@react-oauth/google'
import { useNavigate } from 'react-router-dom'
import { Cloud, ExternalLink } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { ROUTES } from '@/constants/routes'
import { APP_NAME } from '@/constants/config'
import {
  initializeTelegramWebApp,
  isTelegramMiniApp,
  openExternalAuthentication,
} from '@/services/telegramService'

export function AuthPage() {
  const [authError, setAuthError] = useState('')
  const [telegramAuth, setTelegramAuth] = useState(null)
  const [openingBrowser, setOpeningBrowser] = useState(false)
  const [browserOpened, setBrowserOpened] = useState(false)
  const { googleLogin } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const active = initializeTelegramWebApp() || isTelegramMiniApp()
      setTelegramAuth(active)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  const handleOpenExternalAuthentication = () => {
    setAuthError('')
    setOpeningBrowser(true)
    try {
      openExternalAuthentication()
      setBrowserOpened(true)
    } catch (err) {
      console.error('Unable to open external authentication', err)
      setAuthError('Could not open the external browser. Please try again.')
    } finally {
      setOpeningBrowser(false)
    }
  }

  const handleGoogleSuccess = async (credentialResponse) => {
    setAuthError('')
    try {
      await googleLogin(credentialResponse.credential)

      navigate(ROUTES.DASHBOARD)
    } catch (err) {
      console.error('Google Login Error', err)
      setAuthError(
        err.response?.data?.error || 'Google sign-in failed. Please try again.'
      )
    }
  }

  const handleGoogleError = () => {
    setAuthError('Google sign-in failed. Please try again.')
  }

  return (
    <div className="glass-card p-8 md:p-10 shadow-xl">
      <div className="flex flex-col items-center text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-600 to-accent-500 text-white shadow-lg shadow-primary-500/30">
          <Cloud className="h-11 w-11" />
        </div>

        <h1 className="font-display text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
          Welcome to {APP_NAME}
        </h1>
        <p className="mt-3 max-w-sm text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
          Sign in with your Google account to schedule and manage notifications
        </p>
      </div>

      {authError && (
        <div
          className="mt-6 rounded-lg bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-600 text-center"
          role="alert"
        >
          {authError}
        </div>
      )}

      {telegramAuth === null ? (
        <div className="mt-10 mb-6 flex justify-center" role="status" aria-label="Loading authentication">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
        </div>
      ) : telegramAuth ? (
        <div className="mt-10 mb-6 space-y-4">
          <div className="rounded-xl bg-sky-50 px-4 py-3 text-center text-sm text-sky-800 dark:bg-sky-500/10 dark:text-sky-200">
            Google sign-in is not supported inside Telegram&apos;s embedded browser.
            CloudNotify will open the secure browser sign-in instead.
          </div>
          <button
            type="button"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 px-6 py-3 text-base font-medium text-white shadow-lg shadow-primary-500/25 transition-all hover:from-primary-700 hover:to-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={handleOpenExternalAuthentication}
            disabled={openingBrowser}
          >
            {openingBrowser ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <ExternalLink className="h-4 w-4" />
            )}
            {openingBrowser ? 'Opening browser...' : 'Continue in external browser'}
          </button>
          {browserOpened && (
            <p className="text-center text-xs text-emerald-600 dark:text-emerald-400" role="status">
              Browser sign-in opened. Return to Telegram when you are finished.
            </p>
          )}
          <p className="text-center text-xs text-slate-400 dark:text-slate-500">
            If you cancel sign-in, return here and try again.
          </p>
        </div>
      ) : (
        <div className="mt-10 mb-6 flex w-full justify-center">
          <div className="flex justify-center [&>div]:flex [&>div]:justify-center">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              theme="outline"
              size="large"
              text="signin_with"
              shape="rectangular"
              width="320"
            />
          </div>
        </div>
      )}

      <p className="text-center text-xs text-slate-400 dark:text-slate-500">
        Secure authentication powered by Google
      </p>
    </div>
  )
}
