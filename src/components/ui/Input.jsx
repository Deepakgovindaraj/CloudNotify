import { cn } from '@/utils/cn'

export function Input({ label, error, hint, className, id, ...props }) {
  const inputId = id || props.name

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          'w-full rounded-xl border bg-white px-4 py-2.5 text-sm transition-all duration-200',
          'border-slate-200 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-100',
          'placeholder:text-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20',
          error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
          className
        )}
        aria-invalid={!!error}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        {...props}
      />
      {error && (
        <p id={`${inputId}-error`} className="text-xs text-red-500" role="alert">
          {error}
        </p>
      )}
      {hint && !error && (
        <p id={`${inputId}-hint`} className="text-xs text-slate-500">
          {hint}
        </p>
      )}
    </div>
  )
}

export function Textarea({ label, error, className, id, rows = 4, ...props }) {
  const inputId = id || props.name

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        rows={rows}
        className={cn(
          'w-full resize-none rounded-xl border bg-white px-4 py-2.5 text-sm transition-all duration-200',
          'border-slate-200 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-100',
          'placeholder:text-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20',
          error && 'border-red-500',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-500" role="alert">{error}</p>}
    </div>
  )
}

export function Select({ label, error, options, className, id, ...props }) {
  const inputId = id || props.name

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          {label}
        </label>
      )}
      <select
        id={inputId}
        className={cn(
          'w-full rounded-xl border bg-white px-4 py-2.5 text-sm transition-all',
          'border-slate-200 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-100',
          'focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20',
          className
        )}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
