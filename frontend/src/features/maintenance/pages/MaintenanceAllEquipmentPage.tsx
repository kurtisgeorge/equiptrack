import { useMemo, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, Search } from 'lucide-react'
import ErrorState from '../../../components/ErrorState'
import Loader from '../../../components/Loader'
import PageHeader from '../../../components/PageHeader'
import EquipmentGroupGrid from '../../equipment/components/EquipmentGroupGrid'
import { listEquipment } from '../../../services/equipmentService'
import type { EquipmentStatus } from '../../../types/equipment'

const inputCls =
  'w-full h-9 rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-colors dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100 dark:placeholder:text-slate-500'

const STATUS_OPTIONS: Array<{ label: string; value: EquipmentStatus | 'all' }> = [
  { label: 'All statuses', value: 'all'         },
  { label: 'Available',    value: 'available'   },
  { label: 'In Use',       value: 'in_use'      },
  { label: 'Maintenance',  value: 'maintenance' },
]

export default function MaintenanceAllEquipmentPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const locationState = location.state as { statusFilter?: EquipmentStatus | 'all' } | null

  const [search, setSearch]     = useState('')
  const [status, setStatus]     = useState<EquipmentStatus | 'all'>(locationState?.statusFilter ?? 'all')
  const [category, setCategory] = useState('all')

  const equipmentQuery = useQuery({
    queryKey: ['equipment', 'maintenance-browse', { search, status }],
    queryFn: () => listEquipment({ search, status }),
    placeholderData: keepPreviousData,
  })

  const categories = useMemo(() => {
    const set = new Set((equipmentQuery.data ?? []).map((i) => i.category))
    return Array.from(set).sort()
  }, [equipmentQuery.data])

  const filtered = useMemo(() => {
    if (category === 'all') return equipmentQuery.data ?? []
    return (equipmentQuery.data ?? []).filter((i) => i.category === category)
  }, [equipmentQuery.data, category])

  const hasActiveFilters = search || status !== 'all' || category !== 'all'

  if (equipmentQuery.isLoading) return <Loader label="Loading equipment…" />
  if (equipmentQuery.isError) {
    return (
      <ErrorState
        error={equipmentQuery.error}
        onRetry={() => equipmentQuery.refetch()}
        title="Could not load equipment"
      />
    )
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

      <PageHeader title="All Equipment" subtitle="Browse and inspect the full fleet" />

      {/* ── Filters ──────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 dark:bg-slate-700/50 dark:border-slate-700 px-4 py-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Filters</p>
          {hasActiveFilters && (
            <button
              onClick={() => { setSearch(''); setStatus('all'); setCategory('all') }}
              className="text-[11px] font-semibold text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
            >
              Clear all
            </button>
          )}
        </div>

        <div className="p-4 space-y-4">
          {/* Search */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Search</span>
            <div className="relative max-w-sm">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or asset tag…"
                className={inputCls}
              />
            </div>
          </div>

          {/* Status pills */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Status</span>
            <div className="flex flex-wrap gap-1.5">
              {STATUS_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  onClick={() => setStatus(o.value)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    status === o.value
                      ? 'bg-slate-900 text-white'
                      : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-400 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-600'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {/* Category pills (conditional) */}
          {categories.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Category</span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setCategory('all')}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    category === 'all'
                      ? 'bg-slate-900 text-white'
                      : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-400 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-600'
                  }`}
                >
                  All categories
                </button>
                {categories.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      category === c
                        ? 'bg-slate-900 text-white'
                        : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-400 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-600'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <EquipmentGroupGrid
        equipment={filtered}
        getDetailPath={(item) => `/maintenance/equipment/${item.id}`}
      />
    </div>
  )
}
