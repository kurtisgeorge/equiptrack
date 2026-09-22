import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import App from './App'
import { queryClient } from './lib/queryClient'
import { theme } from './theme'
import './index.css'

const SESSION_VERSION = '1'
const SESSION_VERSION_KEY = 'equptrack_session_version'

if (localStorage.getItem(SESSION_VERSION_KEY) !== SESSION_VERSION) {
  localStorage.removeItem('equptrack_session')
  localStorage.setItem(SESSION_VERSION_KEY, SESSION_VERSION)
}

async function enableMocking() {
  const useMocks = import.meta.env.VITE_USE_MOCKS === 'true'

  if (!import.meta.env.DEV || !useMocks) {
    return
  }

  const { worker } = await import('./mocks/browser')

  try {
    await worker.start({ onUnhandledRequest: 'bypass' })
  } catch (error) {
    console.warn('MSW failed to start. Continuing without API mocks.', error)
  }
}

async function bootstrap() {
  await enableMocking()

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </ThemeProvider>
      </QueryClientProvider>
    </StrictMode>,
  )
}

void bootstrap()
