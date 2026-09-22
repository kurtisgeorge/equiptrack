import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '../../../components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog'
import { Select } from '../../../components/ui/select'
import { Label } from '../../../components/ui/label'
import { getAvailableUnitsForType } from '../../../services/availabilityService'
import { updateRentalStatus } from '../../../services/rentalService'
import Loader from '../../../components/Loader'
import ErrorState from '../../../components/ErrorState'
import { formatDate } from '../../../lib/utils'

type ApproveRentalDialogProps = {
  open: boolean
  onClose: () => void
  rentalId: string
  equipmentTypeId: string
  startDate: string
  endDate?: string
}

export default function ApproveRentalDialog({
  open,
  onClose,
  rentalId,
  equipmentTypeId,
  startDate,
  endDate,
}: ApproveRentalDialogProps) {
  const queryClient = useQueryClient()
  const [selectedUnitId, setSelectedUnitId] = useState<string>('')

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) onClose()
  }

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['available-units', equipmentTypeId, startDate, endDate],
    queryFn: () => getAvailableUnitsForType({ equipmentTypeId, startDate, endDate }),
    enabled: open,
  })

  const actionMutation = useMutation({
    mutationFn: (assignedEquipmentId: string) =>
      updateRentalStatus(rentalId, { status: 'approved', assignedEquipmentId }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['rentals'] })
      await queryClient.invalidateQueries({ queryKey: ['equipment'] })
      await queryClient.invalidateQueries({ queryKey: ['admin-summary'] })
      await queryClient.invalidateQueries({ queryKey: ['rental-detail', rentalId] })
      toast.success('Rental approved and unit assigned.')
      onClose()
    },
    onError: () => toast.error('Could not approve rental.'),
  })

  const availableUnits = data?.units.filter((u) => u.isAvailable) || []

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Approve Rental Request</DialogTitle>
          <DialogDescription>
            Assign a specific equipment unit for {formatDate(startDate)}{' '}
            {endDate ? `to ${formatDate(endDate)}` : 'onwards'}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {isLoading ? (
            <Loader label="Loading available units..." />
          ) : isError ? (
            <ErrorState error={error} onRetry={() => refetch()} title="Could not load units" />
          ) : data?.noUnitsAvailable ? (
            <div className="rounded-md bg-slate-100 dark:bg-slate-700 p-4 text-sm text-slate-800 dark:text-slate-200">
              No units are currently available for this equipment type during the requested dates.
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="unit-select">Select Equipment Unit</Label>
              <Select
                id="unit-select"
                onChange={(e) => setSelectedUnitId(e.target.value)}
                value={selectedUnitId}
              >
                <option disabled value="">
                  -- Select a unit --
                </option>
                {availableUnits.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.assetTag}
                  </option>
                ))}
              </Select>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
          <Button onClick={onClose} variant="secondary">
            Cancel
          </Button>
          <Button
            disabled={!selectedUnitId || actionMutation.isPending}
            onClick={() => actionMutation.mutate(selectedUnitId)}
            variant="success"
          >
            {actionMutation.isPending ? 'Approving...' : 'Approve & Assign'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
