import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Globe, Code2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ROUTES } from '@/constants/routes'

const TABS = { login: 'login', register: 'register' }

export function AuthPage() {
  const [tab, setTab] = useState(TABS.login)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const { login, register } = useAuth()
  const navigate = useNavigate()

  const validate = () => {
    const e = {}
    if (!form.email) e.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email'
    if (!form.password) e.password = 'Password is required'
    else if (tab === TABS.register && form.password.length < 8) {
      e.password = 'Password must be at least 8 characters'
    }
    if (tab === TABS.register && !form.name) e.name = 'Name is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    setErrors({})
    try {
      if (tab === TABS.login) {
        await login({ email: form.email, password: form.password })
      } else {
        await register(form)
      }
      navigate(ROUTES.DASHBOARD)
    } catch (err) {
      setErrors({ form: err.message })
    } finally {
      setLoading(false)
    }
  }

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  return (
    <div className="glass-card p-8 shadow-xl">
      <div className="text-center mb-8">
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
          {tab === TABS.login ? 'Welcome back' : 'Create your account'}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          {tab === TABS.login
            ? 'Sign in to manage your notifications'
            : 'Start scheduling multi-channel reminders'}
        </p>
      </div>

      <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 mb-6">
        {Object.entries(TABS).map(([key, value]) => (
          <button
            key={key}
            type="button"
            onClick={() => { setTab(value); setErrors({}) }}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${
              tab === value
                ? 'bg-white dark:bg-slate-700 shadow text-primary-600 dark:text-primary-400'
                : 'text-slate-500'
            }`}
          >
            {key === 'login' ? 'Login' : 'Register'}
          </button>
        ))}
      </div>

      {errors.form && (
        <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-600" role="alert">
          {errors.form}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {tab === TABS.register && (
          <Input
            label="Full Name"
            name="name"
            value={form.name}
            onChange={update('name')}
            error={errors.name}
            placeholder="Alex Morgan"
            autoComplete="name"
          />
        )}
        <Input
          label="Email"
          name="email"
          type="email"
          value={form.email}
          onChange={update('email')}
          error={errors.email}
          placeholder="you@example.com"
          autoComplete="email"
        />
        <div className="relative">
          <Input
            label="Password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            value={form.password}
            onChange={update('password')}
            error={errors.password}
            placeholder="••••••••"
            autoComplete={tab === TABS.login ? 'current-password' : 'new-password'}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-[38px] text-slate-400 hover:text-slate-600"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        {tab === TABS.login && (
          <div className="text-right">
            <button type="button" className="text-sm text-primary-600 hover:underline">
              Forgot password?
            </button>
          </div>
        )}

        <Button type="submit" className="w-full" size="lg" loading={loading}>
          {tab === TABS.login ? 'Sign In' : 'Create Account'}
        </Button>
      </form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200 dark:border-slate-700" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-white dark:bg-slate-900 px-2 text-slate-500">Or continue with</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button variant="secondary" type="button" icon={Globe} className="w-full">
          Google
        </Button>
        <Button variant="secondary" type="button" icon={Code2} className="w-full">
          GitHub
        </Button>
      </div>
    </div>
  )
}
