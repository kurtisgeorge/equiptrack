import { apiClient } from './apiClient'

export type IssueStatus = 'OPEN' | 'REVIEWED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'
export type IssueSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export type IssueReport = {
  id: string
  equipmentId: string
  equipmentName?: string
  equipmentAssetTag?: string
  reportedByUserId: string
  title: string
  description: string
  severity: IssueSeverity
  status: IssueStatus
  reportedAt: string
  resolvedAt?: string
}

export type MaintenanceNote = {
  id: string
  authorId: string
  body: string
  targetType: string
  equipmentId?: string
  createdAt: string
}

export function listIssueReports(params: { status?: IssueStatus; severity?: IssueSeverity; reportedBy?: string } = {}): Promise<IssueReport[]> {
  const searchParams = new URLSearchParams()
  if (params.status) searchParams.set('status', params.status)
  if (params.severity) searchParams.set('severity', params.severity)
  if (params.reportedBy) searchParams.set('reportedBy', params.reportedBy)

  const queryString = searchParams.toString()
  return apiClient.get<IssueReport[]>(`/api/maintenance/issues${queryString ? `?${queryString}` : ''}`)
}

export function resolveIssue(id: string, actorUserId: string): Promise<IssueReport> {
  return apiClient.post<IssueReport, { actorUserId: string }>(`/api/maintenance/issues/${id}/resolve`, {
    actorUserId,
  })
}

export function moveToMaintenance(id: string, actorUserId: string): Promise<unknown> {
  return apiClient.post<unknown, { actorUserId: string }>(`/api/maintenance/issues/${id}/move-to-maintenance`, {
    actorUserId,
  })
}

export function deleteMaintenanceNote(noteId: string, actorUserId: string): Promise<void> {
  return apiClient.delete<void>(`/api/maintenance/notes/${noteId}`, { actorUserId })
}

export function listMaintenanceNotes(equipmentId: string): Promise<MaintenanceNote[]> {
  return apiClient.get<MaintenanceNote[]>(`/api/maintenance/notes?equipmentId=${equipmentId}`)
}

export function addMaintenanceNote(data: {
  authorId: string
  body: string
  equipmentId: string
}): Promise<MaintenanceNote> {
  return apiClient.post<MaintenanceNote, {
    authorId: string
    body: string
    targetType: string
    equipmentId: string
  }>('/api/maintenance/notes', {
    authorId: data.authorId,
    body: data.body,
    targetType: 'EQUIPMENT_UNIT',
    equipmentId: data.equipmentId,
  })
}
