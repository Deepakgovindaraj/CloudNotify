export const ROUTES = {
  AUTH: '/auth',
  DASHBOARD: '/dashboard',
  CREATE: '/create',
  HISTORY: '/history',
  PROFILE: '/profile',
  SETTINGS: '/settings',
  BULK_DELIVERY: '/bulk-delivery',
}

export const NAV_ITEMS = [
  { label: 'Dashboard', path: ROUTES.DASHBOARD, icon: 'LayoutDashboard' },
  { label: 'Create Notification', path: ROUTES.CREATE, icon: 'PlusCircle' },
  { label: 'History', path: ROUTES.HISTORY, icon: 'History' },
  { label: 'Profile', path: ROUTES.PROFILE, icon: 'User' },
  { label: 'Settings', path: ROUTES.SETTINGS, icon: 'Settings' },
]
