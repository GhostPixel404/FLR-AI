import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './ui/theme.css'
import { useStore } from './store/useStore'
import { applyTheme } from './util/theme'

// Resolve the saved theme before first paint to avoid a flash.
applyTheme(useStore.getState().settings.theme)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
