import { RentalStatus } from "../db/enums"
import { Router } from "express"
import { mapPrismaRentalStatusToApi, toIsoDate, type ApiRentalStatus } from "../db/mappers"
import db from "../lib/db"
import {
  createRentalRequest,
  RentalLifecycleError,
  transitionRentalStatus,
} from "../services/rental-lifecycle.service"

const router = Router()

type ApiRental = {
  id: string
  equipmentId: string
  equipmentTypeId: string
  equipmentName: string
  requestedBy: string
  requestedByName: string
  status: ApiRentalStatus
  startDate: string
  endDate?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

type ApiRentalDetail = ApiRental & {
  timeline: Array<{ label: string; at: string }>
}

type RentalJoinRow = {
  id: string
  equipmentUnitId: string | null
  equipmentTypeId: string
  requesterId: string
  status: RentalStatus
  reason: string
  requestedStart: string
  requestedEnd: string
  createdAt: string
  updatedAt: string
  equipmentTypeName: string
  requesterName: string
}

function toApiRental(row: RentalJoinRow): ApiRental {
  return {
    id: row.id,
    equipmentId: row.equipmentUnitId ?? "",
    equipmentTypeId: row.equipmentTypeId,
    equipmentName: row.equipmentTypeName ?? "Equipment",
    requestedBy: row.requesterId,
    requestedByName: row.requesterName,
    status: mapPrismaRentalStatusToApi(row.status),
    startDate: toIsoDate(row.requestedStart) ?? "",
    endDate: toIsoDate(row.requestedEnd),
    notes: row.reason,
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
  }
}

function statusFilterToSql(status?: ApiRentalStatus): { clause: string; params: string[] } {
  if (!status) return { clause: "", params: [] }

  if (status === "pending") {
    return { clause: "AND r.status = ?", params: [RentalStatus.PENDING] }
  }

  if (status === "approved") {
    return { clause: "AND r.status IN (?, ?)", params: [RentalStatus.APPROVED, RentalStatus.RESERVED] }
  }

  if (status === "active") {
    return { clause: "AND r.status IN (?, ?)", params: [RentalStatus.CHECKED_OUT, RentalStatus.OVERDUE] }
  }

  if (status === "returned") {
    return { clause: "AND r.status = ?", params: [RentalStatus.RETURNED] }
  }

  return { clause: "AND r.status IN (?, ?)", params: [RentalStatus.REJECTED, RentalStatus.CANCELLED] }
}

router.get("/", async (req, res) => {
  const status = typeof req.query.status === "string" ? (req.query.status as ApiRentalStatus) : undefined
  const requestedBy = typeof req.query.requestedBy === "string" ? req.query.requestedBy : undefined

  const { clause: statusClause, params: statusParams } = statusFilterToSql(status)
  const conditions = ["1=1", statusClause]
  const params: unknown[] = [...statusParams]

  if (requestedBy) {
    conditions.push("AND r.requesterId = ?")
    params.push(requestedBy)
  }

  const rows = db.prepare(`
    SELECT r.id, r.equipmentUnitId, r.equipmentTypeId, r.requesterId, r.status,
           r.reason, r.requestedStart, r.requestedEnd, r.createdAt, r.updatedAt,
           COALESCE(et_unit.name, et.name) AS equipmentTypeName,
           u.name AS requesterName
    FROM Rental r
    LEFT JOIN EquipmentUnit eu ON r.equipmentUnitId = eu.id
    LEFT JOIN EquipmentType et_unit ON eu.equipmentTypeId = et_unit.id
    JOIN EquipmentType et ON r.equipmentTypeId = et.id
    JOIN User u ON r.requesterId = u.id
    WHERE ${conditions.join(" ")}
    ORDER BY r.createdAt DESC
  `).all(...params) as RentalJoinRow[]

  res.json(rows.map(toApiRental))
})

router.get("/:id", async (req, res) => {
  const row = db.prepare(`
    SELECT r.id, r.equipmentUnitId, r.equipmentTypeId, r.requesterId, r.status,
           r.reason, r.requestedStart, r.requestedEnd, r.createdAt, r.updatedAt,
           COALESCE(et_unit.name, et.name) AS equipmentTypeName,
           u.name AS requesterName
    FROM Rental r
    LEFT JOIN EquipmentUnit eu ON r.equipmentUnitId = eu.id
    LEFT JOIN EquipmentType et_unit ON eu.equipmentTypeId = et_unit.id
    JOIN EquipmentType et ON r.equipmentTypeId = et.id
    JOIN User u ON r.requesterId = u.id
    WHERE r.id = ?
  `).get(req.params.id) as RentalJoinRow | undefined

  if (!row) {
    res.status(404).json({ message: "Rental not found" })
    return
  }

  const timeline = db.prepare(
    "SELECT message, createdAt FROM AuditLog WHERE rentalId = ? ORDER BY createdAt ASC"
  ).all(row.id) as { message: string; createdAt: string }[]

  const detail: ApiRentalDetail = {
    ...toApiRental(row),
    timeline: timeline.map((item) => ({
      label: item.message,
      at: new Date(item.createdAt).toISOString(),
    })),
  }

  res.json(detail)
})

router.post("/", async (req, res) => {
  const equipmentId = req.body?.equipmentId as string | undefined
  const requestedBy = req.body?.requestedBy as string | undefined
  const startDate = req.body?.startDate as string | undefined
  const endDate = req.body?.endDate as string | undefined
  const notes = req.body?.notes as string | undefined

  try {
    const rental = await createRentalRequest({
      equipmentId: equipmentId ?? "",
      requestedByUserId: requestedBy ?? "",
      startDate: startDate ?? "",
      endDate,
      notes,
    })
    res.status(201).json(rental)
  } catch (error) {
    if (error instanceof RentalLifecycleError) {
      res.status(error.statusCode).json({ message: error.message })
      return
    }
    throw error
  }
})

router.patch("/:id/status", async (req, res) => {
  const requestedStatus = req.body?.status as string | undefined
  const actorUserId = (req.body?.actorUserId as string | undefined)
    ?? (req.headers["x-user-id"] as string | undefined)
    ?? ((req as any).user?.id as string | undefined)
  const assignedEquipmentId = req.body?.assignedEquipmentId as string | undefined
  const rejectionReason = req.body?.rejectionReason as string | undefined

  if (!requestedStatus || !actorUserId) {
    res.status(400).json({ message: "status and actorUserId are required" })
    return
  }

  try {
    const rental = await transitionRentalStatus({
      rentalId: req.params.id,
      requestedStatus: requestedStatus as Parameters<typeof transitionRentalStatus>[0]["requestedStatus"],
      actorUserId,
      assignedEquipmentId,
      rejectionReason,
    })
    res.json(rental)
  } catch (error) {
    if (error instanceof RentalLifecycleError) {
      res.status(error.statusCode).json({ message: error.message })
      return
    }
    throw error
  }
})

export default router
