import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangleIcon, HomeIcon, RefreshCwIcon } from 'lucide-react';
interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
  error: Error | null;
}
class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };
  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error
    };
  }
  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }
  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4 text-center">
          <div className="bg-red-50 p-4 rounded-full mb-4">
            <AlertTriangleIcon className="h-12 w-12 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Oops! Something went wrong.
          </h1>
          <p className="text-gray-600 mb-8 max-w-md">
            We apologize for the inconvenience. An unexpected error has
            occurred.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
            <button
              onClick={() => window.location.reload()}
              className="flex-1 flex items-center justify-center gap-2 bg-teal-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-teal-600 transition-colors">

              <RefreshCwIcon size={18} />
              Try Again
            </button>
            <button
              onClick={() => window.location.href = '/home'}
              className="flex-1 flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors">

              <HomeIcon size={18} />
              Go Home
            </button>
          </div>

          {process.env.NODE_ENV === 'development' && this.state.error &&
          <div className="mt-8 p-4 bg-gray-100 rounded-lg text-left w-full max-w-lg overflow-auto">
              <p className="text-xs font-mono text-red-600">
                {this.state.error.toString()}
              </p>
            </div>
          }
        </div>);

    }
    return this.props.children;
  }
}
export default ErrorBoundary;