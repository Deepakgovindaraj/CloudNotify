import { Outlet } from 'react-router-dom'
import { Cloud, RefreshCw } from 'lucide-react'
import { APP_NAME } from '@/constants/config'
import SwarmCursor from '@/components/SwarmCursor'

export function AuthLayout() {
  return (
    <SwarmCursor
      className="min-h-screen"
      count={800}
      size={2.6}
      spread={90}
      swirl={0.6}
      clickEffect="burst"
    >
      <div className="min-h-screen bg-[#0d0b12] text-[#f5f5f5]">
        <header className="relative z-10 flex items-center justify-between px-6 py-4 sm:px-10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/10">
              <Cloud className="h-5 w-5" />
            </div>
            <span className="font-display text-xl font-semibold">{APP_NAME}</span>
          </div>
          <nav className="hidden items-center gap-8 text-sm font-medium text-white/55 md:flex">
            <span>Notifications</span>
            <span>Channels</span>
            <span>Scheduling</span>
            <span>Docs</span>
          </nav>
          <div className="flex items-center gap-3">
            <span className="hidden rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/75 sm:inline-block">
              Secure sign in
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/65">
              <RefreshCw className="h-4 w-4" />
            </div>
          </div>
        </header>

        <main className="relative z-10 flex min-h-[calc(100vh-4.5rem)] items-center justify-center px-6 pb-16 pt-8">
          <div className="w-full max-w-md animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </SwarmCursor>
  )
}
