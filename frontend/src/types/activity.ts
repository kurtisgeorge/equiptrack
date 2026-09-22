export type ActivityType = 'checkout' | 'checkin' | 'service' | 'issue' | 'status_change'

export type ActivityEvent = {
  id: string
  equipmentId: string
  type: ActivityType
  timestamp: string
  actorUserId: string
  summary: string
}
