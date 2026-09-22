import {
  AuditAction,
  EquipmentStatus,
  RentalStatus,
  UserRole,
} from "../db/enums"
import { mapPrismaRentalStatusToApi, toIsoDate } from "../db/mappers"
import db, { generateId, toDbDate } from "../lib/db"
import { assertEquipmentUnitBookable, checkOverlap, validateMaintenanceWindow, OCCUPYING_RENTAL_STATUSES } from "./availability.service"

const RENTAL_TRANSITIONS: Record<RentalStatus, ReadonlySet<RentalStatus>> = {
  PENDING: new Set(["APPROVED", "REJECTED", "CANCELLED"]),
  APPROVED: new Set(["RESERVED", "CHECKED_OUT", "REJECTED", "CANCELLED"]),
  RESERVED: new Set(["CHECKED_OUT", "REJECTED", "CANCELLED"]),
  CHECKED_OUT: new Set(["OVERDUE", "RETURNED"]),
  OVERDUE: new Set(["RETURNED"]),
  RETURNED: new Set(),
  REJECTED: new Set(),
  CANCELLED: new Set(),
}

const MAINTENANCE_BLOCKING_EQUIPMENT_STATUSES: EquipmentStatus[] = [
  "DUE_SOON_MAINTENANCE",
  "IN_MAINTENANCE",
  "OUT_OF_SERVICE",
]

type AllowedAction =
  | "REQUEST"
  | "APPROVED"
  | "REJECTED"
  | "RESERVED"
  | "CHECKED_OUT"
  | "RETURNED"
  | "OVERDUE"
  | "CANCELLED"

type StatusInput =
  | RentalStatus
  | "active"
  | "returned"
  | "rejected"
  | "approved"
  | "reserved"
  | "overdue"
  | "cancelled"

type ApiRental = {
  id: string
  equipmentId: string
  equipmentTypeId: string
  equipmentName: string
  requestedBy: string
  requestedByName: string
  status: ReturnType<typeof mapPrismaRentalStatusToApi>
  startDate: string
  endDate?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

type UserRow = {
  id: string
  name: string
  email: string
  role: UserRole
}

type RentalRow = {
  id: string
  equipmentUnitId: string | null
  equipmentTypeId: string
  requesterId: string
  approverId: string | null
  checkedOutById: string | null
  returnedById: string | null
  locationId: string | null
  status: RentalStatus
  reason: string
  jobSite: string | null
  requestedStart: string
  requestedEnd: string
  approvedStart: string | null
  approvedEnd: string | null
  checkedOutAt: string | null
  returnedAt: string | null
  rejectedReason: string | null
  createdAt: string
  updatedAt: string
}

export type CreateRentalInput = {
  equipmentId: string
  requestedByUserId: string
  startDate: string
  endDate?: string
  notes?: string
}

export type TransitionRentalInput = {
  rentalId: string
  requestedStatus: StatusInput
  actorUserId: string
  assignedEquipmentId?: string
  rejectionReason?: string
}

type ServiceErrorCode =
  | "INVALID_INPUT"
  | "NOT_FOUND"
  | "INVALID_TRANSITION"
  | "FORBIDDEN"
  | "CONFLICT"

export class RentalLifecycleError extends Error {
  code: ServiceErrorCode
  statusCode: number

  constructor(code: ServiceErrorCode, message: string, statusCode: number) {
    super(message)
    this.code = code
    this.statusCode = statusCode
  }
}

function loadRentalWithRelations(rentalId: string) {
  const rental = db.prepare("SELECT * FROM Rental WHERE id = ?").get(rentalId) as RentalRow | undefined
  if (!rental) return undefined

  const requester = db.prepare("SELECT id, name, email, role FROM User WHERE id = ?").get(rental.requesterId) as UserRow

  let equipmentTypeName = "Equipment"
  if (rental.equipmentUnitId) {
    const row = db.prepare(`
      SELECT et.name FROM EquipmentUnit eu
      JOIN EquipmentType et ON eu.equipmentTypeId = et.id
      WHERE eu.id = ?
    `).get(rental.equipmentUnitId) as { name: string } | undefined
    if (row) equipmentTypeName = row.name
  } else {
    const row = db.prepare("SELECT name FROM EquipmentType WHERE id = ?").get(rental.equipmentTypeId) as { name: string } | undefined
    if (row) equipmentTypeName = row.name
  }

  return { rental, requester, equipmentTypeName }
}

function toApiRental(data: { rental: RentalRow; requester: UserRow; equipmentTypeName: string }): ApiRental {
  const { rental, requester, equipmentTypeName } = data
  return {
    id: rental.id,
    equipmentId: rental.equipmentUnitId ?? "",
    equipmentTypeId: rental.equipmentTypeId,
    equipmentName: equipmentTypeName,
    requestedBy: rental.requesterId,
    requestedByName: requester.name,
    status: mapPrismaRentalStatusToApi(rental.status),
    startDate: toIsoDate(rental.requestedStart) ?? "",
    endDate: toIsoDate(rental.requestedEnd),
    notes: rental.reason,
    createdAt: new Date(rental.createdAt).toISOString(),
    updatedAt: new Date(rental.updatedAt).toISOString(),
  }
}

function parseRequestedStatus(input: StatusInput): RentalStatus {
  switch (input) {
    case "active":
      return "CHECKED_OUT"
    case "returned":
      return "RETURNED"
    case "rejected":
      return "REJECTED"
    case "approved":
      return "APPROVED"
    case "reserved":
      return "RESERVED"
    case "overdue":
      return "OVERDUE"
    case "cancelled":
      return "CANCELLED"
    default:
      return input
  }
}

function toAction(status: RentalStatus): AllowedAction {
  switch (status) {
    case "APPROVED":
      return "APPROVED"
    case "REJECTED":
      return "REJECTED"
    case "RESERVED":
      return "RESERVED"
    case "CHECKED_OUT":
      return "CHECKED_OUT"
    case "RETURNED":
      return "RETURNED"
    case "OVERDUE":
      return "OVERDUE"
    case "CANCELLED":
      return "CANCELLED"
    case "PENDING":
      return "REQUEST"
  }
}

function canTransition(from: RentalStatus, to: RentalStatus): boolean {
  return RENTAL_TRANSITIONS[from].has(to)
}

function ensureRoleForAction(actor: UserRow, action: AllowedAction, rental?: { requesterId: string }) {
  if (action === "REQUEST") {
    if (actor.role !== UserRole.FIELD_WORKER && actor.role !== UserRole.ADMIN) {
      throw new RentalLifecycleError("FORBIDDEN", "Only field workers and admins can create requests", 403)
    }
    return
  }

  if (action === "RETURNED") {
    if (actor.role === UserRole.ADMIN || actor.role === UserRole.MAINTENANCE) return
    // A field worker is allowed to return a rental only if they are the
    // original requester of that specific rental. This mirrors the CANCELLED
    // rule below and does not broaden permissions for any other action.
    if (actor.role === UserRole.FIELD_WORKER && rental?.requesterId === actor.id) return
    throw new RentalLifecycleError("FORBIDDEN", "Only admin, maintenance, or the requester can mark this rental returned", 403)
  }

  if (action === "CANCELLED") {
    if (actor.role === UserRole.ADMIN) return
    if (actor.role === UserRole.FIELD_WORKER && rental?.requesterId === actor.id) return

    throw new RentalLifecycleError("FORBIDDEN", "Only admin or requester can cancel this rental", 403)
  }

  if (actor.role !== UserRole.ADMIN) {
    throw new RentalLifecycleError("FORBIDDEN", "Only admin can perform this rental transition", 403)
  }
}

async function resolveRequestedEquipment(
  rental: { id: string; equipmentUnitId: string | null; requestedStart: string; requestedEnd: string; locationId: string | null },
  targetStatus: RentalStatus,
  assignedEquipmentId?: string,
) {
  const equipmentId = assignedEquipmentId ?? rental.equipmentUnitId
  if (!equipmentId) {
    throw new RentalLifecycleError("INVALID_INPUT", "assignedEquipmentId is required for approval", 400)
  }

  const unit = db.prepare(`
    SELECT id, status, nextMaintenanceDue, equipmentTypeId, locationId
    FROM EquipmentUnit WHERE id = ? AND isActive = 1
  `).get(equipmentId) as {
    id: string; status: EquipmentStatus; nextMaintenanceDue: string | null;
    equipmentTypeId: string; locationId: string
  } | undefined

  if (!unit) {
    throw new RentalLifecycleError("NOT_FOUND", "Equipment not found", 404)
  }

  const requestedStart = new Date(rental.requestedStart)
  const requestedEnd = new Date(rental.requestedEnd)

  const bookable = await assertEquipmentUnitBookable({
    equipmentUnitId: unit.id,
    startDate: requestedStart,
    endDate: requestedEnd,
    locationId: rental.locationId ?? undefined,
    excludeRentalId: rental.id,
  })
  if (!bookable.ok) {
    throw new RentalLifecycleError("CONFLICT", bookable.message, bookable.statusCode)
  }

  const overlap = await checkOverlap(unit.id, requestedStart, requestedEnd, rental.id)
  if (overlap) {
    throw new RentalLifecycleError("CONFLICT", "Equipment is already reserved or checked out during the requested window.", 409)
  }

  const durationMs = requestedEnd.getTime() - requestedStart.getTime()
  const durationDays = Math.ceil(durationMs / (1000 * 60 * 60 * 24))

  const validMaintenance = await validateMaintenanceWindow(unit.id, durationDays, requestedStart)
  if (!validMaintenance) {
    throw new RentalLifecycleError("CONFLICT", "Equipment maintenance is due during the requested rental duration.", 409)
  }

  if (targetStatus === "CHECKED_OUT") {
    if (unit.status === "IN_MAINTENANCE" || unit.status === "OUT_OF_SERVICE" || unit.status === "DUE_SOON_MAINTENANCE") {
      throw new RentalLifecycleError("CONFLICT", "Equipment is not available for checkout", 409)
    }
    return { ...unit, nextStatus: EquipmentStatus.CHECKED_OUT }
  }

  if (targetStatus === "OVERDUE") {
    return { ...unit, nextStatus: EquipmentStatus.OVERDUE }
  }

  if (targetStatus === "APPROVED" || targetStatus === "RESERVED") {
    return { ...unit, nextStatus: EquipmentStatus.RESERVED }
  }

  return { ...unit, nextStatus: unit.status }
}

function releaseEquipmentIfNeeded(
  rentalId: string,
  equipmentUnitId: string | null,
) {
  if (!equipmentUnitId) return

  const equipment = db.prepare(
    "SELECT id, status FROM EquipmentUnit WHERE id = ?"
  ).get(equipmentUnitId) as { id: string; status: EquipmentStatus } | undefined

  if (!equipment) return

  if (MAINTENANCE_BLOCKING_EQUIPMENT_STATUSES.includes(equipment.status)) {
    return
  }

  const placeholders = OCCUPYING_RENTAL_STATUSES.map(() => "?").join(",")
  const row = db.prepare(
    `SELECT COUNT(*) as count FROM Rental WHERE id != ? AND equipmentUnitId = ? AND status IN (${placeholders})`
  ).get(rentalId, equipmentUnitId, ...OCCUPYING_RENTAL_STATUSES) as { count: number }

  if (row.count > 0) {
    return
  }

  db.prepare("UPDATE EquipmentUnit SET status = ? WHERE id = ?").run(EquipmentStatus.AVAILABLE, equipmentUnitId)
}

function getAuditEntry(status: RentalStatus, rejectionReason?: string): { action: AuditAction; message: string } {
  if (status === "APPROVED") return { action: "REQUEST_APPROVED", message: "Rental approved" }
  if (status === "REJECTED") return { action: "REQUEST_REJECTED", message: rejectionReason ?? "Rental rejected" }
  if (status === "CHECKED_OUT") return { action: "CHECKED_OUT", message: "Checked out" }
  if (status === "RETURNED") return { action: "RETURNED", message: "Returned" }
  if (status === "CANCELLED") return { action: "STATUS_CHANGED", message: "Rental cancelled" }
  if (status === "OVERDUE") return { action: "STATUS_CHANGED", message: "Rental overdue" }
  if (status === "RESERVED") return { action: "STATUS_CHANGED", message: "Rental reserved" }
  return { action: "STATUS_CHANGED", message: `Status changed to ${status}` }
}

export async function createRentalRequest(input: CreateRentalInput): Promise<ApiRental> {
  if (!input.equipmentId || !input.requestedByUserId || !input.startDate) {
    throw new RentalLifecycleError("INVALID_INPUT", "equipmentId, requestedBy, startDate are required", 400)
  }

  const requestedStart = new Date(input.startDate)
  const requestedEnd = new Date(input.endDate ?? input.startDate)
  if (Number.isNaN(requestedStart.getTime()) || Number.isNaN(requestedEnd.getTime()) || requestedEnd < requestedStart) {
    throw new RentalLifecycleError("INVALID_INPUT", "startDate/endDate are invalid", 400)
  }

  const user = db.prepare("SELECT id, name, email, role FROM User WHERE id = ?").get(input.requestedByUserId) as UserRow | undefined
  const equipment = db.prepare(
    "SELECT id, equipmentTypeId, locationId FROM EquipmentUnit WHERE id = ? AND isActive = 1"
  ).get(input.equipmentId) as { id: string; equipmentTypeId: string; locationId: string } | undefined

  if (!user) throw new RentalLifecycleError("NOT_FOUND", "User not found", 404)
  if (!equipment) throw new RentalLifecycleError("NOT_FOUND", "Equipment not found", 404)

  ensureRoleForAction(user, "REQUEST")

  const bookable = await assertEquipmentUnitBookable({
    equipmentUnitId: equipment.id,
    startDate: requestedStart,
    endDate: requestedEnd,
    locationId: equipment.locationId,
  })
  if (!bookable.ok) {
    throw new RentalLifecycleError("CONFLICT", bookable.message, bookable.statusCode)
  }

  const rentalId = generateId()
  const now = new Date().toISOString()

  const runTransaction = db.transaction(() => {
    db.prepare(`
      INSERT INTO Rental (id, equipmentUnitId, equipmentTypeId, requesterId, locationId,
        status, reason, requestedStart, requestedEnd, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      rentalId, equipment.id, equipment.equipmentTypeId, user.id, equipment.locationId,
      "PENDING", input.notes ?? "Rental requested",
      requestedStart.toISOString(), requestedEnd.toISOString(), now, now
    )

    db.prepare(`
      INSERT INTO AuditLog (id, action, actorId, rentalId, equipmentUnitId, message, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(generateId(), "REQUEST_SUBMITTED", user.id, rentalId, equipment.id, "Rental request submitted", now)
  })

  runTransaction()

  const loaded = loadRentalWithRelations(rentalId)
  if (!loaded) throw new RentalLifecycleError("NOT_FOUND", "Rental creation failed", 500)

  return toApiRental(loaded)
}

export async function transitionRentalStatus(input: TransitionRentalInput): Promise<ApiRental> {
  const targetStatus = parseRequestedStatus(input.requestedStatus)
  const actor = db.prepare("SELECT id, name, email, role FROM User WHERE id = ?").get(input.actorUserId) as UserRow | undefined
  if (!actor) throw new RentalLifecycleError("NOT_FOUND", "actorUserId is invalid", 404)

  const rental = db.prepare("SELECT * FROM Rental WHERE id = ?").get(input.rentalId) as RentalRow | undefined
  if (!rental) throw new RentalLifecycleError("NOT_FOUND", "Rental not found", 404)

  if (!canTransition(rental.status, targetStatus)) {
    throw new RentalLifecycleError("INVALID_TRANSITION", `Cannot transition from ${rental.status} to ${targetStatus}`, 409)
  }

  ensureRoleForAction(actor, toAction(targetStatus), rental)

  let equipmentUnitId = rental.equipmentUnitId
  let equipmentTypeId = rental.equipmentTypeId
  let locationId = rental.locationId

  if (targetStatus === "APPROVED" || targetStatus === "RESERVED" || targetStatus === "CHECKED_OUT" || targetStatus === "OVERDUE") {
    const unit = await resolveRequestedEquipment(
      {
        id: rental.id,
        equipmentUnitId: rental.equipmentUnitId,
        requestedStart: rental.requestedStart,
        requestedEnd: rental.requestedEnd,
        locationId: rental.locationId,
      },
      targetStatus,
      input.assignedEquipmentId,
    )
    equipmentUnitId = unit.id
    equipmentTypeId = unit.equipmentTypeId
    locationId = unit.locationId

    if (unit.status !== unit.nextStatus) {
      db.prepare("UPDATE EquipmentUnit SET status = ? WHERE id = ?").run(unit.nextStatus, unit.id)
    }
  }

  const now = new Date().toISOString()

  const runTransaction = db.transaction(() => {
    db.prepare(`
      UPDATE Rental SET
        status = ?, equipmentUnitId = ?, equipmentTypeId = ?, locationId = ?,
        approverId = ?, approvedStart = ?, approvedEnd = ?,
        checkedOutById = ?, checkedOutAt = ?,
        returnedById = ?, returnedAt = ?,
        rejectedReason = ?, updatedAt = ?
      WHERE id = ?
    `).run(
      targetStatus,
      equipmentUnitId ?? null,
      equipmentTypeId,
      locationId ?? null,
      targetStatus === "APPROVED" || targetStatus === "RESERVED" ? actor.id : rental.approverId,
      targetStatus === "APPROVED" || targetStatus === "RESERVED" ? rental.requestedStart : rental.approvedStart,
      targetStatus === "APPROVED" || targetStatus === "RESERVED" ? rental.requestedEnd : rental.approvedEnd,
      targetStatus === "CHECKED_OUT" ? actor.id : rental.checkedOutById,
      targetStatus === "CHECKED_OUT" ? now : rental.checkedOutAt,
      targetStatus === "RETURNED" ? actor.id : rental.returnedById,
      targetStatus === "RETURNED" ? now : rental.returnedAt,
      targetStatus === "REJECTED" ? input.rejectionReason ?? "Rejected" : null,
      now,
      rental.id,
    )

    if (targetStatus === "RETURNED" || targetStatus === "REJECTED" || targetStatus === "CANCELLED") {
      releaseEquipmentIfNeeded(rental.id, equipmentUnitId)
    }

    const audit = getAuditEntry(targetStatus, input.rejectionReason)
    db.prepare(`
      INSERT INTO AuditLog (id, action, actorId, rentalId, equipmentUnitId, message, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(generateId(), audit.action, actor.id, rental.id, equipmentUnitId, audit.message, now)
  })

  runTransaction()

  const loaded = loadRentalWithRelations(rental.id)
  if (!loaded) throw new RentalLifecycleError("NOT_FOUND", "Rental not found after update", 500)

  return toApiRental(loaded)
}
