const SHELL_CACHE = 'cloudnotify-shell-v1'
const ASSET_CACHE = 'cloudnotify-assets-v1'
const APP_SHELL = ['/', '/index.html']
const INSTALL_ASSETS = [
  '/manifest.webmanifest',
  '/favicon.svg',
  '/icons/cloudnotify-192.png',
  '/icons/cloudnotify-512.png',
  '/icons/cloudnotify-180.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const shellCache = await caches.open(SHELL_CACHE)
    const response = await fetch('/index.html', { cache: 'no-cache' })
    if (!response.ok) {
      throw new Error(`Unable to cache the app shell: HTTP ${response.status}`)
    }

    await shellCache.put('/index.html', response.clone())
    await shellCache.put('/', response.clone())

    const html = await response.text()
    const appAssets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)]
      .map((match) => match[1])
    const assetCache = await caches.open(ASSET_CACHE)

    await Promise.all(appAssets.map(async (url) => {
      const assetResponse = await fetch(url)
      if (!assetResponse.ok) {
        throw new Error(`Unable to cache app asset ${url}: HTTP ${assetResponse.status}`)
      }
      await assetCache.put(url, assetResponse)
    }))

    await shellCache.addAll(INSTALL_ASSETS)
  })())
})

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keep = new Set([SHELL_CACHE, ASSET_CACHE])
    const cacheNames = await caches.keys()
    await Promise.all(cacheNames
      .filter((name) => name.startsWith('cloudnotify-') && !keep.has(name))
      .map((name) => caches.delete(name)))
    await self.clients.claim()
  })())
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  if (request.method !== 'GET' || url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        return await fetch(request)
      } catch {
        return await caches.match('/index.html') || Response.error()
      }
    })())
    return
  }

  const isAppAsset = url.pathname.startsWith('/assets/')
    || url.pathname.startsWith('/icons/')
    || url.pathname === '/manifest.webmanifest'
    || url.pathname === '/favicon.svg'

  if (!isAppAsset) return

  event.respondWith((async () => {
    const cached = await caches.match(request)
    if (cached) return cached

    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(ASSET_CACHE)
      await cache.put(request, response.clone())
    }
    return response
  })())
})
