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
    .then(async (registration) => {
      registration.update().catch(() => {})
      // 첫 설치 시엔 active SW가 아직 페이지를 제어하지 않는다(controller=null).
      // 다운로드된 미디어가 로컬(SW)로 재생되려면 controller 확보가 필요하므로,
      // 설치 완료를 기다렸다가 controllerchange가 빨리 오도록 ready를 대기한다.
      if (!navigator.serviceWorker.controller) {
        await navigator.serviceWorker.ready.catch(() => {})
      }
    })
    .catch(() => {})
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
