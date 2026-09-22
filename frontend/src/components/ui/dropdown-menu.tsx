import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu'
import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

export const DropdownMenu = DropdownMenuPrimitive.Root
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger

export function DropdownMenuContent({
  className,
  sideOffset = 4,
  ...props
}: DropdownMenuPrimitive.DropdownMenuContentProps) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        className={cn(
          'z-50 min-w-[180px] rounded-md border border-slate-200 bg-white p-1 shadow-lg dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100',
          className,
        )}
        sideOffset={sideOffset}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  )
}

export function DropdownMenuLabel({ className, ...props }: DropdownMenuPrimitive.DropdownMenuLabelProps) {
  return <DropdownMenuPrimitive.Label className={cn('px-2 py-1.5 text-sm font-medium', className)} {...props} />
}

export function DropdownMenuSeparator({ className, ...props }: DropdownMenuPrimitive.DropdownMenuSeparatorProps) {
  return <DropdownMenuPrimitive.Separator className={cn('-mx-1 my-1 h-px bg-slate-200 dark:bg-slate-700', className)} {...props} />
}

export function DropdownMenuItem({
  className,
  inset,
  children,
  ...props
}: DropdownMenuPrimitive.DropdownMenuItemProps & { inset?: boolean; children: ReactNode }) {
  return (
    <DropdownMenuPrimitive.Item
      className={cn(
        'relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-slate-100 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 dark:focus:bg-slate-700 dark:focus:text-slate-100',
        inset && 'pl-8',
        className,
      )}
      {...props}
    >
      {children}
    </DropdownMenuPrimitive.Item>
  )
}
