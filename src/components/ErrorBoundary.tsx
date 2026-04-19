import React, { Component, ErrorInfo, ReactNode, PropsWithChildren } from 'react';
import { Button } from './ui/button';

interface Props {}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<PropsWithChildren<Props>, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
          <div className="max-w-md w-full bg-white rounded-3xl p-12 shadow-xl text-center">
            <h2 className="text-3xl font-light mb-4">Something went wrong</h2>
            <p className="text-accent/60 mb-8">
              We encountered an unexpected error. Please try refreshing the page.
            </p>
            <Button 
              onClick={() => window.location.reload()}
              className="bg-primary hover:bg-primary/90 text-white rounded-full px-8"
            >
              Refresh Page
            </Button>
            {import.meta.env.DEV && (
              <pre className="mt-8 p-4 bg-red-50 text-red-600 text-xs text-left overflow-auto rounded-xl">
                {this.state.error?.message}
              </pre>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
