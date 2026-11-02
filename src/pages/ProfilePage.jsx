import { useCallback, useEffect, useState } from 'react'
import {
  Send,
  CheckCircle,
  XCircle,
  Lock,
  Mail
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { authService } from '@/services/authService'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Toggle } from '@/components/ui/Toggle'
import { Modal } from '@/components/ui/Modal'
import { cn } from '@/utils/cn'
import { telegramService } from '@/services/telegramService'
import { gmailService } from '@/services/gmailService'
import { useLanguage } from '@/context/LanguageContext'

function ConnectionCard({
  title,
  connected,
  icon: Icon,
  color,
  onClick,
  t
}) {
  return (
    <div className="glass-card p-5 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className={cn('flex h-12 w-12 items-center justify-center rounded-xl', color)}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        <div>
          <p className="font-medium">{title}</p>
          <p className="text-sm text-slate-500">
            {connected ? t('Connected and ready') : t('Not connected')}
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
          {connected ? t('Disconnect') : t('Connect')}
        </Button>
      </div>
    </div>
  )
}

export function ProfilePage() {
  const {
    user,
    updateUser,
    refreshTelegramStatus
  } = useAuth()
  const { t } = useLanguage()
  const [pictureError, setPictureError] = useState(false)
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' })
  const [prefs, setPrefs] = useState(user?.preferences || {})
  const [loading, setLoading] = useState(false)
  const [successOpen, setSuccessOpen] = useState(false)
  const [errors, setErrors] = useState({})
  const [gmailStatus, setGmailStatus] = useState(null)
  const [gmailBusy, setGmailBusy] = useState(false)
  const [gmailError, setGmailError] = useState('')
  const [gmailNotice, setGmailNotice] = useState('')
  const refreshGmailStatus = useCallback(async () => {
    try {
      const status = await gmailService.getConnection()
      setGmailStatus(status)
      setGmailError('')
      return status
    } catch (error) {
      setGmailError(error.response?.data?.error || 'Failed to load Gmail connection status.')
      return null
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      refreshGmailStatus()
      const params = new URLSearchParams(window.location.search)
      if (params.get('gmail') === 'connected') {
        setGmailNotice('Gmail mailbox connected. Choose Sync now to import interview invitations.')
        window.history.replaceState({}, '', window.location.pathname)
      } else if (params.get('gmail') === 'error') {
        setGmailError(params.get('reason') === 'authorization_denied'
          ? 'Gmail authorization was cancelled.'
          : 'Gmail could not be connected. Check the OAuth configuration and try again.')
        window.history.replaceState({}, '', window.location.pathname)
      }
    }, 0)
    return () => window.clearTimeout(timer)
  }, [refreshGmailStatus])

  const connectGmail = async () => {
    setGmailBusy(true)
    setGmailError('')
    try {
      const { authorizationUrl } = await gmailService.startConnection()
      const target = new URL(authorizationUrl)
      if (target.origin !== 'https://accounts.google.com') {
        throw new Error('Google returned an unexpected authorization address.')
      }
      window.location.assign(target.toString())
    } catch (error) {
      setGmailError(error.response?.data?.error || error.message || 'Could not start Gmail authorization.')
      setGmailBusy(false)
    }
  }

  const disconnectGmail = async () => {
    setGmailBusy(true)
    setGmailError('')
    try {
      await gmailService.disconnect()
      setGmailNotice('Gmail mailbox disconnected.')
      await refreshGmailStatus()
    } catch (error) {
      setGmailError(error.response?.data?.error || 'Could not disconnect Gmail.')
      await refreshGmailStatus()
    } finally {
      setGmailBusy(false)
    }
  }

  const syncGmail = async () => {
    setGmailBusy(true)
    setGmailError('')
    setGmailNotice('')
    try {
      let result
      let messagesProcessed = 0
      let eventsCreated = 0
      for (let page = 0; page < 5; page += 1) {
        result = await gmailService.sync()
        messagesProcessed += result.messagesProcessed
        eventsCreated += result.eventsCreated
        if (result.complete) break
      }
      if (result?.complete) {
        setGmailNotice(`Sync complete. Checked ${messagesProcessed} messages and found ${eventsCreated} interview invitation${eventsCreated === 1 ? '' : 's'}.`)
      } else {
        setGmailNotice(`Sync is continuing. Checked ${messagesProcessed} messages; choose Sync now again to continue.`)
      }
      await refreshGmailStatus()
    } catch (error) {
      setGmailError(error.response?.data?.error || 'Gmail synchronization failed.')
      await refreshGmailStatus()
    } finally {
      setGmailBusy(false)
    }
  }

  const connectTelegram = async () => {
    try {
      const { code } = await telegramService.createLinkCode(user.email)
      const telegramUrl =
        `https://t.me/CloudNotifyApps_bot?start=${encodeURIComponent(code)}`
  
      window.open(telegramUrl, "_blank")
  
      alert(
        "Open Telegram and click START in the bot to complete connection."
      )
  
      window.setTimeout(() => refreshTelegramStatus(), 5000)
  
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
          {user?.picture && !pictureError ? (
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
       <h3 className="font-display font-semibold">Integrations</h3>
       <div className="glass-card space-y-4 p-5">
         <div className="flex items-start justify-between gap-4">
           <div className="flex items-start gap-3">
             <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-rose-600">
               <Mail className="h-5 w-5 text-white" />
             </div>
             <div>
               <p className="font-medium">Gmail mailbox (read-only)</p>
               <p className="text-sm text-slate-500">
                 {gmailStatus?.connected
                   ? `Connected as ${gmailStatus.email}`
                   : gmailStatus?.status === 'REAUTH_REQUIRED'
                     ? 'Authorization expired or revoked. Reconnect to continue syncing.'
                     : 'Not connected. Google sign-in does not grant inbox access.'}
               </p>
               {gmailStatus?.lastSuccessfulSyncAt && (
                 <p className="mt-1 text-xs text-slate-500">
                   Last successful sync: {new Date(gmailStatus.lastSuccessfulSyncAt).toLocaleString()}
                 </p>
               )}
               {gmailStatus?.syncStatus === 'SYNCING' && (
                 <p className="mt-1 text-xs text-sky-600">Synchronization is in progress.</p>
               )}
               {gmailStatus?.error && (
                 <p className="mt-1 text-xs text-amber-600">
                   Sync status: {gmailStatus.error}
                 </p>
               )}
             </div>
           </div>
           <span className={gmailStatus?.connected ? 'text-emerald-500' : 'text-slate-400'} aria-label={gmailStatus?.connected ? 'Connected' : 'Not connected'}>
             {gmailStatus?.connected ? <CheckCircle className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
           </span>
         </div>
         {gmailError && <p className="text-sm text-red-500" role="alert">{gmailError}</p>}
         {gmailNotice && <p className="text-sm text-emerald-600 dark:text-emerald-400" role="status">{gmailNotice}</p>}
         <div className="flex flex-wrap gap-2">
           <Button size="sm" loading={gmailBusy} onClick={connectGmail}>
             {gmailStatus?.status === 'REAUTH_REQUIRED' ? 'Reconnect Gmail' : 'Connect Gmail'}
           </Button>
           {gmailStatus?.connected && (
             <Button variant="secondary" size="sm" loading={gmailBusy} onClick={syncGmail}>
               Sync now
             </Button>
           )}
           {gmailStatus && gmailStatus.status !== 'DISCONNECTED' && (
             <Button variant="ghost" size="sm" disabled={gmailBusy} onClick={disconnectGmail}>
               Disconnect
             </Button>
           )}
         </div>
       </div>
       <ConnectionCard
         title="Telegram"
          connected={user?.telegramConnected}
          icon={Send}
          color="bg-gradient-to-br from-sky-500 to-sky-600"
          onClick={connectTelegram}
          t={t}
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
