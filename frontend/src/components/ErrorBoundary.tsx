import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';


interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full w-full bg-[#070b14] text-slate-200 p-8 select-none">
          <div className="max-w-md w-full bg-slate-900/90 border border-red-800/80 rounded-xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <div className="p-2.5 bg-red-950/80 border border-red-800 rounded-lg">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-slate-100">
                  {this.props.fallbackTitle || 'Topological Canvas Exception'}
                </h3>
                <p className="text-xs text-slate-400">An unexpected rendering anomaly occurred.</p>
              </div>
            </div>

            {this.state.error && (
              <pre className="p-3 bg-slate-950 rounded font-mono text-[11px] text-red-300 overflow-x-auto border border-slate-800/80">
                {this.state.error.message || String(this.state.error)}
              </pre>
            )}

            <button
              onClick={this.handleReset}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-semibold rounded border border-slate-700 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow"
            >
              <RefreshCw size={14} className="text-cyan-400" />
              <span>Reset & Reload Workspace</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
