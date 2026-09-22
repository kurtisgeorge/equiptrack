import { useMemo, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { useNavigate } from 'react-router-dom'
import { ExternalLink } from 'lucide-react'
import DataTable from '../../../components/DataTable'
import ErrorState from '../../../components/ErrorState'
import Loader from '../../../components/Loader'
import PageHeader from '../../../components/PageHeader'
import { Button } from '../../../components/ui/button'
import { getSession } from '../../../lib/auth'
import { formatDateTime } from '../../../lib/utils'
import {
  listIssueReports,
  type IssueReport,
  type IssueStatus,
  type IssueSeverity,
} from '../../../services/maintenanceService'

const SEVERITY_RANK: Record<string, number>     = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }
const ISSUE_STATUS_RANK: Record<string, number> = { OPEN: 0, IN_PROGRESS: 1, REVIEWED: 2, RESOLVED: 3, CLOSED: 4 }

const SEVERITY_META: Record<string, { label: string; pill: string; dot: string }> = {
  LOW:      { label: 'Low',      pill: 'text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-300 dark:bg-blue-900/40 dark:border-blue-800',         dot: 'bg-blue-400 dark:bg-blue-300'      },
  MEDIUM:   { label: 'Medium',   pill: 'text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-900/40 dark:border-amber-800',     dot: 'bg-amber-400 dark:bg-amber-300'    },
  HIGH:     { label: 'High',     pill: 'text-orange-700 bg-orange-50 border-orange-200 dark:text-orange-300 dark:bg-orange-900/40 dark:border-orange-800', dot: 'bg-orange-400 dark:bg-orange-300'  },
  CRITICAL: { label: 'Critical', pill: 'text-red-700 bg-red-50 border-red-200 dark:text-red-300 dark:bg-red-900/40 dark:border-red-800',                 dot: 'bg-red-500 dark:bg-red-400'        },
}

const STATUS_META: Record<string, { label: string; pill: string; dot: string }> = {
  OPEN:        { label: 'Open',        pill: 'text-red-700 bg-red-50 border-red-200 dark:text-red-300 dark:bg-red-900/40 dark:border-red-800',                       dot: 'bg-red-500 dark:bg-red-400'        },
  REVIEWED:    { label: 'Reviewed',    pill: 'text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-900/40 dark:border-amber-800',             dot: 'bg-amber-400 dark:bg-amber-300'    },
  IN_PROGRESS: { label: 'In Progress', pill: 'text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-300 dark:bg-blue-900/40 dark:border-blue-800',                   dot: 'bg-blue-400 dark:bg-blue-300'      },
  RESOLVED:    { label: 'Resolved',    pill: 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-900/40 dark:border-emerald-800', dot: 'bg-emerald-500 dark:bg-emerald-400' },
  CLOSED:      { label: 'Closed',      pill: 'text-slate-600 bg-slate-50 border-slate-200 dark:text-slate-400 dark:bg-slate-700/50 dark:border-slate-600',             dot: 'bg-slate-400'                      },
}

const statusOptions: Array<{ label: string; value: IssueStatus | 'all' }> = [
  { label: 'All statuses', value: 'all'         },
  { label: 'Open',         value: 'OPEN'        },
  { label: 'Reviewed',     value: 'REVIEWED'    },
  { label: 'In Progress',  value: 'IN_PROGRESS' },
  { label: 'Resolved',     value: 'RESOLVED'    },
  { label: 'Closed',       value: 'CLOSED'      },
]

const severityOptions: Array<{ label: string; value: IssueSeverity | 'all' }> = [
  { label: 'All severities', value: 'all'      },
  { label: 'Low',            value: 'LOW'      },
  { label: 'Medium',         value: 'MEDIUM'   },
  { label: 'High',           value: 'HIGH'     },
  { label: 'Critical',       value: 'CRITICAL' },
]

function SeverityBadge({ severity }: { severity: string }) {
  const meta = SEVERITY_META[severity]
  if (!meta) return <span className="text-xs text-slate-400">—</span>
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${meta.pill}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  )
}

function StatusBadgeIssue({ status }: { status: string }) {
  const meta = STATUS_META[status]
  if (!meta) return <span className="text-xs text-slate-400">—</span>
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${meta.pill}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  )
}

export default function FieldIssuesPage() {
  const navigate = useNavigate()
  const session = getSession()
  const userId = session?.user.id ?? ''

  const [status, setStatus]     = useState<IssueStatus | 'all'>('all')
  const [severity, setSeverity] = useState<IssueSeverity | 'all'>('all')

  const issuesQuery = useQuery({
    enabled: Boolean(userId),
    queryKey: ['my-issues', userId, { status, severity }],
    queryFn: () => listIssueReports({
      reportedBy: userId,
      status:   status   === 'all' ? undefined : status,
      severity: severity === 'all' ? undefined : severity,
    }),
    placeholderData: keepPreviousData,
  })

  const columns = useMemo<ColumnDef<IssueReport>[]>(
    () => [
      {
        accessorKey: 'title',
        header: 'Issue',
        cell: ({ row }) => (
          <div>
            <p className="font-semibold text-slate-800 dark:text-slate-200">{row.original.title}</p>
            {row.original.description && (
              <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{row.original.description}</p>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'severity',
        header: 'Severity',
        cell: ({ row }) => <SeverityBadge severity={row.original.severity} />,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadgeIssue status={row.original.status} />,
      },
      {
        accessorKey: 'reportedAt',
        header: 'Reported',
        cell: ({ row }) => (
          <span className="text-sm text-slate-500 whitespace-nowrap">{formatDateTime(row.original.reportedAt)}</span>
        ),
      },
      {
        id: 'actions',
        header: '',
        enableSorting: false,
        cell: ({ row }) => (
          <Button
            size="sm" variant="ghost"
            className="gap-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            onClick={() => navigate(`/field/equipment/${row.original.equipmentId}`)}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            View Equipment
          </Button>
        ),
      },
    ],
    [navigate],
  )

  const sortedIssues = useMemo(() =>
    [...(issuesQuery.data ?? [])].sort((a, b) => {
      const sd = (ISSUE_STATUS_RANK[a.status] ?? 99) - (ISSUE_STATUS_RANK[b.status] ?? 99)
      if (sd !== 0) return sd
      const sv = (SEVERITY_RANK[a.severity] ?? 99) - (SEVERITY_RANK[b.severity] ?? 99)
      if (sv !== 0) return sv
      return new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime()
    }),
    [issuesQuery.data],
  )

  if (issuesQuery.isLoading) return <Loader label="Loading your reports..." />
  if (issuesQuery.isError) {
    return <ErrorState error={issuesQuery.error} onRetry={() => issuesQuery.refetch()} title="Could not load issue reports" />
  }

  return (
    <div className="space-y-6">
      <PageHeader title="My Reports" subtitle="Equipment issues you've submitted" />

      {/* Filters */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700 shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50 dark:bg-slate-700/50 dark:border-slate-700 px-4 py-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Filters</p>
        </div>
        <div className="flex flex-wrap gap-x-8 gap-y-4 p-4">
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Status</span>
            <div className="flex flex-wrap gap-1.5">
              {statusOptions.map((o) => (
                <button key={o.value} onClick={() => setStatus(o.value)}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium transition-colors ${status === o.value ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-400 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-600'}`}
                >
                  {o.value !== 'all' && STATUS_META[o.value] && (
                    <span className={`h-1.5 w-1.5 rounded-full ${status === o.value ? 'bg-white/70' : STATUS_META[o.value].dot}`} />
                  )}
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Severity</span>
            <div className="flex flex-wrap gap-1.5">
              {severityOptions.map((o) => (
                <button key={o.value} onClick={() => setSeverity(o.value)}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium transition-colors ${severity === o.value ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-400 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-600'}`}
                >
                  {o.value !== 'all' && SEVERITY_META[o.value] && (
                    <span className={`h-1.5 w-1.5 rounded-full ${severity === o.value ? 'bg-white/70' : SEVERITY_META[o.value].dot}`} />
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
        data={sortedIssues}
        emptyTitle="No reports yet"
        emptyDescription="Issues you report on equipment will appear here."
      />
    </div>
  )
}
