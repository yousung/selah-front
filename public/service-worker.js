const CACHE_NAME = 'selah-app-v1'
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icon.png', '/icon-192.png', '/icon-512.png']

// ── IDB helpers (SW context) ──────────────────────────────────────────────────

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

// ── OPFS Range 206 serving ────────────────────────────────────────────────────

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

    const rangeHeader = request.headers.get('Range')
    if (rangeHeader) {
      const match = rangeHeader.match(/bytes=(\d+)-(\d*)/)
      if (match) {
        const start = parseInt(match[1], 10)
        const end = match[2] ? parseInt(match[2], 10) : file.size - 1
        const chunk = file.slice(start, end + 1)
        return new Response(chunk, {
          status: 206,
          headers: {
            'Content-Type': entry.mimeType,
            'Content-Range': `bytes ${start}-${end}/${file.size}`,
            'Content-Length': String(end - start + 1),
            'Accept-Ranges': 'bytes',
          },
        })
      }
    }

    return new Response(file, {
      status: 200,
      headers: {
        'Content-Type': entry.mimeType,
        'Content-Length': String(file.size),
        'Accept-Ranges': 'bytes',
      },
    })
  } catch {
    return new Response('Not found', { status: 404 })
  }
}

// ── App shell ─────────────────────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return

  // OPFS media serving — intercept before cache/network logic
  const mediaMatch = url.pathname.match(/^\/media\/([^/]+)$/)
  if (mediaMatch) {
    event.respondWith(serveMediaFromOpfs(mediaMatch[1], request))
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('/index.html')))
    return
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone()
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
        return response
      })
      .catch(() => caches.match(request)),
  )
})
