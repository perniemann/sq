import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught:', error, info.componentStack)
    }
  }

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback
      }
      return (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            background: 'var(--color-void)',
            color: 'var(--color-opponent)',
            fontFamily: 'monospace',
            fontSize: 14,
          }}
        >
          <div style={{ marginBottom: 16, fontWeight: 'bold' }}>
            Something went wrong
          </div>
          <div style={{ maxWidth: 480, wordBreak: 'break-word' }}>
            {this.state.error.message}
          </div>
          {import.meta.env.DEV && (
            <pre
              style={{
                marginTop: 16,
                fontSize: 11,
                opacity: 0.7,
                maxHeight: 200,
                overflow: 'auto',
              }}
            >
              {this.state.error.stack}
            </pre>
          )}
        </div>
      )
    }
    return this.props.children
  }
}
