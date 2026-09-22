export const UserRole = {
  ADMIN: "ADMIN",
  FIELD_WORKER: "FIELD_WORKER",
  MAINTENANCE: "MAINTENANCE",
} as const
export type UserRole = (typeof UserRole)[keyof typeof UserRole]

export const EquipmentStatus = {
  AVAILABLE: "AVAILABLE",
  RESERVED: "RESERVED",
  CHECKED_OUT: "CHECKED_OUT",
  OVERDUE: "OVERDUE",
  DUE_SOON_MAINTENANCE: "DUE_SOON_MAINTENANCE",
  IN_MAINTENANCE: "IN_MAINTENANCE",
  OUT_OF_SERVICE: "OUT_OF_SERVICE",
} as const
export type EquipmentStatus = (typeof EquipmentStatus)[keyof typeof EquipmentStatus]

export const RentalStatus = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  RESERVED: "RESERVED",
  CHECKED_OUT: "CHECKED_OUT",
  RETURNED: "RETURNED",
  OVERDUE: "OVERDUE",
  CANCELLED: "CANCELLED",
} as const
export type RentalStatus = (typeof RentalStatus)[keyof typeof RentalStatus]

export const MaintenanceStatus = {
  OPEN: "OPEN",
  SCHEDULED: "SCHEDULED",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  DEFERRED: "DEFERRED",
} as const
export type MaintenanceStatus = (typeof MaintenanceStatus)[keyof typeof MaintenanceStatus]

export const MaintenanceTrigger = {
  ROUTINE: "ROUTINE",
  ISSUE_REPORTED: "ISSUE_REPORTED",
  INSPECTION: "INSPECTION",
  BREAKDOWN: "BREAKDOWN",
  ADMIN_REQUEST: "ADMIN_REQUEST",
} as const
export type MaintenanceTrigger = (typeof MaintenanceTrigger)[keyof typeof MaintenanceTrigger]

export const IssueSeverity = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  CRITICAL: "CRITICAL",
} as const
export type IssueSeverity = (typeof IssueSeverity)[keyof typeof IssueSeverity]

export const IssueStatus = {
  OPEN: "OPEN",
  REVIEWED: "REVIEWED",
  IN_PROGRESS: "IN_PROGRESS",
  RESOLVED: "RESOLVED",
  CLOSED: "CLOSED",
} as const
export type IssueStatus = (typeof IssueStatus)[keyof typeof IssueStatus]

export const NoteTargetType = {
  EQUIPMENT_UNIT: "EQUIPMENT_UNIT",
  RENTAL: "RENTAL",
  MAINTENANCE_RECORD: "MAINTENANCE_RECORD",
  ISSUE_REPORT: "ISSUE_REPORT",
} as const
export type NoteTargetType = (typeof NoteTargetType)[keyof typeof NoteTargetType]

export const AuditAction = {
  CREATED: "CREATED",
  UPDATED: "UPDATED",
  DELETED: "DELETED",
  STATUS_CHANGED: "STATUS_CHANGED",
  REQUEST_SUBMITTED: "REQUEST_SUBMITTED",
  REQUEST_APPROVED: "REQUEST_APPROVED",
  REQUEST_REJECTED: "REQUEST_REJECTED",
  CHECKED_OUT: "CHECKED_OUT",
  RETURNED: "RETURNED",
  MAINTENANCE_OPENED: "MAINTENANCE_OPENED",
  MAINTENANCE_COMPLETED: "MAINTENANCE_COMPLETED",
  ISSUE_REPORTED: "ISSUE_REPORTED",
  NOTE_ADDED: "NOTE_ADDED",
} as const
export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction]
