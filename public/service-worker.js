const CACHE_NAME = 'selah-app-v2'
const APP_SHELL_PATHS = ['', 'index.html', 'manifest.webmanifest', 'icon.png', 'icon-192.png', 'icon-512.png']

// -- URL helpers --------------------------------------------------------------

const scopeUrl = (path) => new URL(path, self.registration.scope).toString()
const SCOPE_PATH = new URL(self.registration.scope).pathname.replace(/\/$/, '')

function getPathInScope(url) {
  if (SCOPE_PATH && url.pathname.startsWith(`${SCOPE_PATH}/`)) {
    return url.pathname.slice(SCOPE_PATH.length)
  }
  return url.pathname
}

function extractAssetUrls(html) {
  const urls = new Set()
  const attrPattern = /\b(?:src|href)=["']([^"']+)["']/g
  let match = attrPattern.exec(html)

  while (match) {
    const raw = match[1]
    if (
      raw &&
      !raw.startsWith('http:') &&
      !raw.startsWith('https:') &&
      !raw.startsWith('//') &&
      !raw.startsWith('data:')
    ) {
      const url = new URL(raw, self.registration.scope)
      if (
        url.origin === self.location.origin &&
        (url.pathname.includes('/assets/') ||
          url.pathname.endsWith('.js') ||
          url.pathname.endsWith('.css') ||
          url.pathname.endsWith('.woff2'))
      ) {
        urls.add(url.toString())
      }
    }
    match = attrPattern.exec(html)
  }

  return [...urls]
}

async function cacheAppShell() {
  const cache = await caches.open(CACHE_NAME)
  await Promise.allSettled(APP_SHELL_PATHS.map((path) => cache.add(scopeUrl(path))))

  try {
    const indexUrl = scopeUrl('index.html')
    const response = await fetch(indexUrl, { cache: 'no-store' })
    if (!response.ok) return

    const html = await response.clone().text()
    await cache.put(indexUrl, response.clone())
    await cache.put(scopeUrl(''), response.clone())
    await Promise.allSettled(extractAssetUrls(html).map((url) => cache.add(url)))
  } catch {}

  const cachedIndex = await cache.match(scopeUrl('index.html')) || await cache.match(scopeUrl(''))
  if (!cachedIndex) throw new Error('App shell was not cached')
}

// -- IDB helpers (SW context) -------------------------------------------------

function swOpenDb() {
  return new Promise((resolve, reject) => {
    const req = self.indexedDB.open('selah-media', 1)
    req.onupgradeneeded = (e) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains('files')) {
        db.createObjectStore('files', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('positions')) {
        db.createObjectStore('positions', { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function swGetFileEntry(id) {
  const db = await swOpenDb()
  return new Promise((resolve, reject) => {
    const req = db.transaction('files', 'readonly').objectStore('files').get(id)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

// -- OPFS Range 206 serving ---------------------------------------------------

function parseRange(rangeHeader, size) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim())
  if (!match) return null

  const startRaw = match[1]
  const endRaw = match[2]
  if (!startRaw && !endRaw) return null

  let start
  let end
  if (!startRaw) {
    const suffixLength = Number(endRaw)
    if (!Number.isInteger(suffixLength) || suffixLength <= 0) return null
    start = Math.max(size - suffixLength, 0)
    end = size - 1
  } else {
    start = Number(startRaw)
    end = endRaw ? Number(endRaw) : size - 1
  }

  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < start || start >= size) {
    return null
  }

  return { start, end: Math.min(end, size - 1) }
}

async function serveMediaFromOpfs(id, request) {
  if (!self.navigator?.storage?.getDirectory) {
    return new Response('OPFS not supported', { status: 404 })
  }

  try {
    const entry = await swGetFileEntry(id)
    if (!entry || entry.status !== 'complete') {
      return new Response('Not cached', { status: 404 })
    }

    const root = await navigator.storage.getDirectory()
    const mediaDir = await root.getDirectoryHandle('media', { create: false })
    const fileHandle = await mediaDir.getFileHandle(entry.filename)
    const file = await fileHandle.getFile()
    const contentType = entry.mimeType || file.type || 'application/octet-stream'

    const rangeHeader = request.headers.get('Range')
    if (rangeHeader) {
      const range = parseRange(rangeHeader, file.size)
      if (!range) {
        return new Response(null, {
          status: 416,
          headers: {
            'Content-Range': `bytes */${file.size}`,
            'Accept-Ranges': 'bytes',
          },
        })
      }

      const chunk = file.slice(range.start, range.end + 1, contentType)
      return new Response(chunk, {
        status: 206,
        headers: {
          'Content-Type': contentType,
          'Content-Range': `bytes ${range.start}-${range.end}/${file.size}`,
          'Content-Length': String(range.end - range.start + 1),
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'no-store',
        },
      })
    }

    return new Response(file, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(file.size),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-store',
      },
    })
  } catch {
    return new Response('Not found', { status: 404 })
  }
}

// -- App shell ----------------------------------------------------------------

async function handleNavigation(request) {
  const cache = await caches.open(CACHE_NAME)
  try {
    const response = await fetch(request)
    if (response.ok) cache.put(request, response.clone())
    return response
  } catch {
    return (
      (await caches.match(request)) ||
      (await caches.match(scopeUrl('index.html'))) ||
      (await caches.match(scopeUrl(''))) ||
      new Response('Offline', { status: 503 })
    )
  }
}

async function handleStaticAsset(request) {
  const cached = await caches.match(request)
  if (cached) return cached

  const response = await fetch(request)
  if (response.ok) {
    const cache = await caches.open(CACHE_NAME)
    cache.put(request, response.clone())
  }
  return response
}

self.addEventListener('install', (event) => {
  event.waitUntil(cacheAppShell().then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names
          .filter((name) => name.startsWith('selah-app-') && name !== CACHE_NAME)
          .map((name) => caches.delete(name)),
      ))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  const scopedPath = getPathInScope(url)
  if (url.pathname.startsWith('/api/') || scopedPath.startsWith('/api/')) return

  const mediaMatch = scopedPath.match(/^\/media\/([^/]+)$/)
  if (mediaMatch) {
    event.respondWith(serveMediaFromOpfs(decodeURIComponent(mediaMatch[1]), request))
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request))
    return
  }

  if (['script', 'style', 'worker', 'font', 'image', 'manifest'].includes(request.destination)) {
    event.respondWith(handleStaticAsset(request))
  }
})
