export function formatTime12Hour(time24) {
  if (!time24) return ''
  const trimmed = String(time24).trim()
  if (/AM|PM/i.test(trimmed)) return trimmed
  const [hours, minutes] = trimmed.split(':').map(Number)
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return trimmed
  const period = hours >= 12 ? 'PM' : 'AM'
  const h = hours % 12 || 12
  return `${String(h).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${period}`
}

/** Converts 12-hour picker values to 24-hour HH:mm for the API. */
export function to24HourTime(hour12, minute, period) {
  if (!hour12 || minute === '' || minute == null || !period) return ''
  let hours = parseInt(hour12, 10)
  const minutes = parseInt(minute, 10)
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return ''
  const p = String(period).toUpperCase()
  if (p === 'AM') {
    if (hours === 12) hours = 0
  } else if (p === 'PM') {
    if (hours !== 12) hours += 12
  }
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

const hourOptions = Array.from({ length: 12 }, (_, i) => {
  const value = String(i + 1).padStart(2, '0')
  return { value, label: value }
})

const minuteOptions = Array.from({ length: 60 }, (_, i) => {
  const value = String(i).padStart(2, '0')
  return { value, label: value }
})

export const TIME_PICKER_HOUR_OPTIONS = [{ value: '', label: 'HH' }, ...hourOptions]
export const TIME_PICKER_MINUTE_OPTIONS = [{ value: '', label: 'MM' }, ...minuteOptions]
export const TIME_PICKER_PERIOD_OPTIONS = [
  { value: 'AM', label: 'AM' },
  { value: 'PM', label: 'PM' },
]
