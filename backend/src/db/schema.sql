PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS User (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  email        TEXT NOT NULL UNIQUE,
  passwordHash TEXT,
  role         TEXT NOT NULL CHECK(role IN ('ADMIN','FIELD_WORKER','MAINTENANCE')),
  department   TEXT,
  phoneNumber  TEXT,
  position     TEXT,
  avatarUrl    TEXT,
  isAvatarIcon INTEGER NOT NULL DEFAULT 0,
  createdAt    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS Location (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  code        TEXT NOT NULL UNIQUE,
  region      TEXT,
  description TEXT,
  createdAt   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS EquipmentCategory (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  code        TEXT NOT NULL UNIQUE,
  description TEXT
);

CREATE TABLE IF NOT EXISTS EquipmentType (
  id                       TEXT PRIMARY KEY,
  name                     TEXT NOT NULL,
  code                     TEXT NOT NULL UNIQUE,
  manufacturer             TEXT,
  model                    TEXT,
  categoryId               TEXT NOT NULL REFERENCES EquipmentCategory(id),
  description              TEXT,
  defaultMaintenanceDays   INTEGER,
  defaultRentalWarningDays INTEGER,
  requiresApproval         INTEGER NOT NULL DEFAULT 0,
  highRisk                 INTEGER NOT NULL DEFAULT 0,
  createdAt                TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(name, model)
);

CREATE TABLE IF NOT EXISTS EquipmentUnit (
  id                 TEXT PRIMARY KEY,
  assetTag           TEXT NOT NULL UNIQUE,
  serialNumber       TEXT NOT NULL UNIQUE,
  equipmentTypeId    TEXT NOT NULL REFERENCES EquipmentType(id),
  locationId         TEXT NOT NULL REFERENCES Location(id),
  status             TEXT NOT NULL DEFAULT 'AVAILABLE' CHECK(status IN ('AVAILABLE','RESERVED','CHECKED_OUT','OVERDUE','DUE_SOON_MAINTENANCE','IN_MAINTENANCE','OUT_OF_SERVICE')),
  assignedToUserId   TEXT REFERENCES User(id),
  year               INTEGER,
  inServiceDate      TEXT,
  nextMaintenanceDue TEXT,
  lastMaintenanceAt  TEXT,
  notesSummary       TEXT,
  isActive           INTEGER NOT NULL DEFAULT 1,
  createdAt          TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS Rental (
  id              TEXT PRIMARY KEY,
  equipmentUnitId TEXT REFERENCES EquipmentUnit(id),
  equipmentTypeId TEXT NOT NULL REFERENCES EquipmentType(id),
  requesterId     TEXT NOT NULL REFERENCES User(id),
  approverId      TEXT REFERENCES User(id),
  checkedOutById  TEXT REFERENCES User(id),
  returnedById    TEXT REFERENCES User(id),
  locationId      TEXT REFERENCES Location(id),
  status          TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','APPROVED','REJECTED','RESERVED','CHECKED_OUT','RETURNED','OVERDUE','CANCELLED')),
  reason          TEXT NOT NULL,
  jobSite         TEXT,
  requestedStart  TEXT NOT NULL,
  requestedEnd    TEXT NOT NULL,
  approvedStart   TEXT,
  approvedEnd     TEXT,
  checkedOutAt    TEXT,
  returnedAt      TEXT,
  rejectedReason  TEXT,
  createdAt       TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS MaintenanceRecord (
  id              TEXT PRIMARY KEY,
  equipmentUnitId TEXT NOT NULL REFERENCES EquipmentUnit(id) ON DELETE CASCADE,
  technicianId    TEXT REFERENCES User(id),
  status          TEXT NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN','SCHEDULED','IN_PROGRESS','COMPLETED','DEFERRED')),
  trigger         TEXT NOT NULL CHECK("trigger" IN ('ROUTINE','ISSUE_REPORTED','INSPECTION','BREAKDOWN','ADMIN_REQUEST')),
  title           TEXT NOT NULL,
  description     TEXT,
  scheduledFor    TEXT,
  startedAt       TEXT,
  completedAt     TEXT,
  nextDueAt       TEXT,
  issueReportId   TEXT REFERENCES IssueReport(id) ON DELETE SET NULL,
  createdAt       TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS IssueReport (
  id              TEXT PRIMARY KEY,
  equipmentUnitId TEXT NOT NULL REFERENCES EquipmentUnit(id) ON DELETE CASCADE,
  reportedById    TEXT NOT NULL REFERENCES User(id),
  title           TEXT NOT NULL,
  description     TEXT NOT NULL,
  severity        TEXT NOT NULL CHECK(severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  status          TEXT NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN','REVIEWED','IN_PROGRESS','RESOLVED','CLOSED')),
  reportedAt      TEXT NOT NULL DEFAULT (datetime('now')),
  resolvedAt      TEXT
);

CREATE TABLE IF NOT EXISTS Note (
  id                  TEXT PRIMARY KEY,
  authorId            TEXT NOT NULL REFERENCES User(id) ON DELETE CASCADE,
  body                TEXT NOT NULL,
  targetType          TEXT NOT NULL CHECK(targetType IN ('EQUIPMENT_UNIT','RENTAL','MAINTENANCE_RECORD','ISSUE_REPORT')),
  equipmentUnitId     TEXT REFERENCES EquipmentUnit(id) ON DELETE CASCADE,
  rentalId            TEXT REFERENCES Rental(id) ON DELETE CASCADE,
  maintenanceRecordId TEXT REFERENCES MaintenanceRecord(id) ON DELETE CASCADE,
  issueReportId       TEXT REFERENCES IssueReport(id) ON DELETE CASCADE,
  createdAt           TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS AuditLog (
  id                  TEXT PRIMARY KEY,
  action              TEXT NOT NULL CHECK(action IN ('CREATED','UPDATED','DELETED','STATUS_CHANGED','REQUEST_SUBMITTED','REQUEST_APPROVED','REQUEST_REJECTED','CHECKED_OUT','RETURNED','MAINTENANCE_OPENED','MAINTENANCE_COMPLETED','ISSUE_REPORTED','NOTE_ADDED')),
  actorId             TEXT REFERENCES User(id) ON DELETE SET NULL,
  equipmentUnitId     TEXT REFERENCES EquipmentUnit(id) ON DELETE CASCADE,
  rentalId            TEXT REFERENCES Rental(id) ON DELETE CASCADE,
  maintenanceRecordId TEXT REFERENCES MaintenanceRecord(id) ON DELETE CASCADE,
  issueReportId       TEXT REFERENCES IssueReport(id) ON DELETE CASCADE,
  noteId              TEXT REFERENCES Note(id) ON DELETE SET NULL,
  message             TEXT NOT NULL,
  createdAt           TEXT NOT NULL DEFAULT (datetime('now'))
);
