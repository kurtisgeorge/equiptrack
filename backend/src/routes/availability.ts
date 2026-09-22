import { Router } from "express"
import {
  getAvailableQuantityByType,
  getAvailableUnitsForType,
  parseAvailabilityWindow,
} from "../services/availability.service"

const router = Router()

router.get("/types", async (req, res) => {
  const startDate = typeof req.query.startDate === "string" ? req.query.startDate : ""
  const endDate = typeof req.query.endDate === "string" ? req.query.endDate : undefined
  const locationId = typeof req.query.locationId === "string" ? req.query.locationId : undefined

  if (!startDate) {
    res.status(400).json({ message: "startDate is required" })
    return
  }

  try {
    parseAvailabilityWindow(startDate, endDate)
  } catch (error) {
    res.status(400).json({ message: (error as Error).message })
    return
  }

  const result = await getAvailableQuantityByType({
    startDate,
    endDate,
    locationId,
  })

  res.json(result)
})

router.get("/types/:equipmentTypeId/units", async (req, res) => {
  const equipmentTypeId = req.params.equipmentTypeId
  const startDate = typeof req.query.startDate === "string" ? req.query.startDate : ""
  const endDate = typeof req.query.endDate === "string" ? req.query.endDate : undefined
  const locationId = typeof req.query.locationId === "string" ? req.query.locationId : undefined

  if (!startDate) {
    res.status(400).json({ message: "startDate is required" })
    return
  }

  try {
    parseAvailabilityWindow(startDate, endDate)
  } catch (error) {
    res.status(400).json({ message: (error as Error).message })
    return
  }

  const result = await getAvailableUnitsForType({
    equipmentTypeId,
    startDate,
    endDate,
    locationId,
  })

  res.json(result)
})

export default router
