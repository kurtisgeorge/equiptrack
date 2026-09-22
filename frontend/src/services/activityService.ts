import { apiClient } from './apiClient'
import type { ActivityEvent } from '../types/activity'

export function listActivityByEquipment(equipmentId: string, limit = 10): Promise<ActivityEvent[]> {
  return apiClient.get<ActivityEvent[]>(`/api/equipment/${equipmentId}/activity?limit=${limit}`)
}
