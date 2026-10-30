import { useCallback, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from '@/components/layout/Sidebar'
import { Navbar } from '@/components/layout/Navbar'
import { IntroSplash } from '@/components/ui/IntroSplash'
import Particles from '@/components/Particles'

export function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showIntro, setShowIntro] = useState(true)
  const handleIntroComplete = useCallback(() => setShowIntro(false), [])

  return (
    <div className="monochrome-app relative isolate flex min-h-screen overflow-hidden bg-[#0d0b12] text-[#f5f5f5]">
      {showIntro && <IntroSplash onComplete={handleIntroComplete} />}
      <Particles
        particleColors={['#ffffff', '#d4d4d8', '#71717a']}
        particleCount={180}
        particleSpread={10}
        speed={0.1}
        particleBaseSize={100}
        glow={0.5}
        twinkle={0.3}
        moveParticlesOnHover
        hoverEffect="parallax"
      />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="relative z-10 flex-1 flex flex-col min-w-0">
        <Navbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
