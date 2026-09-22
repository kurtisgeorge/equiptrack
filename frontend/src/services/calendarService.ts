import { apiClient } from './apiClient'

export type VisibilityType = 'ALL' | 'ROLES' | 'USERS'

export interface CalendarEvent {
  id: string
  title: string
  description: string | null
  date: string
  startTime: string | null
  endTime: string | null
  color: string
  visibilityType: VisibilityType
  visibilityRoles: string[]
  visibilityUserIds: string[]
  createdById: string
  createdByName: string
  createdAt: string
}

export interface CreateEventPayload {
  title: string
  description?: string
  date: string
  startTime?: string
  endTime?: string
  color?: string
  visibilityType: VisibilityType
  visibilityRoles?: string[]
  visibilityUserIds?: string[]
}

export function listCalendarEvents(month?: string): Promise<CalendarEvent[]> {
  const qs = month ? `?month=${encodeURIComponent(month)}` : ''
  return apiClient.get<CalendarEvent[]>(`/api/calendar/events${qs}`)
}

export function createCalendarEvent(payload: CreateEventPayload): Promise<CalendarEvent> {
  return apiClient.post<CalendarEvent, CreateEventPayload>('/api/calendar/events', payload)
}

export function updateCalendarEvent(id: string, payload: Partial<CreateEventPayload>): Promise<CalendarEvent> {
  return apiClient.put<CalendarEvent, Partial<CreateEventPayload>>(`/api/calendar/events/${id}`, payload)
}

export function deleteCalendarEvent(id: string): Promise<void> {
  return apiClient.delete<void>(`/api/calendar/events/${id}`)
}
