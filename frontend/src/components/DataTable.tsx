import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type Row,
  type SortingState,
} from '@tanstack/react-table'
import { useState } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown, Search, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react'
import { Input } from './ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table'
import { Button } from './ui/button'
import EmptyState from './EmptyState'

type DataTableProps<TData> = {
  data: TData[]
  columns: ColumnDef<TData>[]
  searchPlaceholder?: string
  searchValue?: string
  onSearchValueChange?: (value: string) => void
  emptyTitle: string
  emptyDescription?: string
  pageSize?: number
}

function MobileAccordionRow<TData>({ row }: { row: Row<TData> }) {
  const [expanded, setExpanded] = useState(false)
  const firstCell = row.getVisibleCells()[0]
  const otherCells = row.getVisibleCells().slice(1)

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden dark:bg-slate-800 dark:border-slate-700">
      <button
        className="flex w-full items-center justify-between px-4 py-3.5 text-left font-medium text-slate-900 hover:bg-slate-50 transition-colors dark:text-slate-100 dark:hover:bg-slate-700/50"
        onClick={() => setExpanded(!expanded)}
        type="button"
      >
        <div>{flexRender(firstCell.column.columnDef.cell, firstCell.getContext())}</div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-slate-400 shrink-0 ml-2" />
        ) : (
          <ChevronDown className="h-4 w-4 text-slate-400 shrink-0 ml-2" />
        )}
      </button>
      {expanded && (
        <div className="space-y-3 border-t border-slate-100 bg-slate-50/50 p-4 dark:border-slate-700 dark:bg-slate-700/30">
          {otherCells.map((cell) => {
            const header =
              typeof cell.column.columnDef.header === 'string'
                ? cell.column.columnDef.header
                : cell.column.id
            return (
              <div className="flex flex-col gap-1" key={cell.id}>
                <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  {header}
                </span>
                <div className="text-sm text-slate-800 dark:text-slate-200">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function DataTable<TData>({
  data,
  columns,
  searchPlaceholder,
  searchValue,
  onSearchValueChange,
  emptyTitle,
  emptyDescription,
  pageSize,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const paginationEnabled = typeof pageSize === 'number' && pageSize > 0

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    ...(paginationEnabled
      ? {
          getPaginationRowModel: getPaginationRowModel(),
          initialState: { pagination: { pageSize } },
        }
      : {}),
  })

  const hasRows = table.getRowModel().rows.length > 0

  const paginationControls = paginationEnabled && table.getPageCount() > 1 && (
    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 dark:bg-slate-800 dark:border-slate-700">
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Page <span className="font-semibold text-slate-800 dark:text-slate-200">{table.getState().pagination.pageIndex + 1}</span> of{' '}
        <span className="font-semibold text-slate-800 dark:text-slate-200">{table.getPageCount()}</span>
        <span className="ml-2 text-slate-400 text-xs dark:text-slate-500">({data.length} total)</span>
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
          className="gap-1"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Prev
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
          className="gap-1"
        >
          Next
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )

  return (
    <div className="space-y-3">
      {onSearchValueChange && (
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            className="pl-9"
            onChange={(e) => onSearchValueChange(e.target.value)}
            placeholder={searchPlaceholder ?? 'Search…'}
            value={searchValue ?? ''}
          />
        </div>
      )}

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm md:block dark:bg-slate-800 dark:border-slate-700">
        <div className="w-full overflow-x-auto">
          <Table className="min-w-[720px]">
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="bg-slate-50 hover:bg-slate-50 border-b border-slate-200 dark:bg-slate-700/50 dark:hover:bg-slate-700/50 dark:border-slate-700">
                  {headerGroup.headers.map((header) => {
                    const canSort = header.column.getCanSort()
                    return (
                      <TableHead key={header.id} className="h-11 px-4 py-2">
                        {header.isPlaceholder ? null : canSort ? (
                          <button
                            className="flex items-center gap-1.5 text-left font-semibold uppercase tracking-widest text-[11px] text-slate-500 hover:text-slate-900 transition-colors dark:text-slate-400 dark:hover:text-slate-100"
                            onClick={header.column.getToggleSortingHandler()}
                            type="button"
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {header.column.getIsSorted() === 'asc' ? (
                              <ArrowUp className="h-3 w-3 text-blue-500" />
                            ) : header.column.getIsSorted() === 'desc' ? (
                              <ArrowDown className="h-3 w-3 text-blue-500" />
                            ) : (
                              <ArrowUpDown className="h-3 w-3 text-slate-300" />
                            )}
                          </button>
                        ) : (
                          <span className="font-semibold uppercase tracking-widest text-[11px] text-slate-500 dark:text-slate-400">
                            {flexRender(header.column.columnDef.header, header.getContext())}
                          </span>
                        )}
                      </TableHead>
                    )
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {hasRows ? (
                table.getRowModel().rows.map((row, i) => (
                  <TableRow
                    key={row.id}
                    className={`border-b border-slate-100 hover:bg-slate-50/80 transition-colors dark:border-slate-700 dark:hover:bg-slate-700/40 ${i % 2 === 1 ? 'bg-slate-50/30 dark:bg-slate-700/20' : ''}`}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="px-4 py-3">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell className="py-12" colSpan={columns.length}>
                    <EmptyState description={emptyDescription} title={emptyTitle} />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Mobile accordion */}
      <div className="space-y-2 md:hidden">
        {hasRows ? (
          table.getRowModel().rows.map((row) => (
            <MobileAccordionRow key={row.id} row={row} />
          ))
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white py-12 dark:bg-slate-800 dark:border-slate-700">
            <EmptyState description={emptyDescription} title={emptyTitle} />
          </div>
        )}
      </div>

      {paginationControls}
    </div>
  )
}
