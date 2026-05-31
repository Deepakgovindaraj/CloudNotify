import { Bell, Calendar, CheckCircle, XCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useNotifications } from '@/hooks/useNotifications'
import { StatCard } from '@/components/notifications/NotificationCard'
import {
  WelcomeCard,
  ChannelDistribution,
  RecentActivity,
  UpcomingNotifications,
  WeeklyChart,
} from '@/components/dashboard/DashboardWidgets'
import { NotificationCard } from '@/components/notifications/NotificationCard'
import { StatCardSkeleton, CardSkeleton } from '@/components/ui/Skeleton'
import { ErrorState } from '@/components/ui/ErrorState'
import { Button } from '@/components/ui/Button'
import { ROUTES } from '@/constants/routes'
import { PlusCircle } from 'lucide-react'

export function DashboardPage() {
  const { user } = useAuth()
  const { notifications, stats, activity, loading, error, refetch } = useNotifications()

  if (error === 'network') {
    return <ErrorState onRetry={refetch} />
  }

  const recent = notifications.slice(0, 4)

  return (
    <div className="space-y-6 animate-fade-in">
      <WelcomeCard name={user?.name} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard title="Total Notifications" value={stats?.total} icon={Bell} color="primary" change="+12 this month" />
            <StatCard title="Scheduled" value={stats?.scheduled} icon={Calendar} color="warning" />
            <StatCard title="Sent" value={stats?.sent} icon={CheckCircle} color="success" />
            <StatCard title="Failed" value={stats?.failed} icon={XCircle} color="error" />
          </>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <Link to={ROUTES.CREATE}>
          <Button icon={PlusCircle}>Create Notification</Button>
        </Link>
        <Link to={ROUTES.HISTORY}>
          <Button variant="secondary">View History</Button>
        </Link>
        <Link to={ROUTES.PROFILE}>
          <Button variant="ghost">Profile Settings</Button>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        {loading ? (
          <>
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </>
        ) : (
          <>
            <div className="xl:col-span-2">
              <WeeklyChart data={stats?.weeklyActivity} />
            </div>
            <ChannelDistribution data={stats?.channelDistribution} />
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <UpcomingNotifications notifications={notifications} />
        <RecentActivity activities={activity} />
      </div>

      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold">Recent Notifications</h3>
          <Link to={ROUTES.HISTORY} className="text-sm text-primary-600 hover:underline">
            View all
          </Link>
        </div>
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <CardSkeleton />
            <CardSkeleton />
          </div>
        ) : recent.length ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {recent.map((n) => (
  <NotificationCard
    key={n.notificationId}
    notification={n}
    compact
  />
))}
          </div>
        ) : null}
      </div>
    </div>
  )
}
