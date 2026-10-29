import { useState } from 'react'
import { Sun, Moon } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { useAuth } from '@/context/AuthContext'
import { Select } from '@/components/ui/Input'
import { Toggle } from '@/components/ui/Toggle'
import { TIMEZONES, LANGUAGES } from '@/constants/config'
import { cn } from '@/utils/cn'
import { useLanguage } from '@/context/LanguageContext'

export function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const { user, updateUser } = useAuth()
  const { language, setLanguage, t } = useLanguage()
  const [timezone, setTimezone] = useState(user?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC')

  const themeOptions = [
    { value: 'light', label: t('Light'), icon: Sun },
    { value: 'dark', label: t('Dark'), icon: Moon },
  ]

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-2xl font-bold">{t('Settings')}</h1>
        <p className="text-slate-500 text-sm mt-1">{t('Customize your CloudNotify experience.')}</p>
      </div>

      <section className="glass-card p-6 space-y-4">
        <h2 className="font-display font-semibold">{t('Appearance')}</h2>
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
        <h2 className="font-display font-semibold">{t('Regional')}</h2>
        <Select
          label={t('Time Zone')}
          value={timezone}
          onChange={(e) => {
            setTimezone(e.target.value)
            updateUser({ timezone: e.target.value })
          }}
          options={TIMEZONES.map((tz) => ({ value: tz, label: tz }))}
        />
        <Select
          label={t('Language')}
          value={language}
          onChange={(e) => {
            setLanguage(e.target.value)
            updateUser({ language: e.target.value })
          }}
          options={LANGUAGES}
        />
      </section>

      <section className="glass-card p-6 space-y-4">
        <h2 className="font-display font-semibold">{t('Account')}</h2>
        <Toggle
          label={t('Two-Factor Authentication')}
          description="Add an extra layer of security to your account"
          checked={false}
          onChange={() => {}}
        />
        <Toggle
          label={t('Session Notifications')}
          description="Alert when a new device signs in"
          checked={true}
          onChange={() => {}}
        />
        <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
          <button className="text-sm text-red-600 hover:underline">{t('Delete Account')}</button>
        </div>
      </section>
    </div>
  )
}
