import { Router } from "express"
import { EquipmentStatus, RentalStatus } from "../db/enums"
import db from "../lib/db"

const router = Router()

router.get("/admin-summary", async (req, res) => {
  const byStatus: Record<"available" | "in_use" | "maintenance", number> = {
    available: 0,
    in_use: 0,
    maintenance: 0,
  }

  const units = db.prepare("SELECT status FROM EquipmentUnit").all() as { status: string }[]

  for (const unit of units) {
    if (unit.status === EquipmentStatus.AVAILABLE) {
      byStatus.available++
      continue
    }

    if (
      unit.status === EquipmentStatus.CHECKED_OUT ||
      unit.status === EquipmentStatus.RESERVED ||
      unit.status === EquipmentStatus.OVERDUE
    ) {
      byStatus.in_use++
      continue
    }

    byStatus.maintenance++
  }

  const pendingRow = db.prepare(
    "SELECT COUNT(*) as count FROM Rental WHERE status IN (?, ?, ?)"
  ).get(RentalStatus.PENDING, RentalStatus.APPROVED, RentalStatus.RESERVED) as { count: number }

  const activeRow = db.prepare(
    "SELECT COUNT(*) as count FROM Rental WHERE status IN (?, ?)"
  ).get(RentalStatus.CHECKED_OUT, RentalStatus.OVERDUE) as { count: number }

  res.json({
    totalEquipment: units.length,
    byStatus,
    pendingRentalRequests: pendingRow.count,
    activeRentals: activeRow.count,
  })
})

router.get("/field-summary", async (req, res) => {
  const userId = typeof req.query.userId === "string" ? req.query.userId : ""

  const pendingRow = db.prepare(
    "SELECT COUNT(*) as count FROM Rental WHERE requesterId = ? AND status IN (?, ?, ?)"
  ).get(userId, RentalStatus.PENDING, RentalStatus.APPROVED, RentalStatus.RESERVED) as { count: number }

  const activeRow = db.prepare(
    "SELECT COUNT(*) as count FROM Rental WHERE requesterId = ? AND status IN (?, ?)"
  ).get(userId, RentalStatus.CHECKED_OUT, RentalStatus.OVERDUE) as { count: number }

  const recommended = db.prepare(
    "SELECT id FROM EquipmentUnit WHERE status = ? AND isActive = 1 ORDER BY createdAt DESC LIMIT 3"
  ).all(EquipmentStatus.AVAILABLE) as { id: string }[]

  res.json({
    myPendingRequests: pendingRow.count,
    myActiveRentals: activeRow.count,
    recommendedEquipmentIds: recommended.map((e) => e.id),
  })
})

router.get("/maintenance-summary", async (req, res) => {
  const units = db.prepare("SELECT status FROM EquipmentUnit").all() as { status: string }[]

  let maintenanceEquipment = 0
  let availableEquipment = 0
  let inUseEquipment = 0

  for (const unit of units) {
    if (unit.status === EquipmentStatus.AVAILABLE) {
      availableEquipment++
      continue
    }

    if (
      unit.status === EquipmentStatus.CHECKED_OUT ||
      unit.status === EquipmentStatus.RESERVED ||
      unit.status === EquipmentStatus.OVERDUE
    ) {
      inUseEquipment++
      continue
    }

    maintenanceEquipment++
  }

  res.json({
    maintenanceEquipment,
    availableEquipment,
    inUseEquipment,
  })
})

export default router
