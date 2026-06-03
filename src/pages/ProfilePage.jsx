import { useState } from 'react'
import { Mail, Send, CheckCircle, XCircle, Lock } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { authService } from '@/services/authService'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Toggle } from '@/components/ui/Toggle'
import { Modal } from '@/components/ui/Modal'
import { cn } from '@/utils/cn'
import { telegramService } from '@/services/telegramService'

function ConnectionCard({
  title,
  connected,
  icon: Icon,
  color,
  onClick
})  {
  return (
    <div className="glass-card p-5 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className={cn('flex h-12 w-12 items-center justify-center rounded-xl', color)}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        <div>
          <p className="font-medium">{title}</p>
          <p className="text-sm text-slate-500">
            {connected ? 'Connected and ready' : 'Not connected'}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {connected ? (
          <CheckCircle className="h-5 w-5 text-emerald-500" />
        ) : (
          <XCircle className="h-5 w-5 text-slate-400" />
        )}
        <Button
  variant={connected ? 'secondary' : 'primary'}
  size="sm"
  onClick={onClick}
>
  {connected ? 'Disconnect' : 'Connect'}
</Button>
      </div>
    </div>
  )
}

export function ProfilePage() {
  const { user, updateUser } = useAuth()
  const [pictureError, setPictureError] = useState(false)
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' })
  const [prefs, setPrefs] = useState(user?.preferences || {})
  const [loading, setLoading] = useState(false)
  const [successOpen, setSuccessOpen] = useState(false)
  const [errors, setErrors] = useState({})
  const connectTelegram = async () => {
    try {
      const telegramUrl =
        `https://t.me/CloudNotifyApps_bot?start=${encodeURIComponent(user.email)}`
  
      window.open(telegramUrl, "_blank")
  
      alert(
        "Open Telegram and click START in the bot to complete connection."
      )
    } catch (error) {
      console.error(error)
      alert("Failed to connect Telegram")
    }
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    const e2 = {}
    if (passwordForm.new !== passwordForm.confirm) e2.confirm = 'Passwords do not match'
    if (Object.keys(e2).length) {
      setErrors(e2)
      return
    }
    setLoading(true)
    try {
      await authService.changePassword({
        currentPassword: passwordForm.current,
        newPassword: passwordForm.new,
      })
      setPasswordForm({ current: '', new: '', confirm: '' })
      setSuccessOpen(true)
    } catch (err) {
      setErrors({ form: err.message })
    } finally {
      setLoading(false)
    }
  }

  const updatePref = (key) => (val) => {
    const next = { ...prefs, [key]: val }
    setPrefs(next)
    updateUser({ preferences: next })
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-2xl font-bold">Profile</h1>
        <p className="text-slate-500 text-sm mt-1">Manage your account and channel connections.</p>
      </div>

      <div className="glass-card p-6">
        <div className="flex items-center gap-4">
        {user?.picture && !pictureError? (
 <img
 src={user.picture}
 alt={user.name}
 referrerPolicy="no-referrer"
 className="h-16 w-16 rounded-2xl object-cover"
 onError={() => setPictureError(true)}
/>
) : (
  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 text-2xl font-bold text-white">
    {user?.name?.split(' ').map((n) => n[0]).join('').slice(0, 2)}
  </div>
)}  
          <div>
            <h2 className="font-display text-xl font-semibold">{user?.name}</h2>
            <p className="text-slate-500">{user?.email}</p>
            <p className="text-xs text-slate-400 mt-1">Member since 2026</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-display font-semibold">Channel Connections</h3>
        <ConnectionCard
          title="Gmail"
          connected={user?.gmailConnected}
          icon={Mail}
          color="bg-gradient-to-br from-rose-500 to-rose-600"
        />
        <ConnectionCard
  title="Telegram"
  connected={user?.telegramConnected}
  icon={Send}
  color="bg-gradient-to-br from-sky-500 to-sky-600"
  onClick={connectTelegram}
/>
      </div>

      <div className="glass-card p-6">
        <h3 className="font-display font-semibold mb-4 flex items-center gap-2">
          <Lock className="h-5 w-5" /> Change Password
        </h3>
        {errors.form && <p className="text-sm text-red-500 mb-4">{errors.form}</p>}
        <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
          <Input
            label="Current Password"
            type="password"
            value={passwordForm.current}
            onChange={(e) => setPasswordForm((f) => ({ ...f, current: e.target.value }))}
          />
          <Input
            label="New Password"
            type="password"
            value={passwordForm.new}
            onChange={(e) => setPasswordForm((f) => ({ ...f, new: e.target.value }))}
          />
          <Input
            label="Confirm New Password"
            type="password"
            value={passwordForm.confirm}
            onChange={(e) => setPasswordForm((f) => ({ ...f, confirm: e.target.value }))}
            error={errors.confirm}
          />
          <Button type="submit" loading={loading}>Update Password</Button>
        </form>
      </div>

      <div className="glass-card p-6 space-y-4">
        <h3 className="font-display font-semibold">Notification Preferences</h3>
        <Toggle
          label="Email Digest"
          description="Receive a daily summary of notification activity"
          checked={prefs.emailDigest}
          onChange={updatePref('emailDigest')}
        />
        <Toggle
          label="Push Alerts"
          description="Get instant alerts for failed notifications"
          checked={prefs.pushAlerts}
          onChange={updatePref('pushAlerts')}
        />
        <Toggle
          label="Product Updates"
          description="News and feature announcements"
          checked={prefs.marketing}
          onChange={updatePref('marketing')}
        />
      </div>

      <Modal
        isOpen={successOpen}
        onClose={() => setSuccessOpen(false)}
        title="Password Updated"
        variant="success"
        confirmLabel="Done"
        onConfirm={() => setSuccessOpen(false)}
      >
        Your password has been changed successfully.
      </Modal>
    </div>
  )
}
