import { apiClient } from './apiClient'
import type {
  CreateEquipmentDTO,
  Equipment,
  EquipmentStatus,
  UpdateEquipmentDTO,
} from '../types/equipment'

export type ListEquipmentParams = {
  search?: string
  status?: EquipmentStatus | 'all'
  category?: string | 'all'
  location?: string
  startDate?: string
  endDate?: string
}

export type MarkServicedDTO = {
  performedByUserId: string
  nextServiceDueDate?: string
}

export type ChangeEquipmentStatusDTO = {
  status: EquipmentStatus
  actorUserId: string
  note?: string
}

export function listEquipment(params?: ListEquipmentParams): Promise<Equipment[]> {
  const searchParams = new URLSearchParams()

  if (params?.search) searchParams.set('search', params.search)
  if (params?.status && params.status !== 'all') searchParams.set('status', params.status)
  if (params?.category && params.category !== 'all') searchParams.set('category', params.category)
  if (params?.location) searchParams.set('location', params.location)
  if (params?.startDate) searchParams.set('startDate', params.startDate)
  if (params?.endDate) searchParams.set('endDate', params.endDate)

  const queryString = searchParams.toString()
  return apiClient.get<Equipment[]>(`/api/equipment${queryString ? `?${queryString}` : ''}`)
}

export function getEquipment(id: string, options?: { silent?: boolean }): Promise<Equipment> {
  return apiClient.get<Equipment>(`/api/equipment/${id}`, options)
}

export function createEquipment(dto: CreateEquipmentDTO): Promise<Equipment> {
  return apiClient.post<Equipment, CreateEquipmentDTO>('/api/equipment', dto)
}

export function updateEquipment(id: string, dto: UpdateEquipmentDTO): Promise<Equipment> {
  return apiClient.put<Equipment, UpdateEquipmentDTO>(`/api/equipment/${id}`, dto)
}

export function deleteEquipment(id: string): Promise<void> {
  return apiClient.delete<void>(`/api/equipment/${id}`)
}

export function changeEquipmentStatus(id: string, dto: ChangeEquipmentStatusDTO): Promise<Equipment> {
  return apiClient.patch<Equipment, ChangeEquipmentStatusDTO>(`/api/equipment/${id}/status`, dto)
}

export function checkoutEquipment(
  id: string,
  data: { requestedBy: string; startDate: string; endDate: string },
): Promise<Equipment> {
  return apiClient.post<Equipment, { actorUserId: string; startDate: string; endDate: string }>(
    `/api/equipment/${id}/checkout`,
    {
      actorUserId: data.requestedBy,
      startDate: data.startDate,
      endDate: data.endDate,
    },
  )
}

export function addEquipmentNote(
  id: string,
  data: { note: string; authorId: string },
): Promise<void> {
  return apiClient.post<void, { note: string; authorId: string }>(
    `/api/equipment/${id}/notes`,
    data,
  )
}

export function markEquipmentServiced(id: string, dto: MarkServicedDTO): Promise<Equipment> {
  return apiClient.post<Equipment, MarkServicedDTO>(`/api/equipment/${id}/mark-serviced`, dto)
}

export function listMaintenanceQueue(days = 14): Promise<Equipment[]> {
  return apiClient.get<Equipment[]>(`/api/maintenance/queue?days=${days}`)
}

export function clearServiceLogs(equipmentId: string): Promise<void> {
  return apiClient.delete<void>(`/api/equipment/${equipmentId}/service-logs`)
}

export function clearActivity(equipmentId: string): Promise<void> {
  return apiClient.delete<void>(`/api/equipment/${equipmentId}/activity`)
}

export function clearTechNotes(equipmentId: string): Promise<void> {
  return apiClient.delete<void>(`/api/equipment/${equipmentId}/tech-notes`)
}

export function assignEquipment(
  id: string,
  assignedToUserId: string | null,
  actorUserId: string,
): Promise<Equipment> {
  return apiClient.patch<Equipment, { assignedToUserId: string | null; actorUserId: string }>(
    `/api/equipment/${id}/assign`,
    { assignedToUserId, actorUserId },
  )
}

export function reportIssue(
  equipmentId: string,
  data: { severity: string; title: string; description: string; reportedById: string },
): Promise<{ issue: unknown; equipment: Equipment }> {
  return apiClient.post<
    { issue: unknown; equipment: Equipment },
    { severity: string; title: string; description: string; actorUserId: string }
  >(`/api/equipment/${equipmentId}/report-issue`, {
    severity: data.severity,
    title: data.title,
    description: data.description,
    actorUserId: data.reportedById,
  })
}
