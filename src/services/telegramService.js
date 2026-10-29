import api from './api'

function getTelegramWebApp() {
  return window.Telegram?.WebApp || null
}

export function isTelegramMiniApp() {
  const webApp = getTelegramWebApp()
  return Boolean(webApp?.initData)
}

export function initializeTelegramWebApp() {
  const webApp = getTelegramWebApp()
  if (!webApp) return false

  webApp.ready()
  webApp.expand()
  return Boolean(webApp.initData)
}

export function openExternalAuthentication() {
  const webApp = getTelegramWebApp()
  if (!webApp || !isTelegramMiniApp()) {
    throw new Error('Telegram Web Apps SDK is not available')
  }

  webApp.openLink(`${window.location.origin}/auth`)
}

export const telegramService = {
  async createLinkCode(email) {
    const response = await api.post('/telegram/link-code', { email })
    return response.data
  }
}