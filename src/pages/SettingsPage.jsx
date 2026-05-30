import { useState } from 'react'
import { Sun, Moon } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { useAuth } from '@/context/AuthContext'
import { Select } from '@/components/ui/Input'
import { Toggle } from '@/components/ui/Toggle'
import { TIMEZONES, LANGUAGES } from '@/constants/config'
import { cn } from '@/utils/cn'

export function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const { user, updateUser } = useAuth()
  const [timezone, setTimezone] = useState(user?.timezone || 'UTC')
  const [language, setLanguage] = useState(user?.language || 'en')

  const themeOptions = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
  ]

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-2xl font-bold">Settings</h1>
        <p className="text-slate-500 text-sm mt-1">Customize your CloudNotify experience.</p>
      </div>

      <section className="glass-card p-6 space-y-4">
        <h2 className="font-display font-semibold">Appearance</h2>
        <div className="grid grid-cols-2 gap-3">
          {themeOptions.map((opt) => {
            const Icon = opt.icon
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTheme(opt.value)}
                className={cn(
                  'flex items-center justify-center gap-2 rounded-xl border-2 p-4 transition-all',
                  theme === opt.value
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-500/10'
                    : 'border-slate-200 dark:border-slate-700'
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="font-medium">{opt.label}</span>
              </button>
            )
          })}
        </div>
      </section>

      <section className="glass-card p-6 space-y-4">
        <h2 className="font-display font-semibold">Regional</h2>
        <Select
          label="Time Zone"
          value={timezone}
          onChange={(e) => {
            setTimezone(e.target.value)
            updateUser({ timezone: e.target.value })
          }}
          options={TIMEZONES.map((tz) => ({ value: tz, label: tz }))}
        />
        <Select
          label="Language"
          value={language}
          onChange={(e) => {
            setLanguage(e.target.value)
            updateUser({ language: e.target.value })
          }}
          options={LANGUAGES}
        />
      </section>

      <section className="glass-card p-6 space-y-4">
        <h2 className="font-display font-semibold">Account</h2>
        <Toggle
          label="Two-Factor Authentication"
          description="Add an extra layer of security to your account"
          checked={false}
          onChange={() => {}}
        />
        <Toggle
          label="Session Notifications"
          description="Alert when a new device signs in"
          checked={true}
          onChange={() => {}}
        />
        <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
          <button className="text-sm text-red-600 hover:underline">Delete Account</button>
        </div>
      </section>
    </div>
  )
}
