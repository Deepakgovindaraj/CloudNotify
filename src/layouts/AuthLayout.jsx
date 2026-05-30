import { Outlet } from 'react-router-dom'
import { Cloud } from 'lucide-react'
import { APP_NAME } from '@/constants/config'

export function AuthLayout() {
  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-500 to-accent-600 p-12 flex-col justify-between text-white">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-20 left-20 h-64 w-64 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute bottom-20 right-10 h-80 w-80 rounded-full bg-accent-400/30 blur-3xl" />
        </div>
        <div className="relative flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur">
            <Cloud className="h-7 w-7" />
          </div>
          <span className="font-display text-2xl font-bold">{APP_NAME}</span>
        </div>
        <div className="relative space-y-6 max-w-lg">
          <h2 className="font-display text-4xl font-bold leading-tight">
            Schedule notifications across every channel
          </h2>
          <p className="text-primary-100 text-lg">
            Deliver reminders via Telegram, Gmail, or both — on your schedule, from the cloud.
          </p>
          <div className="flex gap-8 pt-4">
            {['Telegram', 'Gmail', 'Recurring', 'Analytics'].map((feature) => (
              <div key={feature} className="text-center">
                <div className="h-12 w-12 mx-auto rounded-xl bg-white/20 flex items-center justify-center text-sm font-bold mb-2">
                  {feature[0]}
                </div>
                <span className="text-sm text-primary-100">{feature}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="relative text-sm text-primary-200">© 2026 CloudNotify. Serverless notification scheduling.</p>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 bg-slate-50 dark:bg-[#0f1117]">
        <div className="w-full max-w-md animate-fade-in">
          <div className="lg:hidden flex items-center justify-center gap-2 mb-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-600 to-accent-500 text-white">
              <Cloud className="h-6 w-6" />
            </div>
            <span className="font-display text-xl font-bold gradient-text">{APP_NAME}</span>
          </div>
          <Outlet />
        </div>
      </div>
    </div>
  )
}
