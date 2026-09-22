import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import {
  ClipboardList,
  Hammer,
  Package,
  ChevronRight,
  CheckCircle2,
  HardHat,
  SlidersHorizontal,
  Send,
  QrCode,
  AlertTriangle,
} from 'lucide-react'
import ErrorState from '../../../components/ErrorState'
import Loader from '../../../components/Loader'
import PersonalizableWidget from '../../../components/PersonalizableWidget'
import { getSession } from '../../../lib/auth'
import { getFieldSummary } from '../../../services/dashboardService'
import { useDashboardLayout, type WidgetDef } from '../../../hooks/useDashboardLayout'

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

const HOW_IT_WORKS = [
  { step: '01', title: 'Browse Equipment', desc: 'Explore the full catalog and find the right gear for your job.', icon: Package,      iconBg: 'bg-slate-100', to: '/field/equipment' },
  { step: '02', title: 'Submit a Request', desc: 'Choose your dates and send a rental request for admin review.',   icon: ClipboardList, iconBg: 'bg-slate-100', to: '/field/rentals'   },
  { step: '03', title: 'Pick Up & Return', desc: 'Once approved, check out the equipment and return it when done.', icon: CheckCircle2,  iconBg: 'bg-slate-100', to: '/field/rentals'   },
]

const WIDGETS: WidgetDef[] = [
  // ── Row 1: action shortcuts ──────────────────────────────────
  { id: 'action-request',  label: 'Request Equipment',     size: 'card', defaultVisible: true,  description: 'Shortcut to start a new equipment rental request.'          },
  { id: 'action-report',   label: 'Report Equipment Issue',size: 'card', defaultVisible: true,  description: 'File a new maintenance issue report on any equipment unit.' },
  { id: 'action-scan-qr',  label: 'Scan QR Code',          size: 'card', defaultVisible: true,  description: 'Open the QR scanner to instantly look up any equipment unit.'},
  // ── Row 2: metrics ───────────────────────────────────────────
  { id: 'metric-pending',  label: 'My Pending Requests',   size: 'card', defaultVisible: true,  description: 'Number of your requests currently awaiting admin approval.'  },
  { id: 'metric-active',   label: 'My Active Rentals',     size: 'card', defaultVisible: true,  description: 'Equipment currently assigned and checked out to you.'         },
  // ── Row 3: quick links ───────────────────────────────────────
  { id: 'link-equipment',  label: 'Equipment Catalog',     size: 'card', defaultVisible: true,  description: 'Quick link to browse and request available equipment.'        },
  { id: 'link-rentals',    label: 'My Requests',           size: 'card', defaultVisible: true,  description: 'Quick link to track your active and pending rental requests.' },
  // ── Off by default ───────────────────────────────────────────
  { id: 'how-it-works',    label: 'How It Works',          size: 'wide', defaultVisible: false, description: 'Three-step guide: Browse → Request → Pick Up.'               },
]

export default function FieldDashboardPage() {
  const navigate = useNavigate()
  const session = getSession()
  const userId = session?.user.id ?? ''
  const firstName = (session?.user.name ?? 'there').split(' ')[0]

  const [personalizing, setPersonalizing] = useState(false)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  const { orderedWidgets, isVisible, toggleVisible, reset, reorderTo } =
    useDashboardLayout('field', userId, WIDGETS)

  function handleReset() { reset(); setPersonalizing(false) }

  const summaryQuery = useQuery({
    enabled: Boolean(userId),
    queryKey: ['field-summary', userId],
    queryFn: () => getFieldSummary(userId),
  })

  if (summaryQuery.isLoading) return <Loader label="Loading field dashboard..." />
  if (summaryQuery.isError || !summaryQuery.data) {
    return (
      <ErrorState
        error={summaryQuery.error}
        onRetry={() => { void summaryQuery.refetch() }}
        title="Could not load dashboard"
      />
    )
  }

  const RENDER: Record<string, React.ReactNode> = {

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
            <p className="mt-0.5 text-xs text-amber-600/80 dark:text-amber-400/80 leading-relaxed hidden sm:block">Log a new maintenance issue on any fleet unit.</p>
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

    'action-request': (
      <button
        onClick={() => navigate('/request')}
        className="group relative w-full h-full overflow-hidden rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-gradient-to-br from-emerald-50 to-emerald-100/40 dark:from-emerald-900/30 dark:to-emerald-900/10 px-5 py-5 text-left hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-700 transition-all"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500 shadow-sm">
            <Send className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-emerald-800 dark:text-emerald-200">Request Equipment</p>
            <p className="mt-0.5 text-xs text-emerald-600/80 dark:text-emerald-400/80 leading-relaxed hidden sm:block">Pick from available gear and submit a rental request in seconds.</p>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm group-hover:bg-emerald-600 transition-colors">
            <Send className="h-3 w-3" />
            Start a Request
          </span>
          <ChevronRight className="h-4 w-4 text-emerald-400 dark:text-emerald-600 transition-transform group-hover:translate-x-0.5" />
        </div>
      </button>
    ),

    'link-equipment': (
      <Link to="/field/equipment"
        className="group flex h-full items-center gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4 hover:border-slate-300 hover:shadow-md dark:bg-slate-800 dark:border-slate-700 dark:hover:border-slate-600">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-700">
          <Package className="h-5 w-5 text-slate-500 dark:text-slate-400" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Equipment Availability</p>
            <HardHat className="h-3 w-3 text-slate-300 dark:text-slate-500" />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">Browse and request ready equipment</p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition-colors group-hover:text-slate-500" />
      </Link>
    ),

    'link-rentals': (
      <Link to="/field/rentals"
        className="group flex h-full items-center gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4 hover:border-slate-300 hover:shadow-md dark:bg-slate-800 dark:border-slate-700 dark:hover:border-slate-600">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-700">
          <ClipboardList className="h-5 w-5 text-slate-500 dark:text-slate-400" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">My Requests</p>
            <HardHat className="h-3 w-3 text-slate-300 dark:text-slate-500" />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">Track active and pending rentals</p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition-colors group-hover:text-slate-500" />
      </Link>
    ),

    'metric-pending': (
      <button onClick={() => navigate('/field/rentals', { state: { statusFilter: 'pending' } })}
        className="group w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 rounded-xl">
        <div className="metric-card h-full rounded-xl border border-slate-200 border-l-4 border-l-slate-300 bg-white px-5 py-5 group-hover:border-slate-300 group-hover:shadow-md dark:bg-slate-800 dark:border-slate-700 dark:border-l-slate-600">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">My Pending Requests</p>
              <HardHat className="h-3 w-3 text-slate-300 dark:text-slate-600" />
            </div>
            <ClipboardList className="h-4 w-4 text-slate-400" />
          </div>
          <p className="anim-count-pop text-3xl font-bold text-slate-900 dark:text-slate-100">{summaryQuery.data.myPendingRequests}</p>
          <p className="mt-1 text-xs text-slate-400 hidden sm:block">Requests waiting for admin approval</p>
          <p className="mt-3 text-[10px] font-semibold uppercase tracking-wide text-slate-300 transition-colors group-hover:text-slate-500">View details →</p>
        </div>
      </button>
    ),

    'metric-active': (
      <button onClick={() => navigate('/field/rentals', { state: { statusFilter: 'active' } })}
        className="group w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 rounded-xl">
        <div className="metric-card h-full rounded-xl border border-slate-200 border-l-4 border-l-slate-300 bg-white px-5 py-5 group-hover:border-slate-300 group-hover:shadow-md dark:bg-slate-800 dark:border-slate-700 dark:border-l-slate-600">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">My Active Rentals</p>
              <HardHat className="h-3 w-3 text-slate-300 dark:text-slate-600" />
            </div>
            <Hammer className="h-4 w-4 text-slate-400" />
          </div>
          <p className="anim-count-pop text-3xl font-bold text-slate-900 dark:text-slate-100">{summaryQuery.data.myActiveRentals}</p>
          <p className="mt-1 text-xs text-slate-400 hidden sm:block">Equipment currently assigned to your jobs</p>
          <p className="mt-3 text-[10px] font-semibold uppercase tracking-wide text-slate-300 transition-colors group-hover:text-slate-500">View details →</p>
        </div>
      </button>
    ),

    'how-it-works': (
      <div>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-slate-400">How It Works</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {HOW_IT_WORKS.map((s, i) => (
            <Link key={s.step} to={s.to}
              className="group relative flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-5 py-5 hover:border-slate-300 hover:shadow-md dark:bg-slate-800 dark:border-slate-700 dark:hover:border-slate-600 anim-fade-up"
              style={{ animationDelay: `${0.05 + i * 0.07}s` }}
            >
              <div className="flex items-center gap-3">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${s.iconBg} dark:bg-slate-700`}>
                  <s.icon className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-300">{s.step}</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{s.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{s.desc}</p>
              </div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-300 transition-colors group-hover:text-slate-500">Get started →</p>
            </Link>
          ))}
        </div>
      </div>
    ),

  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-8rem)] space-y-7">

      {/* ── Hero Banner ──────────────────────────────────────── */}
      <div
        className="anim-fade-up relative overflow-hidden rounded-2xl px-7 py-10"
        style={{ background: 'linear-gradient(135deg, #15803d 0%, #0f5c2c 100%)', animationDelay: '0s' }}
      >
        <div className="hero-blob pointer-events-none absolute -right-14 -top-14 h-64 w-64 rounded-full bg-white/10" />
        <div className="hero-blob-2 pointer-events-none absolute right-20 -bottom-12 h-40 w-40 rounded-full bg-white/5" />
        <div className="hero-blob pointer-events-none absolute -left-10 top-1/2 h-32 w-32 -translate-y-1/2 rounded-full bg-white/5" style={{ animationDelay: '3s' }} />
        <div className="relative z-10 flex items-center justify-between gap-4">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-emerald-200">{getGreeting()}</p>
            <h1 className="text-2xl font-bold text-white">{firstName}!</h1>
            <p className="mt-1.5 text-sm text-emerald-100/80">Monitor your requests and access available equipment.</p>
          </div>
          <span className="hidden shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold sm:flex"
            style={{ background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.88)' }}>
            <Package className="h-3 w-3" />
            Field User
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
              ? 'border-emerald-400 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
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
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 text-xs font-bold group-hover:bg-emerald-50 dark:group-hover:bg-emerald-900/30 group-hover:text-emerald-500 transition-colors">+</span>
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

      {/* ── Rental policy reminders ───────────────────────────── */}
      <div className="flex flex-col gap-1 px-1 items-center text-center mt-auto pt-8">
        {[
          'Inspect equipment before use and report any damage immediately.',
          'Return equipment by the agreed end date to avoid delays.',
          'Keep gear clean and stored securely when not in use.',
          'Contact admin if you need to extend a rental period.',
        ].map((tip) => (
          <p key={tip} className="text-[11px] text-slate-400 dark:text-slate-600">{tip}</p>
        ))}
      </div>

    </div>
  )
}
