import { useEffect, useState } from 'react'
import { Bell, Cloud, Send } from 'lucide-react'
import { APP_NAME } from '@/constants/config'

const INTRO_DURATION = 4000
const EXIT_DURATION = 600

export function IntroSplash({ onComplete }) {
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    const exitTimer = window.setTimeout(() => setIsExiting(true), INTRO_DURATION - EXIT_DURATION)
    const completeTimer = window.setTimeout(onComplete, INTRO_DURATION)

    return () => {
      window.clearTimeout(exitTimer)
      window.clearTimeout(completeTimer)
    }
  }, [onComplete])

  return (
    <div
      className={`intro-splash ${isExiting ? 'intro-splash--exiting' : ''}`}
      role="status"
      aria-label={`Welcome to ${APP_NAME}`}
    >
      <div className="intro-splash__glow intro-splash__glow--one" />
      <div className="intro-splash__glow intro-splash__glow--two" />

      <div className="intro-splash__content">
        <div className="intro-splash__mark">
          <div className="intro-splash__orbit intro-splash__orbit--one" />
          <div className="intro-splash__orbit intro-splash__orbit--two" />
          <div className="intro-splash__icon">
            <Cloud />
          </div>
          <div className="intro-splash__signal intro-splash__signal--one">
            <Bell />
          </div>
          <div className="intro-splash__signal intro-splash__signal--two">
            <Send />
          </div>
        </div>

        <p className="intro-splash__eyebrow">Your notifications, in motion</p>
        <h1 className="intro-splash__title">{APP_NAME}</h1>
        <p className="intro-splash__subtitle">Connect. Schedule. Stay notified.</p>
        <div className="intro-splash__loader" aria-hidden="true">
          <span />
        </div>
      </div>
    </div>
  )
}
