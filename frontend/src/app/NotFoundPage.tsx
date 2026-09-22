import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { Button } from '../components/ui/button'

export default function NotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 w-fit rounded-full bg-slate-100 p-3">
          <Compass className="h-5 w-5 text-slate-500" />
        </div>
        <h1 className="text-2xl font-semibold text-slate-900">Page not found</h1>
        <p className="mt-2 text-sm text-slate-600">
          The page you requested does not exist or has moved.
        </p>
        <Button asChild className="mt-6">
          <Link to="/">Back to home</Link>
        </Button>
      </div>
    </main>
  )
}
