import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import {
  Building2,
  HardHat,
  Wrench,
  ShieldCheck,
  MapPin,
  ClipboardList,
  Users,
  BarChart3,
  Settings,
  Truck,
  AlertTriangle,
  Wrench as WrenchIcon,
  Eye,
  EyeOff,
  LogIn,
  ArrowLeft,
  KeyRound,
} from 'lucide-react'
import { Navigate, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import fullLogoStroke from '../../assets/logos/full_logo_stroke.png'
import { isAuthenticated, setSession } from '../../lib/auth'
import { loginWithCredentials } from '../../services/authService'
import { useImpersonation } from '../../app/ImpersonationContext'
import { useDarkMode } from '../../hooks/useDarkMode'
import type { UserRole } from '../../types/auth'

type RoleConfig = {
  key: UserRole
  label: string
  icon: React.ElementType
  accent: string
  accentLight: string
  accentBorder: string
  tagline: string
  description: string
  access: Array<{ icon: React.ElementType; label: string }>
  defaultEmail: string
}

const roles: RoleConfig[] = [
  {
    key: 'admin',
    label: 'Administrator',
    icon: Building2,
    accent: 'rgb(var(--brand-navy-rgb))',
    accentLight: 'rgba(3,62,140,0.08)',
    accentBorder: 'rgba(3,62,140,0.2)',
    tagline: 'Full platform oversight and control',
    description:
      'Administrators have unrestricted access to every area of EquipTrack. They manage the equipment catalogue, approve or reject rental requests, oversee all active and historical rentals, and maintain user accounts across the organisation.',
    access: [
      { icon: BarChart3,    label: 'Admin dashboard & KPI summary'      },
      { icon: Settings,     label: 'Equipment catalogue management'      },
      { icon: ClipboardList, label: 'Rental approvals & full history'    },
      { icon: Users,        label: 'User account administration'         },
      { icon: ShieldCheck,  label: 'Impersonate any user (view-only)'   },
    ],
    defaultEmail: 'admin1@equiptrack.local',
  },
  {
    key: 'field',
    label: 'Field User',
    icon: HardHat,
    accent: '#15803d',
    accentLight: 'rgba(21,128,61,0.08)',
    accentBorder: 'rgba(21,128,61,0.2)',
    tagline: 'Browse, request and track equipment on-site',
    description:
      'Field users are the people on the ground using the equipment day-to-day. They can browse all available equipment, submit rental requests with a job site and reason, and track the status of their own active and past rentals.',
    access: [
      { icon: BarChart3,     label: 'Personal dashboard & active rentals' },
      { icon: Truck,         label: 'Browse available equipment'          },
      { icon: ClipboardList, label: 'Submit & track rental requests'      },
      { icon: MapPin,        label: 'Job site & usage details'            },
      { icon: AlertTriangle, label: 'Report equipment issues'             },
    ],
    defaultEmail: 'field1@equiptrack.local',
  },
  {
    key: 'maintenance',
    label: 'Maintenance',
    icon: Wrench,
    accent: '#b45309',
    accentLight: 'rgba(180,83,9,0.08)',
    accentBorder: 'rgba(180,83,9,0.2)',
    tagline: 'Keep the fleet operational and serviced',
    description:
      'Maintenance technicians manage the health of every piece of equipment in the fleet. They work through a prioritised service queue, log completed work, respond to issue reports filed by field users, and update equipment status after servicing.',
    access: [
      { icon: BarChart3,     label: 'Maintenance dashboard & queue'  },
      { icon: WrenchIcon,    label: 'Service logs & maintenance records' },
      { icon: AlertTriangle, label: 'Issue report management'            },
      { icon: ClipboardList, label: 'Equipment status updates'           },
      { icon: ShieldCheck,   label: 'Mark equipment as serviced'         },
    ],
    defaultEmail: 'maintenance1@equiptrack.local',
  },
]

// ─── shared hook ────────────────────────────────────────────────────────────
function useLoginMutation() {
  const navigate = useNavigate()
  const { notifySessionChanged } = useImpersonation()

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      loginWithCredentials(email, password),
    onSuccess: (session) => {
      setSession(session)
      notifySessionChanged()
      const target =
        session.user.role === 'admin'
          ? '/admin/dashboard'
          : session.user.role === 'maintenance'
            ? '/maintenance/dashboard'
            : '/field/dashboard'
      navigate(target, { replace: true })
      toast.success(`Welcome back, ${session.user.name}`)
    },
    onError: (err: unknown) => {
      const message =
        err instanceof Error ? err.message : 'Invalid email or password. Please try again.'
      toast.error(message)
    },
  })
}

// ─── Manual login screen ────────────────────────────────────────────────────
function ManualLoginScreen({ onBack }: { onBack: () => void }) {
  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const loginMutation = useLoginMutation()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password) {
      toast.error('Email and password are required.')
      return
    }
    loginMutation.mutate({ email: email.trim(), password })
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
      <div
        className="w-full max-w-sm rounded-2xl overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
        style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
      >
        {/* Header */}
        <div
          className="px-6 py-5 flex items-center gap-3"
          style={{ background: 'rgb(var(--brand-navy-rgb))', borderBottom: '1px solid rgba(255,255,255,0.1)' }}
        >
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/15">
            <KeyRound className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">Sign in with credentials</p>
            <p className="text-xs text-white/60">Enter your email and password</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-500 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-colors"
              required
              autoComplete="email"
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-10 px-3 pr-10 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-colors"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loginMutation.isPending}
            className="w-full flex items-center justify-center gap-2 h-10 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-50"
            style={{ background: 'rgb(var(--brand-navy-rgb))' }}
          >
            {loginMutation.isPending ? (
              'Signing in…'
            ) : (
              <>
                <LogIn className="h-4 w-4" />
                Sign in
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center justify-center gap-1.5 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors mt-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to demo roles
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── Main login page ─────────────────────────────────────────────────────────
export default function LoginPage() {
  const authenticated = isAuthenticated()
  const [showManual, setShowManual] = useState(false)
  const loginMutation = useLoginMutation()
  const { dark } = useDarkMode()

  if (authenticated) return <Navigate replace to="/" />

  function handleSelectRole(role: RoleConfig) {
    loginMutation.mutate({ email: role.defaultEmail, password: 'demo123' })
  }

  return (
    <main className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      {/* Top bar */}
      <div
        className="w-full flex items-center px-8 py-4 shrink-0"
        style={{ background: 'rgb(var(--brand-navy-rgb))', borderBottom: '1px solid rgba(255,255,255,0.1)' }}
      >
        <img alt="EquipTrack logo" className="h-8 w-auto select-none" src={fullLogoStroke} />
      </div>

      {showManual ? (
        <ManualLoginScreen onBack={() => setShowManual(false)} />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 gap-6">
          <div className="text-center mb-2">
            <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200 tracking-tight">Welcome to EquipTrack</h1>
            <p className="mt-1.5 text-slate-500 dark:text-slate-400 text-sm">
              Select a role to sign in instantly as a demo user.
            </p>
          </div>

          {/* Role cards */}
          <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-3 gap-5">
            {roles.map((role) => {
              const Icon = role.icon
              const isPending = loginMutation.isPending && loginMutation.variables?.email === role.defaultEmail

              return (
                <button
                  key={role.key}
                  type="button"
                  disabled={loginMutation.isPending}
                  onClick={() => handleSelectRole(role)}
                  className="flex flex-col rounded-2xl overflow-hidden text-left transition-all disabled:opacity-60 disabled:cursor-wait focus:outline-none focus-visible:ring-2 bg-white dark:bg-slate-800"
                  style={{
                    border: dark ? '1px solid #334155' : '1px solid #e2e8f0',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                    ['--tw-ring-color' as string]: role.accent,
                  }}
                  onMouseEnter={(e) => {
                    if (!loginMutation.isPending) {
                      const el = e.currentTarget
                      el.style.border = `2px solid ${role.accent}`
                      el.style.boxShadow = `0 0 0 3px ${role.accentLight}, 0 4px 16px rgba(0,0,0,0.1)`
                      el.style.transform = 'translateY(-2px)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget
                    el.style.border = dark ? '1px solid #334155' : '1px solid #e2e8f0'
                    el.style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)'
                    el.style.transform = ''
                  }}
                >
                  {/* Card header */}
                  <div
                    className="px-6 pt-7 pb-5"
                    style={{ borderBottom: `1px solid ${role.accentBorder}`, background: dark ? `${role.accent}22` : role.accentLight }}
                  >
                    <div
                      className="inline-flex items-center justify-center w-11 h-11 rounded-xl mb-4"
                      style={{ background: role.accent }}
                    >
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <h2 className="text-xl font-bold tracking-tight mb-1" style={{ color: role.accent }}>
                      {role.label}
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">{role.tagline}</p>
                  </div>

                  {/* Card body */}
                  <div className="px-6 py-5 flex flex-col gap-4 flex-1">
                    <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">{role.description}</p>
                    <div className="flex flex-col gap-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: role.accent }}>
                        Access includes
                      </p>
                      {role.access.map(({ icon: AccessIcon, label }) => (
                        <div key={label} className="flex items-center gap-2.5">
                          <div
                            className="shrink-0 flex items-center justify-center w-6 h-6 rounded-md"
                            style={{ background: dark ? `${role.accent}30` : role.accentLight }}
                          >
                            <AccessIcon className="h-3.5 w-3.5" style={{ color: role.accent }} />
                          </div>
                          <span className="text-sm text-slate-700 dark:text-slate-300">{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* CTA button at bottom */}
                  <div className="px-6 pb-6">
                    <div
                      className="w-full py-2.5 rounded-xl text-sm font-semibold text-white text-center"
                      style={{ background: role.accent }}
                    >
                      {isPending ? 'Signing in…' : `Sign in as ${role.label}`}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Manual login link */}
          <button
            type="button"
            onClick={() => setShowManual(true)}
            className="inline-flex items-center gap-2 mt-2 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors group"
          >
            <KeyRound className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-600 transition-colors" />
            Sign in with email & password
          </button>
        </div>
      )}
    </main>
  )
}
