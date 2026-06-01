import { useState } from 'react'
import { GoogleLogin } from '@react-oauth/google'
import { jwtDecode } from 'jwt-decode'
import { useNavigate } from 'react-router-dom'
import { Cloud } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { ROUTES } from '@/constants/routes'
import { APP_NAME } from '@/constants/config'

export function AuthPage() {
  const [authError, setAuthError] = useState('')
  const { googleLogin } = useAuth()
  const navigate = useNavigate()

  const handleGoogleSuccess = async (credentialResponse) => {
    setAuthError('')
    try {
      const decoded = jwtDecode(credentialResponse.credential)

      const googleUser = {
        name: decoded.name,
        email: decoded.email,
        picture: decoded.picture,
      }

      googleLogin(googleUser)

      navigate(ROUTES.DASHBOARD)
    } catch (err) {
      console.error('Google Login Error', err)
      setAuthError('Google sign-in failed. Please try again.')
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

      <p className="text-center text-xs text-slate-400 dark:text-slate-500">
        Secure authentication powered by Google
      </p>
    </div>
  )
}
