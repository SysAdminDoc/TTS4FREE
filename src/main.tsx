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
        if (!window.crossOriginIsolated) {
          reloadOnceForIsolation()
        } else {
          // Already isolated: a new build is installing. Tell the app instead
          // of yanking the page out from under the user.
          const worker = reg.installing
          worker?.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) {
              window.dispatchEvent(new CustomEvent('bettertts-update-ready'))
            }
          })
        }
      })
      if (reg.active && !navigator.serviceWorker.controller && !window.crossOriginIsolated) {
        reloadOnceForIsolation()
      }
    })
    .catch(() => {})
}

// The first visit needs one reload so the SW can inject COOP/COEP headers;
// a session flag stops that from ever looping.
function reloadOnceForIsolation() {
  try {
    if (window.sessionStorage.getItem('bettertts-isolation-reload') === '1') return
    window.sessionStorage.setItem('bettertts-isolation-reload', '1')
  } catch {
    /* storage blocked — reload anyway, worst case the old single-reload behavior */
  }
  window.location.reload()
}
