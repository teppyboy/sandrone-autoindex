import type { StoredWebDavAuth, StoredWebDavAuthRecord, WebDavStorageScope } from '@/lib/webdav/types'

const STORAGE_KEY = 'sandrone-webdav-auth'

function encodeBase64Utf8(value: string): string {
  const bytes = new TextEncoder().encode(value)
  let binary = ''

  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  return btoa(binary)
}

function getStorage(scope: WebDavStorageScope): Storage | null {
  if (typeof window === 'undefined') return null

  try {
    return scope === 'local' ? window.localStorage : window.sessionStorage
  } catch {
    return null
  }
}

function safelyRun(action: () => void): void {
  try {
    action()
  } catch {
    // ignore storage errors
  }
}

export function createBasicAuthorization(username: string, password: string): string {
  return `Basic ${encodeBase64Utf8(`${username}:${password}`)}`
}

export function readStoredWebDavAuth(): StoredWebDavAuthRecord | null {
  for (const scope of ['session', 'local'] as const) {
    const storage = getStorage(scope)
    if (!storage) continue

    try {
      const raw = storage.getItem(STORAGE_KEY)
      if (!raw) continue

      const parsed = JSON.parse(raw) as Partial<StoredWebDavAuth>
      if (typeof parsed.username !== 'string' || typeof parsed.authorization !== 'string') continue
      if (!parsed.authorization.startsWith('Basic ')) continue

      return {
        username: parsed.username,
        authorization: parsed.authorization,
        storage: scope,
      }
    } catch {
      continue
    }
  }

  return null
}

export function persistWebDavAuth(auth: StoredWebDavAuth, remember: boolean): void {
  clearStoredWebDavAuth()

  const storage = getStorage(remember ? 'local' : 'session')
  if (!storage) return

  safelyRun(() => {
    storage.setItem(STORAGE_KEY, JSON.stringify(auth))
  })
}

export function clearStoredWebDavAuth(): void {
  for (const scope of ['session', 'local'] as const) {
    const storage = getStorage(scope)
    if (!storage) continue

    safelyRun(() => {
      storage.removeItem(STORAGE_KEY)
    })
  }
}
