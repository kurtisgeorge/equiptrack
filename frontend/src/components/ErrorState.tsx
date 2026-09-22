import { AlertTriangle } from 'lucide-react'
import { ApiRequestError } from '../services/apiClient'
import { Button } from './ui/button'

type ErrorStateProps = {
  error: unknown
  title?: string
  onRetry?: () => void
}

function getMessage(error: unknown): string {
  if (error instanceof ApiRequestError) {
    const details = error.details
    if (details && typeof details === 'object' && 'message' in details) {
      return String(details.message)
    }

    return `${error.message} (HTTP ${error.status})`
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'Something went wrong.'
}

export default function ErrorState({
  error,
  title = 'Request failed',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-900">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5" />
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide">{title}</h2>
          <p className="mt-2 text-sm">{getMessage(error)}</p>
          {onRetry ? (
            <Button className="mt-4" onClick={onRetry} size="sm" variant="default">
              Retry
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
