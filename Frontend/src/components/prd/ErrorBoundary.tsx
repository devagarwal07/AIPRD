// Automatic JSX runtime: default React import not required
import { Component, type ReactNode } from 'react';

interface Props { name: string; children: ReactNode; }
interface State { hasError: boolean; err?: any; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };
  static getDerivedStateFromError(err: any): State { return { hasError: true, err }; }
  componentDidCatch(err: any, info: any) { console.error(`[Boundary:${this.props.name}]`, err, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 border border-red-300 bg-red-50 rounded text-sm">
          <div className="font-semibold text-red-700 mb-1">{this.props.name} crashed</div>
          <button className="btn btn-secondary btn-xs" onClick={()=>this.setState({ hasError:false, err:undefined })}>Retry</button>
        </div>
      );
    }
    return this.props.children;
  }
}
