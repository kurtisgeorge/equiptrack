import { useEffect, useMemo, useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Search, Package, ChevronRight, CheckCircle2, X, User, Calendar,
  MapPin, FileText, ArrowLeft, Layers, ChevronDown,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Loader from '../../../components/Loader'
import ErrorState from '../../../components/ErrorState'
import PageHeader from '../../../components/PageHeader'
import { Button } from '../../../components/ui/button'
import { getSession } from '../../../lib/auth'
import { listEquipment } from '../../../services/equipmentService'
import { createRentalRequest } from '../../../services/rentalService'
import type { Equipment } from '../../../types/equipment'

// ─── Styles ──────────────────────────────────────────────────────────────────

const inputCls =
  'w-full h-10 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-colors placeholder:text-slate-400 dark:placeholder:text-slate-500'

const labelCls =
  'block text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1.5'

// ─── Equipment picker panel ───────────────────────────────────────────────────

type EquipmentGroup = {
  name: string
  category: string
  initials: string
  units: Equipment[]
}

function EquipmentPicker({
  selected,
  onToggle,
}: {
  selected: Equipment[]
  onToggle: (eq: Equipment) => void
}) {
  const [search, setSearch]             = useState('')
  const [category, setCategory]         = useState('all')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  const selectedIds = useMemo(() => new Set(selected.map((e) => e.id)), [selected])

  const query = useQuery({
    queryKey: ['equipment', 'request-picker', { category }],
    queryFn: () => listEquipment({ status: 'available', category: category === 'all' ? undefined : category }),
    placeholderData: keepPreviousData,
  })

  const allItems = query.data ?? []

  const categories = useMemo(() => {
    const set = new Set(allItems.map((i) => i.category))
    return Array.from(set).sort()
  }, [allItems])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return allItems
    return allItems.filter(
      (eq) =>
        eq.name.toLowerCase().includes(q) ||
        eq.qrCode.toLowerCase().includes(q) ||
        eq.category.toLowerCase().includes(q),
    )
  }, [allItems, search])

  const groups = useMemo<EquipmentGroup[]>(() => {
    const map = new Map<string, EquipmentGroup>()
    for (const eq of filtered) {
      if (!map.has(eq.name)) {
        map.set(eq.name, { name: eq.name, category: eq.category, initials: eq.name.slice(0, 2).toUpperCase(), units: [] })
      }
      map.get(eq.name)!.units.push(eq)
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [filtered])

  // Auto-expand groups that contain selected units
  useEffect(() => {
    if (selected.length === 0) return
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      for (const eq of selected) {
        const grp = groups.find((g) => g.units.some((u) => u.id === eq.id))
        if (grp) next.add(grp.name)
      }
      return next
    })
  }, [selected, groups])

  function toggleGroup(name: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const pillCls = (active: boolean) =>
    `px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
      active
        ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
        : 'border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600'
    }`

  return (
    <div className="flex flex-col h-full">
      {/* Search + category */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 space-y-3 shrink-0">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or asset tag…"
            className={`${inputCls} pl-8`}
          />
        </div>
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <button onClick={() => setCategory('all')} className={pillCls(category === 'all')}>All</button>
            {categories.map((c) => (
              <button key={c} onClick={() => setCategory(c)} className={pillCls(category === c)}>{c}</button>
            ))}
          </div>
        )}
      </div>

      {/* Group list */}
      <div className="flex-1 overflow-y-auto">
        {query.isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader label="Loading equipment…" />
          </div>
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => query.refetch()} title="Could not load equipment" />
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 gap-2 text-slate-400">
            <Package className="h-10 w-10 opacity-30" />
            <p className="text-sm font-medium">No available equipment</p>
            <p className="text-xs">Try adjusting your search or category filter.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {groups.map((group) => {
              const isExpanded     = expandedGroups.has(group.name)
              const selectedInGroup = group.units.filter((u) => selectedIds.has(u.id))
              const selCount       = selectedInGroup.length
              const hasAny         = selCount > 0
              const isSingle       = group.units.length === 1

              return (
                <div key={group.name}>
                  {/* ── Group header row ── */}
                  <button
                    onClick={() => {
                      if (isSingle) {
                        onToggle(group.units[0])
                      } else {
                        toggleGroup(group.name)
                      }
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors group ${
                      hasAny
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-l-2 border-l-blue-500'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-700/50 border-l-2 border-l-transparent'
                    }`}
                  >
                    {/* Avatar */}
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                      hasAny
                        ? 'bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                    }`}>
                      {hasAny && isSingle ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        group.initials
                      )}
                    </div>

                    {/* Name + meta */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`text-sm font-semibold truncate ${hasAny ? 'text-blue-700 dark:text-blue-300' : 'text-slate-800 dark:text-slate-200'}`}>
                          {group.name}
                        </p>
                        {/* Total unit count */}
                        <span className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          hasAny
                            ? 'bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-300'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                        }`}>
                          <Layers className="h-2.5 w-2.5" />
                          {group.units.length} unit{group.units.length !== 1 ? 's' : ''}
                        </span>
                        {/* Selected count pill */}
                        {selCount > 0 && (
                          <span className="shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-blue-500 text-white">
                            {selCount} selected
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5">
                        {group.category}
                      </p>
                    </div>

                    {/* Right chevron/check */}
                    {isSingle ? (
                      hasAny ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-500" />
                      ) : (
                        <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 group-hover:text-slate-500 transition-colors" />
                      )
                    ) : (
                      <ChevronDown className={`h-4 w-4 shrink-0 text-slate-300 group-hover:text-slate-500 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                    )}
                  </button>

                  {/* ── Expanded unit list ── */}
                  {!isSingle && isExpanded && (
                    <div className="bg-slate-50/60 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-700">
                      {group.units.map((unit, idx) => {
                        const isUnitSelected = selectedIds.has(unit.id)
                        return (
                          <button
                            key={unit.id}
                            onClick={() => onToggle(unit)}
                            className={`w-full flex items-center gap-3 pl-14 pr-4 py-2.5 text-left transition-colors group ${
                              isUnitSelected
                                ? 'bg-blue-50 dark:bg-blue-900/30'
                                : 'hover:bg-slate-100/80 dark:hover:bg-slate-700/40'
                            } ${idx < group.units.length - 1 ? 'border-b border-slate-100 dark:border-slate-700/60' : ''}`}
                          >
                            {/* Checkbox dot */}
                            <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-bold border-2 transition-colors ${
                              isUnitSelected
                                ? 'bg-blue-500 border-blue-500 text-white'
                                : 'border-slate-300 dark:border-slate-500 bg-white dark:bg-slate-700 text-slate-400'
                            }`}>
                              {isUnitSelected && <CheckCircle2 className="h-3 w-3" />}
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className={`text-xs font-semibold font-mono truncate ${isUnitSelected ? 'text-blue-700 dark:text-blue-300' : 'text-slate-600 dark:text-slate-300'}`}>
                                {unit.qrCode}
                              </p>
                              {unit.notes && (
                                <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{unit.notes}</p>
                              )}
                            </div>

                            <span className={`shrink-0 text-[10px] font-medium transition-colors ${isUnitSelected ? 'text-blue-400' : 'text-slate-300 group-hover:text-slate-500'}`}>
                              {isUnitSelected ? 'Remove' : 'Add'}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Request form panel ───────────────────────────────────────────────────────

function RequestForm({
  equipment,
  onRemove,
  onClearAll,
}: {
  equipment: Equipment[]
  onRemove: (id: string) => void
  onClearAll: () => void
}) {
  const session = getSession()
  const queryClient = useQueryClient()

  const today = new Date().toISOString().split('T')[0]

  const [startDate,    setStartDate]    = useState('')
  const [endDate,      setEndDate]      = useState('')
  const [purpose,      setPurpose]      = useState('')
  const [siteLocation, setSiteLocation] = useState('')
  const [notes,        setNotes]        = useState('')
  const [submitted,    setSubmitted]    = useState(false)
  const [submitCount,  setSubmitCount]  = useState(0)

  const mutation = useMutation({
    mutationFn: async () => {
      const parts: string[] = []
      if (purpose.trim()) parts.push(`Purpose: ${purpose.trim()}`)
      if (siteLocation.trim()) parts.push(`Site / Location: ${siteLocation.trim()}`)
      if (notes.trim()) parts.push(`Additional Notes: ${notes.trim()}`)
      const notesStr = parts.length > 0 ? parts.join('\n') : undefined

      // Fire one request per selected item (sequential to avoid rate limits)
      for (const eq of equipment) {
        await createRentalRequest({
          equipmentId: eq.id,
          requestedBy: session?.user.id ?? '',
          startDate,
          endDate: endDate || undefined,
          notes: notesStr,
        })
      }
      return equipment.length
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['my-rentals'] })
      queryClient.invalidateQueries({ queryKey: ['field-summary'] })
      setSubmitCount(count)
      setSubmitted(true)
      toast.success(
        count === 1
          ? 'Request submitted — awaiting admin approval.'
          : `${count} requests submitted — awaiting admin approval.`,
      )
    },
    onError: (err: any) => toast.error(err.message || 'Failed to submit request.'),
  })

  const canSubmit = startDate.trim() !== '' && equipment.length > 0 && !mutation.isPending

  // ── Success state ────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 px-8 text-center h-full">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
          <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <p className="text-lg font-bold text-slate-800 dark:text-slate-100">
            {submitCount === 1 ? 'Request Submitted!' : `${submitCount} Requests Submitted!`}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
            {submitCount === 1
              ? `Your request for ${equipment[0]?.name ?? 'equipment'} is pending admin approval.`
              : `Your ${submitCount} equipment requests are pending admin approval.`}
            {' '}You can track them under My Rentals.
          </p>
        </div>
        <button
          onClick={onClearAll}
          className="mt-2 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline"
        >
          Submit another request
        </button>
      </div>
    )
  }

  return (
    <div className="overflow-y-auto h-full">
      <div className="p-6 space-y-6">

        {/* Selected equipment list */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Package className="h-3.5 w-3.5 text-slate-400" />
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                Selected Equipment
                <span className="ml-1.5 inline-flex items-center justify-center h-4 w-4 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-[10px] font-bold">
                  {equipment.length}
                </span>
              </p>
            </div>
            <button
              onClick={onClearAll}
              className="text-[10px] font-medium text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
            >
              Clear all
            </button>
          </div>
          <div className="space-y-1.5">
            {equipment.map((eq) => (
              <div
                key={eq.id}
                className="flex items-center gap-2.5 rounded-lg border border-blue-100 dark:border-blue-800/60 bg-blue-50 dark:bg-blue-900/20 px-3 py-2"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 text-[10px] font-bold">
                  {eq.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-blue-800 dark:text-blue-200 truncate">{eq.name}</p>
                  <p className="text-[10px] font-mono text-blue-500/70 dark:text-blue-400/70 truncate">{eq.qrCode}</p>
                </div>
                <button
                  onClick={() => onRemove(eq.id)}
                  className="shrink-0 text-blue-300 hover:text-red-400 dark:text-blue-600 dark:hover:text-red-400 transition-colors"
                  title="Remove from request"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-slate-100 dark:border-slate-700" />

        {/* Requester (read-only) */}
        <div>
          <div className="flex items-center gap-1.5 mb-3">
            <User className="h-3.5 w-3.5 text-slate-400" />
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Requester</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Name</label>
              <div className="h-10 rounded-lg border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 flex items-center text-sm text-slate-600 dark:text-slate-400 truncate">
                {session?.user.name ?? '—'}
              </div>
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <div className="h-10 rounded-lg border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 flex items-center text-sm text-slate-600 dark:text-slate-400 truncate">
                {session?.user.email ?? '—'}
              </div>
            </div>
          </div>
        </div>

        {/* Dates */}
        <div>
          <div className="flex items-center gap-1.5 mb-3">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Rental Dates</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Start Date <span className="text-red-400 normal-case tracking-normal">*</span></label>
              <input type="date" min={today} value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} required />
            </div>
            <div>
              <label className={labelCls}>End Date <span className="normal-case tracking-normal font-normal text-slate-400">(optional)</span></label>
              <input type="date" min={startDate || today} value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputCls} />
            </div>
          </div>
        </div>

        {/* Request details */}
        <div>
          <div className="flex items-center gap-1.5 mb-3">
            <FileText className="h-3.5 w-3.5 text-slate-400" />
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Request Details</p>
          </div>

          {/* Purpose */}
          <div className="mb-3">
            <label className={labelCls}>Purpose of Use</label>
            <input
              type="text"
              placeholder="e.g. Project Work, Site Inspection, Emergency Response…"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className={inputCls}
              maxLength={120}
            />
          </div>

          {/* Site location */}
          <div className="mb-3">
            <label className={labelCls}>
              <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> Site / Deployment Location</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Northern construction site, Block C"
              value={siteLocation}
              onChange={(e) => setSiteLocation(e.target.value)}
              className={inputCls}
              maxLength={120}
            />
          </div>

          {/* Notes */}
          <div>
            <label className={labelCls}>Additional Notes for Admin</label>
            <textarea
              placeholder="Any special requirements, urgency, or context the admin should know…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              maxLength={500}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-colors resize-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
            <p className="mt-1 text-right text-[10px] text-slate-400">{notes.length}/500</p>
          </div>
        </div>

        {/* Submit */}
        <Button
          onClick={() => mutation.mutate()}
          disabled={!canSubmit}
          className="w-full"
          style={{ backgroundColor: 'rgb(var(--brand-navy-rgb))', color: '#fff' }}
        >
          {mutation.isPending
            ? 'Submitting…'
            : equipment.length > 1
              ? `Submit ${equipment.length} Requests`
              : 'Submit Request'}
        </Button>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FieldRequestPage() {
  const navigate = useNavigate()
  const [selected, setSelected] = useState<Equipment[]>([])

  function handleToggle(eq: Equipment) {
    setSelected((prev) => {
      const exists = prev.some((e) => e.id === eq.id)
      return exists ? prev.filter((e) => e.id !== eq.id) : [...prev, eq]
    })
  }

  function handleRemove(id: string) {
    setSelected((prev) => prev.filter((e) => e.id !== id))
  }

  function handleClearAll() {
    setSelected([])
  }

  const hasSelection = selected.length > 0

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
        title="Request Equipment"
        subtitle="Select one or more available items, fill in your details, and submit for admin approval"
      />

      {/* Two-panel layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden bg-white dark:bg-slate-800" style={{ minHeight: '600px' }}>

        {/* Left — equipment picker */}
        <div className="flex flex-col border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-700 lg:max-h-[720px]">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 shrink-0">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
              1 — Pick Equipment
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Grouped by model · tap to add/remove · available only
            </p>
          </div>
          <EquipmentPicker selected={selected} onToggle={handleToggle} />
        </div>

        {/* Right — form */}
        <div className="flex flex-col lg:max-h-[720px]">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 shrink-0">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
              2 — Fill Request Details
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {hasSelection
                ? `${selected.length} item${selected.length !== 1 ? 's' : ''} selected — dates & notes apply to all`
                : 'Select items on the left first'}
            </p>
          </div>

          {hasSelection ? (
            <RequestForm
              key={selected.map((e) => e.id).join(',')}
              equipment={selected}
              onRemove={handleRemove}
              onClearAll={handleClearAll}
            />
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 py-16 px-8 text-center flex-1 text-slate-400">
              <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-dashed border-slate-200 dark:border-slate-600">
                <Package className="h-6 w-6 opacity-50" />
              </div>
              <p className="text-sm font-medium">No equipment selected</p>
              <p className="text-xs max-w-xs">
                Pick one or more available items from the list on the left. You can mix different models in a single request.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
