import express from "express"
import cors from "cors"
import path from "path"
import db from "./lib/db"
import { seedDatabase } from "./db/seed"
import rentalRoutes from "./routes/rentals"
import equipmentRoutes from "./routes/equipment"
import authRoutes from "./routes/auth"
import usersRoutes from "./routes/users"
import dashboardRoutes from "./routes/dashboard"
import maintenanceRoutes from "./routes/maintenance"
import { attachUser } from "./middleware/attachUser"
import availabilityRoutes from "./routes/availability"
import calendarRoutes from "./routes/calendar"

const isProduction = process.env.NODE_ENV === "production"

// Schema/migrations run lazily on first DB access (see lib/db.ts). In
// production, also auto-seed demo data the first time the User table is
// empty — awaited by the exported `ready` promise so a Vercel function
// handler (or a local `.listen()`) never serves a request before this
// finishes.
async function ensureSeeded(): Promise<void> {
  if (!isProduction) return
  const row = (await db.prepare("SELECT COUNT(*) as count FROM User").get()) as { count: number }
  if (row.count === 0) {
    console.log("No users found — seeding...")
    await seedDatabase()
    console.log("Seed complete.")
  }
}

export const ready: Promise<void> = ensureSeeded()

export const app = express()

app.use(cors())
app.use(express.json())
app.use(attachUser)

app.use("/api/auth", authRoutes)
app.use("/api/users", usersRoutes)
app.use("/api/dashboard", dashboardRoutes)
app.use("/api/maintenance", maintenanceRoutes)
app.use("/api/availability", availabilityRoutes)

app.use("/api/calendar", calendarRoutes)
app.use("/api/equipment", equipmentRoutes)
app.use("/api/rentals", rentalRoutes)

if (isProduction) {
  const frontendDist = path.join(__dirname, "../../frontend/dist")
  app.use(express.static(frontendDist))
  app.get(/.*/, (_req, res) => {
    res.sendFile(path.join(frontendDist, "index.html"))
  })
}

// Only bind a port when this file is run directly (`npm run dev` / `npm
// start`). When imported by a Vercel serverless function (api/index.ts),
// `app` is exported and used as the request handler instead — Vercel
// manages the listening socket itself.
if (require.main === module) {
  const PORT = process.env.PORT || 4000
  ready
    .then(() => {
      app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`)
      })
    })
    .catch((err) => {
      console.error("Failed to initialize database:", err)
      process.exit(1)
    })
}
