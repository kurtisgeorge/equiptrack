import { Badge } from './ui/badge'
import type { EquipmentStatus } from '../types/equipment'
import type { RentalStatus } from '../types/rental'

type StatusValue = EquipmentStatus | RentalStatus

type StatusBadgeProps = {
  status: StatusValue
}

const labelMap: Record<StatusValue, string> = {
  available: 'Available',
  in_use: 'In Use',
  maintenance: 'Maintenance',
  pending: 'Pending',
  approved: 'Approved',
  active: 'Active',
  returned: 'Returned',
  rejected: 'Rejected',
}

const variantMap: Record<StatusValue, 'success' | 'info' | 'warning' | 'danger' | 'default'> = {
  available: 'success',
  in_use: 'info',
  maintenance: 'warning',
  pending: 'warning',
  approved: 'info',
  active: 'info',
  returned: 'success',
  rejected: 'danger',
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  return <Badge variant={variantMap[status]}>{labelMap[status]}</Badge>
}
