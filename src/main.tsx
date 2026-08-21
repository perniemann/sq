import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/chakra-petch/400.css'
import '@fontsource/chakra-petch/700.css'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/700.css'
import './theme/tokens.css'
import { formatVersionLabel } from './version'

const App = lazy(() => import('./App'))
const DesignReferencePage = lazy(
  () => import('./dev/design-reference/DesignReferencePage'),
)

function isDesignPath(pathname: string): boolean {
  const p = pathname.replace(/\/+$/, '') || '/'
  return p === '/design' || p.startsWith('/design/')
}

const path = window.location.pathname
const isDesign = isDesignPath(path)

document.title = isDesign
  ? 'Design reference · sq_'
  : `sq_ ${formatVersionLabel()}`

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense
      fallback={
        <p
          style={{
            margin: 24,
            color: 'var(--color-ink-muted)',
            fontFamily: '"IBM Plex Mono", ui-monospace, monospace',
          }}
        >
          {isDesign ? 'Loading design reference…' : 'Loading…'}
        </p>
      }
    >
      {isDesign ? <DesignReferencePage /> : <App />}
    </Suspense>
  </StrictMode>,
)
