import express from "express"
import cors from "cors"
import path from "path"
import { execSync } from "child_process"
import db from "./lib/db"
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

if (isProduction) {
  const { count } = db.prepare("SELECT COUNT(*) as count FROM User").get() as { count: number }
  if (count === 0) {
    console.log("No users found — seeding...")
    execSync(`npx tsx "${path.join(__dirname, "db/seed.ts")}"`, { stdio: "inherit" })
    console.log("Seed complete.")
  }
}

const app = express()

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

const PORT = process.env.PORT || 4000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
