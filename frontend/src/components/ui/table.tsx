import * as React from 'react'
import { cn } from '../../lib/utils'

export function Table({ className, ...props }: React.ComponentProps<'table'>) {
  return <table className={cn('w-full caption-bottom text-sm', className)} {...props} />
}

export function TableHeader({ className, ...props }: React.ComponentProps<'thead'>) {
  return <thead className={cn('[&_tr]:border-b', className)} {...props} />
}

export function TableBody({ className, ...props }: React.ComponentProps<'tbody'>) {
  return <tbody className={cn('[&_tr:last-child]:border-0', className)} {...props} />
}

export function TableRow({ className, ...props }: React.ComponentProps<'tr'>) {
  return (
    <tr
      className={cn(
        'border-b border-slate-200 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700/40',
        className,
      )}
      {...props}
    />
  )
}

export function TableHead({ className, ...props }: React.ComponentProps<'th'>) {
  return (
    <th
      className={cn(
        'h-11 px-4 text-left align-middle font-medium text-slate-600 dark:text-slate-400',
        className,
      )}
      {...props}
    />
  )
}

export function TableCell({ className, ...props }: React.ComponentProps<'td'>) {
  return (
    <td
      className={cn('p-4 align-middle text-slate-800 dark:text-slate-200', className)}
      {...props}
    />
  )
}
