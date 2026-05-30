import { WifiOff, RefreshCw } from 'lucide-react'
import { Button } from './Button'

export function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center animate-fade-in">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-red-100 dark:bg-red-500/10">
        <WifiOff className="h-10 w-10 text-red-500" />
      </div>
      <h3 className="font-display text-xl font-semibold mb-2">Connection Error</h3>
      <p className="max-w-sm text-sm text-slate-500 mb-6">
        {message || 'Unable to reach the server. Please check your connection and try again.'}
      </p>
      {onRetry && (
        <Button onClick={onRetry} icon={RefreshCw}>
          Retry
        </Button>
      )}
    </div>
  )
}
