import { useMemo, useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, X, Eye, EyeOff, Trash2, Users } from 'lucide-react'
import { toast } from 'sonner'
import DataTable from '../../../components/DataTable'
import ErrorState from '../../../components/ErrorState'
import Loader from '../../../components/Loader'
import PageHeader from '../../../components/PageHeader'
import { Button } from '../../../components/ui/button'
import { listUsers, createUser, deleteUser, type CreateUserPayload } from '../../../services/userService'
import type { UserRole } from '../../../types/auth'
import type { User } from '../../../types/user'

const roleOptions: Array<{ label: string; value: UserRole | 'all' }> = [
  { label: 'All roles',    value: 'all'         },
  { label: 'Admin',        value: 'admin'        },
  { label: 'Field User',   value: 'field'        },
  { label: 'Maintenance',  value: 'maintenance'  },
]

const roleMeta: Record<UserRole, { label: string; pill: string; dot: string; initials: string }> = {
  admin:       { label: 'Admin',       pill: 'text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-300 dark:bg-blue-900/40 dark:border-blue-800',         dot: 'bg-blue-500 dark:bg-blue-400',    initials: 'bg-blue-600'    },
  field:       { label: 'Field User',  pill: 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-900/40 dark:border-emerald-800', dot: 'bg-emerald-500 dark:bg-emerald-400', initials: 'bg-emerald-600' },
  maintenance: { label: 'Maintenance', pill: 'text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-900/40 dark:border-amber-800',   dot: 'bg-amber-500 dark:bg-amber-400',   initials: 'bg-amber-600'   },
}

function initials(name: string) {
  return name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()
}

type CreateUserForm = {
  name: string; email: string; role: UserRole
  password: string; department: string; position: string; phoneNumber: string
}

const EMPTY_FORM: CreateUserForm = {
  name: '', email: '', role: 'field', password: '',
  department: '', position: '', phoneNumber: '',
}

const fieldCls = 'w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-colors placeholder:text-slate-400 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100 dark:placeholder:text-slate-500'

function CreateUserDialog({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<CreateUserForm>(EMPTY_FORM)
  const [showPassword, setShowPassword] = useState(false)

  const mutation = useMutation({
    mutationFn: (payload: CreateUserPayload) => createUser(payload),
    onSuccess: (newUser) => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success(`${newUser.name} has been added.`)
      onClose()
    },
  })

  function handleChange(field: keyof CreateUserForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim() || !form.password) {
      toast.error('Name, email, and password are required.')
      return
    }
    mutation.mutate({
      name: form.name.trim(), email: form.email.trim(), role: form.role, password: form.password,
      department: form.department.trim() || undefined, position: form.position.trim() || undefined,
      phoneNumber: form.phoneNumber.trim() || undefined,
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl bg-white dark:bg-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Dialog header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ background: 'rgb(var(--brand-navy-rgb))' }}>
          <div className="flex items-center gap-2 text-white">
            <Users className="h-4 w-4" />
            <span className="font-semibold text-sm">Create New User</span>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Full Name <span className="text-red-400">*</span></label>
              <input type="text" value={form.name} onChange={(e) => handleChange('name', e.target.value)} placeholder="Jane Smith" className={fieldCls} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Role <span className="text-red-400">*</span></label>
              <select value={form.role} onChange={(e) => handleChange('role', e.target.value)} className={fieldCls}>
                <option value="field">Field User</option>
                <option value="maintenance">Maintenance</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Email <span className="text-red-400">*</span></label>
            <input type="email" value={form.email} onChange={(e) => handleChange('email', e.target.value)} placeholder="jane@equiptrack.local" className={fieldCls} required />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Password <span className="text-red-400">*</span></label>
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={(e) => handleChange('password', e.target.value)} placeholder="Min. 6 characters" className={`${fieldCls} pr-10`} required minLength={6} />
              <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Department</label>
              <input type="text" value={form.department} onChange={(e) => handleChange('department', e.target.value)} placeholder="Operations" className={fieldCls} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Position</label>
              <input type="text" value={form.position} onChange={(e) => handleChange('position', e.target.value)} placeholder="Site Supervisor" className={fieldCls} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Phone Number</label>
            <input type="tel" value={form.phoneNumber} onChange={(e) => handleChange('phoneNumber', e.target.value)} placeholder="555-0100" className={fieldCls} />
          </div>

          {/* Divider */}
          <div className="border-t border-slate-100 dark:border-slate-700" />

          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="flex-1" disabled={mutation.isPending} style={{ background: 'rgb(var(--brand-navy-rgb))' }}>
              {mutation.isPending ? 'Creating…' : 'Create User'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function AdminUsersPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [role, setRole] = useState<UserRole | 'all'>('all')
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  const usersQuery = useQuery({
    queryKey: ['users', { role }],
    queryFn: () => listUsers({ role }),
    placeholderData: keepPreviousData,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('User removed.')
    },
  })

  const columns = useMemo<ColumnDef<User>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'User',
        cell: ({ row }) => {
          const meta = roleMeta[row.original.role]
          return (
            <button
              className="flex items-center gap-3 text-left group"
              onClick={() => navigate(`/profile/${row.original.id}`)}
            >
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${meta.initials}`}>
                {initials(row.original.name)}
              </div>
              <div>
                <p className="font-semibold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 transition-colors">{row.original.name}</p>
                <p className="text-xs text-slate-400 font-mono">{row.original.email}</p>
              </div>
            </button>
          )
        },
      },
      {
        accessorKey: 'role',
        header: 'Role',
        cell: ({ row }) => {
          const meta = roleMeta[row.original.role]
          return (
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${meta.pill}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
              {meta.label}
            </span>
          )
        },
      },
      {
        id: 'actions',
        header: 'Actions',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate(`/profile/${row.original.id}`)}>
              View Profile
            </Button>
            <Button
              variant="ghost" size="sm"
              className="text-red-500 hover:text-red-700 hover:bg-red-50"
              onClick={() => {
                if (confirm(`Remove ${row.original.name}? This cannot be undone.`)) {
                  deleteMutation.mutate(row.original.id)
                }
              }}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ),
      },
    ],
    [navigate, deleteMutation],
  )

  if (usersQuery.isLoading) return <Loader label="Loading users..." />
  if (usersQuery.isError) {
    return <ErrorState error={usersQuery.error} onRetry={() => usersQuery.refetch()} title="Could not load users" />
  }

  const filteredUsers = (usersQuery.data ?? []).filter((user) => {
    const q = search.toLowerCase().trim()
    return !q || user.name.toLowerCase().includes(q) || user.email.toLowerCase().includes(q)
  })

  return (
    <div className="space-y-6">
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 transition-colors">
        <ArrowLeft className="h-3.5 w-3.5" />
        Back
      </button>

      <PageHeader
        title="Users"
        subtitle="Manage user accounts and role access"
        actions={
          <Button onClick={() => setShowCreateDialog(true)} className="gap-2" style={{ background: 'rgb(var(--brand-navy-rgb))' }}>
            <Plus className="h-4 w-4" />
            Add User
          </Button>
        }
      />

      {/* Filters */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700 shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50 dark:bg-slate-700/50 dark:border-slate-700 px-4 py-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Filters</p>
        </div>
        <div className="p-4">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Role</span>
            <div className="flex flex-wrap gap-1.5">
              {roleOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setRole(opt.value)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${role === opt.value ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:border-slate-400 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-600'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredUsers}
        emptyDescription="No users match your current filters."
        emptyTitle="No users found"
        onSearchValueChange={setSearch}
        searchPlaceholder="Search by name or email…"
        searchValue={search}
      />

      {showCreateDialog && <CreateUserDialog onClose={() => setShowCreateDialog(false)} />}
    </div>
  )
}
