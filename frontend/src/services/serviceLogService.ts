import { apiClient } from './apiClient'
import type { CreateServiceLogEntryDTO, ServiceLogEntry } from '../types/serviceLog'

export function listServiceLogsByEquipment(equipmentId: string): Promise<ServiceLogEntry[]> {
  return apiClient.get<ServiceLogEntry[]>(`/api/equipment/${equipmentId}/service-logs`)
}

export function addServiceLogEntry(
  equipmentId: string,
  payload: CreateServiceLogEntryDTO,
): Promise<ServiceLogEntry> {
  return apiClient.post<ServiceLogEntry, CreateServiceLogEntryDTO>(
    `/api/equipment/${equipmentId}/service-logs`,
    payload,
  )
}
