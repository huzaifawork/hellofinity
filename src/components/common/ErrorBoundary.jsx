import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Caught error:', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          fontFamily: 'system-ui, sans-serif',
          background: '#F5F2ED',
          color: '#22100C',
        }}>
          <div style={{
            background: '#fff',
            border: '1px solid rgba(34,16,12,0.15)',
            borderRadius: 12,
            padding: '2rem',
            maxWidth: 520,
            width: '100%',
          }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Something went wrong</h2>
            <p style={{ fontSize: 13, color: '#8A6A60', marginBottom: 16, lineHeight: 1.6 }}>
              The app ran into an error. Check the browser console for details.
            </p>
            <pre style={{
              background: '#F0EDE8',
              borderRadius: 8,
              padding: '1rem',
              fontSize: 11,
              overflowX: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              color: '#C4614A',
              marginBottom: 16,
            }}>
              {this.state.error?.message || String(this.state.error)}
            </pre>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: '#22100C',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '10px 20px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                width: '100%',
              }}
            >
              Reload app
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
