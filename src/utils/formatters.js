import { format, parseISO, isValid } from 'date-fns'

export function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr
  return isValid(d) ? format(d, 'MMM d, yyyy') : dateStr
}

export function formatTime(timeStr) {
  if (!timeStr) return '—'
  return timeStr
}

export function formatDateTime(dateStr, timeStr) {
  return `${formatDate(dateStr)} at ${formatTime(timeStr)}`
}

export function capitalize(str) {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}
