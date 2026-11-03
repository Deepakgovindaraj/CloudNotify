import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { AuthLayout } from '@/layouts/AuthLayout'
import { DashboardLayout } from '@/layouts/DashboardLayout'
import { PageLoader } from '@/components/ui/Spinner'
import { ROUTES } from '@/constants/routes'

const AuthPage = lazy(() => import('@/pages/AuthPage').then((m) => ({ default: m.AuthPage })))
const PublicInfoPage = lazy(() => import('@/pages/PublicInfoPage').then((m) => ({ default: m.PublicInfoPage })))
const DashboardPage = lazy(() => import('@/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })))
const CreateNotificationPage = lazy(() =>
  import('@/pages/CreateNotificationPage').then((m) => ({ default: m.CreateNotificationPage }))
)
const HistoryPage = lazy(() => import('@/pages/HistoryPage').then((m) => ({ default: m.HistoryPage })))
const ProfilePage = lazy(() => import('@/pages/ProfilePage').then((m) => ({ default: m.ProfilePage })))
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })))
const BulkCampaignPage = lazy(() =>
  import('@/pages/BulkCampaignPage').then((m) => ({ default: m.BulkCampaignPage }))
)

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()

  if (loading) return <PageLoader />

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.AUTH} replace />
  }

  return children
}

function PublicRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()

  if (loading) return <PageLoader />

  if (isAuthenticated) {
    return <Navigate to={ROUTES.DASHBOARD} replace />
  }

  return children
}

function LazyPage({ children }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to={ROUTES.DASHBOARD} replace />} />

      <Route
        path="/docs"
        element={<LazyPage><PublicInfoPage /></LazyPage>}
      />
      <Route
        path="/docs/:slug"
        element={<LazyPage><PublicInfoPage /></LazyPage>}
      />
      <Route
        path="/legal/:slug"
        element={<LazyPage><PublicInfoPage /></LazyPage>}
      />
      <Route
        path="/support"
        element={<LazyPage><PublicInfoPage /></LazyPage>}
      />
      <Route
        path="/changelog"
        element={<LazyPage><PublicInfoPage /></LazyPage>}
      />
      <Route
        path="/roadmap"
        element={<LazyPage><PublicInfoPage /></LazyPage>}
      />
      <Route
        path="/status"
        element={<LazyPage><PublicInfoPage /></LazyPage>}
      />
      <Route
        path="/about"
        element={<LazyPage><PublicInfoPage /></LazyPage>}
      />

      <Route
        element={
          <PublicRoute>
            <AuthLayout />
          </PublicRoute>
        }
      >
        <Route
          path={ROUTES.AUTH}
          element={
            <LazyPage>
              <AuthPage />
            </LazyPage>
          }
        />
      </Route>

      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route
          path={ROUTES.DASHBOARD}
          element={
            <LazyPage>
              <DashboardPage />
            </LazyPage>
          }
        />
        <Route
          path={ROUTES.CREATE}
          element={
            <LazyPage>
              <CreateNotificationPage />
            </LazyPage>
          }
        />
        <Route
          path={ROUTES.HISTORY}
          element={
            <LazyPage>
              <HistoryPage />
            </LazyPage>
          }
        />
        <Route
          path={ROUTES.BULK_DELIVERY}
          element={
            <LazyPage>
              <BulkCampaignPage />
            </LazyPage>
          }
        />
        <Route
          path={ROUTES.PROFILE}
          element={
            <LazyPage>
              <ProfilePage />
            </LazyPage>
          }
        />
        <Route
          path={ROUTES.SETTINGS}
          element={
            <LazyPage>
              <SettingsPage />
            </LazyPage>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
    </Routes>
  )
}
