import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Wrench,
  CheckCircle2,
  Activity,
  AlertCircle,
  ChevronRight,
  AlertTriangle,
  ClipboardList,
  SlidersHorizontal,
  QrCode,
} from 'lucide-react'
import { toast } from 'sonner'
import DataTable from '../../../components/DataTable'
import ErrorState from '../../../components/ErrorState'
import Loader from '../../../components/Loader'
import PersonalizableWidget from '../../../components/PersonalizableWidget'
import { Button } from '../../../components/ui/button'
import { getSession } from '../../../lib/auth'
import { getMaintenanceSummary } from '../../../services/dashboardService'
import { listIssueReports, resolveIssue, moveToMaintenance } from '../../../services/maintenanceService'
import type { IssueSeverity } from '../../../services/maintenanceService'
import { formatDateTime } from '../../../lib/utils'
import { useDashboardLayout, type WidgetDef } from '../../../hooks/useDashboardLayout'

const SEVERITY_RANK: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }

const SEVERITY_STYLES: Record<string, { label: string; pill: string; dot: string; bar: string }> = {
  LOW:      { label: 'Low',      pill: 'text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-300 dark:bg-blue-900/40 dark:border-blue-800',         dot: 'bg-blue-400',   bar: 'bg-blue-400'   },
  MEDIUM:   { label: 'Medium',   pill: 'text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-900/40 dark:border-amber-800',   dot: 'bg-amber-400',  bar: 'bg-amber-400'  },
  HIGH:     { label: 'High',     pill: 'text-orange-700 bg-orange-50 border-orange-200 dark:text-orange-300 dark:bg-orange-900/40 dark:border-orange-800', dot: 'bg-orange-400', bar: 'bg-orange-400' },
  CRITICAL: { label: 'Critical', pill: 'text-red-700 bg-red-50 border-red-200 dark:text-red-300 dark:bg-red-900/40 dark:border-red-800',               dot: 'bg-red-500',    bar: 'bg-red-500'    },
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

const WIDGETS: WidgetDef[] = [
  // ── Row 1: action shortcuts ──────────────────────────────────
  { id: 'action-report',         label: 'Report Equipment Issue',size: 'card', defaultVisible: true,  description: 'Shortcut to log a new maintenance issue from the dashboard.'     },
  { id: 'action-scan-qr',        label: 'Scan QR Code',          size: 'card', defaultVisible: true,  description: 'Open the QR scanner to instantly look up any equipment unit.'    },
  // ── Row 2: key service numbers ──────────────────────────────
  { id: 'metric-in-maintenance', label: 'In Maintenance',        size: 'card', defaultVisible: true,  description: 'Equipment units currently in the service queue.'                },
  { id: 'metric-critical',       label: 'Critical Issues',       size: 'card', defaultVisible: true,  description: 'Number of open issues flagged as critical severity.'             },
  { id: 'metric-open-total',     label: 'Total Open Issues',     size: 'card', defaultVisible: true,  description: 'Total count of all open issue reports across the fleet.'         },
  // ── Row 3: quick links ───────────────────────────────────────
  { id: 'link-queue',            label: 'Maintenance Queue',     size: 'card', defaultVisible: true,  description: 'Quick link to the maintenance service queue.'                    },
  { id: 'link-issues',           label: 'Issue Reports',         size: 'card', defaultVisible: true,  description: 'Quick link to view and manage all reported issues.'              },
  // ── Row 4: live queue ───────────────────────────────────────
  { id: 'issue-queue',           label: 'Reported Issues Queue', size: 'wide', defaultVisible: true,  description: 'Live table of open issues with severity filter and breakdown.'   },
  // ── Off by default ───────────────────────────────────────────
  { id: 'metric-available',      label: 'Available',             size: 'card', defaultVisible: false, description: 'Equipment units ready to be rented out.'                        },
  { id: 'metric-in-use',         label: 'In Use',                size: 'card', defaultVisible: false, description: 'Equipment units assigned to active rentals.'                    },
  { id: 'link-equipment',        label: 'All Equipment',         size: 'card', defaultVisible: false, description: 'Quick link to browse all equipment and their current status.'    },
]

export default function MaintenanceDashboardPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const session = getSession()
  const userId = session?.user.id ?? ''
  const firstName = (session?.user.name ?? 'there').split(' ')[0]
  const [severityFilter, setSeverityFilter] = useState<IssueSeverity | 'all'>('all')

  const [personalizing, setPersonalizing] = useState(false)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  const { orderedWidgets, isVisible, toggleVisible, reset, reorderTo } =
    useDashboardLayout('maintenance', userId, WIDGETS)

  function handleReset() { reset(); setPersonalizing(false) }

  const summaryQuery = useQuery({
    queryKey: ['maintenance-summary'],
    queryFn: getMaintenanceSummary,
  })

  const issuesQuery = useQuery({
    queryKey: ['open-issues'],
    queryFn: () => listIssueReports({ status: 'OPEN' }),
  })

  const resolveMutation = useMutation({
    mutationFn: (issueId: string) => resolveIssue(issueId, userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['open-issues'] })
      void queryClient.invalidateQueries({ queryKey: ['maintenance-summary'] })
      toast.success('Issue dismissed successfully')
    },
  })

  const maintenanceMutation = useMutation({
    mutationFn: (issueId: string) => moveToMaintenance(issueId, userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['open-issues'] })
      void queryClient.invalidateQueries({ queryKey: ['maintenance-summary'] })
      toast.success('Equipment moved to maintenance')
    },
  })

  const filteredSortedIssues = useMemo(() => {
    const items = issuesQuery.data ?? []
    const filtered = severityFilter === 'all' ? items : items.filter((i) => i.severity === severityFilter)
    return [...filtered].sort((a, b) => {
      const diff = (SEVERITY_RANK[a.severity] ?? 99) - (SEVERITY_RANK[b.severity] ?? 99)
      return diff !== 0 ? diff : new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime()
    })
  }, [issuesQuery.data, severityFilter])

  const severityCounts = useMemo(() => {
    const all = issuesQuery.data ?? []
    return {
      CRITICAL: all.filter((i) => i.severity === 'CRITICAL').length,
      HIGH:     all.filter((i) => i.severity === 'HIGH').length,
      MEDIUM:   all.filter((i) => i.severity === 'MEDIUM').length,
      LOW:      all.filter((i) => i.severity === 'LOW').length,
    }
  }, [issuesQuery.data])

  const totalIssues = (issuesQuery.data ?? []).length || 1
  const totalOpenIssues = (issuesQuery.data ?? []).length

  if (summaryQuery.isLoading || issuesQuery.isLoading) return <Loader label="Loading maintenance dashboard..." />
  if (summaryQuery.isError || !summaryQuery.data) {
    return (
      <ErrorState
        error={summaryQuery.error}
        onRetry={() => { void summaryQuery.refetch(); void issuesQuery.refetch() }}
        title="Could not load dashboard"
      />
    )
  }

  const severityOptions: Array<{ label: string; value: IssueSeverity | 'all' }> = [
    { label: 'All',      value: 'all'      },
    { label: 'Low',      value: 'LOW'      },
    { label: 'Medium',   value: 'MEDIUM'   },
    { label: 'High',     value: 'HIGH'     },
    { label: 'Critical', value: 'CRITICAL' },
  ]

  const issueColumns = [
    { accessorKey: 'title', header: 'Issue Title' },
    {
      accessorKey: 'reportedAt',
      header: 'Date / Time',
      cell: ({ row }: any) => (
        <span className="whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{formatDateTime(row.original.reportedAt)}</span>
      ),
    },
    {
      accessorKey: 'severity',
      header: 'Severity',
      cell: ({ row }: any) => {
        const cfg = SEVERITY_STYLES[row.original.severity as string]
        if (!cfg) return <span className="text-xs text-slate-400">—</span>
        return (
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cfg.pill}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
          </span>
        )
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      enableSorting: false,
      cell: ({ row }: any) => (
        <div className="flex gap-2">
          <Button onClick={() => navigate(`/maintenance/equipment/${row.original.equipmentId}`)} size="sm" variant="outline">View</Button>
          <Button onClick={() => maintenanceMutation.mutate(row.original.id)} size="sm" disabled={maintenanceMutation.isPending} style={{ backgroundColor: 'rgb(var(--brand-navy-rgb))', color: '#fff' }} className="hover:opacity-90">
            Move to Maintenance
          </Button>
          <Button onClick={() => resolveMutation.mutate(row.original.id)} size="sm" variant="ghost" disabled={resolveMutation.isPending} className="text-red-600 hover:bg-red-50 hover:text-red-700">
            Dismiss
          </Button>
        </div>
      ),
    },
  ]

  const RENDER: Record<string, React.ReactNode> = {

    'metric-in-maintenance': (
      <button onClick={() => navigate('/maintenance/queue', { state: { statusFilter: 'maintenance' } })}
        className="group w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded-xl">
        <div className="metric-card h-full rounded-xl border border-slate-200 border-l-4 border-l-slate-300 bg-white px-5 py-5 group-hover:border-slate-300 group-hover:shadow-md dark:bg-slate-800 dark:border-slate-700 dark:border-l-slate-600">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">In Maintenance</p>
              <Wrench className="h-3 w-3 text-slate-300 dark:text-slate-600" />
            </div>
            <Wrench className="h-4 w-4 text-slate-400" />
          </div>
          <p className="anim-count-pop text-3xl font-bold text-slate-900 dark:text-slate-100">{summaryQuery.data.maintenanceEquipment}</p>
          <p className="mt-1 text-xs text-slate-400 hidden sm:block">Currently in the service queue</p>
          <p className="mt-3 text-[10px] font-semibold uppercase tracking-wide text-slate-300 transition-colors group-hover:text-slate-500">View details →</p>
        </div>
      </button>
    ),

    'metric-available': (
      <button onClick={() => navigate('/maintenance/equipment', { state: { statusFilter: 'available' } })}
        className="group w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded-xl">
        <div className="metric-card h-full rounded-xl border border-slate-200 border-l-4 border-l-slate-300 bg-white px-5 py-5 group-hover:border-slate-300 group-hover:shadow-md dark:bg-slate-800 dark:border-slate-700 dark:border-l-slate-600">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Available</p>
              <Wrench className="h-3 w-3 text-slate-300 dark:text-slate-600" />
            </div>
            <CheckCircle2 className="h-4 w-4 text-slate-400" />
          </div>
          <p className="anim-count-pop text-3xl font-bold text-slate-900 dark:text-slate-100">{summaryQuery.data.availableEquipment}</p>
          <p className="mt-1 text-xs text-slate-400 hidden sm:block">Ready to be rented</p>
          <p className="mt-3 text-[10px] font-semibold uppercase tracking-wide text-slate-300 transition-colors group-hover:text-slate-500">View details →</p>
        </div>
      </button>
    ),

    'metric-in-use': (
      <button onClick={() => navigate('/maintenance/equipment', { state: { statusFilter: 'in_use' } })}
        className="group w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded-xl">
        <div className="metric-card h-full rounded-xl border border-slate-200 border-l-4 border-l-slate-300 bg-white px-5 py-5 group-hover:border-slate-300 group-hover:shadow-md dark:bg-slate-800 dark:border-slate-700 dark:border-l-slate-600">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">In Use</p>
              <Wrench className="h-3 w-3 text-slate-300 dark:text-slate-600" />
            </div>
            <Activity className="h-4 w-4 text-slate-400" />
          </div>
          <p className="anim-count-pop text-3xl font-bold text-slate-900 dark:text-slate-100">{summaryQuery.data.inUseEquipment}</p>
          <p className="mt-1 text-xs text-slate-400 hidden sm:block">Assigned to active rentals</p>
          <p className="mt-3 text-[10px] font-semibold uppercase tracking-wide text-slate-300 transition-colors group-hover:text-slate-500">View details →</p>
        </div>
      </button>
    ),

    'metric-critical': (
      <div className="metric-card h-full rounded-xl border border-slate-200 border-l-4 border-l-slate-300 bg-white px-5 py-5 dark:bg-slate-800 dark:border-slate-700 dark:border-l-slate-600">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Critical Issues</p>
            <Wrench className="h-3 w-3 text-slate-300 dark:text-slate-600" />
          </div>
          <AlertCircle className="h-4 w-4 text-slate-400" />
        </div>
        <p className="anim-count-pop text-3xl font-bold text-slate-900 dark:text-slate-100">{severityCounts.CRITICAL}</p>
        <p className="mt-1 text-xs text-slate-400 hidden sm:block">Open issues flagged as critical</p>
        {severityCounts.CRITICAL > 0
          ? <p className="mt-3 text-[10px] font-semibold uppercase tracking-wide text-red-400">Requires immediate attention</p>
          : <p className="mt-3 text-[10px] font-semibold uppercase tracking-wide text-slate-300">All clear</p>}
      </div>
    ),

    'metric-open-total': (
      <div className="metric-card h-full rounded-xl border border-slate-200 border-l-4 border-l-slate-300 bg-white px-5 py-5 dark:bg-slate-800 dark:border-slate-700 dark:border-l-slate-600">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Total Open Issues</p>
            <Wrench className="h-3 w-3 text-slate-300 dark:text-slate-600" />
          </div>
          <ClipboardList className="h-4 w-4 text-slate-400" />
        </div>
        <p className="anim-count-pop text-3xl font-bold text-slate-900 dark:text-slate-100">{totalOpenIssues}</p>
        <p className="mt-1 text-xs text-slate-400 hidden sm:block">All open issue reports fleet-wide</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).filter(s => severityCounts[s] > 0).map(sev => (
            <span key={sev} className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${SEVERITY_STYLES[sev].pill}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${SEVERITY_STYLES[sev].dot}`} />
              {severityCounts[sev]} {SEVERITY_STYLES[sev].label}
            </span>
          ))}
          {totalOpenIssues === 0 && <span className="text-[10px] text-slate-400">No open issues</span>}
        </div>
      </div>
    ),

    'link-queue': (
      <button onClick={() => navigate('/maintenance/queue')}
        className="group w-full flex items-center gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4 text-left hover:border-slate-300 hover:shadow-md dark:bg-slate-800 dark:border-slate-700 dark:hover:border-slate-600">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-700">
          <Wrench className="h-5 w-5 text-slate-500 dark:text-slate-400" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Maintenance Queue</p>
            <Wrench className="h-3 w-3 text-slate-300 dark:text-slate-600" />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">Review and resolve service requests</p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition-colors group-hover:text-slate-500" />
      </button>
    ),

    'link-equipment': (
      <button onClick={() => navigate('/maintenance/equipment')}
        className="group w-full flex items-center gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4 text-left hover:border-slate-300 hover:shadow-md dark:bg-slate-800 dark:border-slate-700 dark:hover:border-slate-600">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-700">
          <Activity className="h-5 w-5 text-slate-500 dark:text-slate-400" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">All Equipment</p>
            <Wrench className="h-3 w-3 text-slate-300 dark:text-slate-600" />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">Browse fleet status and history</p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition-colors group-hover:text-slate-500" />
      </button>
    ),

    'link-issues': (
      <button onClick={() => navigate('/maintenance/issues')}
        className="group w-full flex items-center gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4 text-left hover:border-slate-300 hover:shadow-md dark:bg-slate-800 dark:border-slate-700 dark:hover:border-slate-600">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-700">
          <AlertCircle className="h-5 w-5 text-slate-500 dark:text-slate-400" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Issue Reports</p>
            <Wrench className="h-3 w-3 text-slate-300 dark:text-slate-600" />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">View and manage all reported issues</p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition-colors group-hover:text-slate-500" />
      </button>
    ),

    'action-scan-qr': (
      <button
        onClick={() => navigate('/scan')}
        className="group relative w-full h-full overflow-hidden rounded-xl border border-blue-200 dark:border-blue-800/60 bg-gradient-to-br from-blue-50 to-blue-100/40 dark:from-blue-900/30 dark:to-blue-900/10 px-5 py-5 text-left hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500 shadow-sm">
            <QrCode className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-blue-800 dark:text-blue-200">Scan QR Code</p>
            <p className="mt-0.5 text-xs text-blue-600/80 dark:text-blue-400/80 leading-relaxed hidden sm:block">Instantly look up any equipment unit by scanning its QR tag.</p>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm group-hover:bg-blue-600 transition-colors">
            <QrCode className="h-3 w-3" />
            Open Scanner
          </span>
          <ChevronRight className="h-4 w-4 text-blue-400 dark:text-blue-600 transition-transform group-hover:translate-x-0.5" />
        </div>
      </button>
    ),

    'action-report': (
      <button
        onClick={() => navigate('/report')}
        className="group relative w-full h-full overflow-hidden rounded-xl border border-amber-200 dark:border-amber-800/60 bg-gradient-to-br from-amber-50 to-amber-100/40 dark:from-amber-900/30 dark:to-amber-900/10 px-5 py-5 text-left hover:shadow-md hover:border-amber-300 dark:hover:border-amber-700 transition-all"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 shadow-sm">
            <AlertTriangle className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-amber-800 dark:text-amber-200">Report Equipment Issue</p>
            <p className="mt-0.5 text-xs text-amber-600/80 dark:text-amber-400/80 leading-relaxed hidden sm:block">Find equipment in the fleet and file a new maintenance report.</p>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm group-hover:bg-amber-600 transition-colors">
            <AlertTriangle className="h-3 w-3" />
            File a Report
          </span>
          <ChevronRight className="h-4 w-4 text-amber-400 dark:text-amber-600 transition-transform group-hover:translate-x-0.5" />
        </div>
      </button>
    ),

    'issue-queue': (
      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-700">
              <AlertCircle className="h-4 w-4 text-slate-500 dark:text-slate-400" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Reported Issues Queue</p>
                <Wrench className="h-3 w-3 text-slate-300 dark:text-slate-600" />
              </div>
              <p className="text-xs text-slate-400">
                {filteredSortedIssues.length} open issue{filteredSortedIssues.length !== 1 ? 's' : ''}
                {severityFilter !== 'all' ? ` · filtered by ${SEVERITY_STYLES[severityFilter]?.label ?? severityFilter}` : ''}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {severityOptions.map((opt) => (
              <button key={opt.value} onClick={() => setSeverityFilter(opt.value)}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                  severityFilter === opt.value
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                    : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-400 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-400'
                }`}
              >
                {opt.value !== 'all' && SEVERITY_STYLES[opt.value] && (
                  <span className={`h-1.5 w-1.5 rounded-full ${severityFilter === opt.value ? 'bg-white dark:bg-slate-900' : SEVERITY_STYLES[opt.value].dot}`} />
                )}
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {(issuesQuery.data ?? []).length > 0 && (
          <div className="mb-4 rounded-xl border border-slate-200 bg-white px-5 py-4 dark:bg-slate-800 dark:border-slate-700">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-slate-400">Issue Breakdown</p>
            <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
              {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((sev) => (
                <div key={sev} className={`${SEVERITY_STYLES[sev].bar} transition-all duration-700`}
                  style={{ width: `${(severityCounts[sev] / totalIssues) * 100}%` }}
                />
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-4">
              {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((sev) => (
                <button key={sev} onClick={() => setSeverityFilter(sev)} className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
                  <span className={`h-2 w-2 rounded-full ${SEVERITY_STYLES[sev].dot}`} />
                  <span className="text-xs text-slate-500">{SEVERITY_STYLES[sev].label}</span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{severityCounts[sev]}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {issuesQuery.isError ? (
          <div className="flex items-center gap-3 rounded-xl border border-red-100 bg-red-50 px-5 py-4 text-sm text-red-700">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Could not load issue reports.
          </div>
        ) : (
          <DataTable
            columns={issueColumns}
            data={filteredSortedIssues}
            emptyDescription="No active issue reports match the current filter."
            emptyTitle="Queue Clear"
          />
        )}
      </div>
    ),
  }

  return (
    <div className="space-y-7">

      {/* ── Hero Banner ──────────────────────────────────────── */}
      <div
        className="anim-fade-up relative overflow-hidden rounded-2xl px-7 py-10"
        style={{ background: 'linear-gradient(135deg, #b45309 0%, #7c3a0a 100%)', animationDelay: '0s' }}
      >
        <div className="hero-blob pointer-events-none absolute -right-14 -top-14 h-64 w-64 rounded-full bg-white/10" />
        <div className="hero-blob-2 pointer-events-none absolute right-20 -bottom-12 h-40 w-40 rounded-full bg-white/5" />
        <div className="hero-blob pointer-events-none absolute -left-10 top-1/2 h-32 w-32 -translate-y-1/2 rounded-full bg-white/5" style={{ animationDelay: '2.5s' }} />
        <div className="relative z-10 flex items-center justify-between gap-4">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-amber-200">{getGreeting()}</p>
            <h1 className="text-2xl font-bold text-white">{firstName}!</h1>
            <p className="mt-1.5 text-sm text-amber-100/80">Here's your service workload and inventory health.</p>
          </div>
          <span className="hidden shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold sm:flex"
            style={{ background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.88)' }}>
            <Wrench className="h-3 w-3" />
            Maintenance
          </span>
        </div>
      </div>

      {/* ── Personalize toggle ────────────────────────────────── */}
      <div className="flex items-center justify-end gap-2 -mt-3">
        {personalizing && (
          <>
            <span className="text-xs text-slate-500">Drag to reorder · ✕ to hide</span>
            <button onClick={handleReset} className="text-xs font-medium text-slate-400 hover:text-red-500 transition-colors">
              Reset to defaults
            </button>
          </>
        )}
        <button
          onClick={() => setPersonalizing(v => !v)}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all ${
            personalizing
              ? 'border-amber-400 bg-amber-50 text-amber-700 hover:bg-amber-100'
              : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700 hover:shadow-sm dark:bg-slate-800 dark:border-slate-600 dark:text-slate-400'
          }`}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          {personalizing ? 'Done' : 'Personalize'}
        </button>
      </div>

      {/* ── Per-card responsive grid ──────────────────────────── */}
      <div className="grid grid-cols-2 gap-2 sm:gap-4 xl:grid-cols-3">
        {orderedWidgets
          .filter((w) => isVisible(w.id))
          .map((w) => {
            return (
              <PersonalizableWidget
                key={w.id}
                id={w.id}
                label={w.label}
                personalizing={personalizing}
                isDragOver={dragOverId === w.id}
                onRemove={() => toggleVisible(w.id)}
                onDragStart={() => setDraggedId(w.id)}
                onDragOver={(e) => { e.preventDefault(); setDragOverId(w.id) }}
                onDrop={() => { if (draggedId && draggedId !== w.id) { reorderTo(draggedId, w.id) }; setDraggedId(null); setDragOverId(null) }}
                onDragEnd={() => { setDraggedId(null); setDragOverId(null) }}
                sizeClass={w.size === 'wide' ? 'col-span-full' : ''}
              >
                {RENDER[w.id]}
              </PersonalizableWidget>
            )
          })}

        {/* Add New tile — always shown in personalize mode */}
        {personalizing && (() => {
          const hidden = orderedWidgets.filter((w) => !isVisible(w.id))
          return (
            <div className="flex flex-col rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-600 bg-transparent overflow-hidden">
              {hidden.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-1.5 px-4 py-8 text-center">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-dashed border-slate-200 dark:border-slate-600 text-slate-300 dark:text-slate-600 text-xl font-light">+</span>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">All widgets visible</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 px-4 pt-4 pb-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-slate-300 dark:border-slate-500 text-slate-400 dark:text-slate-500 text-sm font-semibold leading-none">+</span>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Add Widget</p>
                  </div>
                  <div className="flex flex-col gap-1.5 px-4 pb-4">
                    {hidden.map((w) => (
                      <button key={w.id} onClick={() => toggleVisible(w.id)}
                        className="flex items-center gap-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2.5 text-left hover:border-slate-300 dark:hover:border-slate-500 hover:shadow-sm transition-all group">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 text-xs font-bold group-hover:bg-amber-50 dark:group-hover:bg-amber-900/30 group-hover:text-amber-500 transition-colors">+</span>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">{w.label}</p>
                          {w.description && <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate mt-0.5">{w.description}</p>}
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )
        })()}
      </div>

    </div>
  )
}
