import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/outfit/700.css'
import '@fontsource/outfit/800.css'
import './theme/tokens.css'
import App from './App'
import { formatVersionLabel } from './version'

document.title = `sq_ ${formatVersionLabel()}`

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
