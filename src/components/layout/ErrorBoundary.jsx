import { Component } from 'react'
import ErrorScreen from './ErrorScreen'

const DEFAULT_MESSAGE = 'This part of Maketa stopped working.'

// Catches an error thrown while rendering its children and shows ErrorScreen
// instead of a blank page (I.3). React needs a class component for this, and
// logs the error itself. It starts fresh when it mounts again (e.g. after a
// mode switch).
export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (this.state.error) return <ErrorScreen message={this.props.message ?? DEFAULT_MESSAGE} />
    return this.props.children
  }
}
