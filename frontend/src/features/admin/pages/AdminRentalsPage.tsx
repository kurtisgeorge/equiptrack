import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  ArrowLeft, Check, X, RotateCcw, ClipboardList,
  User, Calendar, FileText, Package,
  AlertTriangle, CheckCircle2, Search, Users,
  ChevronDown, ChevronUp, Layers,
} from 'lucide-react'
import ErrorState from '../../../components/ErrorState'
import Loader from '../../../components/Loader'
import PageHeader from '../../../components/PageHeader'
import { Button } from '../../../components/ui/button'
import { formatDate } from '../../../lib/utils'
import { listRentals, updateRentalStatus } from '../../../services/rentalService'
import { getAvailableUnitsForType } from '../../../services/availabilityService'
import type { Rental, RentalStatus } from '../../../types/rental'

// ─── Types ────────────────────────────────────────────────────────────────────

type GroupStatus = 'pending' | 'active' | 'returned' | 'rejected' | 'mixed'

type RentalGroup = {
  key: string
  requesterName: string
  requesterId: string
  site: string
  purpose: string
  startDate: string
  endDate?: string
  items: Rental[]
  groupStatus: GroupStatus
}

type ItemDecision = { approve: boolean | null; unitId: string }

// ─── Config ───────────────────────────────────────────────────────────────────

const GROUP_RANK: Record<GroupStatus, number> = {
  pending: 0, active: 1, returned: 2, rejected: 3, mixed: 4,
}

const STATUS_CFG: Record<string, { dot: string; label: string; bg: string; text: string; border: string }> = {
  pending:  { dot: 'bg-orange-400',  label: 'Pending',  bg: 'bg-orange-50 dark:bg-orange-900/20',   text: 'text-orange-700 dark:text-orange-300',   border: 'border-orange-200 dark:border-orange-800'  },
  active:   { dot: 'bg-emerald-500', label: 'Active',   bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800' },
  returned: { dot: 'bg-slate-400',   label: 'Returned', bg: 'bg-slate-50 dark:bg-slate-700/40',     text: 'text-slate-600 dark:text-slate-400',     border: 'border-slate-200 dark:border-slate-600'    },
  rejected: { dot: 'bg-red-400',     label: 'Rejected', bg: 'bg-red-50 dark:bg-red-900/20',         text: 'text-red-700 dark:text-red-300',         border: 'border-red-200 dark:border-red-800'        },
  mixed:    { dot: 'bg-slate-400',   label: 'Mixed',    bg: 'bg-slate-50 dark:bg-slate-700/40',     text: 'text-slate-600 dark:text-slate-400',     border: 'border-slate-200 dark:border-slate-600'    },
}

const ITEM_STATUS_CFG: Record<string, { dot: string; label: string; bg: string; text: string }> = {
  pending:  { dot: 'bg-orange-400',  label: 'Pending',  bg: 'bg-orange-50 dark:bg-orange-900/20',   text: 'text-orange-700 dark:text-orange-300'   },
  active:   { dot: 'bg-emerald-500', label: 'Active',   bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-300' },
  returned: { dot: 'bg-slate-400',   label: 'Returned', bg: 'bg-slate-50 dark:bg-slate-700/40',     text: 'text-slate-600 dark:text-slate-400'     },
  rejected: { dot: 'bg-red-400',     label: 'Rejected', bg: 'bg-red-50 dark:bg-red-900/20',         text: 'text-red-700 dark:text-red-300'         },
}

const STATUS_TABS: Array<{ label: string; value: RentalStatus | 'all' }> = [
  { label: 'All',      value: 'all'      },
  { label: 'Pending',  value: 'pending'  },
  { label: 'Active',   value: 'active'   },
  { label: 'Returned', value: 'returned' },
  { label: 'Rejected', value: 'rejected' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseNotes(raw?: string): { label: string; value: string }[] {
  if (!raw) return []
  return raw.split('\n').map((line) => {
    const colon = line.indexOf(':')
    if (colon === -1) return { label: 'Notes', value: line.trim() }
    return { label: line.slice(0, colon).trim(), value: line.slice(colon + 1).trim() }
  }).filter((l) => l.value)
}

function parsedField(notes: string | undefined, field: string): string {
  const found = parseNotes(notes).find((n) => n.label.toLowerCase() === field.toLowerCase())
  return found?.value ?? ''
}

function deriveGroupStatus(items: Rental[]): GroupStatus {
  const statuses = new Set(items.map((r) => r.status))
  // Any pending items means the group still needs processing
  if (statuses.has('pending')) return 'pending'
  if (statuses.size === 1) {
    const only = [...statuses][0] as RentalStatus
    if (only === 'active' || only === 'approved') return 'active'
    if (only === 'returned') return 'returned'
    if (only === 'rejected') return 'rejected'
  }
  return 'mixed'
}

function groupMatchesFilter(group: RentalGroup, filter: RentalStatus | 'all'): boolean {
  if (filter === 'all') return true
  return group.groupStatus === filter
}

function initials(name: string) {
  return name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()
}

// ─── Unit picker row (per-item, manages its own query) ────────────────────────

function ItemApprovalRow({
  rental,
  decision,
  onSetApprove,
  onSelectUnit,
}: {
  rental: Rental
  decision: ItemDecision
  onSetApprove: (approve: boolean) => void
  onSelectUnit: (unitId: string) => void
}) {
  const unitsQuery = useQuery({
    queryKey: ['available-units', rental.equipmentTypeId, rental.startDate, rental.endDate],
    queryFn: () => getAvailableUnitsForType({
      equipmentTypeId: rental.equipmentTypeId,
      startDate: rental.startDate,
      endDate: rental.endDate,
    }),
    enabled: decision.approve === true,
    staleTime: 30_000,
  })

  const availableUnits = useMemo(
    () => (unitsQuery.data?.units ?? []).filter((u) => u.isAvailable),
    [unitsQuery.data],
  )

  const isApprove = decision.approve === true
  const isReject = decision.approve === false

  return (
    <div className={`rounded-xl border transition-colors ${
      isApprove
        ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-900/10'
        : isReject
          ? 'border-red-200 dark:border-red-900/40 bg-red-50/40 dark:bg-red-900/10'
          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
    }`}>
      {/* Item header row */}
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
        {/* Equipment name */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
            {rental.equipmentName}
          </p>
          <p className={`text-[10px] font-semibold mt-0.5 ${
            isApprove
              ? 'text-emerald-600 dark:text-emerald-400'
              : isReject
                ? 'text-red-500 dark:text-red-400'
                : 'text-slate-400 dark:text-slate-500'
          }`}>
            {isApprove
              ? '\u2713 Will be checked out'
              : isReject
                ? '\u2717 Will be rejected'
                : 'Decision required'}
          </p>
        </div>

        {/* Unit badge once selected */}
        {isApprove && decision.unitId && (
          <span className="shrink-0 font-mono text-xs bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-md">
            {availableUnits.find((u) => u.id === decision.unitId)?.assetTag ?? '\u2026'}
          </span>
        )}

        {/* Explicit Approve / Reject segmented control */}
        <div
          role="group"
          aria-label={`Decision for ${rental.equipmentName}`}
          className="inline-flex shrink-0 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-600"
        >
          <button
            type="button"
            onClick={() => onSetApprove(true)}
            aria-pressed={isApprove}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors ${
              isApprove
                ? 'bg-emerald-500 text-white'
                : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:text-emerald-700 dark:hover:text-emerald-300'
            }`}
          >
            <Check className="h-3.5 w-3.5" />
            Approve
          </button>
          <button
            type="button"
            onClick={() => onSetApprove(false)}
            aria-pressed={isReject}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors border-l border-slate-200 dark:border-slate-600 ${
              isReject
                ? 'bg-red-500 text-white'
                : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-300'
            }`}
          >
            <X className="h-3.5 w-3.5" />
            Reject
          </button>
        </div>
      </div>

      {/* Unit picker — only when approved */}
      {isApprove && (
        <div className="border-t border-emerald-200 dark:border-emerald-800/60 mx-0">
          {unitsQuery.isLoading ? (
            <div className="flex items-center gap-2 px-4 py-2.5 text-xs text-slate-400">
              <Loader label="Loading units…" />
            </div>
          ) : unitsQuery.isError ? (
            <div className="flex items-center gap-2 px-4 py-2.5 text-xs text-red-500">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              Could not load available units.
            </div>
          ) : availableUnits.length === 0 ? (
            <div className="flex items-center gap-2 px-4 py-2.5 text-xs text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              No units available for these dates — consider rejecting this item.
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5 px-4 py-2.5">
              <p className="w-full text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-0.5">
                Assign a unit
              </p>
              {availableUnits.map((unit) => {
                const isSelected = decision.unitId === unit.id
                return (
                  <button
                    key={unit.id}
                    onClick={() => onSelectUnit(unit.id)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-semibold border transition-colors ${
                      isSelected
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300'
                    }`}
                  >
                    {isSelected && <Check className="h-3 w-3" />}
                    {unit.assetTag}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Group detail (right panel) ───────────────────────────────────────────────

function GroupDetail({
  group,
  onActionDone,
}: {
  group: RentalGroup
  onActionDone: () => void
}) {
  const queryClient = useQueryClient()
  const [decisions, setDecisions] = useState<Record<string, ItemDecision>>({})
  const [expandedItems, setExpandedItems] = useState(true)

  // Reset decisions whenever the selected group changes.
  // We default every pending item to "undecided" (approve: null) so the admin
  // must make an explicit Approve or Reject call before they can submit.
  useEffect(() => {
    const init: Record<string, ItemDecision> = {}
    for (const item of group.items) {
      if (item.status === 'pending') {
        init[item.id] = { approve: null, unitId: '' }
      }
    }
    setDecisions(init)
    setExpandedItems(true)
  }, [group.key])

  const notes = parseNotes(group.items[0]?.notes)

  const pendingItems = group.items.filter((r) => r.status === 'pending')
  const nonPendingItems = group.items.filter((r) => r.status !== 'pending')

  // Every pending item must have an explicit decision, and every "approve"
  // decision needs a unit assigned before we can submit.
  const approveCount = Object.values(decisions).filter((d) => d.approve === true).length
  const rejectCount = Object.values(decisions).filter((d) => d.approve === false).length
  const undecidedCount = pendingItems.filter(
    (item) => (decisions[item.id]?.approve ?? null) === null,
  ).length
  const unassigned = Object.values(decisions).filter((d) => d.approve === true && !d.unitId).length
  const canProcess =
    pendingItems.length > 0 && undecidedCount === 0 && unassigned === 0

  const batchMutation = useMutation({
    mutationFn: async () => {
      for (const item of pendingItems) {
        const decision = decisions[item.id]
        if (!decision || decision.approve === null) continue
        if (decision.approve === true) {
          // Backend enforces a strict rental-status machine:
          //   PENDING -> APPROVED|REJECTED|CANCELLED
          //   APPROVED -> CHECKED_OUT|...
          // So we cannot jump PENDING -> CHECKED_OUT ("active") in one call.
          // Step 1 assigns the unit and moves to APPROVED; step 2 flips it to active (CHECKED_OUT).
          await updateRentalStatus(item.id, { status: 'approved', assignedEquipmentId: decision.unitId })
          await updateRentalStatus(item.id, { status: 'active' })
        } else {
          await updateRentalStatus(item.id, { status: 'rejected' })
        }
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['rentals'] })
      await queryClient.invalidateQueries({ queryKey: ['equipment'] })
      await queryClient.invalidateQueries({ queryKey: ['admin-summary'] })
      const approved = approveCount
      const rejected = rejectCount
      const parts: string[] = []
      if (approved > 0) parts.push(`${approved} equipment approved`)
      if (rejected > 0) parts.push(`${rejected} equipment rejected`)
      toast.success(parts.join(', ') + '.')
      onActionDone()
    },
    onError: () => toast.error('Could not process the request.'),
  })

  const singleMutation = useMutation({
    mutationFn: (payload: { rentalId: string; status: 'active' | 'returned' }) =>
      updateRentalStatus(payload.rentalId, { status: payload.status }),
    onSuccess: async (_, vars) => {
      await queryClient.invalidateQueries({ queryKey: ['rentals'] })
      await queryClient.invalidateQueries({ queryKey: ['equipment'] })
      await queryClient.invalidateQueries({ queryKey: ['admin-summary'] })
      toast.success(vars.status === 'active' ? 'Equipment checked out.' : 'Equipment marked as returned.')
    },
    onError: () => toast.error('Could not update status.'),
  })

  const gcfg = STATUS_CFG[group.groupStatus] ?? STATUS_CFG.pending

  return (
    <div className="overflow-y-auto h-full">
      <div className="p-5 space-y-5">

        {/* ── Header ── */}
        <div className={`rounded-xl border px-5 py-4 ${gcfg.bg} ${gcfg.border}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/60 dark:bg-slate-800/60 border border-white/80 dark:border-slate-700">
                <span className={`text-sm font-bold ${gcfg.text}`}>{initials(group.requesterName)}</span>
              </div>
              <div className="min-w-0">
                <p className={`text-base font-bold ${gcfg.text}`}>{group.requesterName}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {group.items.length} {group.items.length === 1 ? 'request' : 'requests'} · {formatDate(group.startDate)}
                  {group.endDate ? ` → ${formatDate(group.endDate)}` : ''}
                </p>
              </div>
            </div>
            <span className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${gcfg.bg} ${gcfg.text}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${gcfg.dot}`} />
              {gcfg.label}
            </span>
          </div>
        </div>

        {/* ── Info grid ── */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-lg border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-4 py-3">
            <div className="flex items-center gap-1.5 mb-1">
              <User className="h-3 w-3 text-slate-400" />
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Requester</p>
            </div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{group.requesterName}</p>
          </div>
          <div className="rounded-lg border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-4 py-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Calendar className="h-3 w-3 text-slate-400" />
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Dates</p>
            </div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              {formatDate(group.startDate)}
              {group.endDate
                ? <span className="font-normal text-slate-500 dark:text-slate-400"> → {formatDate(group.endDate)}</span>
                : <span className="font-normal text-slate-400"> onwards</span>}
            </p>
          </div>
        </div>

        {/* ── Request notes ── */}
        {notes.length > 0 && (
          <div className="rounded-lg border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-4 py-3">
            <div className="flex items-center gap-1.5 mb-2">
              <FileText className="h-3 w-3 text-slate-400" />
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Request Details</p>
            </div>
            <div className="space-y-1.5">
              {notes.map((n, i) => (
                <div key={i} className="flex gap-2 text-xs">
                  <span className="shrink-0 font-semibold text-slate-500 dark:text-slate-400 w-24">{n.label}</span>
                  <span className="text-slate-700 dark:text-slate-300">{n.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Items list ── */}
        <div>
          <button
            onClick={() => setExpandedItems((v) => !v)}
            className="flex items-center justify-between w-full mb-3 group"
          >
            <div className="flex items-center gap-2">
              <Layers className="h-3.5 w-3.5 text-slate-400" />
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                Equipment ({group.items.length})
              </p>
            </div>
            {expandedItems
              ? <ChevronUp className="h-3.5 w-3.5 text-slate-300 group-hover:text-slate-500 transition-colors" />
              : <ChevronDown className="h-3.5 w-3.5 text-slate-300 group-hover:text-slate-500 transition-colors" />}
          </button>

          {expandedItems && (
            <div className="space-y-2">
              {/* ── Pending items with approval controls ── */}
              {pendingItems.length > 0 && (
                <div className="space-y-2">
                  {pendingItems.map((item) => {
                    const dec = decisions[item.id] ?? { approve: null, unitId: '' }
                    return (
                      <ItemApprovalRow
                        key={item.id}
                        rental={item}
                        decision={dec}
                        onSetApprove={(approve) =>
                          setDecisions((prev) => ({
                            ...prev,
                            [item.id]: approve
                              ? { approve: true, unitId: prev[item.id]?.unitId ?? '' }
                              : { approve: false, unitId: '' },
                          }))
                        }
                        onSelectUnit={(unitId) =>
                          setDecisions((prev) => ({
                            ...prev,
                            [item.id]: { ...(prev[item.id] ?? { approve: true, unitId: '' }), unitId },
                          }))
                        }
                      />
                    )
                  })}

                  {/* Batch action bar */}
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 mt-1">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {approveCount > 0 && (
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                            {approveCount} to approve
                          </span>
                        )}
                        {approveCount > 0 && rejectCount > 0 && <span className="mx-1.5 text-slate-300">·</span>}
                        {rejectCount > 0 && (
                          <span className="text-red-500 dark:text-red-400 font-semibold">
                            {rejectCount} to reject
                          </span>
                        )}
                        {undecidedCount > 0 && (
                          <span className="block text-amber-600 dark:text-amber-400 mt-0.5">
                            {undecidedCount} still need{undecidedCount === 1 ? 's' : ''} an Approve or Reject decision
                          </span>
                        )}
                        {unassigned > 0 && (
                          <span className="block text-amber-600 dark:text-amber-400 mt-0.5">
                            {unassigned} approved item{unassigned === 1 ? '' : 's'} still need{unassigned === 1 ? 's' : ''} a unit assigned
                          </span>
                        )}
                      </div>
                      <Button
                        disabled={!canProcess || batchMutation.isPending}
                        onClick={() => batchMutation.mutate()}
                        className="gap-2 shrink-0"
                        style={{ backgroundColor: canProcess ? '#16a34a' : undefined, color: canProcess ? '#fff' : undefined }}
                      >
                        <Check className="h-4 w-4" />
                        {batchMutation.isPending
                          ? 'Processing…'
                          : approveCount > 0 && rejectCount > 0
                            ? `Submit decisions (${approveCount} approve, ${rejectCount} reject)`
                            : approveCount > 0
                              ? `Approve ${approveCount} ${approveCount === 1 ? 'request' : 'requests'}`
                              : rejectCount > 0
                                ? `Reject ${rejectCount} ${rejectCount === 1 ? 'request' : 'requests'}`
                                : 'Submit decisions'}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Non-pending items (active / returned / rejected) ── */}
              {nonPendingItems.map((item) => {
                const scfg = ITEM_STATUS_CFG[item.status] ?? ITEM_STATUS_CFG.pending
                return (
                  <div
                    key={item.id}
                    className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 flex items-center gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {item.equipmentName}
                      </p>
                    </div>
                    <span className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${scfg.bg} ${scfg.text}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${scfg.dot}`} />
                      {scfg.label}
                    </span>

                    {/* Return button for active items */}
                    {item.status === 'active' && (
                      <Button
                        size="sm"
                        disabled={singleMutation.isPending}
                        onClick={() => singleMutation.mutate({ rentalId: item.id, status: 'returned' })}
                        className="gap-1.5 shrink-0 text-xs"
                        style={{ backgroundColor: '#16a34a', color: '#fff' }}
                      >
                        <RotateCcw className="h-3 w-3" />
                        Return
                      </Button>
                    )}

                    {/* Closed states */}
                    {(item.status === 'returned' || item.status === 'rejected') && (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-slate-300 dark:text-slate-600" />
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminRentalsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const locationState = location.state as { statusFilter?: RentalStatus | 'all' } | null

  const [statusFilter, setStatusFilter] = useState<RentalStatus | 'all'>(locationState?.statusFilter ?? 'pending')
  const [search, setSearch] = useState('')
  const [selectedKey, setSelectedKey] = useState<string | null>(null)

  // Fetch all rentals once — filter and group client-side
  const rentalsQuery = useQuery({
    queryKey: ['rentals', 'all'],
    queryFn: () => listRentals({ status: 'all' }),
  })

  const allRentals = rentalsQuery.data ?? []

  // ── Build groups ─────────────────────────────────────────────────────────────
  const allGroups = useMemo<RentalGroup[]>(() => {
    const map = new Map<string, RentalGroup>()

    for (const rental of allRentals) {
      // Group by requester + exact requestedStart date (shared across batch submissions)
      const dateKey = rental.startDate.slice(0, 10)
      const key = `${rental.requestedBy}||${dateKey}`

      if (!map.has(key)) {
        const site = parsedField(rental.notes, 'Site')
        const purpose = parsedField(rental.notes, 'Purpose')
        map.set(key, {
          key,
          requesterName: rental.requestedByName,
          requesterId: rental.requestedBy,
          site,
          purpose,
          startDate: rental.startDate,
          endDate: rental.endDate,
          items: [],
          groupStatus: 'pending',
        })
      }
      map.get(key)!.items.push(rental)
    }

    // Derive group statuses
    const groups = Array.from(map.values())
    for (const g of groups) {
      g.groupStatus = deriveGroupStatus(g.items)
    }

    // Sort: needs-attention first
    return groups.sort((a, b) => (GROUP_RANK[a.groupStatus] ?? 9) - (GROUP_RANK[b.groupStatus] ?? 9))
  }, [allRentals])

  // ── Counts per tab (based on groups) ─────────────────────────────────────────
  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = { all: allGroups.length }
    for (const g of allGroups) {
      counts[g.groupStatus] = (counts[g.groupStatus] ?? 0) + 1
    }
    return counts
  }, [allGroups])

  // ── Filtered groups ───────────────────────────────────────────────────────────
  const displayed = useMemo(() => {
    let list = allGroups.filter((g) => groupMatchesFilter(g, statusFilter))
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(
        (g) =>
          g.requesterName.toLowerCase().includes(q) ||
          g.items.some((r) => r.equipmentName.toLowerCase().includes(q)) ||
          g.site.toLowerCase().includes(q) ||
          g.purpose.toLowerCase().includes(q),
      )
    }
    return list
  }, [allGroups, statusFilter, search])

  // Auto-select first group when filter changes
  const firstKey = displayed[0]?.key ?? null
  const effectiveKey = selectedKey && displayed.some((g) => g.key === selectedKey) ? selectedKey : firstKey
  const selectedGroup = displayed.find((g) => g.key === effectiveKey) ?? null

  if (rentalsQuery.isLoading) return <Loader label="Loading rentals…" />
  if (rentalsQuery.isError) {
    return <ErrorState error={rentalsQuery.error} onRetry={() => rentalsQuery.refetch()} title="Could not load rentals" />
  }

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back
      </button>

      <PageHeader
        title="Rental Requests"
        subtitle="Review grouped requests, approve or reject individual items, and manage the full lifecycle"
      />

      {/* ── Status filter pills ── */}
      <div className="flex flex-wrap gap-1.5">
        {STATUS_TABS.map((tab) => {
          const count = tabCounts[tab.value] ?? 0
          const isActive = statusFilter === tab.value
          return (
            <button
              key={tab.value}
              onClick={() => { setStatusFilter(tab.value); setSelectedKey(null) }}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm'
                  : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              {tab.value !== 'all' && (
                <span className={`h-1.5 w-1.5 rounded-full ${
                  isActive
                    ? 'bg-white/70 dark:bg-slate-900/70'
                    : (STATUS_CFG[tab.value]?.dot ?? 'bg-slate-300')
                }`} />
              )}
              {tab.label}
              {count > 0 && (
                <span className={`inline-flex items-center justify-center rounded-full min-w-[18px] h-[18px] px-1 text-[10px] font-bold ${
                  isActive
                    ? 'bg-white/20 dark:bg-slate-900/20 text-white dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── Two-panel layout ── */}
      <div
        className="grid grid-cols-1 lg:grid-cols-5 gap-0 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden bg-white dark:bg-slate-800"
        style={{ minHeight: '560px' }}
      >
        {/* ── Left: group list ── */}
        <div className="lg:col-span-2 flex flex-col border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-700 lg:max-h-[720px]">
          {/* Search */}
          <div className="p-3 border-b border-slate-100 dark:border-slate-700 shrink-0">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search person, equipment, or site…"
                className="w-full pl-8 pr-3 h-9 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-colors placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Group list */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
            {displayed.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 gap-2 text-slate-400">
                <ClipboardList className="h-8 w-8 opacity-30" />
                <p className="text-sm font-medium">No requests found</p>
                <p className="text-xs">Try a different filter or search.</p>
              </div>
            ) : (
              displayed.map((group) => {
                const gcfg = STATUS_CFG[group.groupStatus] ?? STATUS_CFG.pending
                const isSelected = effectiveKey === group.key
                const equipmentSummary = group.items.map((r) => r.equipmentName)
                const summaryText = equipmentSummary.length <= 2
                  ? equipmentSummary.join(', ')
                  : `${equipmentSummary.slice(0, 2).join(', ')} +${equipmentSummary.length - 2} more`

                return (
                  <div key={group.key}>
                    <button
                      onClick={() => setSelectedKey(group.key)}
                      className={`w-full flex items-start gap-3 px-4 py-3.5 text-left transition-colors group ${
                        isSelected
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-l-2 border-l-blue-500'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-700/40 border-l-2 border-l-transparent'
                      }`}
                    >
                      {/* Avatar */}
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold mt-0.5 ${
                        isSelected
                          ? 'bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                      }`}>
                        {initials(group.requesterName)}
                      </div>

                      <div className="min-w-0 flex-1">
                        {/* Person name (title) */}
                        <p className={`text-sm font-bold truncate leading-tight ${
                          isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-slate-800 dark:text-slate-200'
                        }`}>
                          {group.requesterName}
                        </p>
                        {/* Equipment list (subtitle) */}
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {summaryText}
                        </p>
                        {/* Date */}
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                          {formatDate(group.startDate)}
                          {group.endDate ? ` → ${formatDate(group.endDate)}` : ''}
                          {group.site ? ` · ${group.site}` : ''}
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-1.5 shrink-0 ml-1">
                        {/* Status pill */}
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${gcfg.bg} ${gcfg.text}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${gcfg.dot}`} />
                          {gcfg.label}
                        </span>
                        {/* Request count badge */}
                        <span className="inline-flex items-center gap-0.5 text-[10px] text-slate-400 dark:text-slate-500">
                          <Users className="h-2.5 w-2.5" />
                          {group.items.length}{' '}
                          {group.groupStatus === 'active'
                            ? 'in use'
                            : group.groupStatus === 'returned'
                              ? 'returned'
                              : group.groupStatus === 'rejected'
                                ? 'rejected'
                                : group.items.length === 1 ? 'request' : 'requests'}
                        </span>
                      </div>
                    </button>

                    {/* Mobile inline accordion — opens directly under the selected row.
                        Desktop still uses the right-hand side panel (below). */}
                    {isSelected && (
                      <div className="lg:hidden border-t border-b border-blue-200 dark:border-blue-900/40 bg-slate-50 dark:bg-slate-900/40">
                        <GroupDetail
                          key={group.key}
                          group={group}
                          onActionDone={() => setSelectedKey(null)}
                        />
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* ── Right: group detail + actions (desktop only; mobile uses the
               inline accordion attached to the selected row above) ── */}
        <div className="hidden lg:flex lg:col-span-3 flex-col lg:max-h-[720px]">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 shrink-0">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
              Request Detail & Actions
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {selectedGroup
                ? `${selectedGroup.items.length} ${selectedGroup.items.length === 1 ? 'request' : 'requests'} — pick Approve or Reject for each, then assign a unit to every approval`
                : 'Select a request from the list'}
            </p>
          </div>

          {selectedGroup ? (
            <GroupDetail
              key={effectiveKey ?? ''}
              group={selectedGroup}
              onActionDone={() => setSelectedKey(null)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 py-16 px-8 text-center flex-1 text-slate-400">
              <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-dashed border-slate-200 dark:border-slate-600">
                <Package className="h-6 w-6 opacity-50" />
              </div>
              <p className="text-sm font-medium">No request selected</p>
              <p className="text-xs max-w-xs">Pick a request from the list to see its items and process approvals.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
