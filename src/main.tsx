import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App, { ErrorBoundary } from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)

if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL })
    .then((reg) => {
      reg.addEventListener('updatefound', () => {
        if (!window.crossOriginIsolated) window.location.reload()
      })
      if (reg.active && !navigator.serviceWorker.controller && !window.crossOriginIsolated) {
        window.location.reload()
      }
    })
    .catch(() => {})
}
