const CACHE_NAME = 'volturaos-v2'
const APP_SHELL = ['/', '/customers', '/estimates', '/jobs', '/invoices']
const QUEUE_DB = 'volturaos-queue'
const QUEUE_STORE = 'requests'

// ── Install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  )
  self.skipWaiting()
})

// ── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const clone = res.clone()
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
        return res
      })
      .catch(() => caches.match(event.request))
  )
})

// ── IndexedDB helpers ─────────────────────────────────────────────────────────
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(QUEUE_DB, 1)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(QUEUE_STORE, { keyPath: 'id', autoIncrement: true })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function enqueue(entry) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, 'readwrite')
    tx.objectStore(QUEUE_STORE).add(entry)
    tx.oncomplete = resolve
    tx.onerror = () => reject(tx.error)
  })
}

async function dequeueAll() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, 'readwrite')
    const store = tx.objectStore(QUEUE_STORE)
    const getAll = store.getAll()
    getAll.onsuccess = () => {
      store.clear()
      resolve(getAll.result)
    }
    getAll.onerror = () => reject(getAll.error)
  })
}

// ── Background Sync ───────────────────────────────────────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-queue') {
    event.waitUntil(flushQueue())
  }
})

async function flushQueue() {
  const entries = await dequeueAll()
  for (const entry of entries) {
    try {
      await fetch(entry.url, {
        method: entry.method,
        headers: entry.headers,
        body: entry.body,
      })
    } catch {
      // Re-queue on failure
      await enqueue(entry)
    }
  }
}

// ── Message handler (called by app to queue offline requests) ─────────────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'QUEUE_REQUEST') {
    enqueue(event.data.payload).then(() => {
      // Register a background sync to flush when back online
      self.registration.sync.register('sync-queue').catch(() => {
        // Background sync not supported — try immediately
        flushQueue()
      })
    })
  }
})
