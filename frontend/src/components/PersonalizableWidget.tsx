import { X } from 'lucide-react'

type Props = {
  id: string
  label: string
  personalizing: boolean
  isDragOver: boolean
  onRemove: () => void
  onDragStart: () => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: () => void
  onDragEnd: () => void
  sizeClass?: string
  children: React.ReactNode
}

export default function PersonalizableWidget({
  id: _id,
  label,
  personalizing,
  isDragOver,
  onRemove,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  sizeClass = '',
  children,
}: Props) {
  return (
    <div
      className={[
        'relative h-full [&>*]:h-full',
        sizeClass,
        personalizing
          ? `cursor-grab rounded-xl outline outline-2 transition-all ${
              isDragOver
                ? 'outline-blue-400 shadow-lg scale-[0.99]'
                : 'outline-slate-200 dark:outline-slate-600 hover:outline-slate-300 dark:hover:outline-slate-500'
            }`
          : '',
      ]
        .filter(Boolean)
        .join(' ')}
      draggable={personalizing}
      onDragStart={personalizing ? onDragStart : undefined}
      onDragOver={
        personalizing
          ? (e) => {
              e.preventDefault()
              onDragOver(e)
            }
          : undefined
      }
      onDrop={personalizing ? onDrop : undefined}
      onDragEnd={personalizing ? onDragEnd : undefined}
    >
      {children}

      {/* ✕ remove button — floats outside the top-right corner */}
      {personalizing && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className="absolute -right-2.5 -top-2.5 z-30 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow-md transition-colors hover:bg-red-600 active:scale-95"
          aria-label={`Hide ${label}`}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}
