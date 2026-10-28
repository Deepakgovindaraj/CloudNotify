import { WifiOff, RefreshCw } from 'lucide-react'
import { Button } from './Button'

export function ErrorState({ message, onRetry }) {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-12 text-center animate-fade-in">
      <div className="flex flex-col items-center justify-center">
        <div className="mb-6 flex h-28 w-28 items-center justify-center rounded-[1.75rem] bg-[#f9dfe2] shadow-[inset_0_0_0_1px_rgba(239,91,91,0.06)]">
          <WifiOff className="h-14 w-14 stroke-[1.8] text-[#ef5b5b]" />
        </div>

        <h3 className="mb-4 font-display text-[2.1rem] font-semibold tracking-[-0.04em] text-slate-800 dark:text-slate-100">
          Connection Error
        </h3>

        <p className="mb-7 max-w-[26rem] text-base leading-relaxed text-slate-500 dark:text-slate-400">
          {message || 'Unable to reach the server. Please check your connection and try again.'}
        </p>

        {onRetry && (
          <Button
            onClick={onRetry}
            icon={RefreshCw}
            size="lg"
            className="min-w-[8.5rem] rounded-xl bg-gradient-to-r from-[#7a6df1] to-[#6f7ce9] px-7 py-3 text-base font-semibold text-white shadow-lg shadow-indigo-400/25 hover:brightness-105"
          >
            Retry
          </Button>
        )}
      </div>
    </div>
  )
}
