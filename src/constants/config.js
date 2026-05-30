export const APP_NAME = import.meta.env.VITE_APP_NAME || 'CloudNotify'
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

export const CHANNELS = [
  { value: 'telegram', label: 'Telegram', icon: 'Send' },
  { value: 'gmail', label: 'Gmail', icon: 'Mail' },
  { value: 'both', label: 'Both', icon: 'Layers' },
]

export const RECURRENCE_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
]

export const STATUS_OPTIONS = ['all', 'pending', 'sent', 'failed']

export const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Asia/Kolkata',
  'Asia/Tokyo',
  'Australia/Sydney',
]

export const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'hi', label: 'Hindi' },
]
