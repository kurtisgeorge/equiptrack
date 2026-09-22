export type EquipmentStatus = 'available' | 'in_use' | 'maintenance'

export type IssueSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export type Equipment = {
  id: string
  name: string
  category: string
  status: EquipmentStatus
  qrCode: string
  lastServiceDate: string
  maintenanceIntervalDays?: number
  nextServiceDueDate?: string
  notes?: string
  severity?: IssueSeverity
  assignedToUserId?: string
  assignedToName?: string
}

export type CreateEquipmentDTO = {
  name: string
  category: string
  status: EquipmentStatus
  qrCode: string
  lastServiceDate: string
  maintenanceIntervalDays?: number
  nextServiceDueDate?: string
  notes?: string
}

export type UpdateEquipmentDTO = Partial<CreateEquipmentDTO>
