import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  PlusCircle,
  History,
  User,
  Settings,
  Cloud,
  X,
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
}

const navItems = [
  { label: 'Dashboard', path: ROUTES.DASHBOARD, icon: 'LayoutDashboard' },
  { label: 'Create Notification', path: ROUTES.CREATE, icon: 'PlusCircle' },
  { label: 'History', path: ROUTES.HISTORY, icon: 'History' },
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

      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full w-64 flex flex-col',
          'bg-[#f5f5f5] dark:bg-[#14161f] border-r border-slate-200/80 dark:border-slate-800',
          'transition-transform duration-300 lg:translate-x-0 lg:static lg:z-auto',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-16 items-center justify-between px-5 border-b border-slate-200/80 dark:border-slate-800">
          <NavLink to={ROUTES.DASHBOARD} className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary-600 to-accent-500 text-white shadow-sm shadow-indigo-500/20">
              <Cloud className="h-5 w-5" />
            </div>
            <span className="font-display text-[1.05rem] font-bold tracking-tight text-slate-800 dark:text-slate-100">
              {APP_NAME}
            </span>
          </NavLink>
          <button onClick={onClose} className="lg:hidden p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto scrollbar-thin">
          {navItems.map((item) => {
            const Icon = iconMap[item.icon]
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-[0.98rem] font-medium transition-all duration-200',
                    isActive
                      ? 'bg-[#efe4ff] text-[#4a4d5a] shadow-[inset_0_0_0_1px_rgba(99,102,241,0.04)]'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                  )
                }
              >
                <Icon className="h-5 w-5 shrink-0" />
                {t(item.label)}
              </NavLink>
            )
          })}
        </nav>

        <div className="p-4 border-t border-slate-200/80 dark:border-slate-800">
          <div className="rounded-xl bg-[#f1ebff] p-4 text-left shadow-[inset_0_0_0_1px_rgba(124,93,255,0.04)]">
            <p className="text-xs font-medium text-[#6147d5]">{t('Pro Tip')}</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">{t('Connect both channels for maximum reach.')}</p>
          </div>
        </div>
      </aside>
    </>
  )
}
