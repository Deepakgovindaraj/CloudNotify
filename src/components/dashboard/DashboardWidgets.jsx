import { Bell, Send, Mail, Layers, Activity } from 'lucide-react'
import { NotificationCard } from '@/components/notifications/NotificationCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { cn } from '@/utils/cn'

export function WelcomeCard({ name }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-600 via-primary-500 to-accent-500 p-8 text-white shadow-xl shadow-primary-500/25 animate-slide-up">
      <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
      <div className="absolute -bottom-4 -left-4 h-32 w-32 rounded-full bg-accent-400/20 blur-xl" />
      <div className="relative">
        <p className="text-primary-100 text-sm font-medium">Welcome back</p>
        <h1 className="font-display mt-1 text-2xl md:text-3xl font-bold">
          Hello, {name?.split(' ')[0] || 'there'} 👋
        </h1>
        <p className="mt-2 text-primary-100/90 text-sm max-w-md">
          Manage your scheduled notifications across Telegram and Gmail from one dashboard.
        </p>
      </div>
    </div>
  )
}

export function ChannelDistribution({ data }) {
  const icons = { Telegram: Send, Gmail: Mail, Both: Layers }

  return (
    <div className="glass-card p-6 animate-slide-up">
      <h3 className="font-display font-semibold mb-4">Channel Distribution</h3>
      <div className="space-y-4">
        {data?.map((item) => {
          const Icon = icons[item.channel] || Bell
          return (
            <div key={item.channel}>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <Icon className="h-4 w-4" />
                  {item.channel}
                </span>
                <span className="font-medium">{item.percentage}%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary-500 to-accent-500 transition-all duration-700"
                  style={{ width: `${item.percentage}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function RecentActivity({ activities }) {
  const typeColors = {
    success: 'bg-emerald-500',
    error: 'bg-red-500',
    info: 'bg-primary-500',
  }

  return (
    <div className="glass-card p-6 animate-slide-up">
      <h3 className="font-display font-semibold mb-4 flex items-center gap-2">
        <Activity className="h-5 w-5 text-primary-500" />
        Recent Activity
      </h3>
      <ul className="space-y-4">
        {activities?.map((act) => (
          <li key={act.id} className="flex gap-3">
            <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', typeColors[act.type])} />
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{act.action}</p>
              <p className="text-xs text-slate-500 truncate">{act.target}</p>
              <p className="text-xs text-slate-400 mt-0.5">{act.time}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function UpcomingNotifications({ notifications }) {
  const upcoming = notifications?.filter((n) => n.status === 'pending').slice(0, 3)

  return (
    <div className="glass-card p-6 animate-slide-up">
      <h3 className="font-display font-semibold mb-4">Upcoming Notifications</h3>
      {upcoming?.length ? (
        <div className="space-y-3">
          {upcoming.map((n) => (
            <NotificationCard key={n.id} notification={n} compact />
          ))}
        </div>
      ) : (
        <EmptyState variant="notifications" />
      )}
    </div>
  )
}

export function WeeklyChart({ data }) {
  const max = Math.max(...(data?.map((d) => d.sent + d.failed) || [1]))

  return (
    <div className="glass-card p-6 animate-slide-up">
      <h3 className="font-display font-semibold mb-4">Notification Statistics</h3>
      <div className="flex items-end justify-between gap-2 h-40">
        {data?.map((d) => {
          const total = d.sent + d.failed
          const height = (total / max) * 100
          return (
            <div key={d.day} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full flex flex-col justify-end h-32 gap-0.5">
                <div
                  className="w-full rounded-t-md bg-gradient-to-t from-primary-600 to-primary-400 transition-all duration-500"
                  style={{ height: `${(d.sent / max) * 100}%` }}
                  title={`Sent: ${d.sent}`}
                />
                {d.failed > 0 && (
                  <div
                    className="w-full rounded-t-md bg-red-400"
                    style={{ height: `${(d.failed / max) * 100}%` }}
                    title={`Failed: ${d.failed}`}
                  />
                )}
              </div>
              <span className="text-xs text-slate-500">{d.day}</span>
            </div>
          )
        })}
      </div>
      <div className="mt-4 flex gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-primary-500" /> Sent
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-red-400" /> Failed
        </span>
      </div>
    </div>
  )
}

