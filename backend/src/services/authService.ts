import { scrypt, randomBytes, timingSafeEqual } from "crypto"
import { promisify } from "util"
import db from "../lib/db"
import { mapPrismaRoleToApi, mapApiRoleToPrisma, type ApiRole } from "../db/mappers"
import type { UserRole } from "../db/enums"

const scryptAsync = promisify(scrypt)

export interface AuthUser {
  id: string
  name: string
  email: string
  role: ApiRole
  passwordHash: string | null
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex")
  const hash = (await scryptAsync(password, salt, 64)) as Buffer
  return `${salt}:${hash.toString("hex")}`
}

export async function verifyPassword(user: AuthUser, password?: string): Promise<boolean> {
  if (!user.passwordHash) {
    return true
  }
  if (!password) return false

  const [salt, storedHash] = user.passwordHash.split(":")
  if (!salt || !storedHash) return false

  try {
    const hash = (await scryptAsync(password, salt, 64)) as Buffer
    const storedBuffer = Buffer.from(storedHash, "hex")
    if (hash.length !== storedBuffer.length) return false
    return timingSafeEqual(hash, storedBuffer)
  } catch {
    return false
  }
}

export async function findUserByEmail(email: string): Promise<AuthUser | null> {
  try {
    const user = db
      .prepare("SELECT id, name, email, passwordHash, role FROM User WHERE email = ?")
      .get(email.toLowerCase().trim()) as
      | { id: string; name: string; email: string; passwordHash: string | null; role: UserRole }
      | undefined

    if (!user) return null

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      passwordHash: user.passwordHash,
      role: mapPrismaRoleToApi(user.role),
    }
  } catch (error) {
    console.error("Error in findUserByEmail:", error)
    throw new Error("Database query failed")
  }
}

export async function findUserByRole(role: ApiRole): Promise<AuthUser | null> {
  try {
    const user = db
      .prepare("SELECT id, name, email, passwordHash, role FROM User WHERE role = ? ORDER BY createdAt ASC LIMIT 1")
      .get(mapApiRoleToPrisma(role)) as
      | { id: string; name: string; email: string; passwordHash: string | null; role: UserRole }
      | undefined

    if (!user) return null

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      passwordHash: user.passwordHash,
      role: mapPrismaRoleToApi(user.role),
    }
  } catch (error) {
    console.error("Error in findUserByRole:", error)
    throw new Error("Database query failed")
  }
}
