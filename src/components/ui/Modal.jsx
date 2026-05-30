import { useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/utils/cn'
import { Button } from './Button'

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  variant = 'default',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  loading,
}) {
  useEffect(() => {
    if (!isOpen) return
    const handleEsc = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', handleEsc)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const icons = {
    success: '✓',
    danger: '!',
    default: '?',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={cn(
          'relative w-full max-w-md glass-card p-6 animate-scale-in shadow-2xl',
          'border border-slate-200/50 dark:border-slate-700/50'
        )}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {variant !== 'default' && (
          <div
            className={cn(
              'mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full text-xl font-bold',
              variant === 'success' && 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20',
              variant === 'danger' && 'bg-red-100 text-red-600 dark:bg-red-500/20'
            )}
          >
            {icons[variant]}
          </div>
        )}

        {title && <h2 className="font-display text-lg font-semibold text-center mb-2">{title}</h2>}
        <div className="text-sm text-slate-600 dark:text-slate-400 text-center">{children}</div>

        {(onConfirm || onClose) && (
          <div className="mt-6 flex gap-3 justify-center">
            <Button variant="secondary" onClick={onClose} disabled={loading}>
              {cancelLabel}
            </Button>
            {onConfirm && (
              <Button
                variant={variant === 'danger' ? 'danger' : 'primary'}
                onClick={onConfirm}
                loading={loading}
              >
                {confirmLabel}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
