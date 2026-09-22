import { LoaderCircle } from 'lucide-react'

type LoaderProps = {
  label?: string
}

export default function Loader({ label = 'Loading...' }: LoaderProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700 p-10 text-center">
      <LoaderCircle className="h-6 w-6 animate-spin text-slate-500 dark:text-slate-400" />
      <p className="text-sm text-slate-600 dark:text-slate-400">{label}</p>
    </div>
  )
}
