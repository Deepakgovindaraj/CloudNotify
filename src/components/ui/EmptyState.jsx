import { Bell, Search, Sparkles } from 'lucide-react'
import { Button } from './Button'
import { Link } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'

const presets = {
  notifications: {
    icon: Bell,
    title: 'No notifications yet',
    description: 'Schedule your first notification to get started with CloudNotify.',
    action: { label: 'Create Notification', to: ROUTES.CREATE },
  },
  search: {
    icon: Search,
    title: 'No results found',
    description: 'Try adjusting your search or filter criteria.',
  },
  welcome: {
    icon: Sparkles,
    title: 'Welcome to CloudNotify!',
    description: 'Connect your channels and schedule your first reminder in minutes.',
    action: { label: 'Get Started', to: ROUTES.CREATE },
  },
}

export function EmptyState({ variant = 'notifications', action }) {
  const preset = presets[variant]
  const Icon = preset.icon
  const actionConfig = action || preset.action

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center animate-fade-in">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500/10 to-accent-500/10">
        <Icon className="h-10 w-10 text-primary-500" />
      </div>
      <h3 className="font-display text-xl font-semibold text-slate-900 dark:text-white mb-2">
        {preset.title}
      </h3>
      <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400 mb-6">{preset.description}</p>
      {actionConfig && (
        <Link to={actionConfig.to}>
          <Button>{actionConfig.label}</Button>
        </Link>
      )}
    </div>
  )
}
