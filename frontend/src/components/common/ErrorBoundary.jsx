import React from 'react'
import { AlertTriangle } from 'lucide-react'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    // Log error to monitoring service
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    
    // You can send to error monitoring service here
    // logErrorToService(error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Algo deu errado
              </h2>
              <p className="text-gray-600 mb-6">
                Ocorreu um erro inesperado no aplicativo.
              </p>
              
              {process.env.NODE_ENV === 'development' && (
                <details className="mb-6 text-left">
                  <summary className="cursor-pointer text-sm font-medium text-gray-700 mb-2">
                    Detalhes do erro
                  </summary>
                  <pre className="text-xs text-gray-500 bg-gray-100 p-4 rounded-lg overflow-auto">
                    {this.state.error.toString()}
                  </pre>
                </details>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => window.location.reload()}
                  className="flex-1 btn-primary"
                >
                  Recarregar Página
                </button>
                <button
                  onClick={() => this.setState({ hasError: false, error: null })}
                  className="flex-1 btn-outline"
                >
                  Tentar Novamente
                </button>
              </div>
              
              <p className="mt-6 text-sm text-gray-500">
                Se o problema persistir, entre em contato com o suporte.
              </p>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
