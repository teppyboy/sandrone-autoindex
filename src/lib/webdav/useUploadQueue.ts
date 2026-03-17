import { useCallback, useState } from 'react'

import type { UploadItem } from '@/lib/webdav/types'

function createUploadId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function useUploadQueue() {
  const [items, setItems] = useState<UploadItem[]>([])
  const [overwriteExisting, setOverwriteExisting] = useState(false)

  const addFiles = useCallback((files: File[] | FileList) => {
    const nextFiles = Array.from(files)
    if (nextFiles.length === 0) return

    setItems(currentItems => [
      ...currentItems,
      ...nextFiles.map(file => ({
        id: createUploadId(),
        file,
        status: 'pending' as const,
        progress: 0,
        message: null,
      })),
    ])
  }, [])

  const updateItem = useCallback((id: string, patch: Partial<Omit<UploadItem, 'id' | 'file'>>) => {
    setItems(currentItems =>
      currentItems.map(item => (item.id === id ? { ...item, ...patch } : item)),
    )
  }, [])

  const removeItem = useCallback((id: string) => {
    setItems(currentItems => currentItems.filter(item => item.id !== id))
  }, [])

  const clearFinished = useCallback(() => {
    setItems(currentItems =>
      currentItems.filter(item => item.status === 'pending' || item.status === 'checking' || item.status === 'uploading'),
    )
  }, [])

  const resetItem = useCallback((id: string) => {
    setItems(currentItems =>
      currentItems.map(item =>
        item.id === id
          ? {
              ...item,
              status: 'pending',
              progress: 0,
              message: null,
            }
          : item,
      ),
    )
  }, [])

  const clearAll = useCallback(() => {
    setItems([])
  }, [])

  return {
    items,
    overwriteExisting,
    setOverwriteExisting,
    addFiles,
    updateItem,
    removeItem,
    clearFinished,
    resetItem,
    clearAll,
  }
}
