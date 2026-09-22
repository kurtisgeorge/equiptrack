import * as React from 'react'
import { cn } from '../../lib/utils'

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>

export function Select({ className, children, ...props }: SelectProps) {
  return (
    <select
      className={cn(
        'flex h-10 w-full rounded-md border border-slate-300 bg-white pl-3 pr-8 py-2 text-base text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  )
}
