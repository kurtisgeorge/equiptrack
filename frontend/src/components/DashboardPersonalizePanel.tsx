import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from './ui/dialog'
import { SlidersHorizontal, ChevronUp, ChevronDown, X } from 'lucide-react'
import type { WidgetDef } from '../hooks/useDashboardLayout'

type Props = {
  widgets: Array<WidgetDef & { visible: boolean }>
  onMoveUp: (id: string) => void
  onMoveDown: (id: string) => void
  onToggle: (id: string) => void
  onReset: () => void
  accentColor?: string
}

export default function DashboardPersonalizePanel({
  widgets,
  onMoveUp,
  onMoveDown,
  onToggle,
  onReset,
  accentColor = '#1A4889',
}: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-500 hover:border-slate-300 hover:text-slate-700 hover:shadow-sm transition-all"
      >
        <SlidersHorizontal className="h-3.5 w-3.5" />
        Personalize
      </button>

      {/* Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="p-0 overflow-hidden max-w-md w-full rounded-xl shadow-xl border-0">
          {/* Colored header band */}
          <div
            className="flex items-start justify-between px-5 py-4"
            style={{ backgroundColor: accentColor }}
          >
            <div>
              <DialogTitle className="text-base font-semibold text-white leading-tight">
                Customize Dashboard
              </DialogTitle>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.75)' }}>
                Show, hide, and reorder individual cards.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="ml-4 mt-0.5 text-white/70 hover:text-white transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Widget list */}
          <div className="divide-y divide-slate-100 max-h-[60vh] overflow-y-auto">
            {widgets.map((w, idx) => (
              <div key={w.id} className="flex items-center gap-3 px-5 py-3.5">
                {/* Visibility toggle switch (CSS-only) */}
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={w.visible}
                    onChange={() => onToggle(w.id)}
                  />
                  <div
                    className={`w-9 h-5 rounded-full transition-colors ${
                      w.visible ? '' : 'bg-slate-200'
                    }`}
                    style={w.visible ? { backgroundColor: accentColor } : {}}
                  />
                  <div
                    className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                      w.visible ? 'translate-x-4' : ''
                    }`}
                  />
                </label>

                {/* Label + description */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold text-slate-800 leading-tight truncate">
                      {w.label}
                    </p>
                    {w.size === 'wide' && (
                      <span className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-400 bg-slate-100">
                        Full width
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 leading-snug line-clamp-2">
                    {w.description}
                  </p>
                </div>

                {/* Up / Down reorder buttons */}
                <div className="flex flex-col gap-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => onMoveUp(w.id)}
                    disabled={idx === 0}
                    aria-label={`Move ${w.label} up`}
                    className="h-7 w-7 rounded-md border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:border-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onMoveDown(w.id)}
                    disabled={idx === widgets.length - 1}
                    aria-label={`Move ${w.label} down`}
                    className="h-7 w-7 rounded-md border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:border-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-100 bg-slate-50">
            <button
              type="button"
              onClick={() => {
                onReset()
              }}
              className="text-xs text-slate-400 hover:text-slate-700 transition-colors"
            >
              Reset to defaults
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-4 py-1.5 rounded-md text-sm font-medium text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: accentColor }}
            >
              Done
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
