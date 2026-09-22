import type { ReactNode } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'

type EmptyStateProps = {
  title: string
  description?: string
  action?: ReactNode
  icon?: ReactNode
}

export default function EmptyState({
  title,
  description,
  action,
  icon,
}: EmptyStateProps) {
  return (
    <Card className="border-dashed">
      <CardHeader className="items-center text-center">
        {icon ? <div className="rounded-full bg-slate-100 dark:bg-slate-700 p-3">{icon}</div> : null}
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      {action ? (
        <CardContent className="flex justify-center">
          {action}
        </CardContent>
      ) : null}
    </Card>
  )
}
