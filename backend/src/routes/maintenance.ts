import { Router } from "express"
import { IssueSeverity, IssueStatus, NoteTargetType } from "../db/enums"
import { requireRole } from "../middleware/requireRole"
import {
  createIssueReport,
  createNote,
  deleteNote,
  getMaintenanceQueue,
  listIssueReports,
  listNotes,
  updateIssueReportStatus,
  resolveIssueReport,
  moveToMaintenance,
} from "../services/maintenance.service"

const router = Router()
const issueSeverityValues = new Set(Object.values(IssueSeverity))
const issueStatusValues = new Set(Object.values(IssueStatus))
const noteTargetValues = new Set(Object.values(NoteTargetType))

router.get("/queue", async (req, res) => {
  const daysQuery = typeof req.query.days === "string" ? Number(req.query.days) : 14
  const days = Number.isFinite(daysQuery) ? daysQuery : 14

  const list = await getMaintenanceQueue(days)
  res.json(list)
})

router.get("/issues", async (req, res) => {
  const equipmentId = typeof req.query.equipmentId === "string" ? req.query.equipmentId : undefined
  const reportedBy = typeof req.query.reportedBy === "string" ? req.query.reportedBy : undefined
  const statusRaw = typeof req.query.status === "string" ? req.query.status : undefined
  const severityRaw = typeof req.query.severity === "string" ? req.query.severity : undefined

  const status = statusRaw && issueStatusValues.has(statusRaw as IssueStatus) ? (statusRaw as IssueStatus) : undefined
  const severity =
    severityRaw && issueSeverityValues.has(severityRaw as IssueSeverity) ? (severityRaw as IssueSeverity) : undefined

  const issues = await listIssueReports({ equipmentId, status, severity, reportedBy })
  res.json(issues)
})

router.post("/issues", requireRole("field", "maintenance", "admin"), async (req, res) => {
  const equipmentId = req.body?.equipmentId as string | undefined
  const reportedByUserId = req.body?.reportedByUserId as string | undefined
  const title = req.body?.title as string | undefined
  const description = req.body?.description as string | undefined
  const severityRaw = req.body?.severity as string | undefined

  if (!equipmentId || !reportedByUserId || !title || !description || !severityRaw) {
    res.status(400).json({ message: "equipmentId, reportedByUserId, title, description, severity are required" })
    return
  }

  if (!issueSeverityValues.has(severityRaw as IssueSeverity)) {
    res.status(400).json({ message: "severity is invalid" })
    return
  }

  const issue = await createIssueReport({
    equipmentId,
    reportedByUserId,
    title,
    description,
    severity: severityRaw as IssueSeverity,
  })

  if (issue === null) {
    res.status(404).json({ message: "Equipment not found" })
    return
  }

  if (issue === undefined) {
    res.status(400).json({ message: "reportedByUserId is required" })
    return
  }

  res.status(201).json(issue)
})

router.patch("/issues/:id/status", requireRole("maintenance", "admin"), async (req, res) => {
  const statusRaw = req.body?.status as string | undefined
  const actorUserId = req.body?.actorUserId as string | undefined

  if (!statusRaw || !actorUserId) {
    res.status(400).json({ message: "status and actorUserId are required" })
    return
  }

  if (!issueStatusValues.has(statusRaw as IssueStatus)) {
    res.status(400).json({ message: "status is invalid" })
    return
  }

  const issue = await updateIssueReportStatus({
    issueId: req.params.id,
    status: statusRaw as IssueStatus,
    actorUserId,
  })

  if (issue === null) {
    res.status(404).json({ message: "Issue not found" })
    return
  }

  if (issue === undefined) {
    res.status(400).json({ message: "actorUserId is required" })
    return
  }

  res.json(issue)
})

router.get("/notes", async (req, res) => {
  const equipmentId = typeof req.query.equipmentId === "string" ? req.query.equipmentId : undefined
  const rentalId = typeof req.query.rentalId === "string" ? req.query.rentalId : undefined
  const maintenanceRecordId =
    typeof req.query.maintenanceRecordId === "string" ? req.query.maintenanceRecordId : undefined
  const issueReportId = typeof req.query.issueReportId === "string" ? req.query.issueReportId : undefined

  const notes = await listNotes({
    equipmentId, rentalId, maintenanceRecordId, issueReportId,
    authorRoles: ["MAINTENANCE", "ADMIN"],
  })
  res.json(notes)
})

router.post("/notes", requireRole("field", "maintenance", "admin"), async (req, res) => {
  const authorId = req.body?.authorId as string | undefined
  const body = req.body?.body as string | undefined
  const targetTypeRaw = req.body?.targetType as string | undefined

  if (!authorId || !body || !targetTypeRaw) {
    res.status(400).json({ message: "authorId, body, targetType are required" })
    return
  }

  if (!noteTargetValues.has(targetTypeRaw as NoteTargetType)) {
    res.status(400).json({ message: "targetType is invalid" })
    return
  }

  const targetType = targetTypeRaw as NoteTargetType

  const created = await createNote({
    authorId,
    body,
    targetType,
    equipmentUnitId: req.body?.equipmentId as string | undefined,
    rentalId: req.body?.rentalId as string | undefined,
    maintenanceRecordId: req.body?.maintenanceRecordId as string | undefined,
    issueReportId: req.body?.issueReportId as string | undefined,
  })

  if (created === undefined) {
    res.status(400).json({ message: "authorId is required" })
    return
  }

  if (created === null) {
    res.status(400).json({ message: "targetType and target reference do not match" })
    return
  }

  res.status(201).json(created)
})

router.delete("/notes/:id", requireRole("maintenance", "admin"), async (req, res) => {
  const actorUserId = req.body?.actorUserId as string | undefined

  if (!actorUserId) {
    res.status(400).json({ message: "actorUserId is required" })
    return
  }

  const result = await deleteNote(req.params.id, actorUserId)

  if (result === null) {
    res.status(404).json({ message: "Note not found" })
    return
  }

  if (result === undefined) {
    res.status(403).json({ message: "Forbidden: insufficient permissions" })
    return
  }

  res.status(204).end()
})

router.post("/issues/:id/resolve", requireRole("maintenance", "admin"), async (req, res) => {
  const actorUserId = req.body?.actorUserId as string | undefined
  if (!actorUserId) {
    res.status(400).json({ message: "actorUserId is required" })
    return
  }

  const result = await resolveIssueReport({
    issueId: req.params.id,
    actorUserId,
  })

  if (result === null) {
    res.status(404).json({ message: "Issue not found" })
    return
  }

  if (result === undefined) {
    res.status(400).json({ message: "actorUserId is invalid" })
    return
  }

  res.json(result)
})

router.post("/issues/:id/move-to-maintenance", requireRole("maintenance", "admin"), async (req, res) => {
  const actorUserId = req.body?.actorUserId as string | undefined
  if (!actorUserId) {
    res.status(400).json({ message: "actorUserId is required" })
    return
  }

  const result = await moveToMaintenance({
    issueId: req.params.id,
    actorUserId,
  })

  if (result === null) {
    res.status(404).json({ message: "Issue not found" })
    return
  }

  if (result === undefined) {
    res.status(400).json({ message: "actorUserId is invalid" })
    return
  }

  res.json(result)
})

export default router
