import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('[ErrorBoundary] Error capturado:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background-light flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-error-light flex items-center justify-center mb-6 shadow-lg">
              <AlertTriangle size={40} className="text-error" />
            </div>

            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              Algo salió mal
            </h1>
            <p className="text-gray-500 mb-8">
              Ocurrió un error inesperado. Puedes intentar recargar la página o volver al inicio.
            </p>

            {import.meta.env.DEV && this.state.error && (
              <details className="mb-6 text-left">
                <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600 mb-2">
                  Detalles del error (solo en desarrollo)
                </summary>
                <pre className="text-xs bg-gray-100 rounded-xl p-4 overflow-auto max-h-48 text-red-700 border border-red-100">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleGoHome}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 border-primary-500 text-primary-600 hover:bg-primary-50 font-medium transition-all text-sm"
              >
                <Home size={16} />
                Ir al Inicio
              </button>
              <button
                onClick={this.handleReload}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-medium shadow-md transition-all text-sm"
              >
                <RefreshCw size={16} />
                Recargar Página
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
