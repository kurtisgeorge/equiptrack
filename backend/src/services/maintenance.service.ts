import { IssueSeverity, IssueStatus, NoteTargetType } from "../db/enums"
import type { EquipmentStatus, UserRole } from "../db/enums"
import { mapPrismaEquipmentStatusToApi, toIsoDate } from "../db/mappers"
import db, { generateId } from "../lib/db"

type QueueItem = {
  id: string
  name: string
  category: string
  status: ReturnType<typeof mapPrismaEquipmentStatusToApi>
  qrCode: string
  lastServiceDate: string
  maintenanceIntervalDays?: number
  nextServiceDueDate?: string
  notes?: string
  severity?: IssueSeverity
}

type IssuePayload = {
  equipmentId: string
  reportedByUserId: string
  title: string
  description: string
  severity: IssueSeverity
}

type NotePayload = {
  authorId: string
  body: string
  targetType: NoteTargetType
  equipmentUnitId?: string
  rentalId?: string
  maintenanceRecordId?: string
  issueReportId?: string
}

function validateNoteTarget(payload: NotePayload): boolean {
  if (payload.targetType === "EQUIPMENT_UNIT") {
    if (!payload.equipmentUnitId) return false
    const item = db.prepare("SELECT id FROM EquipmentUnit WHERE id = ?").get(payload.equipmentUnitId)
    return Boolean(item)
  }

  if (payload.targetType === "RENTAL") {
    if (!payload.rentalId) return false
    const item = db.prepare("SELECT id FROM Rental WHERE id = ?").get(payload.rentalId)
    return Boolean(item)
  }

  if (payload.targetType === "MAINTENANCE_RECORD") {
    if (!payload.maintenanceRecordId) return false
    const item = db.prepare("SELECT id FROM MaintenanceRecord WHERE id = ?").get(payload.maintenanceRecordId)
    return Boolean(item)
  }

  if (!payload.issueReportId) return false
  const item = db.prepare("SELECT id FROM IssueReport WHERE id = ?").get(payload.issueReportId)
  return Boolean(item)
}

type UnitQueueRow = {
  id: string
  assetTag: string
  status: EquipmentStatus
  lastMaintenanceAt: string | null
  nextMaintenanceDue: string | null
  notesSummary: string | null
  typeName: string
  categoryName: string
  defaultMaintenanceDays: number | null
  severityRank: number | null
}

export async function getMaintenanceQueue(days: number): Promise<QueueItem[]> {
  const today = new Date()
  const cutoff = new Date(today)
  cutoff.setDate(cutoff.getDate() + days)

  const rows = db.prepare(`
    SELECT eu.id, eu.assetTag, eu.status, eu.lastMaintenanceAt, eu.nextMaintenanceDue,
           eu.notesSummary, et.name AS typeName, ec.name AS categoryName,
           et.defaultMaintenanceDays,
           ir.severityRank
    FROM EquipmentUnit eu
    JOIN EquipmentType et ON eu.equipmentTypeId = et.id
    JOIN EquipmentCategory ec ON et.categoryId = ec.id
    LEFT JOIN (
      SELECT equipmentUnitId,
             MAX(CASE severity WHEN 'CRITICAL' THEN 4 WHEN 'HIGH' THEN 3 WHEN 'MEDIUM' THEN 2 WHEN 'LOW' THEN 1 END) AS severityRank
      FROM IssueReport
      WHERE status NOT IN ('RESOLVED', 'CLOSED')
      GROUP BY equipmentUnitId
    ) ir ON ir.equipmentUnitId = eu.id
    WHERE eu.isActive = 1 AND eu.nextMaintenanceDue <= ?
    ORDER BY eu.nextMaintenanceDue ASC
  `).all(cutoff.toISOString()) as UnitQueueRow[]

  const rankToSeverity: Record<number, IssueSeverity> = { 1: "LOW", 2: "MEDIUM", 3: "HIGH", 4: "CRITICAL" }

  return rows.map((unit) => ({
    id: unit.id,
    name: unit.typeName,
    category: unit.categoryName,
    status: mapPrismaEquipmentStatusToApi(unit.status),
    qrCode: unit.assetTag,
    lastServiceDate: toIsoDate(unit.lastMaintenanceAt) ?? "",
    maintenanceIntervalDays: unit.defaultMaintenanceDays ?? undefined,
    nextServiceDueDate: toIsoDate(unit.nextMaintenanceDue),
    notes: unit.notesSummary ?? undefined,
    severity: unit.severityRank ? rankToSeverity[unit.severityRank] : undefined,
  }))
}

type IssueRow = {
  id: string
  equipmentUnitId: string
  reportedById: string
  title: string
  description: string
  severity: string
  status: string
  reportedAt: string
  resolvedAt: string | null
}

export async function listIssueReports(input: { equipmentId?: string; status?: IssueStatus; severity?: IssueSeverity; reportedBy?: string }) {
  const conditions: string[] = ["1=1"]
  const params: unknown[] = []

  if (input.equipmentId) { conditions.push("ir.equipmentUnitId = ?"); params.push(input.equipmentId) }
  if (input.status) { conditions.push("ir.status = ?"); params.push(input.status) }
  if (input.severity) { conditions.push("ir.severity = ?"); params.push(input.severity) }
  if (input.reportedBy) { conditions.push("ir.reportedById = ?"); params.push(input.reportedBy) }

  type JoinedIssueRow = IssueRow & {
    equipmentAssetTag: string | null
    equipmentTypeName: string | null
  }

  const issues = db.prepare(
    `SELECT ir.*,
            eu.assetTag AS equipmentAssetTag,
            et.name     AS equipmentTypeName
     FROM IssueReport ir
     LEFT JOIN EquipmentUnit eu ON eu.id = ir.equipmentUnitId
     LEFT JOIN EquipmentType et ON et.id = eu.equipmentTypeId
     WHERE ${conditions.join(" AND ")}
     ORDER BY ir.reportedAt DESC`
  ).all(...params) as JoinedIssueRow[]

  return issues.map((issue) => ({
    id: issue.id,
    equipmentId: issue.equipmentUnitId,
    equipmentName: issue.equipmentTypeName ?? undefined,
    equipmentAssetTag: issue.equipmentAssetTag ?? undefined,
    reportedByUserId: issue.reportedById,
    title: issue.title,
    description: issue.description,
    severity: issue.severity,
    status: issue.status,
    reportedAt: new Date(issue.reportedAt).toISOString(),
    resolvedAt: issue.resolvedAt ? new Date(issue.resolvedAt).toISOString() : undefined,
  }))
}

export async function createIssueReport(input: IssuePayload) {
  const unit = db.prepare(
    "SELECT id FROM EquipmentUnit WHERE id = ? AND isActive = 1"
  ).get(input.equipmentId) as { id: string } | undefined

  if (!unit) return null

  const user = db.prepare("SELECT id FROM User WHERE id = ?").get(input.reportedByUserId) as { id: string } | undefined
  if (!user) return undefined

  const issueId = generateId()
  const now = new Date().toISOString()

  const runTransaction = db.transaction(() => {
    db.prepare(`
      INSERT INTO IssueReport (id, equipmentUnitId, reportedById, title, description, severity, status, reportedAt)
      VALUES (?, ?, ?, ?, ?, ?, 'OPEN', ?)
    `).run(issueId, unit.id, user.id, input.title, input.description, input.severity, now)

    db.prepare(`
      INSERT INTO AuditLog (id, action, actorId, equipmentUnitId, issueReportId, message, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(generateId(), "ISSUE_REPORTED", user.id, unit.id, issueId,
      `Issue reported [${input.severity}]: ${input.description}`, now)
  })

  runTransaction()

  const issue = db.prepare("SELECT * FROM IssueReport WHERE id = ?").get(issueId) as IssueRow

  return {
    id: issue.id,
    equipmentId: issue.equipmentUnitId,
    reportedByUserId: issue.reportedById,
    title: issue.title,
    description: issue.description,
    severity: issue.severity,
    status: issue.status,
    reportedAt: new Date(issue.reportedAt).toISOString(),
    resolvedAt: issue.resolvedAt ? new Date(issue.resolvedAt).toISOString() : undefined,
  }
}

export async function updateIssueReportStatus(input: {
  issueId: string
  status: IssueStatus
  actorUserId: string
}) {
  const issue = db.prepare("SELECT * FROM IssueReport WHERE id = ?").get(input.issueId) as IssueRow | undefined
  const actor = db.prepare("SELECT id FROM User WHERE id = ?").get(input.actorUserId) as { id: string } | undefined

  if (!issue) return null
  if (!actor) return undefined

  const now = new Date().toISOString()
  const resolvedAt = input.status === "RESOLVED" || input.status === "CLOSED" ? now : null

  const runTransaction = db.transaction(() => {
    db.prepare(
      "UPDATE IssueReport SET status = ?, resolvedAt = ? WHERE id = ?"
    ).run(input.status, resolvedAt, issue.id)

    db.prepare(`
      INSERT INTO AuditLog (id, action, actorId, equipmentUnitId, issueReportId, message, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(generateId(), "STATUS_CHANGED", actor.id, issue.equipmentUnitId, issue.id,
      `Issue status changed to ${input.status}`, now)
  })

  runTransaction()

  const updated = db.prepare("SELECT * FROM IssueReport WHERE id = ?").get(issue.id) as IssueRow

  return {
    id: updated.id,
    equipmentId: updated.equipmentUnitId,
    reportedByUserId: updated.reportedById,
    title: updated.title,
    description: updated.description,
    severity: updated.severity,
    status: updated.status,
    reportedAt: new Date(updated.reportedAt).toISOString(),
    resolvedAt: updated.resolvedAt ? new Date(updated.resolvedAt).toISOString() : undefined,
  }
}

type NoteRow = {
  id: string
  authorId: string
  body: string
  targetType: NoteTargetType
  equipmentUnitId: string | null
  rentalId: string | null
  maintenanceRecordId: string | null
  issueReportId: string | null
  createdAt: string
}

export async function listNotes(input: {
  equipmentId?: string
  rentalId?: string
  maintenanceRecordId?: string
  issueReportId?: string
  authorRoles?: string[]
}) {
  const conditions: string[] = ["1=1"]
  const params: unknown[] = []

  if (input.equipmentId) { conditions.push("n.equipmentUnitId = ?"); params.push(input.equipmentId) }
  if (input.rentalId) { conditions.push("n.rentalId = ?"); params.push(input.rentalId) }
  if (input.maintenanceRecordId) { conditions.push("n.maintenanceRecordId = ?"); params.push(input.maintenanceRecordId) }
  if (input.issueReportId) { conditions.push("n.issueReportId = ?"); params.push(input.issueReportId) }

  let joinClause = ""
  if (input.authorRoles && input.authorRoles.length > 0) {
    joinClause = "JOIN User u ON n.authorId = u.id"
    const placeholders = input.authorRoles.map(() => "?").join(", ")
    conditions.push(`u.role IN (${placeholders})`)
    params.push(...input.authorRoles)
  }

  const notes = db.prepare(
    `SELECT n.* FROM Note n ${joinClause} WHERE ${conditions.join(" AND ")} ORDER BY n.createdAt DESC`
  ).all(...params) as NoteRow[]

  return notes.map((note) => ({
    id: note.id,
    authorId: note.authorId,
    body: note.body,
    targetType: note.targetType,
    equipmentId: note.equipmentUnitId ?? undefined,
    rentalId: note.rentalId ?? undefined,
    maintenanceRecordId: note.maintenanceRecordId ?? undefined,
    issueReportId: note.issueReportId ?? undefined,
    createdAt: new Date(note.createdAt).toISOString(),
  }))
}

function getAuditReferenceKey(targetType: NoteTargetType): "equipmentUnitId" | "rentalId" | "maintenanceRecordId" | "issueReportId" {
  switch (targetType) {
    case "EQUIPMENT_UNIT":
      return "equipmentUnitId"
    case "RENTAL":
      return "rentalId"
    case "MAINTENANCE_RECORD":
      return "maintenanceRecordId"
    case "ISSUE_REPORT":
      return "issueReportId"
  }
}

export async function createNote(input: NotePayload) {
  const author = db.prepare("SELECT id FROM User WHERE id = ?").get(input.authorId) as { id: string } | undefined
  if (!author) return undefined

  const hasValidTarget = validateNoteTarget(input)
  if (!hasValidTarget) return null

  const noteId = generateId()
  const now = new Date().toISOString()

  const runTransaction = db.transaction(() => {
    db.prepare(`
      INSERT INTO Note (id, authorId, body, targetType, equipmentUnitId, rentalId, maintenanceRecordId, issueReportId, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(noteId, input.authorId, input.body, input.targetType,
      input.equipmentUnitId ?? null, input.rentalId ?? null,
      input.maintenanceRecordId ?? null, input.issueReportId ?? null, now)

    const referenceKey = getAuditReferenceKey(input.targetType)
    const refValue = referenceKey === "equipmentUnitId" ? input.equipmentUnitId
      : referenceKey === "rentalId" ? input.rentalId
      : referenceKey === "maintenanceRecordId" ? input.maintenanceRecordId
      : input.issueReportId

    const auditMessage = input.targetType === "EQUIPMENT_UNIT"
      ? `Technician Note: ${input.body}`
      : input.body

    db.prepare(`
      INSERT INTO AuditLog (id, action, actorId, ${referenceKey}, message, createdAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(generateId(), "NOTE_ADDED", author.id, refValue ?? null, auditMessage, now)
  })

  runTransaction()

  const created = db.prepare("SELECT * FROM Note WHERE id = ?").get(noteId) as NoteRow

  return {
    id: created.id,
    authorId: created.authorId,
    body: created.body,
    targetType: created.targetType,
    equipmentId: created.equipmentUnitId ?? undefined,
    rentalId: created.rentalId ?? undefined,
    maintenanceRecordId: created.maintenanceRecordId ?? undefined,
    issueReportId: created.issueReportId ?? undefined,
    createdAt: new Date(created.createdAt).toISOString(),
  }
}

export async function deleteNote(noteId: string, actorUserId: string) {
  const note = db.prepare("SELECT * FROM Note WHERE id = ?").get(noteId) as NoteRow | undefined
  const actor = db.prepare("SELECT id, name, role FROM User WHERE id = ?").get(actorUserId) as
    { id: string; name: string; role: UserRole } | undefined

  if (!note) return null
  if (!actor || (actor.role !== "ADMIN" && actor.role !== "MAINTENANCE")) return undefined

  const runTransaction = db.transaction(() => {
    db.prepare("DELETE FROM Note WHERE id = ?").run(noteId)
    db.prepare(`
      INSERT INTO AuditLog (id, action, actorId, equipmentUnitId, rentalId, maintenanceRecordId, issueReportId, message, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(generateId(), "DELETED", actor.id,
      note.equipmentUnitId, note.rentalId, note.maintenanceRecordId, note.issueReportId,
      `Note deleted by ${actor.name}`, new Date().toISOString())
  })

  runTransaction()
  return true
}

export async function markServiced(unitId: string, performedByUserId: string, nextServiceDue?: string) {
  const unit = db.prepare(`
    SELECT eu.*, et.defaultMaintenanceDays
    FROM EquipmentUnit eu
    JOIN EquipmentType et ON eu.equipmentTypeId = et.id
    WHERE eu.id = ?
  `).get(unitId) as (
    { id: string; equipmentTypeId: string; status: string; defaultMaintenanceDays: number | null }
  ) | undefined

  if (!unit) return null

  const performer = db.prepare("SELECT id FROM User WHERE id = ?").get(performedByUserId) as { id: string } | undefined
  if (!performer) return undefined

  const now = new Date()
  let nextDue: Date | null = null

  if (nextServiceDue) {
    nextDue = new Date(nextServiceDue)
  } else if (unit.defaultMaintenanceDays) {
    nextDue = new Date(now)
    nextDue.setDate(now.getDate() + unit.defaultMaintenanceDays)
  }

  const nowIso = now.toISOString()
  const nextDueIso = nextDue ? nextDue.toISOString() : null

  const runTransaction = db.transaction(() => {
    db.prepare(`
      UPDATE EquipmentUnit SET lastMaintenanceAt = ?, nextMaintenanceDue = ?, status = 'AVAILABLE'
      WHERE id = ?
    `).run(nowIso, nextDueIso, unit.id)

    db.prepare(`
      INSERT INTO MaintenanceRecord (id, equipmentUnitId, technicianId, status, trigger, title, description, completedAt, nextDueAt, createdAt, updatedAt)
      VALUES (?, ?, ?, 'COMPLETED', 'ROUTINE', 'Service completed', 'Marked serviced via automated workflow', ?, ?, ?, ?)
    `).run(generateId(), unit.id, performer.id, nowIso, nextDueIso, nowIso, nowIso)

    db.prepare(`
      INSERT INTO AuditLog (id, action, actorId, equipmentUnitId, message, createdAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(generateId(), "MAINTENANCE_COMPLETED", performer.id, unit.id,
      "Service completed and status restored to AVAILABLE", nowIso)
  })

  runTransaction()

  const updated = db.prepare(`
    SELECT eu.id, eu.assetTag, eu.serialNumber, eu.equipmentTypeId, eu.locationId,
           eu.status, eu.year, eu.inServiceDate, eu.nextMaintenanceDue, eu.lastMaintenanceAt,
           eu.notesSummary, eu.isActive, eu.createdAt,
           et.name AS typeName, et.defaultMaintenanceDays,
           ec.name AS categoryName
    FROM EquipmentUnit eu
    JOIN EquipmentType et ON eu.equipmentTypeId = et.id
    JOIN EquipmentCategory ec ON et.categoryId = ec.id
    WHERE eu.id = ?
  `).get(unit.id) as any

  return updated
}

export async function resolveIssueReport(input: {
  issueId: string
  actorUserId: string
}) {
  const issue = db.prepare("SELECT * FROM IssueReport WHERE id = ?").get(input.issueId) as IssueRow | undefined
  const actor = db.prepare("SELECT id FROM User WHERE id = ?").get(input.actorUserId) as { id: string } | undefined

  if (!issue) return null
  if (!actor) return undefined

  const now = new Date().toISOString()

  const runTransaction = db.transaction(() => {
    db.prepare(
      "UPDATE IssueReport SET status = 'RESOLVED', resolvedAt = ? WHERE id = ?"
    ).run(now, issue.id)

    const unit = db.prepare(
      "SELECT id, status FROM EquipmentUnit WHERE id = ?"
    ).get(issue.equipmentUnitId) as { id: string; status: string } | undefined

    if (unit && unit.status === "OUT_OF_SERVICE") {
      db.prepare("UPDATE EquipmentUnit SET status = 'AVAILABLE' WHERE id = ?").run(unit.id)

      db.prepare(`
        INSERT INTO AuditLog (id, action, actorId, equipmentUnitId, message, createdAt)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(generateId(), "STATUS_CHANGED", actor.id, unit.id,
        "Status restored to AVAILABLE after issue resolution", now)
    }

    db.prepare(`
      INSERT INTO AuditLog (id, action, actorId, equipmentUnitId, issueReportId, message, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(generateId(), "UPDATED", actor.id, issue.equipmentUnitId, issue.id,
      "Issue resolved and dismissed", now)
  })

  runTransaction()

  return db.prepare("SELECT * FROM IssueReport WHERE id = ?").get(issue.id) as IssueRow
}

export async function moveToMaintenance(input: {
  issueId: string
  actorUserId: string
}) {
  const issue = db.prepare("SELECT * FROM IssueReport WHERE id = ?").get(input.issueId) as IssueRow | undefined
  const actor = db.prepare("SELECT id FROM User WHERE id = ?").get(input.actorUserId) as { id: string } | undefined

  if (!issue) return null
  if (!actor) return undefined

  const now = new Date().toISOString()
  const recordId = generateId()

  const runTransaction = db.transaction(() => {
    db.prepare("UPDATE IssueReport SET status = 'IN_PROGRESS' WHERE id = ?").run(issue.id)

    db.prepare("UPDATE EquipmentUnit SET status = 'IN_MAINTENANCE' WHERE id = ?").run(issue.equipmentUnitId)

    db.prepare(`
      INSERT INTO MaintenanceRecord (id, equipmentUnitId, issueReportId, technicianId, status, trigger, title, description, startedAt, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, 'IN_PROGRESS', 'ISSUE_REPORTED', ?, ?, ?, ?, ?)
    `).run(recordId, issue.equipmentUnitId, issue.id, actor.id,
      `Maintenance: ${issue.title}`, issue.description, now, now, now)

    db.prepare(`
      INSERT INTO AuditLog (id, action, actorId, equipmentUnitId, maintenanceRecordId, message, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(generateId(), "MAINTENANCE_OPENED", actor.id, issue.equipmentUnitId, recordId,
      `Maintenance started from issue: ${issue.title}`, now)
  })

  runTransaction()

  return db.prepare("SELECT * FROM MaintenanceRecord WHERE id = ?").get(recordId)
}
