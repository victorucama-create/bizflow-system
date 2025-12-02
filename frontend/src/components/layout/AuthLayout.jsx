import React from 'react'
import { Link, Outlet } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'

const AuthLayout = () => {
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gradient-to-br from-primary/10 to-secondary/10">
      {/* Left Panel - Branding */}
      <div className="md:w-1/2 bg-gradient-to-br from-primary to-secondary p-8 md:p-12 lg:p-16 text-white flex flex-col justify-between">
        <div>
          <Link to="/" className="inline-flex items-center gap-3 mb-12">
            <ShieldCheck className="h-10 w-10" />
            <div>
              <h1 className="text-2xl font-bold">BizFlow</h1>
              <p className="text-primary-100 text-sm">Sistema de Gestão Seguro</p>
            </div>
          </Link>
          
          <div className="max-w-md">
            <h2 className="text-3xl font-bold mb-4">Gestão Empresarial Inteligente</h2>
            <p className="text-primary-100 mb-8">
              Controle completo de vendas, estoque, clientes e finanças em uma plataforma 
              segura e integrada.
            </p>
            
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold">Segurança Avançada</h3>
                  <p className="text-sm text-primary-100">Criptografia de ponta a ponta</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold">Conformidade Total</h3>
                  <p className="text-sm text-primary-100">LGPD e normas fiscais</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold">Alta Performance</h3>
                  <p className="text-sm text-primary-100">Processamento rápido e confiável</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-12 text-sm text-primary-100">
          <p>© 2024 BizFlow. Todos os direitos reservados.</p>
          <p className="mt-2">
            <Link to="/privacy" className="hover:text-white transition">Política de Privacidade</Link>
            {' · '}
            <Link to="/terms" className="hover:text-white transition">Termos de Uso</Link>
          </p>
        </div>
      </div>
      
      {/* Right Panel - Authentication Forms */}
      <div className="md:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <Outlet />
          </div>
          
          {/* Security Badge */}
          <div className="mt-6 bg-white/80 backdrop-blur-sm rounded-lg p-4 text-center">
            <div className="inline-flex items-center gap-2 text-sm text-gray-600">
              <ShieldCheck className="h-4 w-4 text-green-500" />
              <span>Conexão segura · SSL Ativo</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AuthLayout
