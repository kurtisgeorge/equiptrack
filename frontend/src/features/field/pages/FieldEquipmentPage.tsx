import { useMemo, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Search, MapPin, Calendar } from 'lucide-react'
import ErrorState from '../../../components/ErrorState'
import Loader from '../../../components/Loader'
import PageHeader from '../../../components/PageHeader'
import EquipmentGroupGrid from '../../equipment/components/EquipmentGroupGrid'
import { listEquipment } from '../../../services/equipmentService'
import type { EquipmentStatus } from '../../../types/equipment'

const inputCls = 'w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-colors dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100 dark:placeholder:text-slate-500'

const STATUS_OPTIONS = [
  { label: 'All statuses', value: 'all'         },
  { label: 'Available',    value: 'available'    },
  { label: 'In Use',       value: 'in_use'       },
  { label: 'Maintenance',  value: 'maintenance'  },
] as const

export default function FieldEquipmentPage() {
  const navigate = useNavigate()
  const [search, setSearch]     = useState('')
  const [status, setStatus]     = useState<EquipmentStatus | 'all'>('all')
  const [category, setCategory] = useState('all')
  const [location, setLocation] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate]   = useState('')

  const equipmentQuery = useQuery({
    queryKey: ['equipment', 'field', { search, status, category, location, startDate, endDate }],
    queryFn: () => listEquipment({ search, status, category, location, startDate, endDate }),
    placeholderData: keepPreviousData,
  })

  const categories = useMemo(() => {
    const set = new Set((equipmentQuery.data ?? []).map((i) => i.category))
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [equipmentQuery.data])

  const hasActiveFilters = search || status !== 'all' || category !== 'all' || location || startDate || endDate

  return (
    <div className="space-y-6">
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 transition-colors">
        <ArrowLeft className="h-3.5 w-3.5" />
        Back
      </button>

      <PageHeader title="Equipment Search" subtitle="Search inventory and tap a tile to see available units" />

      {/* ── Filter card ──────────────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 dark:bg-slate-700/50 dark:border-slate-700 px-4 py-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Filters</p>
          {hasActiveFilters && (
            <button
              onClick={() => { setSearch(''); setStatus('all'); setCategory('all'); setLocation(''); setStartDate(''); setEndDate('') }}
              className="text-[11px] font-semibold text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
            >
              Clear all
            </button>
          )}
        </div>

        <div className="p-4 space-y-4">
          {/* Row 1: Search + Location + Dates */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {/* Search */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-400">Search</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Name or asset tag…"
                  className={`${inputCls} pl-8`}
                />
              </div>
            </div>

            {/* Location */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Location</label>
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Site A"
                  className={`${inputCls} pl-8`}
                />
              </div>
            </div>

            {/* Start Date */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Start Date</label>
              <div className="relative">
                <Calendar className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={`${inputCls} pl-8`}
                />
              </div>
            </div>

            {/* End Date */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">End Date</label>
              <div className="relative">
                <Calendar className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={`${inputCls} pl-8`}
                />
              </div>
            </div>
          </div>

          {/* Row 2: Status pills */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Status</span>
            <div className="flex flex-wrap gap-1.5">
              {STATUS_OPTIONS.map(({ label, value }) => (
                <button
                  key={value}
                  onClick={() => setStatus(value)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    status === value
                      ? 'bg-slate-900 text-white'
                      : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-400 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-600'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Row 3: Category pills (conditional) */}
          {categories.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Category</span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setCategory('all')}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${category === 'all' ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-400 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-600'}`}
                >
                  All categories
                </button>
                {categories.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${category === c ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-400 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-600'}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Equipment grid */}
      {equipmentQuery.isLoading ? (
        <Loader label="Searching equipment…" />
      ) : equipmentQuery.isError ? (
        <ErrorState error={equipmentQuery.error} onRetry={() => equipmentQuery.refetch()} title="Could not load equipment" />
      ) : (
        <EquipmentGroupGrid
          equipment={equipmentQuery.data ?? []}
          getDetailPath={(item) => `/field/equipment/${item.id}`}
          getDetailState={() => ({ startDate, endDate })}
        />
      )}
    </div>
  )
}
