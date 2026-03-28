import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n'
import App from './App.tsx'
import { MisconfigurationScreen } from './components/MisconfigurationScreen.tsx'
import { validateEnv } from './utils/envValidation.ts'

const { valid, missing } = validateEnv()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {valid ? <App /> : <MisconfigurationScreen missing={missing} />}
  </StrictMode>,
)
