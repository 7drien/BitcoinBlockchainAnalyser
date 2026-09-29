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
        <div className="flex flex-col items-center justify-center h-full w-full bg-black text-white p-8 select-none">
          <div className="max-w-md w-full bg-[#121212] border border-neutral-700 rounded-xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-white">
              <div className="p-2.5 bg-[#1c1c1c] border border-neutral-600 rounded-lg">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-white">
                  {this.props.fallbackTitle || 'Application Exception'}
                </h3>
                <p className="text-xs text-neutral-400">An unexpected rendering error occurred.</p>
              </div>
            </div>

            {this.state.error && (
              <pre className="p-3 bg-black rounded font-mono text-[11px] text-neutral-300 overflow-x-auto border border-neutral-800">
                {this.state.error.message || String(this.state.error)}
              </pre>
            )}

            <button
              onClick={this.handleReset}
              className="w-full py-2 bg-white hover:bg-neutral-200 text-black text-xs font-mono font-bold rounded transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <RefreshCw size={14} className="text-black" />
              <span>Reset & Reload Workspace</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
