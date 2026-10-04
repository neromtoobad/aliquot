import {Component, type ReactNode} from 'react'

// Show a crash on screen instead of a blank Dashboard frame.
export class ErrorBoundary extends Component<{children: ReactNode}, {error?: Error}> {
  state: {error?: Error} = {}
  static getDerivedStateFromError(error: Error) {
    return {error}
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{padding: 24, fontFamily: 'ui-monospace, monospace', fontSize: 13, color: '#b4321f', whiteSpace: 'pre-wrap', background: '#fffdf8', minHeight: '100%'}}>
          <b>Bench Court hit an error</b>
          {'\n\n'}
          {String(this.state.error?.message)}
          {'\n\n'}
          {this.state.error?.stack?.split('\n').slice(0, 8).join('\n')}
        </div>
      )
    }
    return this.props.children
  }
}
