import { useState, useEffect } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LogOut,
  User,
  Wrench,
  HardHat,
  Truck,
  ClipboardList,
  Settings,
  Users,
  ChevronDown,
  Search,
  X,
  Eye,
  EyeOff,
  Bell,
  AlertTriangle,
  CheckCircle2,
  Clock,
  LayoutDashboard,
  Boxes,
  ListChecks,
  AlertCircle,
  QrCode,
  Moon,
  Send,
  Menu,
} from 'lucide-react'
import { useDarkMode } from '../hooks/useDarkMode'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { clearSession, getSession, setSession } from '../lib/auth'
import ErrorBoundary from '../components/ErrorBoundary'
import { Avatar, AvatarFallback } from '../components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu'
import iconColor from '../assets/logos/icon_color.png'
import CalendarPopup from '../features/calendar/components/CalendarPopup'
import { getUser, listUsers } from '../services/userService'
import { getAdminSummary, getFieldSummary } from '../services/dashboardService'
import { listIssueReports } from '../services/maintenanceService'
import { listRentals } from '../services/rentalService'
import { useImpersonation } from './ImpersonationContext'
import type { User as UserType } from '../types/user'
import type { UserRole } from '../types/auth'

type NotificationItem = {
  id: string
  icon: React.ElementType
  iconColor: string
  title: string
  body: string
  link: string
  linkState?: Record<string, unknown>
}

const ROLE_THEME = {
  admin: {
    bg: 'rgb(var(--brand-navy-rgb))',
    border: 'rgba(255,255,255,0.1)',
    avatarBg: 'rgba(255,255,255,0.2)',
    badge: 'Administrator',
    badgeBg: 'rgba(255,255,255,0.15)',
    badgeColor: 'rgba(255,255,255,0.85)',
  },
  field: {
    bg: '#15803d',
    border: 'rgba(255,255,255,0.1)',
    avatarBg: 'rgba(255,255,255,0.2)',
    badge: 'Field User',
    badgeBg: 'rgba(255,255,255,0.15)',
    badgeColor: 'rgba(255,255,255,0.85)',
  },
  maintenance: {
    bg: '#b45309',
    border: 'rgba(255,255,255,0.1)',
    avatarBg: 'rgba(255,255,255,0.2)',
    badge: 'Maintenance',
    badgeBg: 'rgba(255,255,255,0.15)',
    badgeColor: 'rgba(255,255,255,0.85)',
  },
}

const ICON_MAP: Record<string, React.ReactNode> = {
  hardhat: <HardHat className="h-4 w-4" />,
  wrench: <Wrench className="h-4 w-4" />,
  truck: <Truck className="h-4 w-4" />,
  clipboard: <ClipboardList className="h-4 w-4" />,
  gear: <Settings className="h-4 w-4" />,
}

function roleLabel(role?: string) {
  if (role === 'admin') return 'Admin'
  if (role === 'maintenance') return 'Maintenance'
  return 'Field User'
}

function roleColor(role?: string) {
  if (role === 'admin') return 'bg-[rgb(var(--brand-navy-rgb))] text-white'
  if (role === 'maintenance') return 'bg-amber-500 text-white'
  return 'bg-emerald-600 text-white'
}

function initials(name?: string) {
  return (
    name
      ?.split(' ')
      .map((p) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() ?? 'U'
  )
}

function useNotifications(role?: string, userId?: string): NotificationItem[] {
  const isAdmin = role === 'admin'
  const isField = role === 'field'
  const isMaintenance = role === 'maintenance'

  const adminSummary = useQuery({
    queryKey: ['admin-summary-notifications'],
    queryFn: getAdminSummary,
    enabled: isAdmin,
    staleTime: 60_000,
  })

  const fieldSummary = useQuery({
    queryKey: ['field-summary-notifications', userId],
    queryFn: () => getFieldSummary(userId!),
    enabled: isField && !!userId,
    staleTime: 60_000,
  })

  const openIssues = useQuery({
    queryKey: ['open-issues-notifications'],
    queryFn: () => listIssueReports({ status: 'OPEN' }),
    enabled: isMaintenance,
    staleTime: 60_000,
  })

  const criticalIssues = useQuery({
    queryKey: ['critical-issues-notifications'],
    queryFn: () => listIssueReports({ status: 'OPEN', severity: 'CRITICAL' }),
    enabled: isAdmin || isMaintenance,
    staleTime: 60_000,
  })

  const myRentals = useQuery({
    queryKey: ['my-rentals-notifications', userId],
    queryFn: () => listRentals({ requestedBy: userId }),
    enabled: isField && !!userId,
    staleTime: 60_000,
  })

  const items: NotificationItem[] = []

  if (isAdmin) {
    const pending = adminSummary.data?.pendingRentalRequests ?? 0
    if (pending > 0) {
      items.push({ id: 'pending-rentals', icon: Clock, iconColor: '#d97706', title: 'Pending Rental Requests', body: `${pending} request${pending !== 1 ? 's' : ''} awaiting your approval.`, link: '/admin/rentals', linkState: { statusFilter: 'pending' } })
    }
    const critical = criticalIssues.data?.length ?? 0
    if (critical > 0) {
      items.push({ id: 'critical-issues', icon: AlertTriangle, iconColor: '#dc2626', title: 'Critical Equipment Issues', body: `${critical} critical issue${critical !== 1 ? 's' : ''} reported and unresolved.`, link: '/admin/issues', linkState: { severityFilter: 'CRITICAL' } })
    }
    const active = adminSummary.data?.activeRentals ?? 0
    if (active > 0) {
      items.push({ id: 'active-rentals', icon: CheckCircle2, iconColor: '#15803d', title: 'Active Rentals', body: `${active} rental${active !== 1 ? 's' : ''} currently checked out.`, link: '/admin/rentals', linkState: { statusFilter: 'active' } })
    }
  }

  if (isField) {
    const myPending = fieldSummary.data?.myPendingRequests ?? 0
    if (myPending > 0) {
      items.push({ id: 'my-pending', icon: Clock, iconColor: '#d97706', title: 'Requests Awaiting Approval', body: `${myPending} of your rental request${myPending !== 1 ? 's are' : ' is'} pending admin review.`, link: '/field/rentals', linkState: { statusFilter: 'pending' } })
    }
    const overdueRentals = (myRentals.data ?? []).filter((r) => r.status === 'active' && !!r.endDate && new Date(r.endDate) < new Date())
    if (overdueRentals.length > 0) {
      items.push({ id: 'overdue-rentals', icon: AlertTriangle, iconColor: '#dc2626', title: 'Overdue Rentals', body: `${overdueRentals.length} rental${overdueRentals.length !== 1 ? 's are' : ' is'} past the expected return date.`, link: '/field/rentals', linkState: { statusFilter: 'active' } })
    }
    const myActive = fieldSummary.data?.myActiveRentals ?? 0
    if (myActive > 0) {
      items.push({ id: 'my-active', icon: CheckCircle2, iconColor: '#15803d', title: 'Active Rentals', body: `You have ${myActive} item${myActive !== 1 ? 's' : ''} currently checked out.`, link: '/field/rentals', linkState: { statusFilter: 'active' } })
    }
  }

  if (isMaintenance) {
    const critical = criticalIssues.data?.length ?? 0
    if (critical > 0) {
      items.push({ id: 'critical-issues-maint', icon: AlertTriangle, iconColor: '#dc2626', title: 'Critical Issues', body: `${critical} critical issue${critical !== 1 ? 's' : ''} need immediate attention.`, link: '/maintenance/issues', linkState: { severityFilter: 'CRITICAL' } })
    }
    const open = openIssues.data?.length ?? 0
    if (open > 0) {
      items.push({ id: 'open-issues', icon: Clock, iconColor: '#d97706', title: 'Open Issue Reports', body: `${open} issue${open !== 1 ? 's' : ''} in the queue awaiting resolution.`, link: '/maintenance/issues', linkState: { statusFilter: 'OPEN' } })
    }
  }

  return items
}

function NotificationPanel({
  theme,
  notifications,
  onClose,
  onNavigate,
}: {
  theme: typeof ROLE_THEME[keyof typeof ROLE_THEME]
  notifications: NotificationItem[]
  onClose: () => void
  onNavigate: (link: string, state?: Record<string, unknown>) => void
}) {
  return (
    <div
      className="absolute right-0 top-full mt-2 w-80 rounded-xl shadow-xl overflow-hidden z-50 dark:border dark:border-slate-700"
      style={{ background: '#fff', border: '1px solid #e2e8f0' }}
    >
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ background: theme.bg, borderBottom: `1px solid ${theme.border}` }}
      >
        <div className="flex items-center gap-2 text-white">
          <Bell className="h-4 w-4" />
          <span className="text-sm font-semibold">Notifications</span>
        </div>
        <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2 text-slate-400 dark:bg-slate-800">
          <CheckCircle2 className="h-8 w-8 opacity-40" />
          <p className="text-sm font-medium">All clear</p>
          <p className="text-xs">No notifications right now.</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-700 max-h-96 overflow-y-auto dark:bg-slate-800">
          {notifications.map((n) => {
            const Icon = n.icon
            return (
              <button
                key={n.id}
                onClick={() => { onNavigate(n.link, n.linkState); onClose() }}
                className="w-full flex items-start gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors text-left group"
              >
                <div className="shrink-0 mt-0.5 flex items-center justify-center w-7 h-7 rounded-lg" style={{ background: `${n.iconColor}18` }}>
                  <Icon className="h-3.5 w-3.5" style={{ color: n.iconColor }} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{n.title}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5">{n.body}</p>
                </div>
                <ChevronDown className="h-3.5 w-3.5 shrink-0 mt-1 -rotate-90 text-slate-300 dark:text-slate-600 group-hover:text-blue-400 transition-colors" />
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function ImpersonateDialog({ onSelect, onClose }: { onSelect: (user: UserType) => void; onClose: () => void }) {
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all')

  const usersQuery = useQuery({ queryKey: ['users-for-impersonation'], queryFn: () => listUsers() })
  const session = getSession()
  const currentUserId = session?.user?.id

  const filtered = (usersQuery.data ?? []).filter((u) => {
    if (u.id === currentUserId) return false
    if (u.role === 'admin') return false
    if (roleFilter !== 'all' && u.role !== roleFilter) return false
    const q = search.toLowerCase()
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.role.toLowerCase().includes(q)
  })

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4" style={{ background: 'rgba(0,0,0,0.45)' }} onClick={onClose}>
      <div className="w-full max-w-md rounded-xl shadow-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid #e2e8f0' }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4" style={{ background: 'rgb(var(--brand-navy-rgb))' }}>
          <div className="flex items-center gap-2 text-white">
            <Eye className="h-4 w-4" />
            <span className="font-semibold text-sm">Impersonate User</span>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors"><X className="h-4 w-4" /></button>
        </div>
        <div className="px-5 py-3 bg-blue-50 border-b border-blue-100 text-xs text-blue-700 leading-relaxed">
          <strong>View-only mode.</strong> You will see exactly what this user sees, but cannot make changes or perform actions on their behalf.
        </div>
        <div className="px-5 py-3 flex gap-2 border-b border-slate-100">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input autoFocus className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/30" placeholder="Search users…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="text-sm border border-slate-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/30" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as UserRole | 'all')}>
            <option value="all">All roles</option>
            <option value="field">Field User</option>
            <option value="maintenance">Maintenance</option>
          </select>
        </div>
        <div className="max-h-72 overflow-y-auto">
          {usersQuery.isLoading && <p className="text-xs text-slate-400 text-center py-6">Loading users…</p>}
          {!usersQuery.isLoading && filtered.length === 0 && <p className="text-xs text-slate-400 text-center py-6">No users found.</p>}
          {filtered.map((u) => (
            <button key={u.id} className="w-full flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors text-left border-b border-slate-50 last:border-0" onClick={() => onSelect(u)}>
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="text-xs font-semibold text-white" style={{ background: u.role === 'maintenance' ? '#b45309' : '#15803d' }}>{initials(u.name)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{u.name}</p>
                <p className="text-xs text-slate-500 truncate">{u.email}</p>
              </div>
              <span className={`shrink-0 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${roleColor(u.role)}`}>{roleLabel(u.role)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function ImpersonationBanner({ user, onStop }: { user: UserType; onStop: () => void }) {
  return (
    <div className="sticky top-0 z-20 w-full flex items-center justify-between px-4 py-1.5 text-xs font-medium" style={{ background: 'linear-gradient(90deg, #7c3aed, #4f46e5)', color: 'white' }}>
      <div className="flex items-center gap-2">
        <Eye className="h-3.5 w-3.5 opacity-80" />
        <span>Viewing as <strong>{user.name}</strong> — <span className="opacity-75">{roleLabel(user.role)} (view-only)</span></span>
      </div>
      <button onClick={onStop} className="flex items-center gap-1 bg-white/20 hover:bg-white/30 transition-colors px-2 py-0.5 rounded">
        <EyeOff className="h-3 w-3" />
        Stop impersonating
      </button>
    </div>
  )
}

function useLiveClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  const date = now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
  const time = now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', second: '2-digit' })
  return { date, time }
}

function RoleTopBar({ onLogout, onImpersonate, onMenuOpen }: { onLogout: () => void; onImpersonate?: () => void; onMenuOpen?: () => void }) {
  const navigate = useNavigate()
  const { effectiveRole, effectiveSession } = useImpersonation()
  const role = (effectiveRole ?? 'field') as keyof typeof ROLE_THEME
  const theme = ROLE_THEME[role] ?? ROLE_THEME.field
  const name = effectiveSession?.user.name ?? 'User'
  const email = effectiveSession?.user.email ?? ''
  const userInitials = initials(name)
  const userId = effectiveSession?.user.id

  const [notifOpen, setNotifOpen] = useState(false)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const clock = useLiveClock()
  const { dark, toggle: toggleDark } = useDarkMode()
  const notifications = useNotifications(role, userId)
  const unreadCount = notifications.length

  const realSession = getSession()
  const avatarQuery = useQuery({
    queryKey: ['current-user-avatar', realSession?.user?.id],
    queryFn: async () => {
      if (!realSession?.user?.id) return null
      const user = await getUser(realSession.user.id, { silent: true })
      if (user && realSession) {
        setSession({ ...realSession, user: { ...realSession.user, avatarUrl: user.avatarUrl ?? undefined, isAvatarIcon: user.isAvatarIcon } })
      }
      return user
    },
    enabled: !!realSession?.user?.id,
    staleTime: 30_000,
  })

  const avatarIcon = avatarQuery.data?.avatarUrl || realSession?.user?.avatarUrl
  const isAvatarIcon = avatarQuery.data?.isAvatarIcon ?? realSession?.user?.isAvatarIcon

  return (
    <>
    {calendarOpen && <div className="fixed inset-0 z-40" onClick={() => setCalendarOpen(false)} />}
    <header className="sticky top-0 z-50 w-full flex items-center px-4 h-12 shadow-sm" style={{ background: theme.bg, borderBottom: `1px solid ${theme.border}` }}>
      <div className="flex-1 flex items-center gap-2">
        <button
          onClick={onMenuOpen}
          className="sm:hidden flex items-center justify-center w-8 h-8 rounded hover:bg-white/10 transition-colors text-white"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <img alt="EquipTrack icon" className="h-7 w-7 rounded object-contain" src={iconColor} />
          <span className="font-bold text-sm tracking-wide text-white hidden sm:block">
            Equip<span style={{ color: 'rgb(var(--brand-yellow-rgb))' }}>Track</span>
          </span>
          <span className="ml-2 text-[10px] font-semibold uppercase tracking-widest px-1.5 py-0.5 rounded hidden sm:inline-block" style={{ background: theme.badgeBg, color: theme.badgeColor }}>
            {theme.badge}
          </span>
        </Link>
      </div>

      <div className="relative">
        <button
          onClick={() => { setCalendarOpen(v => !v); setNotifOpen(false) }}
          className="flex flex-col items-center leading-none px-3 py-1 rounded-lg hover:bg-white/10 transition-colors"
        >
          <span className="text-white font-semibold text-sm tabular-nums">{clock.time}</span>
          <span className="text-white/60 text-[10px] mt-0.5">{clock.date}</span>
        </button>
        {calendarOpen && (
          <CalendarPopup
            isAdmin={role === 'admin'}
            onClose={() => setCalendarOpen(false)}
            onCreateEvent={() => {
              setCalendarOpen(false)
              navigate('/calendar')
            }}
          />
        )}
      </div>

      <div className="flex-1 flex items-center justify-end gap-1">
        <div className="relative">
          <button
            onClick={() => { toast.dismiss(); setNotifOpen((v) => !v) }}
            className="relative flex items-center justify-center w-8 h-8 rounded hover:bg-white/10 transition-colors text-white"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex items-center justify-center min-w-[14px] h-[14px] rounded-full text-[9px] font-bold text-white px-0.5" style={{ background: '#dc2626', lineHeight: 1 }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          {notifOpen && <NotificationPanel theme={theme} notifications={notifications} onClose={() => setNotifOpen(false)} onNavigate={(link, state) => navigate(link, { state })} />}
        </div>

        <DropdownMenu onOpenChange={(open) => { if (open) { toast.dismiss(); setNotifOpen(false) } }}>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 px-2 py-1 rounded hover:bg-white/10 transition-colors text-white">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-xs font-bold" style={{ background: theme.avatarBg, color: 'white' }}>
                  {isAvatarIcon && avatarIcon && ICON_MAP[avatarIcon] ? ICON_MAP[avatarIcon] : userInitials}
                </AvatarFallback>
              </Avatar>
              <span className="hidden sm:block text-sm font-medium">{name}</span>
              <ChevronDown className="h-3.5 w-3.5 opacity-60" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-60">
            <div className="px-3 py-3 flex items-center gap-3 border-b border-slate-100 dark:border-slate-700">
              <Avatar className="h-10 w-10 shrink-0">
                <AvatarFallback className="text-sm font-bold text-white" style={{ background: theme.bg }}>{userInitials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{email}</p>
                <span className="inline-block mt-0.5 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded text-white" style={{ background: theme.bg }}>{theme.badge}</span>
              </div>
            </div>

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={() => navigate('/profile')} className="cursor-pointer gap-2">
              <User className="h-4 w-4" />
              Profile
            </DropdownMenuItem>

            {onImpersonate && (
              <DropdownMenuItem onClick={onImpersonate} className="cursor-pointer gap-2 text-indigo-700 focus:text-indigo-700 focus:bg-indigo-50">
                <Users className="h-4 w-4" />
                Impersonate User
              </DropdownMenuItem>
            )}

            <DropdownMenuSeparator />

            <DropdownMenuItem onSelect={(e) => e.preventDefault()} onClick={toggleDark} className="cursor-pointer flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <Moon className="h-4 w-4" />
                Dark Mode
              </span>
              <span className={`inline-flex h-5 w-9 shrink-0 items-center rounded-full border-2 transition-colors ${dark ? 'border-blue-500 bg-blue-500' : 'border-slate-300 bg-slate-200'}`}>
                <span className={`h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform ${dark ? 'translate-x-[17px]' : 'translate-x-0.5'}`} />
              </span>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={onLogout} className="cursor-pointer gap-2 text-red-600 focus:text-red-600 focus:bg-red-50">
              <LogOut className="h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
    </>
  )
}


type NavItem = { label: string; to: string; icon: React.ElementType }

const ROLE_NAV: Record<string, NavItem[]> = {
  admin: [
    { label: 'Dashboard',    to: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Equipment',    to: '/admin/equipment',  icon: Boxes },
    { label: 'Rentals',      to: '/admin/rentals',    icon: ClipboardList },
    { label: 'Issue Reports',to: '/admin/issues',     icon: AlertCircle },
    { label: 'Users',        to: '/admin/users',      icon: Users },
    { label: 'Request',      to: '/request',          icon: Send },
    { label: 'Report Issue', to: '/report',           icon: AlertTriangle },
    { label: 'Scan QR',      to: '/scan',             icon: QrCode },
  ],
  field: [
    { label: 'Dashboard',   to: '/field/dashboard', icon: LayoutDashboard },
    { label: 'Equipment',   to: '/field/equipment',  icon: Boxes },
    { label: 'Request',     to: '/request',          icon: Send },
    { label: 'My Rentals',  to: '/field/rentals',    icon: ClipboardList },
    { label: 'My Reports',  to: '/field/reports',    icon: AlertCircle },
    { label: 'Report Issue',to: '/report',           icon: AlertTriangle },
    { label: 'Scan QR',     to: '/scan',             icon: QrCode },
  ],
  maintenance: [
    { label: 'Dashboard',    to: '/maintenance/dashboard', icon: LayoutDashboard },
    { label: 'Service Queue',to: '/maintenance/queue',     icon: ListChecks },
    { label: 'All Equipment',to: '/maintenance/equipment', icon: Boxes },
    { label: 'Issue Reports',to: '/maintenance/issues',    icon: AlertCircle },
    { label: 'Request',      to: '/request',               icon: Send },
    { label: 'Report Issue', to: '/report',                icon: AlertTriangle },
    { label: 'Scan QR',      to: '/scan',                  icon: QrCode },
  ],
}

function MobileSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { effectiveRole } = useImpersonation()
  const role = (effectiveRole ?? 'field') as keyof typeof ROLE_THEME
  const theme = ROLE_THEME[role] ?? ROLE_THEME.field
  const items = ROLE_NAV[role] ?? []

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity sm:hidden ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      <div
        className="fixed top-0 left-0 z-50 h-full w-64 shadow-2xl transition-transform duration-300 sm:hidden flex flex-col"
        style={{ background: theme.bg, transform: open ? 'translateX(0)' : 'translateX(-100%)' }}
      >
        <div className="flex items-center justify-between px-4 h-12 shrink-0" style={{ borderBottom: `1px solid ${theme.border}` }}>
          <div className="flex items-center gap-2">
            <img alt="EquipTrack icon" className="h-7 w-7 rounded object-contain" src={iconColor} />
            <span className="font-bold text-sm tracking-wide text-white">
              Equip<span style={{ color: 'rgb(var(--brand-yellow-rgb))' }}>Track</span>
            </span>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors" aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="py-2 overflow-y-auto flex-1">
          {items.map(({ label, to, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-5 py-3 text-sm font-medium transition-colors ${
                  isActive ? 'text-white bg-white/15' : 'text-white/70 hover:text-white hover:bg-white/10'
                }`
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
    </>
  )
}

function SecondaryNavWrapper() {
  const { effectiveRole } = useImpersonation()
  const role = (effectiveRole ?? 'field') as keyof typeof ROLE_THEME
  const theme = ROLE_THEME[role] ?? ROLE_THEME.field
  return <SecondaryNav role={role} theme={theme} />
}

function SecondaryNav({ role, theme }: { role: string; theme: typeof ROLE_THEME[keyof typeof ROLE_THEME] }) {
  const items = ROLE_NAV[role] ?? []
  if (items.length === 0) return null

  return (
    <nav
      className="w-full border-b overflow-hidden"
      style={{ background: theme.bg, borderColor: theme.border }}
    >
      <div className="scrollbar-none mx-auto w-full max-w-7xl px-4 flex items-center gap-1 overflow-x-auto overflow-y-hidden" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', touchAction: 'pan-x' }}>
        {items.map(({ label, to, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              [
                'flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold whitespace-nowrap transition-colors border-b-2 -mb-px',
                isActive
                  ? 'text-white border-white'
                  : 'text-white/60 border-transparent hover:text-white/90 hover:border-white/40',
              ].join(' ')
            }
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

export default function AppLayout() {
  const navigate = useNavigate()
  const { impersonation, startImpersonation, stopImpersonation, notifySessionChanged } = useImpersonation()
  const realRole = getSession()?.user?.role

  const [showImpersonateDialog, setShowImpersonateDialog] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  function handleLogout() {
    clearSession()
    notifySessionChanged()
    navigate('/login', { replace: true })
  }

  function handleStartImpersonation(user: UserType) {
    startImpersonation(user)
    setShowImpersonateDialog(false)
    if (user.role === 'field') navigate('/field/dashboard')
    else if (user.role === 'maintenance') navigate('/maintenance/dashboard')
  }

  function handleStopImpersonation() {
    stopImpersonation()
    navigate('/admin/dashboard')
  }

  return (
    <div
      className="min-h-screen bg-slate-100 dark:bg-slate-900 dark:text-slate-100 text-slate-900"
      data-impersonating={impersonation.active ? impersonation.user?.id : undefined}
      data-impersonated-role={impersonation.active ? impersonation.user?.role : undefined}
    >
      {impersonation.active && impersonation.user && (
        <ImpersonationBanner user={impersonation.user} onStop={handleStopImpersonation} />
      )}

      <RoleTopBar
        onLogout={impersonation.active ? handleStopImpersonation : handleLogout}
        onImpersonate={realRole === 'admin' && !impersonation.active ? () => setShowImpersonateDialog(true) : undefined}
        onMenuOpen={() => setSidebarOpen(true)}
      />

      <MobileSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="hidden sm:block">
        <SecondaryNavWrapper />
      </div>

      <main className="mx-auto w-full max-w-7xl p-4 md:p-8">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>

      {showImpersonateDialog && (
        <ImpersonateDialog onSelect={handleStartImpersonation} onClose={() => setShowImpersonateDialog(false)} />
      )}
    </div>
  )
}
