import { format, parseISO, isValid } from 'date-fns'

const TWELVE_HOUR_PATTERN = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i
const TWENTY_FOUR_HOUR_PATTERN = /^(\d{1,2}):(\d{2})(?::\d{2})?$/

/**
 * Formats notification time for display as hh:mm AM/PM.
 * Leaves values that already include AM/PM unchanged.
 */
export function formatNotificationTime(timeStr) {
  if (timeStr == null || timeStr === '') return '—'

  const trimmed = String(timeStr).trim()
  if (!trimmed) return '—'

  if (TWELVE_HOUR_PATTERN.test(trimmed)) {
    return trimmed
  }

  if (trimmed.includes('T')) {
    const parsed = parseISO(trimmed)
    if (isValid(parsed)) {
      return format(parsed, 'hh:mm a')
    }
  }

  const isoDate = parseISO(trimmed)
  if (isValid(isoDate) && trimmed.includes('-')) {
    return format(isoDate, 'hh:mm a')
  }

  const match24 = trimmed.match(TWENTY_FOUR_HOUR_PATTERN)
  if (match24) {
    const hours = parseInt(match24[1], 10)
    const minutes = match24[2]

    if (hours >= 0 && hours <= 23) {
      const period = hours >= 12 ? 'PM' : 'AM'
      const hour12 = hours % 12 || 12
      return `${String(hour12).padStart(2, '0')}:${minutes} ${period}`
    }
  }

  return trimmed
}

export function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr
  return isValid(d) ? format(d, 'MMM d, yyyy') : dateStr
}

export function formatTime(timeStr) {
  return formatNotificationTime(timeStr)
}

export function formatDateTime(dateStr, timeStr) {
  return `${formatDate(dateStr)} at ${formatTime(timeStr)}`
}

export function capitalize(str) {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}
