import { Component } from 'react'
import type { ReactNode, ErrorInfo } from 'react'
import { Button } from './ui/Button'

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

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex min-h-screen items-center justify-center bg-canvas p-8">
          <div className="w-full max-w-md border-2 border-black bg-white p-8 shadow-brutal-xl">
            <h1 className="mb-4 font-heading text-2xl font-extrabold uppercase text-black">
              Something went wrong
            </h1>
            <p className="mb-6 font-body text-sm text-text-subtle">
              An unexpected error occurred. You can try again or refresh the page.
            </p>
            {this.state.error && (
              <pre className="mb-6 overflow-auto border border-black bg-hover p-4 font-mono text-xs text-text-subtle">
                {this.state.error.message}
              </pre>
            )}
            <div className="flex gap-3">
              <Button onClick={this.handleRetry}>Try Again</Button>
              <Button variant="secondary" onClick={() => window.location.reload()}>
                Refresh Page
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
