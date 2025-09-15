import { Component, ReactNode } from 'react';

interface Props { children: ReactNode; fallback?: ReactNode; onError?: (error: any, info: any) => void }
interface State { hasError: boolean; error: any }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: any): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, info: any) {
    this.props.onError?.(error, info);
    // Optionally log to telemetry later
    // captureError(error, { info });
  }

  reset = () => this.setState({ hasError: false, error: null });

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-6 border border-red-300 rounded bg-red-50 text-sm text-red-800 space-y-3">
          <div className="font-semibold">Something went wrong.</div>
          <pre className="whitespace-pre-wrap text-xs overflow-auto max-h-48">{String(this.state.error)}</pre>
          <button onClick={this.reset} className="btn btn-secondary btn-sm">Retry</button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
