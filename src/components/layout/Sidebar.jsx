import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  PlusCircle,
  History,
  User,
  Settings,
  Cloud,
  CalendarDays,
  MailPlus,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { APP_NAME } from '@/constants/config'
import { ROUTES } from '@/constants/routes'
import { useLanguage } from '@/context/LanguageContext'

const iconMap = {
  LayoutDashboard,
  PlusCircle,
  History,
  User,
  Settings,
  CalendarDays,
  MailPlus,
}

const navItems = [
  { label: 'Dashboard', path: ROUTES.DASHBOARD, icon: 'LayoutDashboard' },
  { label: 'Create Notification', path: ROUTES.CREATE, icon: 'PlusCircle' },
  { label: 'History', path: ROUTES.HISTORY, icon: 'History' },
  { label: 'Interview Events', path: ROUTES.INTERVIEWS, icon: 'CalendarDays' },
  { label: 'Bulk Delivery', path: ROUTES.BULK_DELIVERY, icon: 'MailPlus' },
  { label: 'Profile', path: ROUTES.PROFILE, icon: 'User' },
  { label: 'Settings', path: ROUTES.SETTINGS, icon: 'Settings' },
]

export function Sidebar({ isOpen, onClose }) {
  const { t } = useLanguage()
  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <div
        className="sidebar-stack fixed inset-y-0 left-0 z-50 h-screen w-64 lg:static lg:shrink-0"
        data-open={isOpen}
        aria-hidden={!isOpen}
        inert={!isOpen}
      >
        <div className="sidebar-prelayers" aria-hidden="true">
          <div className="sidebar-prelayer sidebar-prelayer--one" />
          <div className="sidebar-prelayer sidebar-prelayer--two" />
        </div>

        <aside className="app-sidebar relative z-10 flex h-full min-h-screen w-full flex-col border-r border-slate-200/80 bg-[#f5f5f5] dark:border-slate-800 dark:bg-[#14161f]">
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200/80 px-5 dark:border-slate-800">
            <NavLink to={ROUTES.DASHBOARD} className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary-600 to-accent-500 text-white shadow-sm shadow-indigo-500/20">
                <Cloud className="h-5 w-5" />
              </div>
              <span className="font-display text-[1.05rem] font-bold tracking-tight text-slate-800 dark:text-slate-100">
                {APP_NAME}
              </span>
            </NavLink>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto p-4 scrollbar-thin">
            {navItems.map((item) => {
              const Icon = iconMap[item.icon]
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => {
                    if (window.matchMedia('(max-width: 1023px)').matches) onClose()
                  }}
                  className={({ isActive }) =>
                    cn(
                      'sidebar-nav-item flex items-center gap-3 overflow-hidden rounded-xl px-3 py-2.5 text-[0.98rem] font-medium transition-all duration-200',
                      isActive
                        ? 'bg-[#efe4ff] text-[#4a4d5a] shadow-[inset_0_0_0_1px_rgba(99,102,241,0.04)]'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                    )
                  }
                >
                  <span className="sidebar-nav-item__content inline-flex items-center gap-3">
                    <Icon className="h-5 w-5 shrink-0" />
                    {t(item.label)}
                  </span>
                </NavLink>
              )
            })}
          </nav>

          <div className="shrink-0 border-t border-slate-200/80 p-4 dark:border-slate-800">
            <div className="rounded-xl bg-[#f1ebff] p-4 text-left shadow-[inset_0_0_0_1px_rgba(124,93,255,0.04)]">
              <p className="text-xs font-medium text-[#6147d5]">{t('Pro Tip')}</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">{t('Connect both channels for maximum reach.')}</p>
            </div>
          </div>
        </aside>
      </div>
    </>
  )
}
