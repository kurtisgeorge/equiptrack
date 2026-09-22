import { Router } from "express"
import * as authService from "../services/authService"

const router = Router()

router.post("/login", async (req, res) => {
  const { email, password } = req.body ?? {}

  if (!email || typeof email !== "string") {
    return res.status(400).json({ message: "email is required" })
  }

  try {
    const user = await authService.findUserByEmail(email)

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" })
    }

    const isValid = await authService.verifyPassword(user, password)
    if (!isValid) {
      return res.status(401).json({ message: "Invalid email or password" })
    }

    const token = `dev-token-${user.id}`

    const { passwordHash: _ph, ...safeUser } = user

    res.json({ token, user: safeUser })
  } catch (error) {
    console.error("Login error:", error)
    res.status(500).json({ message: "Internal server error" })
  }
})

export default router
