import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
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
    console.error('ErrorBoundary caught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-[#212121] text-[#ececec] p-6 font-sans">
          <div className="max-w-md w-full p-6 bg-[#171717] border border-[#383838] rounded-2xl shadow-2xl flex flex-col items-center text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-[#2f2f2f] flex items-center justify-center text-white">
              <AlertTriangle className="w-6 h-6 text-yellow-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">Something went wrong</h2>
            <p className="text-xs text-[#8e8e8e] leading-relaxed">
              An unexpected error occurred in the application. Click below to reload and continue chatting.
            </p>
            <button
              onClick={this.handleReset}
              className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-200 text-black text-xs font-semibold rounded-xl transition-all shadow-md"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reload Application</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
