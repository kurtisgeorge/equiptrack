import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(isoDate?: string): string {
  if (!isoDate) return '-'

  const date = new Date(isoDate)
  if (Number.isNaN(date.getTime())) return isoDate

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

export function formatDateTime(isoDate?: string): string {
  if (!isoDate) return '-'

  const date = new Date(isoDate)
  if (Number.isNaN(date.getTime())) return isoDate

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}
