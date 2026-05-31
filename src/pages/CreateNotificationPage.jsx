import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Send, Mail, Layers } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input, Textarea, Select } from '@/components/ui/Input'
import { Toggle } from '@/components/ui/Toggle'
import { Modal } from '@/components/ui/Modal'
import { CHANNELS, RECURRENCE_OPTIONS } from '@/constants/config'
import { useNotifications } from '@/hooks/useNotifications'
import { ROUTES } from '@/constants/routes'
import { cn } from '@/utils/cn'
import { formatTime12Hour } from '@/utils/time'

const channelIcons = { telegram: Send, gmail: Mail, both: Layers }

const initialForm = {
  title: '',
  message: '',
  email: '',
  date: '',
  time: '',
  channel: 'gmail',
  recurring: false,
  recurrence: 'daily',
}

export function CreateNotificationPage() {
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [successOpen, setSuccessOpen] = useState(false)
  const { createNotification } = useNotifications()
  const navigate = useNavigate()

  const update = (field) => (e) => {
    const value = e.target ? e.target.value : e
    setForm((f) => ({ ...f, [field]: value }))
  }

  const validate = () => {
    const e = {}
    if (!form.title.trim()) e.title = 'Title is required'
    if (!form.message.trim()) e.message = 'Message is required'
    if (!form.date) e.date = 'Date is required'
    if (!form.time) e.time = 'Time is required'
    if (!form.email.trim()) e.email = 'Email is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      await createNotification({
        ...form,
        time: formatTime12Hour(form.time),
      })
      setSuccessOpen(true)
    } catch (err) {
      setErrors({ form: err.message })
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setForm(initialForm)
    setErrors({})
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold">Create Notification</h1>
        <p className="text-slate-500 text-sm mt-1">Schedule a reminder via Telegram, Gmail, or both.</p>
      </div>

      <form onSubmit={handleSubmit} className="glass-card p-6 md:p-8 space-y-6">
        {errors.form && (
          <p className="text-sm text-red-500" role="alert">{errors.form}</p>
        )}

        <Input
          label="Notification Title"
          name="title"
          value={form.title}
          onChange={update('title')}
          error={errors.title}
          placeholder="Weekly team standup reminder"
        />

        <Textarea
          label="Message"
          name="message"
          value={form.message}
          onChange={update('message')}
          error={errors.message}
          placeholder="Enter the notification message..."
        />

        <Input
          label="Recipient Email"
          name="email"
          type="email"
          value={form.email}
          onChange={update('email')}
          error={errors.email}
          placeholder="user@gmail.com"
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Date"
            name="date"
            type="date"
            value={form.date}
            onChange={update('date')}
            error={errors.date}
          />
          <Input
            label="Time (12-hour)"
            name="time"
            type="time"
            value={form.time}
            onChange={update('time')}
            error={errors.time}
            hint="Uses your local timezone"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
            Channel
          </label>
          <div className="grid grid-cols-3 gap-3">
            {CHANNELS.map((ch) => {
              const Icon = channelIcons[ch.value]
              return (
                <button
                  key={ch.value}
                  type="button"
                  onClick={() => update('channel')(ch.value)}
                  className={cn(
                    'flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all',
                    form.channel === ch.value
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-500/10'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  )}
                >
                  <Icon className={cn('h-6 w-6', form.channel === ch.value ? 'text-primary-600' : 'text-slate-400')} />
                  <span className="text-sm font-medium">{ch.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-4">
          <Toggle
            label="Recurring Notification"
            description="Repeat this notification on a schedule"
            checked={form.recurring}
            onChange={(v) => update('recurring')(v)}
          />
          {form.recurring && (
            <Select
              label="Recurrence"
              name="recurrence"
              value={form.recurrence}
              onChange={update('recurrence')}
              options={RECURRENCE_OPTIONS}
            />
          )}
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <Button type="submit" loading={loading} className="flex-1 sm:flex-none">
            Schedule Notification
          </Button>
          <Button type="button" variant="secondary" onClick={handleReset}>
            Reset Form
          </Button>
        </div>
      </form>

      <Modal
        isOpen={successOpen}
        onClose={() => {
          setSuccessOpen(false)
          navigate(ROUTES.HISTORY)
        }}
        title="Notification Scheduled!"
        variant="success"
        confirmLabel="View History"
        onConfirm={() => {
          setSuccessOpen(false)
          navigate(ROUTES.HISTORY)
        }}
      >
        Your notification has been scheduled successfully.
      </Modal>
    </div>
  )
}
