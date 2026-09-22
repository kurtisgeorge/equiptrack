import { useEffect, useMemo, useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Search, Package, ChevronRight, CheckCircle2, X, FileText,
  ArrowLeft, Layers, ChevronDown, AlertTriangle,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Loader from '../../../components/Loader'
import ErrorState from '../../../components/ErrorState'
import PageHeader from '../../../components/PageHeader'
import { Button } from '../../../components/ui/button'
import { getSession } from '../../../lib/auth'
import { listEquipment, reportIssue } from '../../../services/equipmentService'
import type { Equipment, EquipmentStatus } from '../../../types/equipment'

// ─── Styles ──────────────────────────────────────────────────────────────────

const inputCls =
  'w-full h-10 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 transition-colors placeholder:text-slate-400 dark:placeholder:text-slate-500'

const labelCls =
  'block text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1.5'

// ─── Severity config ──────────────────────────────────────────────────────────

const SEVERITY_OPTIONS = [
  { value: 'LOW',      label: 'Low',      active: 'bg-blue-500 border-blue-500 text-white',      idle: 'border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30'      },
  { value: 'MEDIUM',   label: 'Medium',   active: 'bg-amber-500 border-amber-500 text-white',    idle: 'border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30'  },
  { value: 'HIGH',     label: 'High',     active: 'bg-orange-500 border-orange-500 text-white',  idle: 'border-orange-200 dark:border-orange-800 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/30' },
  { value: 'CRITICAL', label: 'Critical', active: 'bg-red-500 border-red-500 text-white',        idle: 'border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30'            },
]

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_DOT: Record<EquipmentStatus, string> = {
  available:   'bg-emerald-500',
  in_use:      'bg-blue-500',
  maintenance: 'bg-amber-500',
}

const STATUS_LABEL: Record<EquipmentStatus, string> = {
  available:   'Available',
  in_use:      'In Use',
  maintenance: 'Maintenance',
}

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
  const [search, setSearch]                   = useState('')
  const [category, setCategory]               = useState('all')
  const [expandedGroups, setExpandedGroups]   = useState<Set<string>>(new Set())

  const selectedIds = useMemo(() => new Set(selected.map((e) => e.id)), [selected])

  // All statuses — maintenance staff needs to report on any equipment
  const query = useQuery({
    queryKey: ['equipment', 'report-picker', { category }],
    queryFn: () => listEquipment({ category: category === 'all' ? undefined : category }),
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

  // Auto-expand groups with selected units
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
      next.has(name) ? next.delete(name) : next.add(name)
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
            <p className="text-sm font-medium">No equipment found</p>
            <p className="text-xs">Try adjusting your search or category filter.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {groups.map((group) => {
              const isExpanded      = expandedGroups.has(group.name)
              const selCount        = group.units.filter((u) => selectedIds.has(u.id)).length
              const hasAny          = selCount > 0
              const isSingle        = group.units.length === 1

              // Status mix summary for the group
              const statusCounts = group.units.reduce(
                (acc, u) => { acc[u.status] = (acc[u.status] ?? 0) + 1; return acc },
                {} as Record<string, number>,
              )

              return (
                <div key={group.name}>
                  {/* ── Group header ── */}
                  <button
                    onClick={() => isSingle ? onToggle(group.units[0]) : toggleGroup(group.name)}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors group ${
                      hasAny
                        ? 'bg-amber-50 dark:bg-amber-900/20 border-l-2 border-l-amber-500'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-700/50 border-l-2 border-l-transparent'
                    }`}
                  >
                    {/* Avatar */}
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                      hasAny
                        ? 'bg-amber-100 dark:bg-amber-800 text-amber-700 dark:text-amber-300'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                    }`}>
                      {hasAny && isSingle ? <CheckCircle2 className="h-4 w-4" /> : group.initials}
                    </div>

                    {/* Name + meta */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`text-sm font-semibold truncate ${hasAny ? 'text-amber-700 dark:text-amber-300' : 'text-slate-800 dark:text-slate-200'}`}>
                          {group.name}
                        </p>
                        <span className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          hasAny
                            ? 'bg-amber-100 dark:bg-amber-800 text-amber-600 dark:text-amber-300'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                        }`}>
                          <Layers className="h-2.5 w-2.5" />
                          {group.units.length} unit{group.units.length !== 1 ? 's' : ''}
                        </span>
                        {selCount > 0 && (
                          <span className="shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-amber-500 text-white">
                            {selCount} selected
                          </span>
                        )}
                      </div>
                      {/* Status dots row */}
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-slate-400 dark:text-slate-500">{group.category}</p>
                        {Object.entries(statusCounts).map(([status, count]) => (
                          <span key={status} className="flex items-center gap-1">
                            <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[status as EquipmentStatus] ?? 'bg-slate-400'}`} />
                            <span className="text-[10px] text-slate-400">{count}</span>
                          </span>
                        ))}
                      </div>
                    </div>

                    {isSingle ? (
                      hasAny
                        ? <CheckCircle2 className="h-4 w-4 shrink-0 text-amber-500" />
                        : <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 group-hover:text-slate-500 transition-colors" />
                    ) : (
                      <ChevronDown className={`h-4 w-4 shrink-0 text-slate-300 group-hover:text-slate-500 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                    )}
                  </button>

                  {/* ── Expanded units ── */}
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
                                ? 'bg-amber-50 dark:bg-amber-900/30'
                                : 'hover:bg-slate-100/80 dark:hover:bg-slate-700/40'
                            } ${idx < group.units.length - 1 ? 'border-b border-slate-100 dark:border-slate-700/60' : ''}`}
                          >
                            {/* Checkbox */}
                            <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${
                              isUnitSelected
                                ? 'bg-amber-500 border-amber-500 text-white'
                                : 'border-slate-300 dark:border-slate-500 bg-white dark:bg-slate-700'
                            }`}>
                              {isUnitSelected && <CheckCircle2 className="h-3 w-3" />}
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className={`text-xs font-semibold font-mono truncate ${isUnitSelected ? 'text-amber-700 dark:text-amber-300' : 'text-slate-600 dark:text-slate-300'}`}>
                                {unit.qrCode}
                              </p>
                              {/* Status label */}
                              <span className="flex items-center gap-1 mt-0.5">
                                <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[unit.status]}`} />
                                <span className="text-[10px] text-slate-400">{STATUS_LABEL[unit.status]}</span>
                              </span>
                            </div>

                            <span className={`shrink-0 text-[10px] font-medium transition-colors ${isUnitSelected ? 'text-amber-400' : 'text-slate-300 group-hover:text-slate-500'}`}>
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

// ─── Report form panel ────────────────────────────────────────────────────────

function ReportForm({
  equipment,
  onRemove,
  onClearAll,
}: {
  equipment: Equipment[]
  onRemove: (id: string) => void
  onClearAll: () => void
}) {
  const session      = getSession()
  const queryClient  = useQueryClient()

  const [severity,    setSeverity]    = useState('MEDIUM')
  const [title,       setTitle]       = useState('')
  const [description, setDescription] = useState('')
  const [submitted,   setSubmitted]   = useState(false)
  const [submitCount, setSubmitCount] = useState(0)

  const mutation = useMutation({
    mutationFn: async () => {
      for (const eq of equipment) {
        await reportIssue(eq.id, {
          severity,
          title: title.trim(),
          description: description.trim(),
          reportedById: session?.user.id ?? '',
        })
      }
      return equipment.length
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['open-issues'] })
      queryClient.invalidateQueries({ queryKey: ['maintenance-summary'] })
      setSubmitCount(count)
      setSubmitted(true)
      toast.success(count === 1 ? 'Issue reported successfully.' : `${count} issues reported successfully.`)
    },
    onError: (err: any) => toast.error(err.message || 'Failed to submit report.'),
  })

  const canSubmit = title.trim() !== '' && description.trim() !== '' && !mutation.isPending

  // ── Success state ────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 px-8 text-center h-full">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40">
          <CheckCircle2 className="h-8 w-8 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <p className="text-lg font-bold text-slate-800 dark:text-slate-100">
            {submitCount === 1 ? 'Issue Reported!' : `${submitCount} Issues Reported!`}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
            {submitCount === 1
              ? `The issue for ${equipment[0]?.name ?? 'equipment'} has been logged.`
              : `Issues for ${submitCount} equipment units have been logged.`}
            {' '}You can track them under Issue Reports.
          </p>
        </div>
        <button
          onClick={onClearAll}
          className="mt-2 text-sm font-semibold text-amber-600 dark:text-amber-400 hover:underline"
        >
          File another report
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
                Reporting On
                <span className="ml-1.5 inline-flex items-center justify-center h-4 w-4 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 text-[10px] font-bold">
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
              <div key={eq.id} className="flex items-center gap-2.5 rounded-lg border border-amber-100 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-900/20 px-3 py-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-800 text-amber-700 dark:text-amber-300 text-[10px] font-bold">
                  {eq.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-amber-800 dark:text-amber-200 truncate">{eq.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[eq.status]}`} />
                    <p className="text-[10px] font-mono text-amber-500/70 dark:text-amber-400/70">{eq.qrCode}</p>
                    <span className="text-[10px] text-slate-400">{STATUS_LABEL[eq.status]}</span>
                  </div>
                </div>
                <button
                  onClick={() => onRemove(eq.id)}
                  className="shrink-0 text-amber-300 hover:text-red-400 dark:text-amber-600 dark:hover:text-red-400 transition-colors"
                  title="Remove from report"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-slate-100 dark:border-slate-700" />

        {/* Issue details */}
        <div>
          <div className="flex items-center gap-1.5 mb-3">
            <FileText className="h-3.5 w-3.5 text-slate-400" />
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Issue Details</p>
          </div>

          {/* Severity pills */}
          <div className="mb-4">
            <label className={labelCls}>Severity</label>
            <div className="grid grid-cols-4 gap-2">
              {SEVERITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSeverity(opt.value)}
                  className={`rounded-lg border-2 px-2 py-2 text-xs font-bold transition-all ${
                    severity === opt.value ? opt.active : `bg-white dark:bg-slate-800 ${opt.idle}`
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {severity === 'CRITICAL' && (
              <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 px-3 py-2">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-500" />
                <p className="text-xs text-red-600 dark:text-red-400">Critical issues are escalated immediately to admin.</p>
              </div>
            )}
          </div>

          {/* Title */}
          <div className="mb-3">
            <label className={labelCls}>Issue Title <span className="text-red-400 normal-case tracking-normal">*</span></label>
            <input
              type="text"
              placeholder="e.g. Hydraulic fluid leak, Brake failure, Cracked housing…"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputCls}
              maxLength={120}
            />
          </div>

          {/* Description */}
          <div>
            <label className={labelCls}>Description <span className="text-red-400 normal-case tracking-normal">*</span></label>
            <textarea
              placeholder="Describe the issue in detail — when it was noticed, symptoms, any safety concerns…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              maxLength={600}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 transition-colors resize-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
            <p className="mt-1 text-right text-[10px] text-slate-400">{description.length}/600</p>
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
              ? `Submit ${equipment.length} Reports`
              : 'Submit Report'}
        </Button>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MaintenanceReportPage() {
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
        title="Report Equipment Issue"
        subtitle="Select one or more equipment units and file a maintenance issue report"
      />

      {/* Two-panel layout */}
      <div
        className="grid grid-cols-1 lg:grid-cols-2 gap-0 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden bg-white dark:bg-slate-800"
        style={{ minHeight: '600px' }}
      >
        {/* Left — picker */}
        <div className="flex flex-col border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-700 lg:max-h-[720px]">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 shrink-0">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
              1 — Pick Equipment
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Grouped by model · all statuses · tap to add/remove
            </p>
          </div>
          <EquipmentPicker selected={selected} onToggle={handleToggle} />
        </div>

        {/* Right — form */}
        <div className="flex flex-col lg:max-h-[720px]">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 shrink-0">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
              2 — Fill Report Details
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {hasSelection
                ? `${selected.length} unit${selected.length !== 1 ? 's' : ''} selected — details apply to all`
                : 'Select equipment on the left first'}
            </p>
          </div>

          {hasSelection ? (
            <ReportForm
              key={selected.map((e) => e.id).join(',')}
              equipment={selected}
              onRemove={handleRemove}
              onClearAll={handleClearAll}
            />
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 py-16 px-8 text-center flex-1 text-slate-400">
              <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-dashed border-slate-200 dark:border-slate-600">
                <AlertTriangle className="h-6 w-6 opacity-50" />
              </div>
              <p className="text-sm font-medium">No equipment selected</p>
              <p className="text-xs max-w-xs">
                Pick one or more units from the list on the left to start your report. You can report the same issue across multiple units at once.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
