import { useCallback, useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from '@/components/layout/Sidebar'
import { Navbar } from '@/components/layout/Navbar'
import { IntroSplash } from '@/components/ui/IntroSplash'
import Particles from '@/components/Particles'
import Silk from '@/components/Silk'
import { useTheme } from '@/context/ThemeContext'

export function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showIntro, setShowIntro] = useState(true)
  const { appearance } = useTheme()
  const [showBackgroundEffects, setShowBackgroundEffects] = useState(appearance === 'enhance')
  const handleIntroComplete = useCallback(() => setShowIntro(false), [])

  useEffect(() => {
    if (appearance === 'enhance') {
      const timer = window.setTimeout(() => setShowBackgroundEffects(true), 0)
      return () => window.clearTimeout(timer)
    }

    const timer = window.setTimeout(() => setShowBackgroundEffects(false), 500)
    return () => window.clearTimeout(timer)
  }, [appearance])

  return (
    <div className={`${appearance === 'enhance' ? 'monochrome-app' : 'normal-app'} relative isolate flex min-h-screen overflow-hidden bg-[#0d0b12] text-[#f5f5f5]`}>
      {showIntro && <IntroSplash onComplete={handleIntroComplete} />}
      <div
        className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-500 ease-in-out"
        style={{ opacity: appearance === 'enhance' ? 1 : 0 }}
        aria-hidden="true"
      >
        {showBackgroundEffects && (
          <>
            <Silk
              className="pointer-events-none"
              style={{ position: 'absolute', inset: 0 }}
              color="#5227FF"
              sheenColor="#ffffff"
              speed={5}
              scale={0.6}
              rotation={0}
              sheen={0.4}
              depth={0.5}
              glow={0.45}
              noiseIntensity={0}
              mouseInteraction={false}
              clickRipple
              intro
              ripple={0.6}
            />
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
          </>
        )}
      </div>
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
