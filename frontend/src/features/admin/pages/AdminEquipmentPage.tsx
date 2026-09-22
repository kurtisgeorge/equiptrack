import { useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useLocation } from 'react-router-dom'
import { toast } from 'sonner'
import { Plus, ArrowLeft, Search, Pencil, Trash2 } from 'lucide-react'
import ErrorState from '../../../components/ErrorState'
import Loader from '../../../components/Loader'
import PageHeader from '../../../components/PageHeader'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../../components/ui/alert-dialog'
import { Button } from '../../../components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog'
import EquipmentForm from '../../equipment/components/EquipmentForm'
import EquipmentGroupGrid from '../../equipment/components/EquipmentGroupGrid'
import {
  createEquipment,
  deleteEquipment,
  listEquipment,
  updateEquipment,
} from '../../../services/equipmentService'
import type { CreateEquipmentDTO, Equipment, EquipmentStatus } from '../../../types/equipment'

const STATUS_FILTERS: Array<{ label: string; value: EquipmentStatus | 'all' }> = [
  { label: 'All statuses', value: 'all' },
  { label: 'Available', value: 'available' },
  { label: 'In Use', value: 'in_use' },
  { label: 'Maintenance', value: 'maintenance' },
]

export default function AdminEquipmentPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()
  const locationState = location.state as { statusFilter?: EquipmentStatus | 'all' } | null

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<EquipmentStatus | 'all'>(
    locationState?.statusFilter ?? 'all'
  )
  const [isCreateOpen, setCreateOpen] = useState(false)
  const [editItem, setEditItem] = useState<Equipment | null>(null)
  const [deleteItem, setDeleteItem] = useState<Equipment | null>(null)

  const equipmentQuery = useQuery({
    queryKey: ['equipment', { search, statusFilter }],
    queryFn: () => listEquipment({ search, status: statusFilter }),
    placeholderData: keepPreviousData,
  })

  const createMutation = useMutation({
    mutationFn: (values: CreateEquipmentDTO) => createEquipment(values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['equipment'] })
      await queryClient.invalidateQueries({ queryKey: ['admin-summary'] })
      setCreateOpen(false)
      toast.success('Equipment added.')
    },
    onError: () => toast.error('Could not create equipment.'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: CreateEquipmentDTO }) =>
      updateEquipment(id, values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['equipment'] })
      await queryClient.invalidateQueries({ queryKey: ['admin-summary'] })
      setEditItem(null)
      toast.success('Equipment updated.')
    },
    onError: () => toast.error('Could not update equipment.'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteEquipment(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['equipment'] })
      await queryClient.invalidateQueries({ queryKey: ['admin-summary'] })
      setDeleteItem(null)
      toast.success('Equipment deleted.')
    },
    onError: () => toast.error('Could not delete equipment.'),
  })

  if (equipmentQuery.isLoading) return <Loader label="Loading equipment..." />
  if (equipmentQuery.isError) {
    return (
      <ErrorState
        error={equipmentQuery.error}
        onRetry={() => equipmentQuery.refetch()}
        title="Could not load equipment"
      />
    )
  }

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
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add equipment
          </Button>
        }
        subtitle="Manage inventory, profile metadata, and service scheduling"
        title="Equipment"
      />

      {/* ── Filters ──────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 dark:bg-slate-700/50 dark:border-slate-700 px-4 py-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Filters</p>
          {(search || statusFilter !== 'all') && (
            <button
              onClick={() => { setSearch(''); setStatusFilter('all') }}
              className="text-[11px] font-semibold text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
            >
              Clear all
            </button>
          )}
        </div>
        <div className="p-4 space-y-4">
          {/* Search */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Search</span>
            <div className="relative max-w-sm">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search equipment by name…"
                className="w-full h-9 rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-colors dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100 dark:placeholder:text-slate-500"
              />
            </div>
          </div>
          {/* Status pills */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Status</span>
            <div className="flex flex-wrap gap-1.5">
              {STATUS_FILTERS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setStatusFilter(opt.value)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    statusFilter === opt.value
                      ? 'bg-slate-900 text-white'
                      : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-400 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-600'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Grouped tile grid */}
      <EquipmentGroupGrid
        equipment={equipmentQuery.data ?? []}
        getDetailPath={(item) => `/admin/equipment/${item.id}`}
        renderItemActions={(item) => (
          <>
            <button
              className="flex items-center justify-center h-7 w-7 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
              title="Edit"
              onClick={(e) => { e.preventDefault(); setEditItem(item) }}
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              className="flex items-center justify-center h-7 w-7 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              title="Delete"
              onClick={(e) => { e.preventDefault(); setDeleteItem(item) }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      />

      {/* Create dialog */}
      <Dialog onOpenChange={setCreateOpen} open={isCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add equipment</DialogTitle>
            <DialogDescription>Create a new equipment record.</DialogDescription>
          </DialogHeader>
          <EquipmentForm
            existingEquipment={equipmentQuery.data ?? []}
            isSubmitting={createMutation.isPending}
            onCancel={() => setCreateOpen(false)}
            onSubmit={(values) => createMutation.mutate(values)}
            submitLabel="Create equipment"
          />
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog onOpenChange={(open) => !open && setEditItem(null)} open={Boolean(editItem)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit equipment</DialogTitle>
            <DialogDescription>Update equipment details and status.</DialogDescription>
          </DialogHeader>
          {editItem && (
            <EquipmentForm
              initialValues={editItem}
              existingEquipment={equipmentQuery.data ?? []}
              isSubmitting={updateMutation.isPending}
              onCancel={() => setEditItem(null)}
              onSubmit={(values) => updateMutation.mutate({ id: editItem.id, values })}
              submitLabel="Save changes"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog onOpenChange={(open) => !open && setDeleteItem(null)} open={Boolean(deleteItem)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete equipment?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Equipment with active/pending rentals cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="secondary">Cancel</Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                disabled={deleteMutation.isPending}
                onClick={() => deleteItem && deleteMutation.mutate(deleteItem.id)}
                variant="default"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
