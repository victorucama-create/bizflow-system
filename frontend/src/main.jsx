import React from 'react'
import ReactDOM from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import { QueryClient, QueryClientProvider } from 'react-query'
import { ErrorBoundary } from 'react-error-boundary'
import { Toaster } from 'react-hot-toast'
import App from './App.jsx'
import './assets/css/global.css'

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    },
  },
})

// Error Fallback Component
const ErrorFallback = ({ error, resetErrorBoundary }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
      <div className="text-red-500 text-6xl mb-4">⚠️</div>
      <h2 className="text-2xl font-bold text-gray-800 mb-2">Algo deu errado</h2>
      <p className="text-gray-600 mb-4">
        Ocorreu um erro inesperado. Por favor, tente novamente.
      </p>
      <details className="mb-4 text-left">
        <summary className="cursor-pointer text-sm text-gray-500 mb-2">
          Detalhes do erro
        </summary>
        <pre className="text-xs text-gray-500 bg-gray-100 p-3 rounded overflow-auto">
          {error.message}
        </pre>
      </details>
      <button
        onClick={resetErrorBoundary}
        className="bg-primary text-white px-6 py-2 rounded-lg font-medium hover:bg-primary/90 transition"
      >
        Tentar novamente
      </button>
    </div>
  </div>
)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={() => window.location.reload()}
    >
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                duration: 3000,
                iconTheme: {
                  primary: '#4cc9f0',
                  secondary: '#fff',
                },
              },
              error: {
                duration: 5000,
                iconTheme: {
                  primary: '#f72585',
                  secondary: '#fff',
                },
              },
            }}
          />
          <App />
        </QueryClientProvider>
      </HelmetProvider>
    </ErrorBoundary>
  </React.StrictMode>
)
