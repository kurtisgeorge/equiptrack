import { useState } from 'react'
import { User, MapPin, Calendar, FileText, Package, ChevronDown } from 'lucide-react'
import { Button } from '../../../components/ui/button'

// ─── Shared input styles ────────────────────────────────────────────────────

const inputCls =
  'w-full h-10 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-colors placeholder:text-slate-400 dark:placeholder:text-slate-500'

const selectCls =
  'w-full h-10 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-colors appearance-none cursor-pointer'

const textareaCls =
  'w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-colors resize-none placeholder:text-slate-400 dark:placeholder:text-slate-500'

const labelCls = 'block text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1.5'

// ─── Types ──────────────────────────────────────────────────────────────────

const PURPOSE_OPTIONS = [
  { value: '', label: 'Select a purpose…' },
  { value: 'project_work', label: 'Project Work' },
  { value: 'site_inspection', label: 'Site Inspection' },
  { value: 'training', label: 'Training / Demonstration' },
  { value: 'equipment_testing', label: 'Equipment Testing' },
  { value: 'emergency_response', label: 'Emergency Response' },
  { value: 'maintenance_support', label: 'Maintenance Support' },
  { value: 'other', label: 'Other' },
]

export type RentalRequestFormValues = {
  startDate: string
  endDate: string
  purpose: string
  siteLocation: string
  notes: string
}

type Props = {
  equipmentName: string
  equipmentQr: string
  requesterName: string
  requesterEmail: string
  defaultStartDate?: string
  defaultEndDate?: string
  isSubmitting?: boolean
  onSubmit: (values: { startDate: string; endDate?: string; notes?: string }) => void
  onCancel: () => void
}

// ─── Form ───────────────────────────────────────────────────────────────────

export default function RentalRequestForm({
  equipmentName,
  equipmentQr,
  requesterName,
  requesterEmail,
  defaultStartDate = '',
  defaultEndDate = '',
  isSubmitting,
  onSubmit,
  onCancel,
}: Props) {
  const [startDate, setStartDate]       = useState(defaultStartDate)
  const [endDate, setEndDate]           = useState(defaultEndDate)
  const [purpose, setPurpose]           = useState('')
  const [siteLocation, setSiteLocation] = useState('')
  const [notes, setNotes]               = useState('')

  const today = new Date().toISOString().split('T')[0]
  const canSubmit = startDate.trim() !== '' && !isSubmitting

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return

    // Build a structured notes string combining all optional fields
    const parts: string[] = []
    if (purpose) {
      const label = PURPOSE_OPTIONS.find((o) => o.value === purpose)?.label ?? purpose
      parts.push(`Purpose: ${label}`)
    }
    if (siteLocation.trim()) parts.push(`Site / Location: ${siteLocation.trim()}`)
    if (notes.trim()) parts.push(`Additional Notes: ${notes.trim()}`)

    onSubmit({
      startDate,
      endDate: endDate || undefined,
      notes: parts.length > 0 ? parts.join('\n') : undefined,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-0">

      {/* ── Read-only info cards ─────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        {/* Requester */}
        <div className="rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-4 py-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <User className="h-3.5 w-3.5 text-slate-400" />
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Requester</p>
          </div>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{requesterName}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{requesterEmail}</p>
        </div>

        {/* Equipment */}
        <div className="rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-4 py-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Package className="h-3.5 w-3.5 text-slate-400" />
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Equipment</p>
          </div>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{equipmentName}</p>
          <p className="text-xs font-mono text-slate-400 dark:text-slate-500 truncate">{equipmentQr}</p>
        </div>
      </div>

      {/* ── Divider ──────────────────────────────────────────────── */}
      <div className="border-t border-slate-100 dark:border-slate-700 mb-5" />

      {/* ── Dates ────────────────────────────────────────────────── */}
      <div className="mb-5">
        <div className="flex items-center gap-1.5 mb-3">
          <Calendar className="h-3.5 w-3.5 text-slate-400" />
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Rental Dates</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>
              Start Date <span className="text-red-400 normal-case tracking-normal">*</span>
            </label>
            <input
              type="date"
              min={today}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={inputCls}
              required
            />
          </div>
          <div>
            <label className={labelCls}>
              End Date <span className="normal-case tracking-normal font-normal text-slate-400">(optional)</span>
            </label>
            <input
              type="date"
              min={startDate || today}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>
      </div>

      {/* ── Request Details ───────────────────────────────────────── */}
      <div className="mb-5">
        <div className="flex items-center gap-1.5 mb-3">
          <FileText className="h-3.5 w-3.5 text-slate-400" />
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Request Details</p>
        </div>

        {/* Purpose */}
        <div className="mb-3">
          <label className={labelCls}>Purpose of Use</label>
          <div className="relative">
            <select
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className={selectCls}
            >
              {PURPOSE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value} disabled={o.value === ''}>
                  {o.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          </div>
        </div>

        {/* Site / Location */}
        <div className="mb-3">
          <label className={labelCls}>
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              Site / Deployment Location
            </span>
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
            placeholder="Any extra context, special requirements, or urgency details…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            maxLength={500}
            className={textareaCls}
          />
          <p className="mt-1 text-right text-[10px] text-slate-400">{notes.length}/500</p>
        </div>
      </div>

      {/* ── Actions ───────────────────────────────────────────────── */}
      <div className="flex gap-2 pt-1">
        <Button type="button" variant="outline" className="flex-1" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!canSubmit}
          className="flex-1"
          style={{ backgroundColor: 'rgb(var(--brand-navy-rgb))', color: '#fff' }}
        >
          {isSubmitting ? 'Submitting…' : 'Submit Request'}
        </Button>
      </div>
    </form>
  )
}
