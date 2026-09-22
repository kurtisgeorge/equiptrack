import type { NextFunction, Request, Response } from "express"
import { mapPrismaRoleToApi } from "../db/mappers"
import db from "../lib/db"
import type { UserRole } from "../db/enums"

type RequestWithUser = Request & {
  user?: {
    id: string
    role: ReturnType<typeof mapPrismaRoleToApi>
  }
}

function extractBearerUserId(value: string | undefined): string | undefined {
  if (!value) return undefined
  const match = value.match(/^Bearer\s+dev-token-(.+)$/i)
  return match?.[1]
}

function resolveBodyUserId(body: unknown): string | undefined {
  if (!body || typeof body !== "object") return undefined
  const data = body as Record<string, unknown>
  const candidates = [
    data.actorUserId,
    data.requestedBy,
    data.requestedByUserId,
    data.performedByUserId,
    data.reportedByUserId,
    data.authorId,
  ]
  const match = candidates.find((value) => typeof value === "string" && value.trim().length > 0)
  return typeof match === "string" ? match : undefined
}

export async function attachUser(req: Request, _res: Response, next: NextFunction) {
  const request = req as RequestWithUser
  const userIdFromHeader =
    extractBearerUserId(req.header("authorization")) ??
    (typeof req.header("x-user-id") === "string" ? req.header("x-user-id") : undefined)
  const userIdFromBody = resolveBodyUserId(req.body)
  const userId = userIdFromHeader ?? userIdFromBody

  if (!userId) {
    next()
    return
  }

  const user = db.prepare("SELECT id, role FROM User WHERE id = ?").get(userId) as
    | { id: string; role: UserRole }
    | undefined

  if (user) {
    request.user = {
      id: user.id,
      role: mapPrismaRoleToApi(user.role),
    }
  }

  next()
}
