import { useState, useEffect, useCallback } from 'react'

export type WidgetDef = {
  id: string
  label: string
  description: string
  /** Layout hint — 'wide' spans the full grid row, 'card' is a standard 1-column tile */
  size?: 'card' | 'wide'
  /** Whether this widget is visible when the user first loads the dashboard. Defaults to true. */
  defaultVisible?: boolean
}

type StoredItem = { id: string; visible: boolean }

function readFromStorage(key: string): StoredItem[] {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (item): item is StoredItem =>
        typeof item === 'object' &&
        item !== null &&
        typeof item.id === 'string' &&
        typeof item.visible === 'boolean',
    )
  } catch {
    return []
  }
}

function writeToStorage(key: string, items: StoredItem[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(items))
  } catch {
    // silently ignore
  }
}

function buildMerged(
  stored: StoredItem[],
  defaults: WidgetDef[],
): Array<WidgetDef & { visible: boolean }> {
  const knownIds = new Set(defaults.map((d) => d.id))
  const filtered = stored.filter((s) => knownIds.has(s.id))
  const storedIds = new Set(filtered.map((s) => s.id))
  const appended: StoredItem[] = defaults
    .filter((d) => !storedIds.has(d.id))
    .map((d) => ({ id: d.id, visible: d.defaultVisible !== false }))
  const merged = [...filtered, ...appended]
  return merged.map((s) => {
    const def = defaults.find((d) => d.id === s.id)!
    return { ...def, visible: s.visible }
  })
}

export function useDashboardLayout(
  role: string,
  userId: string,
  defaults: WidgetDef[],
): {
  orderedWidgets: Array<WidgetDef & { visible: boolean }>
  isVisible: (id: string) => boolean
  moveUp: (id: string) => void
  moveDown: (id: string) => void
  toggleVisible: (id: string) => void
  reset: () => void
  reorderTo: (fromId: string, toId: string) => void
  swap: (currentId: string, newId: string) => void
} {
  const storageKey = `et-dash-v4-${role}-${userId}`

  const [stored, setStored] = useState<StoredItem[]>(() =>
    readFromStorage(storageKey),
  )

  // Sync when another tab (or same-window dispatch) changes the key
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === storageKey) {
        setStored(readFromStorage(storageKey))
      }
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [storageKey])

  const orderedWidgets = buildMerged(stored, defaults)

  const isVisible = useCallback(
    (id: string) => {
      const w = buildMerged(stored, defaults).find((x) => x.id === id)
      return w?.visible ?? true
    },
    [stored, defaults],
  )

  const persist = useCallback(
    (next: StoredItem[]) => {
      writeToStorage(storageKey, next)
      setStored(next)
    },
    [storageKey],
  )

  const moveUp = useCallback(
    (id: string) => {
      const items = buildMerged(stored, defaults).map((w) => ({
        id: w.id,
        visible: w.visible,
      }))
      const idx = items.findIndex((item) => item.id === id)
      if (idx <= 0) return
      const next = [...items]
      ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
      persist(next)
    },
    [stored, defaults, persist],
  )

  const moveDown = useCallback(
    (id: string) => {
      const items = buildMerged(stored, defaults).map((w) => ({
        id: w.id,
        visible: w.visible,
      }))
      const idx = items.findIndex((item) => item.id === id)
      if (idx === -1 || idx >= items.length - 1) return
      const next = [...items]
      ;[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
      persist(next)
    },
    [stored, defaults, persist],
  )

  const toggleVisible = useCallback(
    (id: string) => {
      const items = buildMerged(stored, defaults).map((w) => ({
        id: w.id,
        visible: w.visible,
      }))
      const idx = items.findIndex((item) => item.id === id)
      if (idx === -1) return
      const next = [...items]
      next[idx] = { ...next[idx], visible: !next[idx].visible }
      persist(next)
    },
    [stored, defaults, persist],
  )

  const reset = useCallback(() => {
    try {
      localStorage.removeItem(storageKey)
    } catch {
      // silently ignore
    }
    setStored([])
  }, [storageKey])

  const reorderTo = useCallback((fromId: string, toId: string) => {
    if (fromId === toId) return
    const items = buildMerged(stored, defaults).map((w) => ({ id: w.id, visible: w.visible }))
    const fromIdx = items.findIndex((i) => i.id === fromId)
    const toIdx = items.findIndex((i) => i.id === toId)
    if (fromIdx === -1 || toIdx === -1) return
    const next = [...items]
    const [moved] = next.splice(fromIdx, 1)
    next.splice(toIdx, 0, moved)
    persist(next)
  }, [stored, defaults, persist])

  const swap = useCallback((currentId: string, newId: string) => {
    const items = buildMerged(stored, defaults).map((w) => ({ id: w.id, visible: w.visible }))
    const next = items.map((item) => {
      if (item.id === currentId) return { id: newId, visible: true }
      if (item.id === newId) return { id: currentId, visible: false }
      return item
    })
    persist(next)
  }, [stored, defaults, persist])

  return { orderedWidgets, isVisible, moveUp, moveDown, toggleVisible, reset, reorderTo, swap }
}
