import { useMemo, useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { useNavigate, useLocation } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, Clock, CheckCircle2, RotateCcw, XCircle, ExternalLink } from 'lucide-react'
import DataTable from '../../../components/DataTable'
import ErrorState from '../../../components/ErrorState'
import Loader from '../../../components/Loader'
import PageHeader from '../../../components/PageHeader'
import StatusBadge from '../../../components/StatusBadge'
import { Button } from '../../../components/ui/button'
import { getSession } from '../../../lib/auth'
import { formatDate } from '../../../lib/utils'
import { listRentals, updateRentalStatus } from '../../../services/rentalService'
import type { Rental, RentalStatus } from '../../../types/rental'

const RENTAL_STATUS_RANK: Record<string, number> = { active: 0, pending: 1, returned: 2, rejected: 3 }

const tabs: Array<{ label: string; value: RentalStatus | 'all'; dot?: string }> = [
  { label: 'All',      value: 'all'      },
  { label: 'Pending',  value: 'pending',  dot: 'bg-orange-400' },
  { label: 'Active',   value: 'active',   dot: 'bg-emerald-500' },
  { label: 'Returned', value: 'returned', dot: 'bg-slate-400' },
]

const STATUS_MESSAGE: Record<string, { text: string; color: string; icon: React.ElementType }> = {
  pending:  { text: 'Awaiting admin approval',           color: 'text-amber-700',   icon: Clock        },
  active:   { text: 'Checked out — tap Return when done', color: 'text-emerald-700', icon: RotateCcw    },
  returned: { text: 'Rental completed',                  color: 'text-slate-600',   icon: CheckCircle2 },
  rejected: { text: 'Request was rejected',              color: 'text-red-700',     icon: XCircle      },
}

export default function FieldRentalsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const locationState = location.state as { statusFilter?: RentalStatus | 'all' } | null
  const [status, setStatus] = useState<RentalStatus | 'all'>(locationState?.statusFilter ?? 'all')
  const session = getSession()
  const userId = session?.user.id ?? ''

  const rentalsQuery = useQuery({
    enabled: Boolean(userId),
    queryKey: ['rentals', 'field', userId, status],
    queryFn: () => listRentals({ requestedBy: userId, status }),
    placeholderData: keepPreviousData,
  })

  const queryClient = useQueryClient()
  const returnMutation = useMutation({
    mutationFn: (rentalId: string) =>
      updateRentalStatus(rentalId, { status: 'returned' }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['rentals'] })
      await queryClient.invalidateQueries({ queryKey: ['equipment'] })
      toast.success('Equipment returned. Thanks!')
    },
    onError: () => toast.error('Could not mark this rental returned.'),
  })

  const columns = useMemo<ColumnDef<Rental>[]>(
    () => [
      {
        accessorKey: 'equipmentName',
        header: 'Equipment',
        cell: ({ row }) => <p className="font-semibold text-slate-800 dark:text-slate-200">{row.original.equipmentName}</p>,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        accessorKey: 'startDate',
        header: 'Start',
        cell: ({ row }) => <span className="text-sm text-slate-600 dark:text-slate-400">{formatDate(row.original.startDate)}</span>,
      },
      {
        accessorKey: 'endDate',
        header: 'End',
        cell: ({ row }) => <span className="text-sm text-slate-600 dark:text-slate-400">{formatDate(row.original.endDate)}</span>,
      },
      {
        id: 'message',
        header: 'Note',
        enableSorting: false,
        cell: ({ row }) => {
          const msg = STATUS_MESSAGE[row.original.status]
          if (!msg) return null
          const Icon = msg.icon
          return (
            <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${msg.color}`}>
              <Icon className="h-3.5 w-3.5 shrink-0" />
              {msg.text}
            </span>
          )
        },
      },
      {
        id: 'actions',
        header: '',
        enableSorting: false,
        cell: ({ row }) => {
          const rental = row.original
          // Only offer Return for an active rental that the signed-in field
          // user actually owns. The backend enforces the same rule; this is
          // just to keep the UI honest for mocked/impersonated sessions.
          const canReturn =
            rental.status === 'active' && rental.requestedBy === userId
          return (
            <div className="flex items-center justify-end gap-2">
              {canReturn && (
                <Button
                  onClick={() => returnMutation.mutate(rental.id)}
                  size="sm"
                  disabled={returnMutation.isPending}
                  className="gap-1.5 text-xs"
                  style={{ backgroundColor: '#16a34a', color: '#fff' }}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  {returnMutation.isPending && returnMutation.variables === rental.id
                    ? 'Returning…'
                    : 'Return'}
                </Button>
              )}
              <Button
                onClick={() => navigate(`/field/equipment/${rental.equipmentId}`)}
                size="sm"
                variant="ghost"
                className="gap-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                View
              </Button>
            </div>
          )
        },
      },
    ],
    [navigate, returnMutation, userId],
  )

  const sortedRentals = useMemo(
    () => [...(rentalsQuery.data ?? [])].sort((a, b) =>
      (RENTAL_STATUS_RANK[a.status] ?? 99) - (RENTAL_STATUS_RANK[b.status] ?? 99)
    ),
    [rentalsQuery.data],
  )

  if (rentalsQuery.isLoading) return <Loader label="Loading your rentals..." />
  if (rentalsQuery.isError) {
    return <ErrorState error={rentalsQuery.error} onRetry={() => rentalsQuery.refetch()} title="Could not load rentals" />
  }

  return (
    <div className="space-y-6">
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 transition-colors">
        <ArrowLeft className="h-3.5 w-3.5" />
        Back
      </button>

      <PageHeader title="My Requests" subtitle="Track request status and active assignments" />

      {/* Status tabs */}
      <div className="flex flex-wrap gap-1.5">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatus(tab.value)}
            className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              status === tab.value
                ? 'bg-slate-900 text-white shadow-sm'
                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-400 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-600'
            }`}
          >
            {tab.dot && (
              <span className={`h-1.5 w-1.5 rounded-full ${status === tab.value ? 'bg-white/70' : tab.dot}`} />
            )}
            {tab.label}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={sortedRentals}
        emptyDescription="You have no rentals in this state."
        emptyTitle="No rentals found"
      />
    </div>
  )
}
