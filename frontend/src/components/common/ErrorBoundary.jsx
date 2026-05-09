import React from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="card p-12 bg-danger-bg border border-danger-border text-center space-y-6 animate-in zoom-in duration-300">
          <div className="w-20 h-20 rounded-full bg-danger-bg border border-danger-border flex items-center justify-center mx-auto text-danger-fg shadow-[0_0_40px_rgba(244,63,94,0.2)]">
            <AlertTriangle size={40} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-primary mb-2">Something went wrong</h2>
            <p className="text-secondary text-sm max-w-md mx-auto mb-4">
              {this.state.error?.message || "An unexpected error occurred in the application UI."}
            </p>
            <pre className="p-4 bg-void/50 rounded-xl text-xs text-danger-fg/70 overflow-auto text-left max-h-[200px] custom-scrollbar border border-border-subtle">
              {this.state.error?.stack}
            </pre>
          </div>
          <button 
            onClick={() => window.location.reload()} 
            className="btn-primary px-8 py-3 flex items-center gap-2 mx-auto"
          >
            <RefreshCcw size={18} /> Reload Application
          </button>
        </div>
      );
    }

    return this.props.children; 
  }
}

export default ErrorBoundary;
