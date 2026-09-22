import { Router } from 'express'
import * as calendarService from '../services/calendarService'
import { requireRole } from '../middleware/requireRole'

const router = Router()

router.get('/events', (req: any, res) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' })
  const month = typeof req.query.month === 'string' ? req.query.month : undefined
  const events = calendarService.listEvents({
    month,
    userId: req.user.id,
    userRole: req.user.role,
  })
  res.json(events)
})

router.post('/events', requireRole('admin'), (req: any, res) => {
  const { title, description, date, startTime, endTime, color, visibilityType, visibilityRoles, visibilityUserIds } = req.body
  if (!title || typeof title !== 'string') return res.status(400).json({ message: 'title is required' })
  if (!date || typeof date !== 'string') return res.status(400).json({ message: 'date is required' })
  if (!visibilityType) return res.status(400).json({ message: 'visibilityType is required' })
  try {
    const event = calendarService.createEvent({
      title, description, date, startTime, endTime, color,
      visibilityType, visibilityRoles, visibilityUserIds,
      createdById: req.user.id,
    })
    res.status(201).json(event)
  } catch (err) {
    console.error('Create event error:', err)
    res.status(500).json({ message: 'Failed to create event' })
  }
})

router.put('/events/:id', requireRole('admin'), (req: any, res) => {
  const event = calendarService.updateEvent(req.params.id, req.body)
  if (!event) return res.status(404).json({ message: 'Event not found' })
  res.json(event)
})

router.delete('/events/:id', requireRole('admin'), (req: any, res) => {
  const deleted = calendarService.deleteEvent(req.params.id)
  if (!deleted) return res.status(404).json({ message: 'Event not found' })
  res.status(204).end()
})

export default router
