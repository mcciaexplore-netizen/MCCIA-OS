import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './ui/Button';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Optional custom fallback renderer. */
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Catches render-time errors in its subtree and shows a recoverable fallback
 * UI with a retry button. Use around route content so one page crashing does
 * not take down the whole shell.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // In production this is where you'd forward to an error reporter.
    console.error('ErrorBoundary caught an error:', error, info);
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (this.props.fallback) return this.props.fallback(error, this.reset);

    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-900/50 dark:text-rose-300">
          <AlertTriangle className="h-7 w-7" aria-hidden />
        </div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          This view hit an unexpected error
        </h2>
        <p className="mt-1 max-w-md text-sm text-slate-600 dark:text-slate-400">
          {error.message || 'An unknown error occurred while rendering this page.'}
        </p>
        <Button variant="primary" className="mt-6" onClick={this.reset}>
          <RefreshCw className="h-4 w-4" />
          Reload this view
        </Button>
      </div>
    );
  }
}
