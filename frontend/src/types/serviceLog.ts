export type ServiceLogEntry = {
  id: string
  equipmentId: string
  date: string
  note: string
  performedByUserId: string
}

export type CreateServiceLogEntryDTO = {
  date: string
  note: string
  performedByUserId: string
}
