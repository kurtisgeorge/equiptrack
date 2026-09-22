export type RentalStatus = 'pending' | 'approved' | 'active' | 'returned' | 'rejected'

export type Rental = {
  id: string
  equipmentId: string
  equipmentTypeId: string
  equipmentName: string
  requestedBy: string
  requestedByName: string
  status: RentalStatus
  startDate: string
  endDate?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export type RentalStatusEvent = {
  label: string
  at: string
}

export type RentalDetail = Rental & {
  timeline: RentalStatusEvent[]
}

export type CreateRentalRequestDTO = {
  equipmentId: string
  requestedBy: string
  startDate: string
  endDate?: string
  notes?: string
}

export type UpdateRentalStatusDTO = {
  status: Extract<RentalStatus, 'active' | 'returned' | 'rejected' | 'approved'>
  assignedEquipmentId?: string
}
