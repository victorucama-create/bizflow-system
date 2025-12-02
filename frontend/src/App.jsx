import React, { Suspense, useEffect } from 'react'
import { BrowserRouter as Router } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useAuthStore } from './store/authStore'
import RouterConfig from './router'
import LoadingSpinner from './components/common/LoadingSpinner'
import SecurityProvider from './components/providers/SecurityProvider'

function App() {
  const { checkAuth, isLoading } = useAuthStore()

  useEffect(() => {
    // Verificar autenticação ao carregar o app
    checkAuth()
  }, [checkAuth])

  return (
    <>
      <Helmet>
        <title>BizFlow - Sistema de Gestão Integrado</title>
        <meta name="description" content="Sistema completo de gestão empresarial" />
      </Helmet>
      
      <Router>
        <SecurityProvider>
          <Suspense fallback={<LoadingSpinner fullScreen />}>
            {isLoading ? (
              <LoadingSpinner fullScreen message="Verificando autenticação..." />
            ) : (
              <RouterConfig />
            )}
          </Suspense>
        </SecurityProvider>
      </Router>
    </>
  )
}

export default App
