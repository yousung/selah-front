import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import './index.css'

// Record current app version
localStorage.setItem('selah-version', __APP_VERSION__)

// Apply saved theme before first paint to prevent flash
try {
  const saved = JSON.parse(localStorage.getItem('selah-settings') ?? '{}')
  if (saved?.state?.theme === 'dark') document.documentElement.classList.add('dark')
} catch {}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
})

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  navigator.serviceWorker
    .register(`${import.meta.env.BASE_URL}service-worker.js`)
    .then((registration) => registration.update().catch(() => {}))
    .catch(() => {})
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
