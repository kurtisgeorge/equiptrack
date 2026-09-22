import { Toaster } from 'sonner'
import AppRouter from './app/router'

export default function App() {
  return (
    <>
      <AppRouter />
      <Toaster position="top-right" richColors closeButton offset="60px" />
    </>
  )
}
