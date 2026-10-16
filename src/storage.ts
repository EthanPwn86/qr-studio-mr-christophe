import { validDesign, validateUrl, type Entry } from './model'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('qr-studio', 1)
    request.onupgradeneeded = () => request.result.createObjectStore('history', { keyPath: 'id' })
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
    request.onblocked = () => reject(new Error('Le stockage est occupé par un autre onglet.'))
  })
}
export async function history(): Promise<Entry[]> {
  const db = await openDb()
  try {
    return await new Promise((resolve, reject) => {
      const request = db.transaction('history').objectStore('history').getAll()
      request.onsuccess = () => resolve(request.result.filter((entry: Entry) =>
        typeof entry.id === 'string' && typeof entry.url === 'string' && !!validateUrl(entry.url).url
        && validDesign(entry.design) && Number.isFinite(entry.created)
        && typeof entry.thumbnail === 'string' && entry.thumbnail.startsWith('data:image/png;base64,')
      ).sort((a: Entry, b: Entry) => b.created - a.created))
      request.onerror = () => reject(request.error)
    })
  } finally { db.close() }
}
export async function saveEntry(entry: Entry): Promise<void> {
  const db = await openDb()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('history', 'readwrite')
      const store = tx.objectStore('history')
      store.put(entry)
      const request = store.getAll()
      request.onsuccess = () => {
        const sorted = (request.result as Entry[]).sort((a, b) => b.created - a.created)
        sorted.slice(50).forEach(old => store.delete(old.id))
      }
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
    })
  } finally { db.close() }
}
export async function deleteEntries(id?: string): Promise<void> {
  const db = await openDb()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('history', 'readwrite')
      const store = tx.objectStore('history')
      if (id) store.delete(id); else store.clear()
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
    })
  } finally { db.close() }
}
