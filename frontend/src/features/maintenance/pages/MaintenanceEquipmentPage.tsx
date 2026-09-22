import { useMemo, useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, Calendar, CheckCircle2 } from 'lucide-react'
import DataTable from '../../../components/DataTable'
import ErrorState from '../../../components/ErrorState'
import Loader from '../../../components/Loader'
import PageHeader from '../../../components/PageHeader'
import StatusBadge from '../../../components/StatusBadge'
import {
  Dialog, DialogContent, DialogDescription,
  DialogHeader, DialogTitle,
} from '../../../components/ui/dialog'
import { Button } from '../../../components/ui/button'
import { Label } from '../../../components/ui/label'
import { listMaintenanceQueue, markEquipmentServiced } from '../../../services/equipmentService'
import type { Equipment, EquipmentStatus, IssueSeverity } from '../../../types/equipment'
import { formatDate } from '../../../lib/utils'
import { getSession } from '../../../lib/auth'

type Priority = 'overdue' | 'critical' | 'upcoming' | 'scheduled'

function derivePriority(nextServiceDueDate?: string): Priority {
  if (!nextServiceDueDate) return 'scheduled'
  const diffDays = Math.ceil((new Date(nextServiceDueDate).getTime() - Date.now()) / 86_400_000)
  if (diffDays < 0) return 'overdue'
  if (diffDays <= 3) return 'critical'
  if (diffDays <= 7) return 'upcoming'
  return 'scheduled'
}

const PRIORITY_META: Record<Priority, { label: string; pill: string; dot: string }> = {
  overdue:   { label: 'Overdue',   pill: 'text-red-700 bg-red-50 border-red-200 dark:text-red-300 dark:bg-red-900/40 dark:border-red-800',                 dot: 'bg-red-500 dark:bg-red-400'       },
  critical:  { label: 'Critical',  pill: 'text-orange-700 bg-orange-50 border-orange-200 dark:text-orange-300 dark:bg-orange-900/40 dark:border-orange-800', dot: 'bg-orange-400 dark:bg-orange-300'  },
  upcoming:  { label: 'Upcoming',  pill: 'text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-900/40 dark:border-amber-800',       dot: 'bg-amber-400 dark:bg-amber-300'    },
  scheduled: { label: 'Scheduled', pill: 'text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-300 dark:bg-blue-900/40 dark:border-blue-800',             dot: 'bg-blue-400 dark:bg-blue-300'      },
}

const SEVERITY_META: Record<IssueSeverity, { label: string; pill: string; dot: string }> = {
  LOW:      { label: 'Low',      pill: 'text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-300 dark:bg-blue-900/40 dark:border-blue-800',         dot: 'bg-blue-400 dark:bg-blue-300'      },
  MEDIUM:   { label: 'Medium',   pill: 'text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-900/40 dark:border-amber-800',     dot: 'bg-amber-400 dark:bg-amber-300'    },
  HIGH:     { label: 'High',     pill: 'text-orange-700 bg-orange-50 border-orange-200 dark:text-orange-300 dark:bg-orange-900/40 dark:border-orange-800', dot: 'bg-orange-400 dark:bg-orange-300'  },
  CRITICAL: { label: 'Critical', pill: 'text-red-700 bg-red-50 border-red-200 dark:text-red-300 dark:bg-red-900/40 dark:border-red-800',                 dot: 'bg-red-500 dark:bg-red-400'        },
}

const priorityOptions: Array<{ label: string; value: Priority | 'all' }> = [
  { label: 'All priorities',   value: 'all'       },
  { label: 'Overdue',          value: 'overdue'   },
  { label: 'Critical (≤3 d)',  value: 'critical'  },
  { label: 'Upcoming (≤7 d)',  value: 'upcoming'  },
  { label: 'Scheduled',        value: 'scheduled' },
]

const statusOptions: Array<{ label: string; value: EquipmentStatus | 'all' }> = [
  { label: 'All statuses',   value: 'all'         },
  { label: 'In Maintenance', value: 'maintenance' },
  { label: 'Available',      value: 'available'   },
  { label: 'In Use',         value: 'in_use'      },
]

export default function MaintenanceEquipmentPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()
  const session = getSession()
  const userId = session?.user.id ?? ''

  const [selectedItem, setSelectedItem] = useState<Equipment | null>(null)
  const [manualNextDueDate, setManualNextDueDate] = useState('')
  const [search, setSearch] = useState('')
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'all'>('all')
  const [severityFilter, setSeverityFilter] = useState<IssueSeverity | 'all' | 'none'>('all')

  const locationState = location.state as { statusFilter?: EquipmentStatus | 'all' } | null
  const [statusFilter, setStatusFilter] = useState<EquipmentStatus | 'all'>(locationState?.statusFilter ?? 'all')

  const equipmentQuery = useQuery({
    queryKey: ['maintenance-queue'],
    queryFn: () => listMaintenanceQueue(14),
    placeholderData: keepPreviousData,
  })

  const filteredData = useMemo(() => {
    let items = equipmentQuery.data ?? []
    if (search) {
      const term = search.toLowerCase()
      items = items.filter((i) =>
        i.name.toLowerCase().includes(term) ||
        i.category.toLowerCase().includes(term) ||
        i.qrCode?.toLowerCase().includes(term)
      )
    }
    if (statusFilter !== 'all')   items = items.filter((i) => i.status === statusFilter)
    if (priorityFilter !== 'all') items = items.filter((i) => derivePriority(i.nextServiceDueDate) === priorityFilter)
    if (severityFilter === 'none')       items = items.filter((i) => !i.severity)
    else if (severityFilter !== 'all')   items = items.filter((i) => i.severity === severityFilter)
    return items
  }, [equipmentQuery.data, search, statusFilter, priorityFilter, severityFilter])

  const completeServiceMutation = useMutation({
    mutationFn: (payload: { id: string; nextServiceDueDate?: string }) =>
      markEquipmentServiced(payload.id, { performedByUserId: userId, nextServiceDueDate: payload.nextServiceDueDate }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['equipment'] })
      await queryClient.invalidateQueries({ queryKey: ['maintenance-queue'] })
      await queryClient.invalidateQueries({ queryKey: ['maintenance-summary'] })
      await queryClient.invalidateQueries({ queryKey: ['service-logs'] })
      await queryClient.invalidateQueries({ queryKey: ['activity'] })
      setSelectedItem(null)
      setManualNextDueDate('')
      toast.success('Equipment marked serviced.')
    },
    onError: () => toast.error('Could not mark serviced. Add a manual due date if needed.'),
  })

  const columns = useMemo<ColumnDef<Equipment>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Equipment',
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
              {row.original.name}
            </p>
            {row.original.qrCode && (
              <span className="inline-flex items-center rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[11px] text-slate-600 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300 mt-0.5">
                {row.original.qrCode}
              </span>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'category',
        header: 'Category',
        cell: ({ row }) => <span className="text-sm text-slate-600 dark:text-slate-400">{row.original.category}</span>,
      },
      {
        id: 'priority',
        header: 'Priority',
        cell: ({ row }) => {
          const p = derivePriority(row.original.nextServiceDueDate)
          const m = PRIORITY_META[p]
          return (
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${m.pill}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />
              {m.label}
            </span>
          )
        },
      },
      {
        id: 'severity',
        header: () => {
          const cycle: Array<IssueSeverity | 'all' | 'none'> = ['all', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'none']
          const nextVal = cycle[(cycle.indexOf(severityFilter) + 1) % cycle.length]
          const label = severityFilter === 'all' ? 'Severity'
            : severityFilter === 'none' ? 'Severity: None'
            : `Sev: ${SEVERITY_META[severityFilter as IssueSeverity]?.label}`
          return (
            <button type="button" onClick={() => setSeverityFilter(nextVal)}
              className={`flex items-center gap-1 text-[11px] font-semibold uppercase tracking-widest transition-colors ${severityFilter !== 'all' ? 'text-slate-900 dark:text-slate-100' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'}`}>
              {label}
              {severityFilter !== 'all' && <span className="ml-0.5 h-1.5 w-1.5 rounded-full bg-slate-900" />}
            </button>
          )
        },
        enableSorting: false,
        cell: ({ row }) => {
          const sev = row.original.severity
          if (!sev) return <span className="text-xs text-slate-400">—</span>
          const m = SEVERITY_META[sev]
          return (
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${m.pill}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />
              {m.label}
            </span>
          )
        },
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        accessorKey: 'nextServiceDueDate',
        header: 'Due date',
        cell: ({ row }) => <span className="text-sm text-slate-600 dark:text-slate-400">{formatDate(row.original.nextServiceDueDate)}</span>,
      },
      {
        id: 'actions',
        header: 'Action',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex gap-2">
            <Button asChild size="sm" variant="outline">
              <Link to={`/maintenance/equipment/${row.original.id}`}>View</Link>
            </Button>
            <Button
              onClick={() => setSelectedItem(row.original)}
              size="sm"
              className="gap-1.5"
              style={{ backgroundColor: 'rgb(var(--brand-navy-rgb))', color: '#fff' }}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Mark serviced
            </Button>
          </div>
        ),
      },
    ],
    [severityFilter],
  )

  if (equipmentQuery.isLoading) return <Loader label="Loading maintenance queue..." />
  if (equipmentQuery.isError) {
    return <ErrorState error={equipmentQuery.error} onRetry={() => equipmentQuery.refetch()} title="Could not load maintenance queue" />
  }

  return (
    <div className="space-y-6">
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 transition-colors">
        <ArrowLeft className="h-3.5 w-3.5" />
        Back
      </button>

      <PageHeader title="Maintenance Queue" subtitle="Items due in the next 14 days or already overdue" />

      {/* ── Filters ──────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700 shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50 dark:bg-slate-700/50 dark:border-slate-700 px-4 py-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Filters</p>
        </div>
        <div className="flex flex-wrap gap-x-8 gap-y-4 p-4">
          {/* Status */}
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Status</span>
            <div className="flex flex-wrap gap-1.5">
              {statusOptions.map((o) => (
                <button key={o.value} onClick={() => setStatusFilter(o.value)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${statusFilter === o.value ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-400 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-600'}`}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          {/* Priority */}
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Priority</span>
            <div className="flex flex-wrap gap-1.5">
              {priorityOptions.map((o) => (
                <button key={o.value} onClick={() => setPriorityFilter(o.value)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium transition-colors ${priorityFilter === o.value ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-400 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-600'}`}>
                  {o.value !== 'all' && PRIORITY_META[o.value as Priority] && (
                    <span className={`h-1.5 w-1.5 rounded-full ${priorityFilter === o.value ? 'bg-white/70' : PRIORITY_META[o.value as Priority].dot}`} />
                  )}
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredData}
        emptyDescription="No equipment matches the current filters."
        emptyTitle="Maintenance queue is empty"
        onSearchValueChange={setSearch}
        searchPlaceholder="Search by name, category, or asset tag…"
        searchValue={search}
        pageSize={25}
      />

      {/* ── Mark Serviced dialog ─────────────────────────────── */}
      <Dialog onOpenChange={(open) => !open && setSelectedItem(null)} open={Boolean(selectedItem)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Mark Serviced
            </DialogTitle>
            <DialogDescription>
              This will add a routine service log and update last/next service dates.
            </DialogDescription>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4">
              {/* Info card */}
              <div className="rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 px-4 py-3 space-y-1.5">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Equipment</p>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{selectedItem.name}</p>
                  {selectedItem.qrCode && (
                    <span className="mt-1 inline-flex items-center rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[11px] text-slate-600 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-300">
                      {selectedItem.qrCode}
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Configured interval</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {selectedItem.maintenanceIntervalDays ? `${selectedItem.maintenanceIntervalDays} days` : '—'}
                  </p>
                </div>
              </div>

              {/* Manual date */}
              {(() => {
                const hasInterval = Boolean(selectedItem.maintenanceIntervalDays)
                const manualRequired = !hasInterval
                const today = new Date(); today.setHours(0, 0, 0, 0)
                const manualDate = manualNextDueDate ? new Date(manualNextDueDate) : null
                const manualInPast = Boolean(manualDate && manualDate < today)
                const missingRequired = manualRequired && !manualNextDueDate
                const invalid = missingRequired || manualInPast
                return (
                  <>
                    <div className="space-y-1.5">
                      <Label htmlFor="manualNextDueDate" className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                        Manual next due date {manualRequired && <span className="normal-case tracking-normal text-rose-500">(required — no interval configured)</span>}
                      </Label>
                      <div className="relative">
                        <Calendar className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                        <input
                          id="manualNextDueDate"
                          type="date"
                          value={manualNextDueDate}
                          min={new Date().toISOString().slice(0, 10)}
                          onChange={(e) => setManualNextDueDate(e.target.value)}
                          className={`w-full h-10 rounded-lg border bg-white pl-9 pr-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-colors dark:bg-slate-700 dark:text-slate-100 ${
                            invalid ? 'border-rose-400 dark:border-rose-500' : 'border-slate-200 dark:border-slate-600'
                          }`}
                        />
                      </div>
                      {missingRequired && (
                        <p className="text-xs text-rose-500">A next-service date is required because this equipment has no maintenance interval.</p>
                      )}
                      {manualInPast && (
                        <p className="text-xs text-rose-500">Next service date cannot be in the past.</p>
                      )}
                    </div>

                    <div className="flex justify-end gap-3">
                      <Button variant="outline" onClick={() => setSelectedItem(null)}>Cancel</Button>
                      <Button
                        disabled={completeServiceMutation.isPending || invalid}
                        onClick={() => completeServiceMutation.mutate({ id: selectedItem.id, nextServiceDueDate: manualNextDueDate || undefined })}
                        className="gap-1.5"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {completeServiceMutation.isPending ? 'Saving…' : 'Confirm'}
                      </Button>
                    </div>
                  </>
                )
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
