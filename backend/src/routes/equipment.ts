import { randomUUID } from "crypto"
import { Router } from "express"
import type { EquipmentStatus as EquipmentStatusType } from "../db/enums"
import {
  mapApiEquipmentStatusToPrisma,
  mapAuditActionToActivityType,
  mapPrismaEquipmentStatusToApi,
  toIsoDate,
  type ApiEquipmentStatus,
} from "../db/mappers"
import db, { generateId } from "../lib/db"
import { requireRole } from "../middleware/requireRole"
import { markServiced } from "../services/maintenance.service"
import type { AuditAction } from "../db/enums"

const router = Router()

type ApiEquipment = {
  id: string
  name: string
  category: string
  status: ApiEquipmentStatus
  qrCode: string
  lastServiceDate: string
  maintenanceIntervalDays?: number
  nextServiceDueDate?: string
  notes?: string
  assignedToUserId?: string
  assignedToName?: string
}

type ServiceLogEntry = {
  id: string
  equipmentId: string
  date: string
  note: string
  performedByUserId: string
}

type UnitJoinRow = {
  id: string
  assetTag: string
  status: EquipmentStatusType
  lastMaintenanceAt: string | null
  nextMaintenanceDue: string | null
  notesSummary: string | null
  equipmentTypeId: string
  typeName: string
  categoryName: string
  defaultMaintenanceDays: number | null
  assignedToUserId: string | null
  assignedToName: string | null
}

function slugifyCode(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 32)
}

function toApiEquipment(unit: UnitJoinRow): ApiEquipment {
  return {
    id: unit.id,
    name: unit.typeName,
    category: unit.categoryName,
    status: mapPrismaEquipmentStatusToApi(unit.status),
    qrCode: unit.assetTag,
    lastServiceDate: toIsoDate(unit.lastMaintenanceAt) ?? "",
    maintenanceIntervalDays: unit.defaultMaintenanceDays ?? undefined,
    nextServiceDueDate: toIsoDate(unit.nextMaintenanceDue),
    notes: unit.notesSummary ?? undefined,
    assignedToUserId: unit.assignedToUserId ?? undefined,
    assignedToName: unit.assignedToName ?? undefined,
  }
}

const UNIT_JOIN_SQL = `
  SELECT eu.id, eu.assetTag, eu.status, eu.lastMaintenanceAt, eu.nextMaintenanceDue,
         eu.notesSummary, eu.equipmentTypeId, eu.assignedToUserId,
         et.name AS typeName, ec.name AS categoryName, et.defaultMaintenanceDays,
         au.name AS assignedToName
  FROM EquipmentUnit eu
  JOIN EquipmentType et ON eu.equipmentTypeId = et.id
  JOIN EquipmentCategory ec ON et.categoryId = ec.id
  LEFT JOIN User au ON eu.assignedToUserId = au.id
`

function ensureUserExists(userId: string) {
  return db.prepare("SELECT id FROM User WHERE id = ?").get(userId) as { id: string } | undefined
}

router.get("/alerts/maintenance", async (_req, res) => {
  const today = new Date()
  const nextWeek = new Date(today)
  nextWeek.setDate(nextWeek.getDate() + 7)

  const units = db.prepare(`
    ${UNIT_JOIN_SQL}
    WHERE eu.isActive = 1 AND eu.nextMaintenanceDue IS NOT NULL AND eu.nextMaintenanceDue <= ?
    ORDER BY eu.nextMaintenanceDue ASC
  `).all(nextWeek.toISOString()) as UnitJoinRow[]

  res.json({
    count: units.length,
    equipment: units.map(toApiEquipment),
  })
})

router.get("/", async (req, res) => {
  const search = typeof req.query.search === "string" ? req.query.search.trim() : ""
  const status = typeof req.query.status === "string" ? (req.query.status as ApiEquipmentStatus) : undefined
  const category = typeof req.query.category === "string" ? req.query.category.trim() : undefined

  const conditions: string[] = ["eu.isActive = 1"]
  const params: unknown[] = []

  if (status) {
    if (status === "available") {
      conditions.push("eu.status IN ('AVAILABLE')")
    } else if (status === "in_use") {
      conditions.push("eu.status IN ('RESERVED', 'CHECKED_OUT', 'OVERDUE')")
    } else {
      conditions.push("eu.status IN ('DUE_SOON_MAINTENANCE', 'IN_MAINTENANCE', 'OUT_OF_SERVICE')")
    }
  }

  if (category) {
    conditions.push("ec.name = ?")
    params.push(category)
  }

  if (search) {
    conditions.push("(eu.assetTag LIKE ? OR et.name LIKE ?)")
    params.push(`%${search}%`, `%${search}%`)
  }

  const units = db.prepare(`
    ${UNIT_JOIN_SQL}
    WHERE ${conditions.join(" AND ")}
    ORDER BY eu.createdAt DESC
  `).all(...params) as UnitJoinRow[]

  res.json(units.map(toApiEquipment))
})

router.get("/:id", async (req, res) => {
  const item = db.prepare(`
    ${UNIT_JOIN_SQL}
    WHERE eu.id = ? AND eu.isActive = 1
  `).get(req.params.id) as UnitJoinRow | undefined

  if (!item) {
    res.status(404).json({ message: "Equipment not found" })
    return
  }

  res.json(toApiEquipment(item))
})

router.post("/", requireRole("admin"), async (req, res) => {
  const body = req.body as Partial<ApiEquipment>

  if (!body.name || !body.category || !body.qrCode || !body.status) {
    res.status(400).json({ message: "name, category, qrCode, and status are required" })
    return
  }

  const categoryName = body.category.trim()
  const categoryCode = slugifyCode(categoryName)
  const typeName = body.name.trim()
  const typeCode = slugifyCode(typeName)
  const qrCode = body.qrCode
  const nextStatus = body.status

  const createdEquipmentId = generateId()

  const runTransaction = db.transaction(() => {
    let cat = db.prepare("SELECT id FROM EquipmentCategory WHERE code = ?").get(categoryCode) as { id: string } | undefined
    if (cat) {
      db.prepare("UPDATE EquipmentCategory SET name = ? WHERE code = ?").run(categoryName, categoryCode)
    } else {
      const catId = generateId()
      db.prepare("INSERT INTO EquipmentCategory (id, name, code) VALUES (?, ?, ?)").run(catId, categoryName, categoryCode)
      cat = { id: catId }
    }

    let eType = db.prepare("SELECT id FROM EquipmentType WHERE code = ?").get(typeCode) as { id: string } | undefined
    if (eType) {
      db.prepare("UPDATE EquipmentType SET name = ?, categoryId = ?, defaultMaintenanceDays = ? WHERE code = ?")
        .run(typeName, cat.id, body.maintenanceIntervalDays ?? null, typeCode)
    } else {
      const typeId = generateId()
      db.prepare(`
        INSERT INTO EquipmentType (id, name, code, categoryId, defaultMaintenanceDays)
        VALUES (?, ?, ?, ?, ?)
      `).run(typeId, typeName, typeCode, cat.id, body.maintenanceIntervalDays ?? null)
      eType = { id: typeId }
    }

    const defaultLocation = db.prepare("SELECT id FROM Location ORDER BY createdAt ASC LIMIT 1").get() as { id: string } | undefined
    if (!defaultLocation) {
      throw new Error("No location exists. Seed database first.")
    }

    db.prepare(`
      INSERT INTO EquipmentUnit (id, assetTag, serialNumber, equipmentTypeId, locationId, status, lastMaintenanceAt, nextMaintenanceDue, notesSummary)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      createdEquipmentId,
      qrCode,
      `SN-${randomUUID().slice(0, 8).toUpperCase()}`,
      eType.id,
      defaultLocation.id,
      mapApiEquipmentStatusToPrisma(nextStatus),
      body.lastServiceDate ? new Date(body.lastServiceDate).toISOString() : null,
      body.nextServiceDueDate ? new Date(body.nextServiceDueDate).toISOString() : null,
      body.notes ?? null,
    )
  })

  runTransaction()

  const equipment = db.prepare(`
    ${UNIT_JOIN_SQL} WHERE eu.id = ?
  `).get(createdEquipmentId) as UnitJoinRow | undefined

  if (!equipment) {
    res.status(500).json({ message: "Failed to create equipment" })
    return
  }

  res.status(201).json(toApiEquipment(equipment))
})

router.put("/:id", requireRole("admin"), async (req, res) => {
  const existing = db.prepare(`
    ${UNIT_JOIN_SQL} WHERE eu.id = ? AND eu.isActive = 1
  `).get(req.params.id) as UnitJoinRow | undefined

  if (!existing) {
    res.status(404).json({ message: "Equipment not found" })
    return
  }

  const body = req.body as Partial<ApiEquipment>

  let equipmentTypeId = existing.equipmentTypeId
  if (body.name || body.category || body.maintenanceIntervalDays !== undefined) {
    const categoryName = (body.category ?? existing.categoryName).trim()
    const categoryCode = slugifyCode(categoryName)
    const typeName = (body.name ?? existing.typeName).trim()
    const typeCode = slugifyCode(typeName)

    let cat = db.prepare("SELECT id FROM EquipmentCategory WHERE code = ?").get(categoryCode) as { id: string } | undefined
    if (cat) {
      db.prepare("UPDATE EquipmentCategory SET name = ? WHERE code = ?").run(categoryName, categoryCode)
    } else {
      const catId = generateId()
      db.prepare("INSERT INTO EquipmentCategory (id, name, code) VALUES (?, ?, ?)").run(catId, categoryName, categoryCode)
      cat = { id: catId }
    }

    let eType = db.prepare("SELECT id, defaultMaintenanceDays FROM EquipmentType WHERE code = ?").get(typeCode) as
      { id: string; defaultMaintenanceDays: number | null } | undefined
    if (eType) {
      db.prepare("UPDATE EquipmentType SET name = ?, categoryId = ?, defaultMaintenanceDays = ? WHERE code = ?")
        .run(typeName, cat.id, body.maintenanceIntervalDays ?? eType.defaultMaintenanceDays, typeCode)
    } else {
      const typeId = generateId()
      db.prepare(`
        INSERT INTO EquipmentType (id, name, code, categoryId, defaultMaintenanceDays)
        VALUES (?, ?, ?, ?, ?)
      `).run(typeId, typeName, typeCode, cat.id, body.maintenanceIntervalDays ?? null)
      eType = { id: typeId, defaultMaintenanceDays: body.maintenanceIntervalDays ?? null }
    }

    equipmentTypeId = eType.id
  }

  const sets: string[] = ["equipmentTypeId = ?"]
  const params: unknown[] = [equipmentTypeId]

  if (body.status) {
    sets.push("status = ?")
    params.push(mapApiEquipmentStatusToPrisma(body.status))
  }
  if (body.qrCode !== undefined) {
    sets.push("assetTag = ?")
    params.push(body.qrCode)
  }

  sets.push("lastMaintenanceAt = ?")
  params.push(body.lastServiceDate
    ? new Date(body.lastServiceDate).toISOString()
    : existing.lastMaintenanceAt)

  if (body.nextServiceDueDate !== undefined) {
    sets.push("nextMaintenanceDue = ?")
    params.push(body.nextServiceDueDate ? new Date(body.nextServiceDueDate).toISOString() : null)
  } else {
    sets.push("nextMaintenanceDue = ?")
    params.push(existing.nextMaintenanceDue)
  }

  sets.push("notesSummary = ?")
  params.push(body.notes ?? existing.notesSummary)

  params.push(existing.id)
  db.prepare(`UPDATE EquipmentUnit SET ${sets.join(", ")} WHERE id = ?`).run(...params)

  const item = db.prepare(`${UNIT_JOIN_SQL} WHERE eu.id = ?`).get(existing.id) as UnitJoinRow

  res.json(toApiEquipment(item))
})

router.delete("/:id", requireRole("admin"), async (req, res) => {
  const item = db.prepare("SELECT id, isActive FROM EquipmentUnit WHERE id = ?").get(req.params.id) as
    { id: string; isActive: number } | undefined

  if (!item || !item.isActive) {
    res.status(404).json({ message: "Equipment not found" })
    return
  }

  db.prepare("UPDATE EquipmentUnit SET isActive = 0 WHERE id = ?").run(item.id)
  res.status(204).end()
})

router.patch("/:id/status", requireRole("admin", "maintenance"), async (req, res) => {
  const item = db.prepare("SELECT id FROM EquipmentUnit WHERE id = ? AND isActive = 1").get(req.params.id) as
    { id: string } | undefined

  if (!item) {
    res.status(404).json({ message: "Equipment not found" })
    return
  }

  const status = req.body?.status as ApiEquipmentStatus | undefined
  const actorUserId = req.body?.actorUserId as string | undefined

  if (!status || !actorUserId) {
    res.status(400).json({ message: "status and actorUserId are required" })
    return
  }

  const actor = ensureUserExists(actorUserId)
  if (!actor) {
    res.status(400).json({ message: "actorUserId is required" })
    return
  }

  const now = new Date().toISOString()

  const runTransaction = db.transaction(() => {
    db.prepare("UPDATE EquipmentUnit SET status = ? WHERE id = ?")
      .run(mapApiEquipmentStatusToPrisma(status), item.id)

    db.prepare(`
      INSERT INTO AuditLog (id, action, actorId, equipmentUnitId, message, createdAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(generateId(), "STATUS_CHANGED", actor.id, item.id, `Status changed to ${status}`, now)
  })

  runTransaction()

  const updated = db.prepare(`${UNIT_JOIN_SQL} WHERE eu.id = ?`).get(item.id) as UnitJoinRow

  res.json(toApiEquipment(updated))
})

router.post("/:id/report-issue", requireRole("field", "maintenance", "admin"), async (req, res) => {
  const item = db.prepare(`${UNIT_JOIN_SQL} WHERE eu.id = ? AND eu.isActive = 1`).get(req.params.id) as UnitJoinRow | undefined

  if (!item) {
    res.status(404).json({ message: "Equipment not found" })
    return
  }

  const { severity, description, actorUserId, title } = req.body as {
    severity: string
    description: string
    actorUserId: string
    title?: string
  }

  if (!severity || !description || !actorUserId) {
    res.status(400).json({ message: "severity, description, and actorUserId are required" })
    return
  }

  const actor = ensureUserExists(actorUserId)
  if (!actor) {
    res.status(400).json({ message: "Invalid actorUserId" })
    return
  }

  const issueId = generateId()
  const now = new Date().toISOString()

  db.prepare(`
    INSERT INTO IssueReport (id, equipmentUnitId, reportedById, title, description, severity, status, reportedAt)
    VALUES (?, ?, ?, ?, ?, ?, 'OPEN', ?)
  `).run(issueId, item.id, actor.id, title || `Issue reported: ${severity.toUpperCase()}`,
    description, severity.toUpperCase(), now)

  let updatedUnit = item
  if (severity.toUpperCase() === "HIGH" || severity.toUpperCase() === "CRITICAL") {
    db.prepare("UPDATE EquipmentUnit SET status = 'OUT_OF_SERVICE' WHERE id = ?").run(item.id)
    db.prepare(`
      INSERT INTO AuditLog (id, action, actorId, equipmentUnitId, message, createdAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(generateId(), "STATUS_CHANGED", actor.id, item.id,
      "Status changed to OUT_OF_SERVICE due to high severity issue", now)
    updatedUnit = db.prepare(`${UNIT_JOIN_SQL} WHERE eu.id = ?`).get(item.id) as UnitJoinRow
  }

  db.prepare(`
    INSERT INTO AuditLog (id, action, actorId, equipmentUnitId, issueReportId, message, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(generateId(), "ISSUE_REPORTED", actor.id, item.id, issueId,
    `Issue reported [${severity.toUpperCase()}]: ${description}`, now)

  const issue = db.prepare("SELECT * FROM IssueReport WHERE id = ?").get(issueId)

  res.status(201).json({ issue, equipment: toApiEquipment(updatedUnit) })
})

router.post("/:id/checkout", async (req, res) => {
  const item = db.prepare(`${UNIT_JOIN_SQL} WHERE eu.id = ? AND eu.isActive = 1`).get(req.params.id) as UnitJoinRow | undefined

  if (!item) {
    res.status(404).json({ message: "Equipment not found" })
    return
  }

  if (item.status === "IN_MAINTENANCE" || item.status === "OUT_OF_SERVICE" || item.status === "DUE_SOON_MAINTENANCE") {
    res.status(400).json({ message: "Equipment is under maintenance and cannot be checked out" })
    return
  }

  if (item.status === "RESERVED" || item.status === "CHECKED_OUT") {
    res.status(409).json({ message: "Equipment is already reserved or checked out via the rental system. Use the rental workflow to check it out." })
    return
  }

  if (item.nextMaintenanceDue && new Date(item.nextMaintenanceDue) <= new Date()) {
    res.status(400).json({ message: "Equipment service overdue. Maintenance required." })
    return
  }

  const actorUserId = req.body?.actorUserId as string | undefined
  if (!actorUserId) {
    res.status(400).json({ message: "actorUserId is required" })
    return
  }

  const actor = ensureUserExists(actorUserId)
  if (!actor) {
    res.status(400).json({ message: "actorUserId is required" })
    return
  }

  const now = new Date().toISOString()

  const runTransaction = db.transaction(() => {
    db.prepare("UPDATE EquipmentUnit SET status = 'CHECKED_OUT', assignedToUserId = ? WHERE id = ?")
      .run(actor.id, item.id)

    db.prepare(`
      INSERT INTO AuditLog (id, action, actorId, equipmentUnitId, message, createdAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(generateId(), "CHECKED_OUT", actor.id, item.id, "Checked out", now)
  })

  runTransaction()

  const updated = db.prepare(`${UNIT_JOIN_SQL} WHERE eu.id = ?`).get(item.id) as UnitJoinRow

  res.json(toApiEquipment(updated))
})

router.post("/:id/checkin", async (req, res) => {
  const item = db.prepare(`${UNIT_JOIN_SQL} WHERE eu.id = ? AND eu.isActive = 1`).get(req.params.id) as UnitJoinRow | undefined

  if (!item) {
    res.status(404).json({ message: "Equipment not found" })
    return
  }

  const actorUserId = req.body?.actorUserId as string | undefined
  if (!actorUserId) {
    res.status(400).json({ message: "actorUserId is required" })
    return
  }

  const actor = ensureUserExists(actorUserId)
  if (!actor) {
    res.status(400).json({ message: "actorUserId is required" })
    return
  }

  const now = new Date().toISOString()

  const runTransaction = db.transaction(() => {
    db.prepare("UPDATE EquipmentUnit SET status = 'AVAILABLE', assignedToUserId = NULL WHERE id = ?").run(item.id)

    db.prepare(`
      INSERT INTO AuditLog (id, action, actorId, equipmentUnitId, message, createdAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(generateId(), "RETURNED", actor.id, item.id, "Checked in", now)
  })

  runTransaction()

  const updated = db.prepare(`${UNIT_JOIN_SQL} WHERE eu.id = ?`).get(item.id) as UnitJoinRow

  res.json(toApiEquipment(updated))
})

// Assign (or unassign) a field worker to a piece of equipment
router.patch("/:id/assign", requireRole("admin"), async (req, res) => {
  const item = db.prepare("SELECT id, status FROM EquipmentUnit WHERE id = ? AND isActive = 1").get(req.params.id) as
    { id: string; status: EquipmentStatusType } | undefined

  if (!item) {
    res.status(404).json({ message: "Equipment not found" })
    return
  }

  const { assignedToUserId, actorUserId } = req.body as {
    assignedToUserId: string | null
    actorUserId: string
  }

  if (!actorUserId) {
    res.status(400).json({ message: "actorUserId is required" })
    return
  }

  const actor = ensureUserExists(actorUserId)
  if (!actor) {
    res.status(400).json({ message: "Invalid actorUserId" })
    return
  }

  // If assigning, validate the target user exists
  if (assignedToUserId) {
    const target = db.prepare("SELECT id, name FROM User WHERE id = ?").get(assignedToUserId) as
      { id: string; name: string } | undefined
    if (!target) {
      res.status(400).json({ message: "Assigned user not found" })
      return
    }
  }

  const now = new Date().toISOString()

  db.transaction(() => {
    // Determine new status when assigning/unassigning
    // Field-use statuses: CHECKED_OUT / RESERVED / OVERDUE
    // Maintenance statuses: IN_MAINTENANCE / DUE_SOON_MAINTENANCE / OUT_OF_SERVICE
    // Only touch status when assigning to/from AVAILABLE
    let newStatus: string = item.status
    if (assignedToUserId && item.status === "AVAILABLE") newStatus = "CHECKED_OUT"
    if (!assignedToUserId && (item.status === "CHECKED_OUT" || item.status === "RESERVED" || item.status === "OVERDUE")) newStatus = "AVAILABLE"

    db.prepare("UPDATE EquipmentUnit SET assignedToUserId = ?, status = ? WHERE id = ?")
      .run(assignedToUserId ?? null, newStatus, item.id)

    const logMsg = assignedToUserId
      ? `Assigned to worker (id: ${assignedToUserId})`
      : "Assignment cleared — equipment returned to available pool"

    db.prepare(`
      INSERT INTO AuditLog (id, action, actorId, equipmentUnitId, message, createdAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(generateId(), "STATUS_CHANGED", actorUserId, item.id, logMsg, now)
  })()

  const updated = db.prepare(`${UNIT_JOIN_SQL} WHERE eu.id = ?`).get(item.id) as UnitJoinRow
  res.json(toApiEquipment(updated))
})

router.post("/:id/mark-serviced", requireRole("maintenance", "admin"), async (req, res) => {
  const performedByUserId = req.body?.performedByUserId as string | undefined
  const nextServiceDueDate = req.body?.nextServiceDueDate as string | undefined

  if (!performedByUserId) {
    res.status(400).json({ message: "performedByUserId is required" })
    return
  }

  const result = await markServiced(req.params.id, performedByUserId, nextServiceDueDate)

  if (result === null) {
    res.status(404).json({ message: "Equipment not found" })
    return
  }

  if (result === undefined) {
    res.status(400).json({ message: "performedByUserId is invalid" })
    return
  }

  const unit = db.prepare(`${UNIT_JOIN_SQL} WHERE eu.id = ?`).get(req.params.id) as UnitJoinRow
  res.json(toApiEquipment(unit))
})

router.get("/:id/service-logs", async (req, res) => {
  const item = db.prepare("SELECT id FROM EquipmentUnit WHERE id = ? AND isActive = 1").get(req.params.id) as { id: string } | undefined

  if (!item) {
    res.status(404).json({ message: "Equipment not found" })
    return
  }

  const logs = db.prepare(`
    SELECT id, equipmentUnitId, completedAt, createdAt, description, technicianId
    FROM MaintenanceRecord
    WHERE equipmentUnitId = ?
    ORDER BY createdAt DESC
  `).all(item.id) as {
    id: string; equipmentUnitId: string; completedAt: string | null;
    createdAt: string; description: string | null; technicianId: string | null
  }[]

  const data: ServiceLogEntry[] = logs.map((entry) => ({
    id: entry.id,
    equipmentId: entry.equipmentUnitId,
    date: toIsoDate(entry.completedAt ?? entry.createdAt) ?? "",
    note: entry.description ?? "Maintenance entry",
    performedByUserId: entry.technicianId ?? "",
  }))

  res.json(data)
})

router.post("/:id/service-logs", requireRole("maintenance", "admin"), async (req, res) => {
  const item = db.prepare("SELECT id FROM EquipmentUnit WHERE id = ? AND isActive = 1").get(req.params.id) as { id: string } | undefined

  if (!item) {
    res.status(404).json({ message: "Equipment not found" })
    return
  }

  const date = req.body?.date as string | undefined
  const note = req.body?.note as string | undefined
  const performedByUserId = req.body?.performedByUserId as string | undefined

  if (!date || !note || !performedByUserId) {
    res.status(400).json({ message: "date, note, performedByUserId are required" })
    return
  }

  const performer = ensureUserExists(performedByUserId)
  if (!performer) {
    res.status(400).json({ message: "performedByUserId is required" })
    return
  }

  const completedAt = new Date(date).toISOString()
  const recordId = generateId()
  const now = new Date().toISOString()

  const runTransaction = db.transaction(() => {
    db.prepare(`
      INSERT INTO MaintenanceRecord (id, equipmentUnitId, technicianId, status, trigger, title, description, completedAt, createdAt, updatedAt)
      VALUES (?, ?, ?, 'COMPLETED', 'ROUTINE', 'Service log', ?, ?, ?, ?)
    `).run(recordId, item.id, performer.id, note, completedAt, now, now)

    db.prepare(`
      INSERT INTO AuditLog (id, action, actorId, equipmentUnitId, message, createdAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(generateId(), "MAINTENANCE_COMPLETED", performer.id, item.id, note, now)
  })

  runTransaction()

  const entry = db.prepare(
    "SELECT id, equipmentUnitId, completedAt, description, technicianId FROM MaintenanceRecord WHERE id = ?"
  ).get(recordId) as { id: string; equipmentUnitId: string; completedAt: string | null; description: string | null; technicianId: string | null }

  res.status(201).json({
    id: entry.id,
    equipmentId: entry.equipmentUnitId,
    date: toIsoDate(entry.completedAt) ?? date,
    note: entry.description ?? note,
    performedByUserId: entry.technicianId ?? performedByUserId,
  })
})

router.post("/:id/notes", async (req, res) => {
  const item = db.prepare("SELECT id FROM EquipmentUnit WHERE id = ? AND isActive = 1").get(req.params.id) as { id: string } | undefined

  if (!item) {
    res.status(404).json({ message: "Equipment not found" })
    return
  }

  const { note, authorId } = req.body as { note: string; authorId: string }

  if (!note || !authorId) {
    res.status(400).json({ message: "note and authorId are required" })
    return
  }

  const author = ensureUserExists(authorId)
  if (!author) {
    res.status(400).json({ message: "Invalid authorId" })
    return
  }

  const now = new Date().toISOString()
  const noteId = generateId()

  const runTransaction = db.transaction(() => {
    db.prepare(`
      INSERT INTO Note (id, body, authorId, targetType, equipmentUnitId, createdAt)
      VALUES (?, ?, ?, 'EQUIPMENT_UNIT', ?, ?)
    `).run(noteId, note, author.id, item.id, now)

    db.prepare(`
      INSERT INTO AuditLog (id, action, actorId, equipmentUnitId, noteId, message, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(generateId(), "NOTE_ADDED", author.id, item.id, noteId,
      `Field Note: ${note.length > 50 ? note.slice(0, 47) + "..." : note}`, now)
  })

  runTransaction()

  res.status(201).json({ message: "Note added successfully" })
})

router.delete("/:id/service-logs", requireRole("admin"), async (req, res) => {
  const item = db.prepare("SELECT id FROM EquipmentUnit WHERE id = ? AND isActive = 1").get(req.params.id) as { id: string } | undefined
  if (!item) { res.status(404).json({ message: "Equipment not found" }); return }

  db.prepare("DELETE FROM MaintenanceRecord WHERE equipmentUnitId = ?").run(item.id)
  res.status(204).end()
})

router.delete("/:id/activity", requireRole("admin"), async (req, res) => {
  const item = db.prepare("SELECT id FROM EquipmentUnit WHERE id = ? AND isActive = 1").get(req.params.id) as { id: string } | undefined
  if (!item) { res.status(404).json({ message: "Equipment not found" }); return }

  db.prepare("DELETE FROM AuditLog WHERE equipmentUnitId = ?").run(item.id)
  res.status(204).end()
})

router.delete("/:id/tech-notes", requireRole("admin"), async (req, res) => {
  const item = db.prepare("SELECT id FROM EquipmentUnit WHERE id = ? AND isActive = 1").get(req.params.id) as { id: string } | undefined
  if (!item) { res.status(404).json({ message: "Equipment not found" }); return }

  db.prepare(`
    DELETE FROM Note WHERE equipmentUnitId = ? AND authorId IN (
      SELECT id FROM User WHERE role IN ('MAINTENANCE', 'ADMIN')
    )
  `).run(item.id)
  res.status(204).end()
})

router.get("/:id/activity", async (req, res) => {
  const item = db.prepare("SELECT id FROM EquipmentUnit WHERE id = ? AND isActive = 1").get(req.params.id) as { id: string } | undefined

  if (!item) {
    res.status(404).json({ message: "Equipment not found" })
    return
  }

  const limit = typeof req.query.limit === "string" ? Number(req.query.limit) : 10

  const logs = db.prepare(`
    SELECT id, equipmentUnitId, action, createdAt, actorId, message
    FROM AuditLog
    WHERE equipmentUnitId = ?
    ORDER BY createdAt DESC
    LIMIT ?
  `).all(item.id, Number.isFinite(limit) ? limit : 10) as {
    id: string; equipmentUnitId: string | null; action: AuditAction;
    createdAt: string; actorId: string | null; message: string
  }[]

  res.json(
    logs.map((a) => ({
      id: a.id,
      equipmentId: a.equipmentUnitId ?? item.id,
      type: mapAuditActionToActivityType(a.action),
      timestamp: new Date(a.createdAt).toISOString(),
      actorUserId: a.actorId ?? "",
      summary: a.message,
    })),
  )
})

export default router
