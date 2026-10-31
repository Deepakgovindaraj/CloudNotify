import { Calendar, Clock } from 'lucide-react'
import { cn } from '@/utils/cn'
import { StatusBadge, ChannelBadge } from '@/components/ui/Badge'
import { formatDate, formatTime } from '@/utils/formatters'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import SwipeRow from '@/components/ui/SwipeRow'

export function NotificationCard({ notification, onDelete, compact }) {
  const { user } = useAuth()
  const { language } = useLanguage()
  const locale = language === 'en' ? 'en-US' : language
  return (
    <SwipeRow
      actions={onDelete ? [{ id: 'delete', label: 'Delete' }] : []}
      onCommit={() => onDelete?.(notification)}
      rowColor="#32145f"
      drawerColor="#4c1d95"
      height={compact ? 112 : 160}
      label={`Notification: ${notification.title}`}
    >
      <div className={cn('min-w-0 flex-1 py-3', !compact && 'py-2')}>
        <div className="min-w-0">
          <h3 className="truncate font-display font-semibold text-white">
            {notification.title}
          </h3>
          {!compact && (
            <p className="mt-1 line-clamp-2 text-sm text-slate-300">
              {notification.message}
            </p>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <StatusBadge status={notification.status} />
          <ChannelBadge channel={notification.channel} />
          {notification.recurring && (
            <span className="rounded-full bg-slate-700 px-2 py-0.5 text-xs capitalize text-slate-300">
              {notification.recurrence}
            </span>
          )}
        </div>

        <div className="mt-2 flex items-center gap-4 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {formatDate(notification.date, notification.timezone || user?.timezone, locale)}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {formatTime(notification.time, locale)}
          </span>
        </div>
      </div>
    </SwipeRow>
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
