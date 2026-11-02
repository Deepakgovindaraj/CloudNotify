import { useCallback, useEffect, useState } from 'react'
import {
  CalendarCheck,
  CheckCircle,
  ExternalLink,
  Save,
  Trash2,
  XCircle,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { interviewEventService } from '@/services/gmailService'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { EmptyState } from '@/components/ui/EmptyState'

const CHANNEL_OPTIONS = [
  { value: 'GMAIL', label: 'Gmail' },
  { value: 'TELEGRAM', label: 'Telegram' },
  { value: 'BOTH', label: 'Gmail and Telegram' },
]

function messageFromError(error) {
  return error.response?.data?.error || error.message || 'The request could not be completed.'
}

function formForEvent(event, timezone) {
  return {
    companyName: event.companyName || '',
    jobRole: event.jobRole || '',
    interviewDate: event.interviewDate || '',
    interviewTime: event.interviewTime || '',
    timezone: event.timezone || timezone,
    location: event.location || '',
    meetingUrl: event.meetingUrl || '',
    interviewType: event.interviewType || 'unknown',
    channel: event.deliveryChannel || 'GMAIL',
  }
}

function statusLabel(status) {
  return {
    REVIEW: 'Needs review',
    CONFIRMED: 'Confirmed',
    REJECTED: 'Rejected',
  }[status] || status
}

export function InterviewEventsPage() {
  const { user } = useAuth()
  const timezone = user?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  const [events, setEvents] = useState([])
  const [forms, setForms] = useState({})
  const [loading, setLoading] = useState(true)
  const [busyEvent, setBusyEvent] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const loadEvents = useCallback(async () => {
    setError('')
    try {
      const result = await interviewEventService.getAll()
      setEvents(result)
      setForms(Object.fromEntries(result.map((event) => [
        event.eventId,
        formForEvent(event, timezone),
      ])))
    } catch (requestError) {
      setError(messageFromError(requestError))
    } finally {
      setLoading(false)
    }
  }, [timezone])

  useEffect(() => {
    const timer = window.setTimeout(() => loadEvents(), 0)
    return () => window.clearTimeout(timer)
  }, [loadEvents])

  const updateField = (eventId, field, value) => {
    setForms((current) => ({
      ...current,
      [eventId]: { ...current[eventId], [field]: value },
    }))
  }

  const runEventAction = async (event, action) => {
    const form = forms[event.eventId]
    setBusyEvent(event.eventId)
    setError('')
    setNotice('')
    try {
      if (action === 'save') {
        await interviewEventService.update(event.eventId, form)
        setNotice('Interview details saved.')
      } else if (action === 'confirm') {
        await interviewEventService.confirm(event.eventId, form)
        setNotice('Interview confirmed. Your reminders have been scheduled.')
      } else if (action === 'reject') {
        await interviewEventService.reject(event.eventId)
        setNotice('Interview invitation rejected.')
      } else if (action === 'delete') {
        await interviewEventService.delete(event.eventId)
        setNotice('Interview event deleted.')
      }
      await loadEvents()
    } catch (requestError) {
      setError(messageFromError(requestError))
    } finally {
      setBusyEvent(null)
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-slate-500" role="status">Loading interview events...</div>
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-2xl font-bold">Interview Events</h1>
        <p className="mt-1 text-sm text-slate-500">
          Review invitations found in Gmail. Reminders are created only after you confirm an event.
        </p>
      </div>

      {error && <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300" role="alert">{error}</p>}
      {notice && <p className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" role="status">{notice}</p>}

      {events.length === 0 ? (
        <div className="glass-card p-6">
          <EmptyState variant="notifications" />
          <p className="mt-3 text-center text-sm text-slate-500">
            Connect Gmail from Profile and choose “Sync now” to look for interview invitations.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {events.map((event) => {
            const form = forms[event.eventId] || formForEvent(event, timezone)
            const readOnly = event.status === 'REJECTED'
            const busy = busyEvent === event.eventId
            return (
              <article key={event.eventId} className="glass-card space-y-5 p-5 md:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <CalendarCheck className="mt-1 h-5 w-5 shrink-0 text-primary-500" />
                    <div>
                      <h2 className="font-display text-lg font-semibold">
                        {event.companyName || 'Potential interview invitation'}
                      </h2>
                      <p className="text-sm text-slate-500">
                        {statusLabel(event.status)} · Extraction confidence {Math.round(event.confidence * 100)}%
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {event.sources.map((source) => (
                      <a
                        key={source.messageId}
                        href={source.gmailUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-primary-600 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                      >
                        Original email <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Input label="Company" value={form.companyName} disabled={readOnly} onChange={(e) => updateField(event.eventId, 'companyName', e.target.value)} />
                  <Input label="Job role" value={form.jobRole} disabled={readOnly} onChange={(e) => updateField(event.eventId, 'jobRole', e.target.value)} />
                  <Input label="Interview date" type="date" value={form.interviewDate} disabled={readOnly} onChange={(e) => updateField(event.eventId, 'interviewDate', e.target.value)} />
                  <Input label="Interview time" type="time" value={form.interviewTime} disabled={readOnly} onChange={(e) => updateField(event.eventId, 'interviewTime', e.target.value)} />
                  <Input label="Timezone (IANA)" value={form.timezone} disabled={readOnly} onChange={(e) => updateField(event.eventId, 'timezone', e.target.value)} placeholder="e.g. Asia/Kolkata" />
                  <Select
                    label="Interview type"
                    value={form.interviewType}
                    disabled={readOnly}
                    onChange={(e) => updateField(event.eventId, 'interviewType', e.target.value)}
                    options={[
                      { value: 'unknown', label: 'Not specified' },
                      { value: 'remote', label: 'Remote' },
                      { value: 'onsite', label: 'On-site' },
                      { value: 'phone', label: 'Phone' },
                    ]}
                  />
                  <Input label="Location" value={form.location} disabled={readOnly} onChange={(e) => updateField(event.eventId, 'location', e.target.value)} />
                  <Input label="Meeting URL" type="url" value={form.meetingUrl} disabled={readOnly} onChange={(e) => updateField(event.eventId, 'meetingUrl', e.target.value)} />
                  {event.status !== 'REJECTED' && (
                    <Select
                      label="Reminder delivery"
                      value={form.channel}
                      disabled={readOnly}
                      onChange={(e) => updateField(event.eventId, 'channel', e.target.value)}
                      options={user?.telegramConnected
                        ? CHANNEL_OPTIONS
                        : CHANNEL_OPTIONS.filter((option) => option.value === 'GMAIL')}
                    />
                  )}
                </div>

                {event.reminders.length > 0 && (
                  <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                    {event.reminders.map((reminder) => (
                      <span key={reminder.type} className="rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">
                        {reminder.type === 'DAY_BEFORE' ? 'Day before' : 'Morning of'}: {reminder.status.toLowerCase()}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4 dark:border-slate-700">
                  {!readOnly && (
                    <Button variant="secondary" size="sm" loading={busy} onClick={() => runEventAction(event, 'save')}>
                      <Save className="mr-1.5 h-4 w-4" /> Save details
                    </Button>
                  )}
                  {event.status === 'REVIEW' && (
                    <>
                      <Button size="sm" loading={busy} onClick={() => runEventAction(event, 'confirm')}>
                        <CheckCircle className="mr-1.5 h-4 w-4" /> Confirm and schedule
                      </Button>
                      <Button variant="ghost" size="sm" disabled={busy} onClick={() => runEventAction(event, 'reject')}>
                        <XCircle className="mr-1.5 h-4 w-4" /> Reject
                      </Button>
                    </>
                  )}
                  <Button variant="ghost" size="sm" disabled={busy} onClick={() => runEventAction(event, 'delete')}>
                    <Trash2 className="mr-1.5 h-4 w-4" /> Delete
                  </Button>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
