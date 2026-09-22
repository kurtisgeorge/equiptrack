import Database from "better-sqlite3"
import { readFileSync } from "fs"
import { join } from "path"
import { randomUUID } from "crypto"

const dbPath = join(process.cwd(), "dev.db")
const db = new Database(dbPath)

const schemaSQL = readFileSync(join(__dirname, "..", "db", "schema.sql"), "utf-8")
db.exec(schemaSQL)

try { db.exec("ALTER TABLE User ADD COLUMN passwordHash TEXT") } catch { /* already exists */ }

// Migration: add assignedToUserId to EquipmentUnit and auto-assign existing in-use units
try {
  db.exec("ALTER TABLE EquipmentUnit ADD COLUMN assignedToUserId TEXT REFERENCES User(id)")
  // First-run only: assign all currently in-use equipment to random field workers
  const inUseUnits = db.prepare(
    "SELECT id FROM EquipmentUnit WHERE status IN ('CHECKED_OUT','RESERVED','OVERDUE') AND assignedToUserId IS NULL"
  ).all() as { id: string }[]
  const fieldWorkers = db.prepare(
    "SELECT id FROM User WHERE role = 'FIELD_WORKER'"
  ).all() as { id: string }[]
  if (fieldWorkers.length > 0 && inUseUnits.length > 0) {
    const stmt = db.prepare("UPDATE EquipmentUnit SET assignedToUserId = ? WHERE id = ?")
    for (const unit of inUseUnits) {
      const worker = fieldWorkers[Math.floor(Math.random() * fieldWorkers.length)]
      stmt.run(worker.id, unit.id)
    }
  }
} catch { /* column already exists — assignments already set */ }

// Migration: auto-assign maintenance-status equipment to maintenance users (runs once)
try {
  db.exec("ALTER TABLE EquipmentUnit ADD COLUMN _maintAssignSentinel INTEGER DEFAULT 0")
  const maintUnits = db.prepare(
    "SELECT id FROM EquipmentUnit WHERE status IN ('IN_MAINTENANCE','DUE_SOON_MAINTENANCE','OUT_OF_SERVICE')"
  ).all() as { id: string }[]
  const maintUsers = db.prepare(
    "SELECT id FROM User WHERE role = 'MAINTENANCE'"
  ).all() as { id: string }[]
  if (maintUsers.length > 0 && maintUnits.length > 0) {
    const stmt = db.prepare("UPDATE EquipmentUnit SET assignedToUserId = ? WHERE id = ?")
    for (const unit of maintUnits) {
      const user = maintUsers[Math.floor(Math.random() * maintUsers.length)]
      stmt.run(user.id, unit.id)
    }
  }
} catch { /* already ran */ }

try {
  db.exec(`CREATE TABLE IF NOT EXISTS CalendarEvent (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    date TEXT NOT NULL,
    startTime TEXT,
    endTime TEXT,
    color TEXT NOT NULL DEFAULT '#3b82f6',
    visibilityType TEXT NOT NULL DEFAULT 'ALL',
    visibilityRoles TEXT NOT NULL DEFAULT '[]',
    visibilityUserIds TEXT NOT NULL DEFAULT '[]',
    createdById TEXT NOT NULL REFERENCES User(id),
    createdAt TEXT NOT NULL DEFAULT (datetime('now'))
  )`)
} catch { /* already exists */ }

export function generateId(): string {
  return randomUUID()
}

export function toDbBool(value: boolean | undefined | null): number | undefined {
  if (value === undefined || value === null) return undefined
  return value ? 1 : 0
}

export function fromDbBool(value: number | null | undefined): boolean {
  return value === 1
}

export function toDbDate(value: Date | string | null | undefined): string | null {
  if (!value) return null
  if (value instanceof Date) return value.toISOString()
  return new Date(value).toISOString()
}

export function fromDbDate(value: string | null | undefined): Date | null {
  if (!value) return null
  return new Date(value)
}

export default db
