import { Outlet } from 'react-router-dom'
import { Cloud } from 'lucide-react'
import { APP_NAME } from '@/constants/config'
import SwarmCursor from '@/components/SwarmCursor'
import GradientWaves from '@/components/GradientWaves'

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
      <div className="relative isolate min-h-screen bg-[#0d0b12] text-[#f5f5f5]">
        <div className="pointer-events-none absolute inset-0 z-0" aria-hidden="true">
          <GradientWaves
            horizonColor="#5227FF"
            waveColor="#FF9FFC"
            crestColor="#FFFFFF"
            speed={0.4}
            amplitude={2.5}
            relief={1}
            lightAngle={120}
            mouseInteraction
            swellOnClick
          />
        </div>
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
          </nav>
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
