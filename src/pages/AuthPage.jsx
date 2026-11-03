import { useEffect, useRef, useState } from 'react'
import { GoogleLogin } from '@react-oauth/google'
import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'motion/react'
import {
  Bell,
  CalendarCheck,
  CalendarDays,
  Check,
  Clock3,
  Cloud,
  ExternalLink,
  ListChecks,
  Mail,
  MessageCircle,
  Send,
  Sparkles,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { ROUTES } from '@/constants/routes'
import { APP_NAME } from '@/constants/config'
import { LoginFooter } from '@/components/public/LoginFooter'
import GradientText from '@/components/GradientText'
import GradientWaves from '@/components/GradientWaves'
import {
  initializeTelegramWebApp,
  isTelegramMiniApp,
  openExternalAuthentication,
} from '@/services/telegramService'

export function AuthPage() {
  const [authError, setAuthError] = useState('')
  const [telegramAuth, setTelegramAuth] = useState(null)
  const [openingBrowser, setOpeningBrowser] = useState(false)
  const [browserOpened, setBrowserOpened] = useState(false)
  const googleButtonRef = useRef(null)
  const reduceMotion = useReducedMotion()
  const { googleLogin } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const active = initializeTelegramWebApp() || isTelegramMiniApp()
      setTelegramAuth(active)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  const handleOpenExternalAuthentication = () => {
    setAuthError('')
    setOpeningBrowser(true)
    try {
      openExternalAuthentication()
      setBrowserOpened(true)
    } catch (err) {
      console.error('Unable to open external authentication', err)
      setAuthError('Could not open the external browser. Please try again.')
    } finally {
      setOpeningBrowser(false)
    }
  }

  const handleGoogleSuccess = async (credentialResponse) => {
    setAuthError('')
    try {
      await googleLogin(credentialResponse.credential)

      navigate(ROUTES.DASHBOARD)
    } catch (err) {
      console.error('Google Login Error', err)
      setAuthError(
        err.response?.data?.error || 'Google sign-in failed. Please try again.'
      )
    }
  }

  const handleGoogleError = () => {
    setAuthError('Google sign-in failed. Please try again.')
  }

  const handleScrollToGoogleSignIn = () => {
    const googleButton = googleButtonRef.current
    if (!googleButton) return

    const googleFrame = googleButton.querySelector('iframe')
    if (googleFrame) {
      googleFrame.focus({ preventScroll: true })
    } else {
      googleButton.focus({ preventScroll: true })
    }

    window.scrollTo({
      top: 0,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth',
    })
  }

  return (
    <>
      <main className="flex min-h-[calc(100vh-4.5rem)] items-center justify-center px-6 pb-16 pt-8">
        <div className="w-full max-w-md animate-fade-in">
          <div className="flex w-full flex-col items-center text-center text-[#f5f5f5]">
            <div className="flex flex-col items-center text-center">
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-600 to-accent-500 text-white shadow-lg shadow-primary-500/30">
                <Cloud className="h-11 w-11" />
              </div>

              <h1 className="font-display text-3xl md:text-4xl font-bold">
                <GradientText
                  colors={['#5227FF', '#FF9FFC', '#B497CF']}
                  animationSpeed={3}
                  variant="flow"
                  glow={0.12}
                  className="font-display"
                >
                  Welcome to {APP_NAME}
                </GradientText>
              </h1>
              <p className="mt-3 max-w-sm text-sm text-slate-300 leading-relaxed">
                Sign in with your Google account to schedule and manage notifications
              </p>
            </div>

            {authError && (
              <div
                className="mt-6 rounded-lg bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-600 text-center"
                role="alert"
              >
                {authError}
              </div>
            )}

            {telegramAuth === null ? (
              <div className="mt-10 mb-6 flex justify-center" role="status" aria-label="Loading authentication">
                <span className="h-8 w-8 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
              </div>
            ) : telegramAuth ? (
              <div className="mt-10 mb-6 space-y-4">
                <div className="rounded-xl bg-sky-50 px-4 py-3 text-center text-sm text-sky-800 dark:bg-sky-500/10 dark:text-sky-200">
                  Google sign-in is not supported inside Telegram&apos;s embedded browser.
                  CloudNotify will open the secure browser sign-in instead.
                </div>
                <button
                  type="button"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 px-6 py-3 text-base font-medium text-white shadow-lg shadow-primary-500/25 transition-all hover:from-primary-700 hover:to-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={handleOpenExternalAuthentication}
                  disabled={openingBrowser}
                >
                  {openingBrowser ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <ExternalLink className="h-4 w-4" />
                  )}
                  {openingBrowser ? 'Opening browser...' : 'Continue in external browser'}
                </button>
                {browserOpened && (
                  <p className="text-center text-xs text-emerald-600 dark:text-emerald-400" role="status">
                    Browser sign-in opened. Return to Telegram when you are finished.
                  </p>
                )}
                <p className="text-center text-xs text-slate-400 dark:text-slate-500">
                  If you cancel sign-in, return here and try again.
                </p>
              </div>
            ) : (
              <div className="mt-10 mb-6 flex w-full justify-center">
                <div
                  id="google-sign-in"
                  ref={googleButtonRef}
                  tabIndex={-1}
                  className="specular-button specular-button--google flex justify-center [&>div]:flex [&>div]:justify-center"
                >
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={handleGoogleError}
                    theme="filled_black"
                    size="large"
                    text="signin_with"
                    shape="rectangular"
                    width="320"
                  />
                </div>
              </div>
            )}

            <p className="inline-block rounded-full bg-[#0d0b12]/75 px-3 py-1 text-center text-xs text-white shadow-sm backdrop-blur-sm">
              Secure authentication powered by Google
            </p>
          </div>
        </div>
      </main>

      <div className="relative isolate overflow-hidden bg-[#0B0912] text-[#F5F3FA]">
        <div className="pointer-events-none absolute inset-0 z-0" aria-hidden="true">
          <GradientWaves
            horizonColor="#5227FF"
            waveColor="#B56CFF"
            crestColor="#FFFFFF"
            speed={0.3}
            amplitude={2}
            relief={0.8}
            lightAngle={120}
            quality="low"
            dpr={1}
            mouseInteraction={false}
            swellOnClick={false}
          />
        </div>
        <div className="relative z-10">
        <section className="relative mx-auto grid max-w-7xl items-center gap-12 px-6 py-24 sm:px-10 lg:grid-cols-2 lg:gap-16 lg:py-32">
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 24 }}
            whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.65, ease: 'easeOut' }}
          >
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.24em] text-[#B56CFF]">
              Meet CloudNotify
            </p>
            <h2 className="font-display text-4xl font-bold leading-tight sm:text-5xl">
              One Platform.
              <br />
              <span className="bg-gradient-to-r from-[#B56CFF] to-[#7950F2] bg-clip-text text-transparent">
                Every Notification.
              </span>
            </h2>
            <p className="mt-6 max-w-xl text-lg leading-8 text-white/65">
              CloudNotify simplifies notification management by bringing scheduling,
              automation, and multiple communication channels together in one place.
            </p>
            <div className="mt-8 flex items-center gap-3 text-sm text-white/55">
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#7950F2]/40 bg-[#7950F2]/10 text-[#B56CFF]">
                <Sparkles className="h-4 w-4" />
              </span>
              Less juggling. More peace of mind.
            </div>
          </motion.div>

          <motion.div
            className="relative mx-auto w-full max-w-[500px]"
            animate={reduceMotion ? undefined : { y: [0, -12, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            aria-hidden="true"
          >
            <div className="absolute inset-[15%] rounded-full bg-[#7950F2]/20 blur-3xl" />
            <svg
              viewBox="0 0 500 360"
              className="relative h-auto w-full drop-shadow-[0_0_40px_rgba(121,80,242,0.28)]"
              fill="none"
            >
              <defs>
                <linearGradient id="cloud-body" x1="112" y1="112" x2="366" y2="264" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#F5F3FA" />
                  <stop offset=".32" stopColor="#D8C6FF" />
                  <stop offset=".68" stopColor="#966BFF" />
                  <stop offset="1" stopColor="#5227A8" />
                </linearGradient>
                <linearGradient id="cloud-rim" x1="111" y1="155" x2="372" y2="254" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#FFFFFF" />
                  <stop offset=".45" stopColor="#DAB9FF" />
                  <stop offset="1" stopColor="#7950F2" />
                </linearGradient>
                <radialGradient id="cloud-light" cx="0" cy="0" r="1" gradientTransform="matrix(0 100 -154 0 247 148)" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#FFFFFF" stopOpacity=".75" />
                  <stop offset="1" stopColor="#B56CFF" stopOpacity="0" />
                </radialGradient>
                <filter id="cloud-shadow" x="44" y="58" width="412" height="270" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse">
                  <feGaussianBlur stdDeviation="13" />
                </filter>
              </defs>
              <ellipse cx="250" cy="287" rx="143" ry="19" fill="#7950F2" opacity=".35" filter="url(#cloud-shadow)" />
              <ellipse cx="250" cy="210" rx="207" ry="91" stroke="#B56CFF" strokeOpacity=".2" />
              <ellipse cx="250" cy="210" rx="175" ry="67" stroke="#D8C6FF" strokeOpacity=".14" strokeDasharray="4 10" />
              <circle cx="75" cy="198" r="4" fill="#DCC8FF" />
              <circle cx="397" cy="146" r="3" fill="#B56CFF" />
              <circle cx="345" cy="303" r="3" fill="#F5F3FA" />
              <path
                d="M115 249h247c34 0 61-25 61-57 0-30-23-54-53-57-10-47-51-81-100-81-44 0-82 29-96 69-8-4-17-6-27-6-33 0-59 25-59 56v2c-27 4-47 27-47 54 0 28 24 50 54 50Z"
                fill="#7950F2"
                opacity=".7"
                transform="translate(0 17)"
              />
              <path
                d="M115 249h247c34 0 61-25 61-57 0-30-23-54-53-57-10-47-51-81-100-81-44 0-82 29-96 69-8-4-17-6-27-6-33 0-59 25-59 56v2c-27 4-47 27-47 54 0 28 24 50 54 50Z"
                fill="url(#cloud-body)"
              />
              <path
                d="M64 226c2-24 22-43 47-46m45-55c14-30 43-49 77-49 42 0 77 28 87 67"
                stroke="url(#cloud-rim)"
                strokeLinecap="round"
                strokeWidth="5"
                opacity=".8"
              />
              <path
                d="M115 249h247c34 0 61-25 61-57 0-30-23-54-53-57-10-47-51-81-100-81-44 0-82 29-96 69-8-4-17-6-27-6-33 0-59 25-59 56v2c-27 4-47 27-47 54 0 28 24 50 54 50Z"
                fill="url(#cloud-light)"
              />
              <path d="M167 203h153" stroke="#FFF" strokeOpacity=".42" strokeWidth="2" strokeLinecap="round" />
              <path d="M184 218h112" stroke="#FFF" strokeOpacity=".2" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </motion.div>
        </section>

        <section className="border-y border-white/[0.06] bg-white/[0.015] px-6 py-24 sm:px-10 lg:py-28">
          <div className="mx-auto max-w-7xl">
            <motion.div
              className="mx-auto mb-14 max-w-2xl text-center"
              initial={reduceMotion ? false : { opacity: 0, y: 20 }}
              whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ duration: 0.55 }}
            >
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.24em] text-[#B56CFF]">
                Everything in sync
              </p>
              <h2 className="font-display text-3xl font-bold sm:text-4xl">Key Features</h2>
              <p className="mt-4 text-white/60">
                All the essentials to send the right notification at the right moment.
              </p>
            </motion.div>

            <div className="grid gap-5 md:grid-cols-3">
              {[
                {
                  title: 'Smart Scheduling',
                  icon: CalendarDays,
                  points: [
                    'Schedule notifications in advance.',
                    'Automated delivery at selected times.',
                    'Manage upcoming notifications.',
                  ],
                },
                {
                  title: 'Multi-Channel Communication',
                  icon: MessageCircle,
                  points: [
                    'Gmail integration.',
                    'Telegram integration.',
                    'Centralized channel management.',
                  ],
                },
                {
                  title: 'Notification Management',
                  icon: ListChecks,
                  points: [
                    'View notification history.',
                    'Track delivery status.',
                    'Manage scheduled notifications.',
                  ],
                },
              ].map(({ title, icon: Icon, points }, index) => (
                <motion.article
                  key={title}
                  className="group relative overflow-hidden rounded-2xl border border-white/10 bg-[#171421]/85 p-7 shadow-[0_18px_70px_rgba(0,0,0,0.18)] backdrop-blur-xl transition-colors duration-300 hover:border-[#7950F2]/55 hover:bg-[#1B1728]"
                  initial={reduceMotion ? false : { opacity: 0, y: 24 }}
                  whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  whileHover={reduceMotion ? undefined : { y: -6 }}
                  transition={{ duration: 0.45, delay: index * 0.1 }}
                >
                  <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[#7950F2]/10 blur-3xl transition-colors group-hover:bg-[#B56CFF]/20" />
                  <div className="relative">
                    <span className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl border border-[#7950F2]/30 bg-[#7950F2]/15 text-[#B56CFF] shadow-[0_0_28px_rgba(121,80,242,0.12)]">
                      <Icon className="h-5 w-5" />
                    </span>
                    <h3 className="font-display text-xl font-semibold">{title}</h3>
                    <ul className="mt-5 space-y-3 text-sm leading-6 text-white/60">
                      {points.map((point) => (
                        <li key={point} className="flex items-start gap-3">
                          <Check className="mt-1 h-4 w-4 shrink-0 text-[#B56CFF]" />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-24 sm:px-10 lg:py-28">
          <motion.div
            className="mx-auto mb-14 max-w-2xl text-center"
            initial={reduceMotion ? false : { opacity: 0, y: 20 }}
            whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.55 }}
          >
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.24em] text-[#B56CFF]">
              Connected channels
            </p>
            <h2 className="font-display text-3xl font-bold sm:text-4xl">
              Your Messages. Your Channels.
            </h2>
          </motion.div>

          <div className="grid gap-6 md:grid-cols-2">
            <motion.article
              className="group relative flex min-h-56 items-center gap-6 overflow-hidden rounded-2xl border border-white/10 bg-[#171421]/85 p-7 backdrop-blur-xl transition-all duration-300 hover:border-[#B56CFF]/45 hover:shadow-[0_0_45px_rgba(121,80,242,0.14)] sm:p-9"
              initial={reduceMotion ? false : { opacity: 0, x: -24 }}
              whileInView={reduceMotion ? undefined : { opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.55 }}
            >
              <div className="absolute -right-8 -top-12 h-40 w-40 rounded-full bg-[#7950F2]/10 blur-3xl transition-colors group-hover:bg-[#7950F2]/25" />
              <span className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white shadow-[0_0_32px_rgba(181,108,255,0.2)]">
                <svg viewBox="0 0 48 48" className="h-9 w-9" aria-hidden="true">
                  <path fill="#4285F4" d="M6.5 40.2h6.4V24.6l-8.5-6.1v18.3c0 1.9 1 3.4 2.1 3.4Z" />
                  <path fill="#34A853" d="M35.1 40.2h6.4c1.9 0 3.5-1.5 3.5-3.4V18.5l-8.5 6.1v12.2c0 1.9-1 3.4-1.4 3.4Z" />
                  <path fill="#FBBC04" d="M35.1 12.7v11.9l8.5-6.1v-4.1c0-4.2-4.8-6.6-8.2-4.1l-.3 2.4Z" />
                  <path fill="#EA4335" d="m12.9 24.6 11.1 8 11.1-8V12.7l-11.1 8-11.1-8v11.9Z" />
                  <path fill="#C5221F" d="M4.4 14.4v4.1l8.5 6.1V12.7L8.7 9.2c-3.4-2.5-8.2-.1-8.2 4.1Z" />
                </svg>
              </span>
              <div className="relative">
                <h3 className="font-display text-xl font-semibold">Gmail</h3>
                <p className="mt-2 max-w-sm text-sm leading-6 text-white/60">
                  Email notifications and reminders.
                </p>
              </div>
            </motion.article>

            <motion.article
              className="group relative flex min-h-56 items-center gap-6 overflow-hidden rounded-2xl border border-white/10 bg-[#171421]/85 p-7 backdrop-blur-xl transition-all duration-300 hover:border-[#B56CFF]/45 hover:shadow-[0_0_45px_rgba(121,80,242,0.14)] sm:p-9"
              initial={reduceMotion ? false : { opacity: 0, x: 24 }}
              whileInView={reduceMotion ? undefined : { opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.55 }}
            >
              <div className="absolute -right-8 -top-12 h-40 w-40 rounded-full bg-[#7950F2]/10 blur-3xl transition-colors group-hover:bg-[#7950F2]/25" />
              <span className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#39B8F2] to-[#168ACB] shadow-[0_0_32px_rgba(57,184,242,0.25)]">
                <svg viewBox="0 0 24 24" className="h-9 w-9" aria-hidden="true">
                  <path
                    fill="white"
                    d="M21.7 4.1 18.5 20c-.2 1.1-.9 1.4-1.8.9l-5-3.7-2.4 2.3c-.3.3-.5.5-1 .5l.4-5.1 9.3-8.4c.4-.4-.1-.6-.6-.2L6 13.5l-5-1.6c-1.1-.3-1.1-1.1.2-1.6l19.3-7.4c.9-.3 1.6.2 1.2 1.2Z"
                  />
                </svg>
              </span>
              <div className="relative">
                <h3 className="font-display text-xl font-semibold">Telegram</h3>
                <p className="mt-2 max-w-sm text-sm leading-6 text-white/60">
                  Instant notification delivery through your Telegram bot.
                </p>
              </div>
            </motion.article>
          </div>
        </section>

        <section className="border-y border-white/[0.06] bg-white/[0.015] px-6 py-24 sm:px-10 lg:py-28">
          <div className="mx-auto max-w-7xl">
            <motion.div
              className="mx-auto mb-16 max-w-2xl text-center"
              initial={reduceMotion ? false : { opacity: 0, y: 20 }}
              whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ duration: 0.55 }}
            >
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.24em] text-[#B56CFF]">
                Simple by design
              </p>
              <h2 className="font-display text-3xl font-bold sm:text-4xl">
                From Scheduling to Delivery.
              </h2>
            </motion.div>

            <div className="relative grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
              <div className="absolute left-[12%] right-[12%] top-8 hidden h-px bg-gradient-to-r from-transparent via-[#7950F2]/70 to-transparent lg:block" />
              {[
                { number: '01', title: 'Create Notification', icon: Bell },
                { number: '02', title: 'Choose Communication Channel', icon: Send },
                { number: '03', title: 'Set Date and Time', icon: CalendarCheck },
                { number: '04', title: 'Notification Delivered', icon: Check },
              ].map(({ number, title, icon: Icon }, index) => (
                <motion.div
                  key={number}
                  className="relative z-10 flex flex-col items-center text-center"
                  initial={reduceMotion ? false : { opacity: 0, y: 20 }}
                  whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.45, delay: index * 0.12 }}
                >
                  <span className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#7950F2]/45 bg-[#171421] text-[#B56CFF] shadow-[0_0_28px_rgba(121,80,242,0.2)]">
                    <Icon className="h-6 w-6" />
                  </span>
                  <span className="text-xs font-semibold tracking-[0.2em] text-[#B56CFF]">{number}</span>
                  <h3 className="mt-2 max-w-52 font-display text-lg font-semibold leading-6">
                    {title}
                  </h3>
                  {index < 3 && (
                    <span className="mt-5 flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-white/50 lg:hidden">
                      <Clock3 className="h-3.5 w-3.5" />
                    </span>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="relative px-6 py-24 sm:px-10 lg:py-32">
          <motion.div
            className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl border border-[#7950F2]/35 bg-[#171421]/90 px-6 py-14 text-center shadow-[0_0_90px_rgba(121,80,242,0.13)] backdrop-blur-xl sm:px-12 sm:py-20"
            initial={reduceMotion ? false : { opacity: 0, y: 24 }}
            whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.6 }}
          >
            <div className="pointer-events-none absolute -left-20 -top-28 h-64 w-64 rounded-full bg-[#7950F2]/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-36 -right-16 h-72 w-72 rounded-full bg-[#B56CFF]/15 blur-3xl" />
            <div className="relative">
              <span className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-xl border border-[#B56CFF]/30 bg-[#7950F2]/15 text-[#D8C6FF]">
                <Bell className="h-5 w-5" />
              </span>
              <h2 className="font-display text-3xl font-bold leading-tight sm:text-4xl">
                Ready to Take Control of Your Notifications?
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-white/60">
                Experience smarter notification management with CloudNotify.
              </p>
              <button
                type="button"
                onClick={handleScrollToGoogleSignIn}
                className="mt-8 inline-flex items-center gap-3 rounded-xl bg-gradient-to-r from-[#7950F2] to-[#9A5CF6] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_8px_32px_rgba(121,80,242,0.3)] transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_36px_rgba(121,80,242,0.42)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B56CFF]"
              >
                <Mail className="h-4 w-4" />
                Sign in with Google
              </button>
            </div>
          </motion.div>
          <div className="mx-auto mt-10 flex items-center justify-center gap-2 text-xs text-white/35">
            <Clock3 className="h-3.5 w-3.5" />
            Your next notification is just a sign-in away.
          </div>
        </section>
        </div>
      </div>
      <LoginFooter />
    </>
  )
}
