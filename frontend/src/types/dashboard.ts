import type { EquipmentStatus } from './equipment'

export type AdminSummary = {
  totalEquipment: number
  byStatus: Record<EquipmentStatus, number>
  pendingRentalRequests: number
  activeRentals: number
}

export type FieldSummary = {
  myPendingRequests: number
  myActiveRentals: number
  recommendedEquipmentIds: string[]
}

export type ForemanSummary = FieldSummary

export type MaintenanceSummary = {
  maintenanceEquipment: number
  availableEquipment: number
  inUseEquipment: number
}
