import { apiClient } from './apiClient'
import type { AdminSummary, FieldSummary, MaintenanceSummary } from '../types/dashboard'

export function getAdminSummary(): Promise<AdminSummary> {
  return apiClient.get<AdminSummary>('/api/dashboard/admin-summary')
}

export function getFieldSummary(userId: string): Promise<FieldSummary> {
  return apiClient.get<FieldSummary>(`/api/dashboard/field-summary?userId=${userId}`)
}

export function getForemanSummary(userId: string): Promise<FieldSummary> {
  return getFieldSummary(userId)
}

export function getMaintenanceSummary(): Promise<MaintenanceSummary> {
  return apiClient.get<MaintenanceSummary>('/api/dashboard/maintenance-summary')
}
