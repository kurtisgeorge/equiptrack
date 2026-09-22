import * as React from 'react'
import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog'
import { cn } from '../../lib/utils'

export const AlertDialog = AlertDialogPrimitive.Root
export const AlertDialogTrigger = AlertDialogPrimitive.Trigger
export const AlertDialogAction = AlertDialogPrimitive.Action
export const AlertDialogCancel = AlertDialogPrimitive.Cancel

export function AlertDialogContent({ className, ...props }: AlertDialogPrimitive.AlertDialogContentProps) {
  return (
    <AlertDialogPrimitive.Portal>
      <AlertDialogPrimitive.Overlay className="fixed inset-0 z-40 bg-slate-950/40" />
      <AlertDialogPrimitive.Content
        className={cn(
          'fixed left-1/2 top-1/2 z-50 w-[95vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700 p-6 shadow-xl',
          className,
        )}
        {...props}
      />
    </AlertDialogPrimitive.Portal>
  )
}

export function AlertDialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('space-y-2 text-left', className)} {...props} />
}

export function AlertDialogTitle({ className, ...props }: AlertDialogPrimitive.AlertDialogTitleProps) {
  return <AlertDialogPrimitive.Title className={cn('text-lg font-semibold text-slate-900 dark:text-slate-100', className)} {...props} />
}

export function AlertDialogDescription({
  className,
  ...props
}: AlertDialogPrimitive.AlertDialogDescriptionProps) {
  return <AlertDialogPrimitive.Description className={cn('text-sm text-slate-600 dark:text-slate-400', className)} {...props} />
}

export function AlertDialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mt-4 flex justify-end gap-2', className)} {...props} />
}
