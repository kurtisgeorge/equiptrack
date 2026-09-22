import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { MoreVertical, Trash2, ArrowLeft, Mail, User } from 'lucide-react'
import { toast } from 'sonner'
import PageHeader from '../../../components/PageHeader'
import ErrorState from '../../../components/ErrorState'
import Loader from '../../../components/Loader'
import { Button } from '../../../components/ui/button'
import { Label } from '../../../components/ui/label'
import { Input } from '../../../components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '../../../components/ui/dropdown-menu'
import { getSession } from '../../../lib/auth'
import { getUser, updateUser, deleteUser } from '../../../services/userService'

const ICONS = ['hardhat', 'wrench', 'truck', 'clipboard', 'gear']

const ROLE_PILL: Record<string, string> = {
  admin:       'bg-violet-50 text-violet-700 border border-violet-200',
  field:       'bg-emerald-50 text-emerald-700 border border-emerald-200',
  maintenance: 'bg-amber-50 text-amber-700 border border-amber-200',
}

export default function UserProfilePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const session = getSession()
  const sessionUserId = session?.user?.id
  const currentUserRole = session?.user?.role

  const effectiveUserId = id || sessionUserId
  const isOwnProfile = !id || id === sessionUserId
  const isAdmin = currentUserRole === 'admin'

  const queryClient = useQueryClient()

  const [avatarUrl, setAvatarUrl]   = useState<string>('')
  const [phoneNumber, setPhoneNumber] = useState<string>('')
  const [position, setPosition]     = useState<string>('')

  const userQuery = useQuery({
    queryKey: ['user', effectiveUserId],
    queryFn: () => getUser(effectiveUserId!),
    enabled: !!effectiveUserId,
  })

  useEffect(() => {
    if (userQuery.data) {
      setAvatarUrl(userQuery.data.avatarUrl ?? '')
      setPhoneNumber(userQuery.data.phoneNumber ?? '')
      setPosition(userQuery.data.position ?? '')
    }
  }, [userQuery.data])

  const updateMutation = useMutation({
    mutationFn: () => updateUser(effectiveUserId!, {
      phoneNumber: phoneNumber || null,
      position: position || null,
      avatarUrl: avatarUrl || null,
      isAvatarIcon: true,
    }),
    onSuccess: (updated) => {
      toast.success('Profile updated successfully')
      queryClient.setQueryData(['user', effectiveUserId], updated)
      void queryClient.invalidateQueries({ queryKey: ['current-user-avatar'] })
    },
    onError: (error) => {
      toast.error('Failed to update profile: ' + (error as Error).message)
    }
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteUser(effectiveUserId!),
    onSuccess: () => {
      toast.success('User deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['users'] })
      navigate('/admin/users')
    },
    onError: (error) => {
      toast.error('Failed to delete user: ' + (error as Error).message)
    }
  })

  if (!effectiveUserId) return <ErrorState error={new Error('User not found')} title="Error" />
  if (userQuery.isLoading)  return <Loader label="Loading profile..." />
  if (userQuery.isError) {
    return <ErrorState error={userQuery.error} onRetry={() => userQuery.refetch()} title="Could not load profile" />
  }

  const user = userQuery.data
  if (!user) return null

  // Derive initials for the avatar bubble
  const initials = user.name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back
      </button>

      <PageHeader
        actions={
          <div className="flex items-center gap-2">
            {isAdmin && !isOwnProfile && user.role !== 'admin' && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
                    onClick={() => {
                      if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
                        deleteMutation.mutate()
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete User
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        }
        subtitle={isOwnProfile ? 'Manage your personal details and avatar' : `Viewing profile for ${user.email}`}
        title={isOwnProfile ? 'My Profile' : user.name}
      />

      {/* ── Identity hero card ──────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700 shadow-sm">
        <div className="flex items-center gap-4 p-6 border-b border-slate-100 dark:border-slate-700">
          {/* Avatar bubble */}
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-slate-800 text-white text-lg font-bold shadow-sm">
            {initials || <User className="h-6 w-6" />}
          </div>
          <div className="min-w-0">
            <p className="text-lg font-bold text-slate-900 dark:text-slate-100 truncate">{user.name}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
            <span className={`mt-1 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${ROLE_PILL[user.role] ?? 'bg-slate-100 text-slate-600'}`}>
              {user.role}
            </span>
          </div>
        </div>

        {/* Read-only details grid */}
        <div className="p-6 space-y-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-3">Account Details</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              {isOwnProfile ? 'Contact your administrator to change read-only details.' : 'Information about this user account.'}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-700 p-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-0.5">Name</p>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{user.name}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-0.5">Email</p>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{user.email}</p>
                {isOwnProfile && (
                  <button
                    type="button"
                    className="mt-1.5 inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
                    onClick={() => toast.info('Email update is not yet available.')}
                  >
                    <Mail className="h-3 w-3" />
                    Update Email
                  </button>
                )}
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-0.5">Role</p>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 capitalize">{user.role}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-0.5">Department</p>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{user.department || '—'}</p>
              </div>
            </div>
          </div>

          {/* Editable section */}
          <div className="space-y-4 border-t border-slate-100 dark:border-slate-700 pt-6">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
              {isOwnProfile ? 'Editable Details' : 'Contact Information'}
            </p>

            <div className="space-y-1.5">
              <Label htmlFor="position" className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                Position / Title
              </Label>
              <Input
                id="position"
                placeholder="e.g. Heavy Equipment Operator"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                disabled={!isOwnProfile && !isAdmin}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                Phone Number
              </Label>
              <Input
                id="phone"
                placeholder="555-0100"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                disabled={!isOwnProfile && !isAdmin}
              />
            </div>

            {(isOwnProfile || isAdmin) && (
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Avatar Icon</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {ICONS.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setAvatarUrl(icon)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium capitalize transition-colors ${
                        avatarUrl === icon
                          ? 'bg-slate-900 text-white'
                          : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-400 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-600'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setAvatarUrl('')}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      avatarUrl === ''
                        ? 'bg-slate-900 text-white'
                        : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-400 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-600'
                    }`}
                  >
                    None
                  </button>
                </div>
              </div>
            )}

            {(isOwnProfile || isAdmin) && (
              <div className="flex justify-end pt-2">
                <Button
                  onClick={() => updateMutation.mutate()}
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
