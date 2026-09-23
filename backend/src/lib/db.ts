import { createClient, type Client, type InStatement, type InValue, type ResultSet } from "@libsql/client"
import { readFileSync } from "fs"
import { join } from "path"
import { randomUUID } from "crypto"
import { AsyncLocalStorage } from "async_hooks"

// Load backend/.env for local dev (npm run dev / seed / start). No-op if the
// file doesn't exist — real hosts (Vercel, etc.) inject env vars directly.
try {
  ;(process as unknown as { loadEnvFile: (path?: string) => void }).loadEnvFile(join(__dirname, "..", "..", ".env"))
} catch { /* no .env file — env vars must already be set (e.g. in production) */ }

// ─────────────────────────────────────────────────────────────────────────
// Turso (libSQL) connection. Same SQL dialect as the SQLite file this app
// used to read locally — `?` placeholders, `datetime('now')`, no identifier
// folding — so schema.sql and every query string below are untouched. Only
// the connection is now a network client instead of a local file handle,
// which is what makes this work from Vercel's serverless functions (no
// persistent disk there).
// ─────────────────────────────────────────────────────────────────────────

// Defaults to a plain local SQLite file — no external account needed. Set
// TURSO_DATABASE_URL (+ TURSO_AUTH_TOKEN) to point at a real hosted Turso
// database instead, for data that survives across serverless instances.
// On Vercel, /tmp is the only writable directory in a function, and it's
// wiped on cold starts / not shared across concurrent instances — fine for
// a demo, not for data that needs to persist reliably.
const isServerless = Boolean(process.env.VERCEL)
const defaultUrl = isServerless ? "file:/tmp/dev.db" : `file:${join(process.cwd(), "dev.db")}`
const url = process.env.TURSO_DATABASE_URL || defaultUrl
const authToken = process.env.TURSO_AUTH_TOKEN

const client: Client = createClient({ url, authToken })

// ── Prepared-statement shim ────────────────────────────────────────────────
// Mirrors better-sqlite3's `db.prepare(sql).get/all/run(...args)` surface so
// every call site elsewhere in the app is unchanged except for adding
// `await`. Two execution modes, selected by AsyncLocalStorage:
//   - "live" (inside an async db.transaction callback, or no transaction at
//     all): each call really hits the network, awaited.
//   - "collect" (inside a plain, non-async db.transaction callback — used
//     only by the seed script, which never reads results mid-transaction):
//     `.run()`/`.exec()` synchronously queue {sql, args} and the whole batch
//     is sent as one atomic `client.batch()` once the callback returns. This
//     lets the seed script's hundreds of insert calls stay exactly as
//     written, with no `await` needed anywhere in that file.

type LiveCtx = { mode: "live"; exec: Pick<Client, "execute"> }
type CollectCtx = { mode: "collect"; batch: InStatement[] }
const als = new AsyncLocalStorage<LiveCtx | CollectCtx>()

function isAsyncFn(fn: (...args: unknown[]) => unknown): boolean {
  return fn.constructor.name === "AsyncFunction"
}

let readyPromise: Promise<void> | null = null
function ensureReady(): Promise<void> {
  if (!readyPromise) readyPromise = init()
  return readyPromise
}

function toRunResult(rs: ResultSet) {
  return { changes: rs.rowsAffected, lastInsertRowid: rs.lastInsertRowid }
}

type Prepared = {
  get: (...args: unknown[]) => Promise<any>
  all: (...args: unknown[]) => Promise<any[]>
  run: (...args: unknown[]) => Promise<{ changes: number; lastInsertRowid: bigint | undefined }> | { changes: number; lastInsertRowid: undefined }
}

function prepare(sql: string): Prepared {
  return {
    get: async (...args: unknown[]) => {
      await ensureReady()
      const ctx = als.getStore()
      const exec = ctx && ctx.mode === "live" ? ctx.exec : client
      const rs = await exec.execute({ sql, args: args as InValue[] })
      return rs.rows[0]
    },
    all: async (...args: unknown[]) => {
      await ensureReady()
      const ctx = als.getStore()
      const exec = ctx && ctx.mode === "live" ? ctx.exec : client
      const rs = await exec.execute({ sql, args: args as InValue[] })
      return rs.rows as any[]
    },
    run: (...args: unknown[]) => {
      const ctx = als.getStore()
      if (ctx && ctx.mode === "collect") {
        ctx.batch.push({ sql, args: args as InValue[] })
        return { changes: 0, lastInsertRowid: undefined }
      }
      return (async () => {
        await ensureReady()
        const exec = ctx && ctx.mode === "live" ? ctx.exec : client
        const rs = await exec.execute({ sql, args: args as InValue[] })
        return toRunResult(rs)
      })()
    },
  }
}

// Single, non-parameterized statement (DDL, or the seed script's bulk
// DELETEs). Honors collect-mode the same way `.run()` does.
function exec(sql: string): Promise<void> | void {
  const ctx = als.getStore()
  if (ctx && ctx.mode === "collect") {
    ctx.batch.push({ sql })
    return
  }
  return (async () => {
    await ensureReady()
    const runner = ctx && ctx.mode === "live" ? ctx.exec : client
    await runner.execute(sql)
  })()
}

function transaction<T>(fn: (() => T) | (() => Promise<T>)): () => Promise<T> {
  return async function runTransaction(): Promise<T> {
    await ensureReady()

    if (isAsyncFn(fn as (...args: unknown[]) => unknown)) {
      const tx = await client.transaction("write")
      try {
        const result = await als.run({ mode: "live", exec: tx }, fn as () => Promise<T>)
        await tx.commit()
        return result
      } catch (err) {
        await tx.rollback().catch(() => {})
        throw err
      }
    }

    const batch: InStatement[] = []
    const result = als.run({ mode: "collect", batch }, fn as () => T)
    const CHUNK = 400
    for (let i = 0; i < batch.length; i += CHUNK) {
      await client.batch(batch.slice(i, i + CHUNK), "write")
    }
    return result
  }
}

// ── Schema + one-time migrations ───────────────────────────────────────────

async function init(): Promise<void> {
  // WAL journaling is a local-file concept only — Turso's managed remote
  // storage rejects the pragma outright (SQL_PARSE_ERROR), so it's issued
  // here (not from schema.sql) and only for a local `file:` connection.
  if (url.startsWith("file:")) {
    try {
      await client.execute("PRAGMA journal_mode=WAL")
    } catch { /* not supported on this connection — fine to skip */ }
  }

  const schemaSQL = readFileSync(join(__dirname, "..", "db", "schema.sql"), "utf-8")
  await client.executeMultiple(schemaSQL)

  try {
    await client.execute("ALTER TABLE User ADD COLUMN passwordHash TEXT")
  } catch { /* already exists */ }

  // Migration: add assignedToUserId to EquipmentUnit and auto-assign existing in-use units
  try {
    await client.execute("ALTER TABLE EquipmentUnit ADD COLUMN assignedToUserId TEXT REFERENCES User(id)")

    const inUseUnits = (
      await client.execute(
        "SELECT id FROM EquipmentUnit WHERE status IN ('CHECKED_OUT','RESERVED','OVERDUE') AND assignedToUserId IS NULL"
      )
    ).rows as unknown as { id: string }[]
    const fieldWorkers = (await client.execute("SELECT id FROM User WHERE role = 'FIELD_WORKER'"))
      .rows as unknown as { id: string }[]

    if (fieldWorkers.length > 0 && inUseUnits.length > 0) {
      for (const unit of inUseUnits) {
        const worker = fieldWorkers[Math.floor(Math.random() * fieldWorkers.length)]
        await client.execute({
          sql: "UPDATE EquipmentUnit SET assignedToUserId = ? WHERE id = ?",
          args: [worker.id, unit.id],
        })
      }
    }
  } catch { /* column already exists — assignments already set */ }

  // Migration: auto-assign maintenance-status equipment to maintenance users (runs once)
  try {
    await client.execute("ALTER TABLE EquipmentUnit ADD COLUMN _maintAssignSentinel INTEGER DEFAULT 0")

    const maintUnits = (
      await client.execute(
        "SELECT id FROM EquipmentUnit WHERE status IN ('IN_MAINTENANCE','DUE_SOON_MAINTENANCE','OUT_OF_SERVICE')"
      )
    ).rows as unknown as { id: string }[]
    const maintUsers = (await client.execute("SELECT id FROM User WHERE role = 'MAINTENANCE'"))
      .rows as unknown as { id: string }[]

    if (maintUsers.length > 0 && maintUnits.length > 0) {
      for (const unit of maintUnits) {
        const user = maintUsers[Math.floor(Math.random() * maintUsers.length)]
        await client.execute({
          sql: "UPDATE EquipmentUnit SET assignedToUserId = ? WHERE id = ?",
          args: [user.id, unit.id],
        })
      }
    }
  } catch { /* already ran */ }

  try {
    await client.execute(`CREATE TABLE IF NOT EXISTS CalendarEvent (
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
}

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

const db = { prepare, transaction, exec, ready: ensureReady }

export default db
