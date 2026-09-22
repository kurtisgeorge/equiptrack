import { Router } from "express"
import { UserRole } from "../db/enums"
import { mapApiRoleToPrisma, mapPrismaRoleToApi, type ApiRole } from "../db/mappers"
import db, { fromDbBool, generateId } from "../lib/db"
import { requireRole } from "../middleware/requireRole"
import { hashPassword } from "../services/authService"

type RequestWithUser = import("express").Request & {
  user?: {
    id: string
    role: ReturnType<typeof mapPrismaRoleToApi>
  }
}

type UserRow = {
  id: string
  name: string
  email: string
  role: UserRole
  phoneNumber: string | null
  position: string | null
  avatarUrl: string | null
  isAvatarIcon: number
}

function toUserDto(u: UserRow) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: mapPrismaRoleToApi(u.role),
    phoneNumber: u.phoneNumber,
    position: u.position,
    avatarUrl: u.avatarUrl,
    isAvatarIcon: fromDbBool(u.isAvatarIcon),
  }
}

const router = Router()

router.get("/", async (req, res) => {
  const role = typeof req.query.role === "string" ? req.query.role : undefined

  let users: UserRow[]
  if (role && role !== "all") {
    users = db
      .prepare("SELECT id, name, email, role, phoneNumber, position, avatarUrl, isAvatarIcon FROM User WHERE role = ? ORDER BY name ASC")
      .all(mapApiRoleToPrisma(role as ApiRole)) as UserRow[]
  } else {
    users = db
      .prepare("SELECT id, name, email, role, phoneNumber, position, avatarUrl, isAvatarIcon FROM User ORDER BY name ASC")
      .all() as UserRow[]
  }

  res.json(users.map(toUserDto))
})

router.get("/:id", async (req, res) => {
  const { id } = req.params
  const targetUser = db
    .prepare("SELECT id, name, email, role, phoneNumber, position, avatarUrl, isAvatarIcon FROM User WHERE id = ?")
    .get(id) as UserRow | undefined

  if (!targetUser) {
    return res.status(404).json({ error: "User not found." })
  }

  res.json(toUserDto(targetUser))
})

router.put("/:id", async (req, res) => {
  const { id } = req.params
  const { phoneNumber, position, avatarUrl, isAvatarIcon } = req.body

  try {
    const sets: string[] = []
    const params: unknown[] = []

    if (phoneNumber !== undefined) { sets.push("phoneNumber = ?"); params.push(phoneNumber) }
    if (position !== undefined) { sets.push("position = ?"); params.push(position) }
    if (avatarUrl !== undefined) { sets.push("avatarUrl = ?"); params.push(avatarUrl) }
    if (isAvatarIcon !== undefined) { sets.push("isAvatarIcon = ?"); params.push(isAvatarIcon ? 1 : 0) }

    if (sets.length > 0) {
      params.push(id)
      db.prepare(`UPDATE User SET ${sets.join(", ")} WHERE id = ?`).run(...params)
    }

    const updated = db
      .prepare("SELECT id, name, email, role, phoneNumber, position, avatarUrl, isAvatarIcon FROM User WHERE id = ?")
      .get(id) as UserRow | undefined

    if (!updated) {
      return res.status(404).json({ error: "User not found." })
    }

    res.json(toUserDto(updated))
  } catch (error) {
    res.status(500).json({ error: "Failed to update user." })
  }
})

router.post("/", requireRole("admin"), async (req, res) => {
  const { name, email, role, password, department, phoneNumber, position } = req.body ?? {}

  if (!name || typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: "name is required" })
  }
  if (!email || typeof email !== "string" || !email.trim()) {
    return res.status(400).json({ error: "email is required" })
  }
  if (!role || !["admin", "field", "maintenance"].includes(role)) {
    return res.status(400).json({ error: "role must be one of: admin, field, maintenance" })
  }
  if (!password || typeof password !== "string" || password.length < 6) {
    return res.status(400).json({ error: "password must be at least 6 characters" })
  }

  const normalizedEmail = email.toLowerCase().trim()
  const existing = db.prepare("SELECT id FROM User WHERE email = ?").get(normalizedEmail)
  if (existing) {
    return res.status(409).json({ error: "A user with this email already exists" })
  }

  try {
    const passwordHash = await hashPassword(password)
    const id = generateId()

    db.prepare(
      "INSERT INTO User (id, name, email, passwordHash, role, department, phoneNumber, position, isAvatarIcon) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)"
    ).run(
      id,
      name.trim(),
      normalizedEmail,
      passwordHash,
      mapApiRoleToPrisma(role as ApiRole),
      department?.trim() ?? null,
      phoneNumber?.trim() ?? null,
      position?.trim() ?? null,
    )

    const created = db
      .prepare("SELECT id, name, email, role, phoneNumber, position, avatarUrl, isAvatarIcon FROM User WHERE id = ?")
      .get(id) as UserRow

    res.status(201).json(toUserDto(created))
  } catch (error) {
    console.error("Error creating user:", error)
    res.status(500).json({ error: "Failed to create user" })
  }
})

router.delete("/:id", async (req, res) => {
  const { id } = req.params
  const userReq = req as RequestWithUser

  try {
    const targetUser = db
      .prepare("SELECT id, role FROM User WHERE id = ?")
      .get(id) as { id: string; role: UserRole } | undefined

    if (!targetUser) {
      return res.status(404).json({ error: "User not found." })
    }

    if (userReq.user?.role === "admin" && targetUser.role === UserRole.ADMIN) {
      return res.status(403).json({ error: "Admins cannot delete other Admins." })
    }

    db.prepare("DELETE FROM User WHERE id = ?").run(id)
    res.status(204).send()
  } catch (error) {
    res.status(500).json({ error: "Failed to delete user." })
  }
})

export default router
