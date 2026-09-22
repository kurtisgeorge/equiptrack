import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, PackageSearch, UserCircle2 } from 'lucide-react'
import StatusBadge from '../../../components/StatusBadge'
import { Button } from '../../../components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog'
import type { Equipment } from '../../../types/equipment'

// ─── Types ──────────────────────────────────────────────────────────────────

type Group = {
  name: string
  category: string
  items: Equipment[]
  counts: { available: number; in_use: number; maintenance: number }
}

export type EquipmentGroupGridProps = {
  equipment: Equipment[]
  getDetailPath: (item: Equipment) => string
  getDetailState?: (item: Equipment) => unknown
  renderItemActions?: (item: Equipment) => React.ReactNode
}

// ─── Status pill ─────────────────────────────────────────────────────────────

const PILL_STYLES = {
  available: {
    wrap: 'text-emerald-700 bg-emerald-50 border-emerald-100 dark:text-emerald-300 dark:bg-emerald-900/40 dark:border-emerald-800',
    dot: 'bg-emerald-500 dark:bg-emerald-400',
    label: 'Available',
  },
  in_use: {
    wrap: 'text-blue-700 bg-blue-50 border-blue-100 dark:text-blue-300 dark:bg-blue-900/40 dark:border-blue-800',
    dot: 'bg-blue-500 dark:bg-blue-400',
    label: 'In Use',
  },
  maintenance: {
    wrap: 'text-amber-700 bg-amber-50 border-amber-100 dark:text-amber-300 dark:bg-amber-900/40 dark:border-amber-800',
    dot: 'bg-amber-500 dark:bg-amber-400',
    label: 'Maintenance',
  },
} as const

function StatusPill({ type, count }: { type: keyof typeof PILL_STYLES; count: number }) {
  if (count === 0) return null
  const s = PILL_STYLES[type]
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-semibold rounded-full px-2 py-0.5 border ${s.wrap}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />
      {count} {s.label}
    </span>
  )
}

// ─── Group tile (closed card) ────────────────────────────────────────────────

function GroupTile({
  group,
  onClick,
}: {
  group: Group
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-150 p-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 group"
    >
      {/* Name + count + chevron */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm leading-snug line-clamp-2 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">
            {group.name}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{group.category}</p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
          <span className="min-w-[22px] text-center text-[11px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-full px-2 py-0.5">
            {group.items.length}
          </span>
          <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
        </div>
      </div>

      {/* Status count pills */}
      <div className="flex flex-wrap gap-1.5 mt-3">
        <StatusPill type="available" count={group.counts.available} />
        <StatusPill type="in_use" count={group.counts.in_use} />
        <StatusPill type="maintenance" count={group.counts.maintenance} />
      </div>
    </button>
  )
}

// ─── Units overlay (Dialog) ──────────────────────────────────────────────────

function GroupDialog({
  group,
  open,
  onClose,
  getDetailPath,
  getDetailState,
  renderItemActions,
}: {
  group: Group | null
  open: boolean
  onClose: () => void
  getDetailPath: (item: Equipment) => string
  getDetailState?: (item: Equipment) => unknown
  renderItemActions?: (item: Equipment) => React.ReactNode
}) {
  if (!group) return null

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg w-full p-0 overflow-hidden gap-0">
        {/* Header */}
        <DialogHeader className="px-5 pt-5 pb-4 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-start justify-between gap-3 pr-6">
            <div className="min-w-0">
              <DialogTitle className="text-base font-semibold text-slate-900 dark:text-slate-100 leading-snug">
                {group.name}
              </DialogTitle>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{group.category}</p>
            </div>
            <span className="shrink-0 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-full px-2.5 py-1 mt-0.5">
              {group.items.length} {group.items.length === 1 ? 'unit' : 'units'}
            </span>
          </div>

          {/* Status summary pills */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            <StatusPill type="available" count={group.counts.available} />
            <StatusPill type="in_use" count={group.counts.in_use} />
            <StatusPill type="maintenance" count={group.counts.maintenance} />
          </div>
        </DialogHeader>

        {/* Unit list */}
        <div className="overflow-y-auto" style={{ maxHeight: '60vh' }}>
          {group.items.map((item, idx) => (
            <div
              key={item.id}
              className={`flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${
                idx < group.items.length - 1 ? 'border-b border-slate-100 dark:border-slate-700' : ''
              }`}
            >
              {/* Asset info */}
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500 leading-tight truncate">
                  {item.qrCode}
                </p>
                <div className="mt-1">
                  <StatusBadge status={item.status} />
                </div>
                {item.assignedToName && (
                  <div className="flex items-center gap-1 mt-1">
                    <UserCircle2 className="h-3 w-3 text-slate-400 shrink-0" />
                    <span className="text-[11px] text-slate-500 truncate">{item.assignedToName}</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5 shrink-0">
                {renderItemActions?.(item)}
                <Button
                  asChild
                  size="sm"
                  variant="secondary"
                  className="h-8 px-3 text-xs font-medium"
                  onClick={onClose}
                >
                  <Link to={getDetailPath(item)} state={getDetailState?.(item)}>
                    View
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Grid ────────────────────────────────────────────────────────────────────

export default function EquipmentGroupGrid({
  equipment,
  getDetailPath,
  getDetailState,
  renderItemActions,
}: EquipmentGroupGridProps) {
  const [activeGroup, setActiveGroup] = useState<Group | null>(null)

  const groups = useMemo<Group[]>(() => {
    const map = new Map<string, Equipment[]>()
    for (const item of equipment) {
      const arr = map.get(item.name) ?? []
      arr.push(item)
      map.set(item.name, arr)
    }
    return Array.from(map.entries()).map(([name, items]) => ({
      name,
      category: items[0].category,
      items,
      counts: {
        available: items.filter((i) => i.status === 'available').length,
        in_use: items.filter((i) => i.status === 'in_use').length,
        maintenance: items.filter((i) => i.status === 'maintenance').length,
      },
    }))
  }, [equipment])

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400 dark:text-slate-500">
        <PackageSearch className="h-10 w-10 opacity-40" />
        <p className="text-sm font-medium">No equipment matches your filters</p>
        <p className="text-xs">Try broadening your search or changing filters.</p>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {groups.map((group) => (
          <GroupTile
            key={group.name}
            group={group}
            onClick={() => setActiveGroup(group)}
          />
        ))}
      </div>

      <GroupDialog
        group={activeGroup}
        open={activeGroup !== null}
        onClose={() => setActiveGroup(null)}
        getDetailPath={getDetailPath}
        getDetailState={getDetailState}
        renderItemActions={renderItemActions}
      />
    </>
  )
}
