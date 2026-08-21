import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/outfit/700.css'
import '@fontsource/outfit/800.css'
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

const path = typeof window !== 'undefined' ? window.location.pathname : '/'
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
            fontFamily: 'monospace',
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
