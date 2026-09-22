import {
  AuditAction,
  EquipmentStatus,
  RentalStatus,
  UserRole,
} from "./enums"

export type ApiRole = "admin" | "field" | "maintenance"
export type ApiEquipmentStatus = "available" | "in_use" | "maintenance"
export type ApiRentalStatus = "pending" | "approved" | "active" | "returned" | "rejected"

export function mapApiRoleToPrisma(role: ApiRole): UserRole {
  switch (role) {
    case "admin":
      return UserRole.ADMIN
    case "field":
      return UserRole.FIELD_WORKER
    case "maintenance":
      return UserRole.MAINTENANCE
  }
}

export function mapPrismaRoleToApi(role: UserRole): ApiRole {
  switch (role) {
    case UserRole.ADMIN:
      return "admin"
    case UserRole.FIELD_WORKER:
      return "field"
    case UserRole.MAINTENANCE:
      return "maintenance"
  }
}

export function mapPrismaEquipmentStatusToApi(status: EquipmentStatus): ApiEquipmentStatus {
  switch (status) {
    case EquipmentStatus.AVAILABLE:
      return "available"
    case EquipmentStatus.RESERVED:
    case EquipmentStatus.CHECKED_OUT:
    case EquipmentStatus.OVERDUE:
      return "in_use"
    case EquipmentStatus.DUE_SOON_MAINTENANCE:
    case EquipmentStatus.IN_MAINTENANCE:
    case EquipmentStatus.OUT_OF_SERVICE:
      return "maintenance"
  }
}

export function mapApiEquipmentStatusToPrisma(status: ApiEquipmentStatus): EquipmentStatus {
  switch (status) {
    case "available":
      return EquipmentStatus.AVAILABLE
    case "in_use":
      return EquipmentStatus.CHECKED_OUT
    case "maintenance":
      return EquipmentStatus.IN_MAINTENANCE
  }
}

export function mapPrismaRentalStatusToApi(status: RentalStatus): ApiRentalStatus {
  switch (status) {
    case RentalStatus.PENDING:
      return "pending"
    case RentalStatus.APPROVED:
    case RentalStatus.RESERVED:
      return "approved"
    case RentalStatus.CHECKED_OUT:
    case RentalStatus.OVERDUE:
      return "active"
    case RentalStatus.RETURNED:
      return "returned"
    case RentalStatus.REJECTED:
    case RentalStatus.CANCELLED:
      return "rejected"
  }
}

export function mapApiRentalStatusToPrisma(status: ApiRentalStatus): RentalStatus {
  switch (status) {
    case "pending":
      return RentalStatus.PENDING
    case "approved":
      return RentalStatus.APPROVED
    case "active":
      return RentalStatus.CHECKED_OUT
    case "returned":
      return RentalStatus.RETURNED
    case "rejected":
      return RentalStatus.REJECTED
  }
}

export function toIsoDate(value?: Date | string | null): string | undefined {
  if (!value) return undefined
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  return new Date(value).toISOString().slice(0, 10)
}

export function toIsoDateTime(value?: Date | string | null): string | undefined {
  if (!value) return undefined
  if (value instanceof Date) return value.toISOString()
  return new Date(value).toISOString()
}

export function mapAuditActionToActivityType(action: AuditAction): "checkout" | "checkin" | "service" | "issue" | "status_change" {
  switch (action) {
    case AuditAction.CHECKED_OUT:
      return "checkout"
    case AuditAction.RETURNED:
      return "checkin"
    case AuditAction.MAINTENANCE_COMPLETED:
    case AuditAction.MAINTENANCE_OPENED:
      return "service"
    case AuditAction.ISSUE_REPORTED:
      return "issue"
    default:
      return "status_change"
  }
}
