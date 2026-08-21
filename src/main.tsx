import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/chakra-petch/400.css'
import '@fontsource/chakra-petch/700.css'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/700.css'
import './theme/tokens.css'
import { formatVersionLabel } from './version'

const isDesignRoute =
  window.location.pathname === '/design' ||
  window.location.pathname === '/design/'

async function boot(): Promise<void> {
  if (isDesignRoute) {
    document.documentElement.style.overflow = 'auto'
    document.body.style.overflow = 'auto'
    const rootEl = document.getElementById('root')
    if (rootEl) rootEl.style.minHeight = '100%'
    document.title = `sq_ design · ${formatVersionLabel()}`
    const { default: DesignReference } = await import('./ui/DesignReference')
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <DesignReference />
      </StrictMode>,
    )
    return
  }

  document.title = `sq_ ${formatVersionLabel()}`
  const { default: App } = await import('./App')
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

void boot()
