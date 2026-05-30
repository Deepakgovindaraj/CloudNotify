import { Calendar, Clock, Trash2 } from 'lucide-react'
import { cn } from '@/utils/cn'
import { StatusBadge, ChannelBadge } from '@/components/ui/Badge'
import { formatDate } from '@/utils/formatters'

export function NotificationCard({ notification, onDelete, compact }) {
  return (
    <article
      className={cn(
        'group glass-card p-5 transition-all duration-300',
        'hover:shadow-xl hover:shadow-primary-500/10 hover:-translate-y-0.5',
        'dark:hover:border-primary-500/30'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-display font-semibold text-slate-900 dark:text-white truncate">
            {notification.title}
          </h3>
          {!compact && (
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 line-clamp-2">
              {notification.message}
            </p>
          )}
        </div>
        {onDelete && (
          <button
            onClick={() => onDelete(notification)}
            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
            aria-label="Delete notification"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <StatusBadge status={notification.status} />
        <ChannelBadge channel={notification.channel} />
        {notification.recurring && (
          <span className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full capitalize">
            {notification.recurrence}
          </span>
        )}
      </div>

      <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <Calendar className="h-3.5 w-3.5" />
          {formatDate(notification.date)}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          {notification.time}
        </span>
      </div>
    </article>
  )
}

export function StatCard({ title, value, change, icon: Icon, color = 'primary' }) {
  const colors = {
    primary: 'from-primary-500 to-primary-600',
    success: 'from-emerald-500 to-emerald-600',
    warning: 'from-amber-500 to-amber-600',
    error: 'from-red-500 to-red-600',
    purple: 'from-accent-500 to-accent-600',
  }

  return (
    <div className="glass-card p-6 animate-slide-up hover:shadow-lg transition-shadow duration-300">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
          <p className="mt-2 font-display text-3xl font-bold text-slate-900 dark:text-white">{value}</p>
          {change && (
            <p className="mt-1 text-xs text-slate-500">{change}</p>
          )}
        </div>
        <div className={cn('flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-lg', colors[color])}>
          {Icon && <Icon className="h-6 w-6" />}
        </div>
      </div>
    </div>
  )
}
