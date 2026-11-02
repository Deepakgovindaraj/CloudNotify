import { cn } from '@/utils/cn'

export function NeonReveal({ enabled, children, className }) {
  return (
    <div
      className={cn('neon-reveal', className)}
      data-active={enabled ? 'true' : 'false'}
    >
      <div className="neon-reveal__light" aria-hidden="true" />
      <div className="neon-reveal__content">{children}</div>
    </div>
  )
}
