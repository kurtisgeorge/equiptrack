import db, { generateId } from "../lib/db"

export type VisibilityType = 'ALL' | 'ROLES' | 'USERS'

export interface CalendarEvent {
  id: string
  title: string
  description: string | null
  date: string
  startTime: string | null
  endTime: string | null
  color: string
  visibilityType: VisibilityType
  visibilityRoles: string[]
  visibilityUserIds: string[]
  createdById: string
  createdByName: string
  createdAt: string
}

type DbRow = {
  id: string
  title: string
  description: string | null
  date: string
  startTime: string | null
  endTime: string | null
  color: string
  visibilityType: string
  visibilityRoles: string
  visibilityUserIds: string
  createdById: string
  createdByName: string
  createdAt: string
}

function mapRow(row: DbRow): CalendarEvent {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    date: row.date,
    startTime: row.startTime,
    endTime: row.endTime,
    color: row.color,
    visibilityType: row.visibilityType as VisibilityType,
    visibilityRoles: JSON.parse(row.visibilityRoles || '[]'),
    visibilityUserIds: JSON.parse(row.visibilityUserIds || '[]'),
    createdById: row.createdById,
    createdByName: row.createdByName || '',
    createdAt: row.createdAt,
  }
}

export function listEvents(opts: { month?: string; userId: string; userRole: string }): CalendarEvent[] {
  const { month, userId, userRole } = opts

  let sql = `
    SELECT e.*, u.name AS createdByName
    FROM CalendarEvent e
    LEFT JOIN User u ON e.createdById = u.id
    WHERE 1=1
  `
  const params: string[] = []

  if (month) {
    sql += ' AND e.date LIKE ?'
    params.push(`${month}%`)
  }

  sql += ' ORDER BY e.date ASC, e.startTime ASC'

  const rows = db.prepare(sql).all(...params) as DbRow[]

  return rows.filter((row) => {
    if (userRole === 'admin') return true
    if (row.visibilityType === 'ALL') return true
    if (row.visibilityType === 'ROLES') {
      const roles: string[] = JSON.parse(row.visibilityRoles || '[]')
      return roles.includes(userRole)
    }
    if (row.visibilityType === 'USERS') {
      const users: string[] = JSON.parse(row.visibilityUserIds || '[]')
      return users.includes(userId)
    }
    return false
  }).map(mapRow)
}

export function createEvent(data: {
  title: string
  description?: string | null
  date: string
  startTime?: string | null
  endTime?: string | null
  color?: string
  visibilityType: VisibilityType
  visibilityRoles?: string[]
  visibilityUserIds?: string[]
  createdById: string
}): CalendarEvent {
  const id = generateId()
  const now = new Date().toISOString()

  db.prepare(`
    INSERT INTO CalendarEvent
      (id, title, description, date, startTime, endTime, color, visibilityType, visibilityRoles, visibilityUserIds, createdById, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    data.title,
    data.description ?? null,
    data.date,
    data.startTime ?? null,
    data.endTime ?? null,
    data.color ?? '#3b82f6',
    data.visibilityType,
    JSON.stringify(data.visibilityRoles ?? []),
    JSON.stringify(data.visibilityUserIds ?? []),
    data.createdById,
    now,
  )

  const row = db.prepare(`
    SELECT e.*, u.name AS createdByName FROM CalendarEvent e LEFT JOIN User u ON e.createdById = u.id WHERE e.id = ?
  `).get(id) as DbRow

  return mapRow(row)
}

export function updateEvent(id: string, data: {
  title?: string
  description?: string | null
  date?: string
  startTime?: string | null
  endTime?: string | null
  color?: string
  visibilityType?: VisibilityType
  visibilityRoles?: string[]
  visibilityUserIds?: string[]
}): CalendarEvent | null {
  const existing = db.prepare('SELECT * FROM CalendarEvent WHERE id = ?').get(id) as DbRow | undefined
  if (!existing) return null

  db.prepare(`
    UPDATE CalendarEvent SET
      title = ?, description = ?, date = ?, startTime = ?, endTime = ?,
      color = ?, visibilityType = ?, visibilityRoles = ?, visibilityUserIds = ?
    WHERE id = ?
  `).run(
    data.title ?? existing.title,
    data.description !== undefined ? data.description : existing.description,
    data.date ?? existing.date,
    data.startTime !== undefined ? data.startTime : existing.startTime,
    data.endTime !== undefined ? data.endTime : existing.endTime,
    data.color ?? existing.color,
    data.visibilityType ?? existing.visibilityType,
    JSON.stringify(data.visibilityRoles ?? JSON.parse(existing.visibilityRoles || '[]')),
    JSON.stringify(data.visibilityUserIds ?? JSON.parse(existing.visibilityUserIds || '[]')),
    id,
  )

  const row = db.prepare(`
    SELECT e.*, u.name AS createdByName FROM CalendarEvent e LEFT JOIN User u ON e.createdById = u.id WHERE e.id = ?
  `).get(id) as DbRow

  return mapRow(row)
}

export function deleteEvent(id: string): boolean {
  const result = db.prepare('DELETE FROM CalendarEvent WHERE id = ?').run(id)
  return result.changes > 0
}
