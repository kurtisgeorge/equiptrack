import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import {
  Activity,
  CheckCircle2,
  Clock3,
  Package,
  Wrench,
  Users,
  ClipboardList,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  SlidersHorizontal,
  Shield,
  Send,
  QrCode,
} from 'lucide-react'
import ErrorState from '../../../components/ErrorState'
import Loader from '../../../components/Loader'
import PersonalizableWidget from '../../../components/PersonalizableWidget'
import { getAdminSummary } from '../../../services/dashboardService'
import { getSession } from '../../../lib/auth'
import { useDashboardLayout, type WidgetDef } from '../../../hooks/useDashboardLayout'

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

const WIDGETS: WidgetDef[] = [
  // ── Row 1: full-width health overview ───────────────────────
  { id: 'fleet-health',       label: 'Fleet Health',          size: 'wide', defaultVisible: true,  description: 'Segmented bar showing available / in-use / maintenance split.'  },
  // ── Row 2: key numbers ───────────────────────────────────────
  { id: 'metric-pending',     label: 'Pending Requests',      size: 'card', defaultVisible: true,  description: 'Rental requests awaiting admin approval.'                         },
  { id: 'metric-active',      label: 'Active Rentals',        size: 'card', defaultVisible: true,  description: 'Ongoing equipment rentals across the fleet.'                      },
  { id: 'metric-available',   label: 'Available',             size: 'card', defaultVisible: true,  description: 'Equipment units currently ready for rental.'                      },
  { id: 'metric-maintenance', label: 'Maintenance',           size: 'card', defaultVisible: true,  description: 'Equipment units currently being serviced.'                        },
  // ── Row 3: quick links ───────────────────────────────────────
  { id: 'link-rentals',       label: 'Rentals Shortcut',      size: 'card', defaultVisible: true,  description: 'Quick link to review and approve rental requests.'                 },
  { id: 'link-equipment',     label: 'Equipment Shortcut',    size: 'card', defaultVisible: true,  description: 'Quick link to manage the equipment inventory.'                    },
  // ── Row 4: action shortcuts ──────────────────────────────────
  { id: 'action-request',     label: 'Request Equipment',     size: 'card', defaultVisible: true,  description: 'Browse available equipment and submit a rental request.'           },
  { id: 'action-report',      label: 'Report Equipment Issue',size: 'card', defaultVisible: true,  description: 'File a new maintenance issue report on any equipment unit.'      },
  { id: 'action-scan-qr',     label: 'Scan QR Code',          size: 'card', defaultVisible: true,  description: 'Open the QR scanner to instantly look up any equipment unit.'    },
  // ── Off by default ───────────────────────────────────────────
  { id: 'metric-total',       label: 'Total Equipment',       size: 'card', defaultVisible: false, description: 'Count of all tracked assets in the system.'                      },
  { id: 'metric-in-use',      label: 'In Use',                size: 'card', defaultVisible: false, description: 'Equipment units currently rented out.'                            },
  { id: 'metric-utilization', label: 'Utilization Rate',      size: 'card', defaultVisible: false, description: 'Percentage of the fleet currently rented out.'                    },
  { id: 'metric-downtime',    label: 'Downtime Rate',         size: 'card', defaultVisible: false, description: 'Percentage of the fleet currently in maintenance.'                 },
  { id: 'link-users',         label: 'Users Shortcut',        size: 'card', defaultVisible: false, description: 'Quick link to manage team members and access.'                    },
]

export default function AdminDashboardPage() {
  const navigate = useNavigate()
  const session = getSession()
  const firstName = (session?.user.name ?? 'there').split(' ')[0]
  const userId = session?.user.id ?? 'anon'

  const [personalizing, setPersonalizing] = useState(false)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  const { orderedWidgets, isVisible, toggleVisible, reset, reorderTo } =
    useDashboardLayout('admin', userId, WIDGETS)

  function handleReset() { reset(); setPersonalizing(false) }

  const summaryQuery = useQuery({
    queryKey: ['admin-summary'],
    queryFn: getAdminSummary,
  })

  if (summaryQuery.isLoading) return <Loader label="Loading admin dashboard..." />
  if (summaryQuery.isError || !summaryQuery.data) {
    return (
      <ErrorState
        error={summaryQuery.error}
        onRetry={() => summaryQuery.refetch()}
        title="Could not load dashboard"
      />
    )
  }

  const d = summaryQuery.data
  const total = d.totalEquipment || 1
  const utilizationPct = Math.round((d.byStatus.in_use / total) * 100)
  const downtimePct = Math.round((d.byStatus.maintenance / total) * 100)

  const healthBars = [
    { label: 'Available',   value: d.byStatus.available,   bg: 'bg-emerald-500', text: 'text-emerald-700', dot: 'bg-emerald-500' },
    { label: 'In Use',      value: d.byStatus.in_use,      bg: 'bg-blue-400',    text: 'text-blue-700',    dot: 'bg-blue-400'    },
    { label: 'Maintenance', value: d.byStatus.maintenance, bg: 'bg-amber-400',   text: 'text-amber-700',   dot: 'bg-amber-400'   },
  ]

  const quickLinks = [
    { id: 'link-equipment', title: 'Equipment',  desc: 'Manage inventory & assets',  to: '/admin/equipment', icon: Package,       accent: 'text-slate-600',   iconBg: 'bg-slate-50'   },
    { id: 'link-rentals',   title: 'Rentals',    desc: 'Review & approve requests',  to: '/admin/rentals',   icon: ClipboardList, accent: 'text-slate-600',   iconBg: 'bg-slate-50'   },
    { id: 'link-users',     title: 'Users',      desc: 'Manage team access',         to: '/admin/users',     icon: Users,         accent: 'text-slate-600',   iconBg: 'bg-slate-50'   },
  ]

  const RENDER: Record<string, React.ReactNode> = {

    'fleet-health': (
      <div className="anim-fade-up rounded-xl border border-slate-200 bg-white px-5 py-4 dark:bg-slate-800 dark:border-slate-700">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Fleet Health</p>
          <p className="text-xs text-slate-400">{d.totalEquipment} total units</p>
        </div>
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
          {healthBars.map((bar, i) => (
            <div
              key={bar.label}
              className={`${bar.bg} transition-all duration-700`}
              style={{
                width: `${(bar.value / total) * 100}%`,
                borderRadius:
                  i === 0 ? '9999px 0 0 9999px'
                  : i === healthBars.length - 1 ? '0 9999px 9999px 0'
                  : '0',
              }}
            />
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-5">
          {healthBars.map((bar) => (
            <div key={bar.label} className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${bar.dot}`} />
              <span className="text-xs text-slate-500">{bar.label}</span>
              <span className={`text-xs font-bold ${bar.text}`}>{bar.value}</span>
              <span className="text-[10px] text-slate-400">({Math.round((bar.value / total) * 100)}%)</span>
            </div>
          ))}
        </div>
      </div>
    ),

    'metric-total': (
      <button onClick={() => navigate('/admin/equipment', { state: {} })}
        className="group w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded-xl anim-fade-up">
        <div className="metric-card h-full rounded-xl border border-slate-200 border-l-4 border-l-slate-300 bg-white px-5 py-5 dark:bg-slate-800 dark:border-slate-700 dark:border-l-slate-600 group-hover:border-slate-300 group-hover:shadow-md dark:bg-slate-800 dark:border-slate-700 dark:border-l-slate-600">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Total Equipment</p>
              <Shield className="h-3 w-3 text-slate-300" />
            </div>
            <Package className="h-4 w-4 text-slate-400" />
          </div>
          <p className="anim-count-pop text-3xl font-bold text-slate-900 dark:text-slate-100">{d.totalEquipment}</p>
          <p className="mt-1 text-xs text-slate-400 hidden sm:block">All tracked assets</p>
          <p className="mt-3 text-[10px] font-semibold uppercase tracking-wide text-slate-300 transition-colors group-hover:text-slate-500">View details →</p>
        </div>
      </button>
    ),

    'metric-available': (
      <button onClick={() => navigate('/admin/equipment', { state: { statusFilter: 'available' } })}
        className="group w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded-xl anim-fade-up">
        <div className="metric-card h-full rounded-xl border border-slate-200 border-l-4 border-l-slate-300 bg-white px-5 py-5 dark:bg-slate-800 dark:border-slate-700 dark:border-l-slate-600 group-hover:border-slate-300 group-hover:shadow-md dark:bg-slate-800 dark:border-slate-700 dark:border-l-slate-600">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Available</p>
              <Shield className="h-3 w-3 text-slate-300" />
            </div>
            <CheckCircle2 className="h-4 w-4 text-slate-400" />
          </div>
          <p className="anim-count-pop text-3xl font-bold text-slate-900 dark:text-slate-100">{d.byStatus.available}</p>
          <p className="mt-1 text-xs text-slate-400 hidden sm:block">Ready for rental</p>
          <p className="mt-3 text-[10px] font-semibold uppercase tracking-wide text-slate-300 transition-colors group-hover:text-slate-500">View details →</p>
        </div>
      </button>
    ),

    'metric-in-use': (
      <button onClick={() => navigate('/admin/equipment', { state: { statusFilter: 'in_use' } })}
        className="group w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded-xl anim-fade-up">
        <div className="metric-card h-full rounded-xl border border-slate-200 border-l-4 border-l-slate-300 bg-white px-5 py-5 dark:bg-slate-800 dark:border-slate-700 dark:border-l-slate-600 group-hover:border-slate-300 group-hover:shadow-md dark:bg-slate-800 dark:border-slate-700 dark:border-l-slate-600">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">In Use</p>
              <Shield className="h-3 w-3 text-slate-300" />
            </div>
            <Activity className="h-4 w-4 text-slate-400" />
          </div>
          <p className="anim-count-pop text-3xl font-bold text-slate-900 dark:text-slate-100">{d.byStatus.in_use}</p>
          <p className="mt-1 text-xs text-slate-400 hidden sm:block">Currently rented out</p>
          <p className="mt-3 text-[10px] font-semibold uppercase tracking-wide text-slate-300 transition-colors group-hover:text-slate-500">View details →</p>
        </div>
      </button>
    ),

    'metric-maintenance': (
      <button onClick={() => navigate('/admin/equipment', { state: { statusFilter: 'maintenance' } })}
        className="group w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded-xl anim-fade-up">
        <div className="metric-card h-full rounded-xl border border-slate-200 border-l-4 border-l-slate-300 bg-white px-5 py-5 dark:bg-slate-800 dark:border-slate-700 dark:border-l-slate-600 group-hover:border-slate-300 group-hover:shadow-md dark:bg-slate-800 dark:border-slate-700 dark:border-l-slate-600">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Maintenance</p>
              <Shield className="h-3 w-3 text-slate-300" />
            </div>
            <Wrench className="h-4 w-4 text-slate-400" />
          </div>
          <p className="anim-count-pop text-3xl font-bold text-slate-900 dark:text-slate-100">{d.byStatus.maintenance}</p>
          <p className="mt-1 text-xs text-slate-400 hidden sm:block">Needs servicing</p>
          <p className="mt-3 text-[10px] font-semibold uppercase tracking-wide text-slate-300 transition-colors group-hover:text-slate-500">View details →</p>
        </div>
      </button>
    ),

    'metric-pending': (
      <button onClick={() => navigate('/admin/rentals', { state: { statusFilter: 'pending' } })}
        className="group w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded-xl anim-fade-up">
        <div className="metric-card h-full rounded-xl border border-slate-200 border-l-4 border-l-slate-300 bg-white px-5 py-5 dark:bg-slate-800 dark:border-slate-700 dark:border-l-slate-600 group-hover:border-slate-300 group-hover:shadow-md dark:bg-slate-800 dark:border-slate-700 dark:border-l-slate-600">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Pending Requests</p>
              <Shield className="h-3 w-3 text-slate-300" />
            </div>
            <Clock3 className="h-4 w-4 text-slate-400" />
          </div>
          <p className="anim-count-pop text-3xl font-bold text-slate-900 dark:text-slate-100">{d.pendingRentalRequests}</p>
          <p className="mt-1 text-xs text-slate-400 hidden sm:block">Awaiting admin action</p>
          <p className="mt-3 text-[10px] font-semibold uppercase tracking-wide text-slate-300 transition-colors group-hover:text-slate-500">View details →</p>
        </div>
      </button>
    ),

    'metric-active': (
      <button onClick={() => navigate('/admin/rentals', { state: { statusFilter: 'active' } })}
        className="group w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded-xl anim-fade-up">
        <div className="metric-card h-full rounded-xl border border-slate-200 border-l-4 border-l-slate-300 bg-white px-5 py-5 dark:bg-slate-800 dark:border-slate-700 dark:border-l-slate-600 group-hover:border-slate-300 group-hover:shadow-md dark:bg-slate-800 dark:border-slate-700 dark:border-l-slate-600">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Active Rentals</p>
              <Shield className="h-3 w-3 text-slate-300" />
            </div>
            <Activity className="h-4 w-4 text-slate-400" />
          </div>
          <p className="anim-count-pop text-3xl font-bold text-slate-900 dark:text-slate-100">{d.activeRentals}</p>
          <p className="mt-1 text-xs text-slate-400 hidden sm:block">Ongoing equipment use</p>
          <p className="mt-3 text-[10px] font-semibold uppercase tracking-wide text-slate-300 transition-colors group-hover:text-slate-500">View details →</p>
        </div>
      </button>
    ),

    'metric-utilization': (
      <div className="anim-fade-up metric-card h-full rounded-xl border border-slate-200 border-l-4 border-l-slate-300 bg-white px-5 py-5 dark:bg-slate-800 dark:border-slate-700 dark:border-l-slate-600">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Utilization Rate</p>
            <Shield className="h-3 w-3 text-slate-300" />
          </div>
          <TrendingUp className="h-4 w-4 text-slate-400" />
        </div>
        <p className="anim-count-pop text-3xl font-bold text-slate-900 dark:text-slate-100">{utilizationPct}%</p>
        <p className="mt-1 text-xs text-slate-400 hidden sm:block">of fleet currently in use</p>
        <div className="mt-3 h-1.5 w-full rounded-full bg-slate-100">
          <div className="h-1.5 rounded-full bg-slate-400 transition-all duration-700" style={{ width: `${utilizationPct}%` }} />
        </div>
        <p className="mt-1.5 text-[10px] text-slate-400">{d.byStatus.in_use} of {d.totalEquipment} units</p>
      </div>
    ),

    'metric-downtime': (
      <div className="anim-fade-up metric-card h-full rounded-xl border border-slate-200 border-l-4 border-l-slate-300 bg-white px-5 py-5 dark:bg-slate-800 dark:border-slate-700 dark:border-l-slate-600">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Downtime Rate</p>
            <Shield className="h-3 w-3 text-slate-300" />
          </div>
          <AlertTriangle className="h-4 w-4 text-slate-400" />
        </div>
        <p className="anim-count-pop text-3xl font-bold text-slate-900 dark:text-slate-100">{downtimePct}%</p>
        <p className="mt-1 text-xs text-slate-400 hidden sm:block">of fleet currently in maintenance</p>
        <div className="mt-3 h-1.5 w-full rounded-full bg-slate-100">
          <div className="h-1.5 rounded-full bg-slate-400 transition-all duration-700" style={{ width: `${downtimePct}%` }} />
        </div>
        <p className="mt-1.5 text-[10px] text-slate-400">{d.byStatus.maintenance} of {d.totalEquipment} units</p>
      </div>
    ),

    ...Object.fromEntries(
      quickLinks.map((link) => [
        link.id,
        <Link key={link.id} to={link.to} className="anim-fade-up group flex items-center gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4 hover:border-slate-300 hover:shadow-md dark:bg-slate-800 dark:border-slate-700 dark:hover:border-slate-600">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${link.iconBg}`}>
            <link.icon className={`h-5 w-5 ${link.accent}`} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{link.title}</p>
              <Shield className="h-3 w-3 text-slate-300" />
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">{link.desc}</p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition-colors group-hover:text-slate-500" />
        </Link>,
      ])
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
            <p className="mt-0.5 text-xs text-emerald-600/80 dark:text-emerald-400/80 leading-relaxed hidden sm:block">Browse available gear and submit a rental request.</p>
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
  }

  return (
    <div className="space-y-7">

      {/* ── Hero Banner ──────────────────────────────────────── */}
      <div
        className="anim-fade-up relative overflow-hidden rounded-2xl px-7 py-10"
        style={{ background: 'linear-gradient(135deg, rgb(3,62,140) 0%, rgb(1,38,95) 100%)', animationDelay: '0s' }}
      >
        <div className="hero-blob pointer-events-none absolute -right-14 -top-14 h-64 w-64 rounded-full bg-white/10" />
        <div className="hero-blob-2 pointer-events-none absolute right-20 -bottom-12 h-40 w-40 rounded-full bg-white/5" />
        <div className="hero-blob pointer-events-none absolute -left-10 top-1/2 h-32 w-32 -translate-y-1/2 rounded-full bg-white/5" style={{ animationDelay: '2s' }} />
        <div className="relative z-10 flex items-center justify-between gap-4">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-blue-300">{getGreeting()}</p>
            <h1 className="text-2xl font-bold text-white">{firstName}!</h1>
            <p className="mt-1.5 text-sm text-blue-200/80">Here's your fleet and rental overview for today.</p>
          </div>
          <span className="hidden shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold sm:flex"
            style={{ background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.88)' }}>
            <Users className="h-3 w-3" />
            Administrator
          </span>
        </div>
      </div>

      {/* ── Personalize button ────────────────────────────────── */}
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
              ? 'border-blue-400 bg-blue-50 text-blue-700 hover:bg-blue-100'
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
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 text-xs font-bold group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30 group-hover:text-blue-500 transition-colors">+</span>
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
