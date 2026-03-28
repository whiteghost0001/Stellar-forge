import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n'
import App from './App.tsx'
import { MisconfigurationScreen } from './components/MisconfigurationScreen.tsx'
import { validateEnv } from './utils/envValidation.ts'
import { parseContractError } from './utils/contractErrors.ts'

const { valid, missing } = validateEnv()

// Surface unhandled promise rejections as visible toasts via a custom event.
// ToastBridge in App.tsx listens for this event.
window.addEventListener('unhandledrejection', (event) => {
  const err = parseContractError(event.reason)
  window.dispatchEvent(new CustomEvent('app:unhandled-error', { detail: err.message }))
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {valid ? <App /> : <MisconfigurationScreen missing={missing} />}
  </StrictMode>,
)
