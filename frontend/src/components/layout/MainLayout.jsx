import React, { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { 
  Menu, 
  X, 
  Bell, 
  Search, 
  User, 
  LogOut,
  Shield,
  Settings,
  HelpCircle
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import Sidebar from './Sidebar'
import SecurityIndicator from '../security/SecurityIndicator'
import SessionTimeoutWarning from '../security/SessionTimeoutWarning'

const MainLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Security Components */}
      <SecurityIndicator />
      <SessionTimeoutWarning />
      
      {/* Navbar */}
      <nav className="bg-gradient-to-r from-primary to-secondary text-white shadow-lg">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Left: Menu & Brand */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-lg hover:bg-white/10 transition lg:hidden"
              >
                {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
              
              <NavLink to="/dashboard" className="flex items-center space-x-3">
                <Shield className="h-8 w-8" />
                <div>
                  <h1 className="text-xl font-bold">BizFlow</h1>
                  <div className="flex items-center gap-1 text-xs opacity-80">
                    <span className="px-2 py-0.5 bg-green-500/20 rounded-full">Seguro</span>
                    <span>v1.0.0</span>
                  </div>
                </div>
              </NavLink>
            </div>

            {/* Center: Search */}
            <div className="hidden lg:block flex-1 max-w-2xl mx-8">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="search"
                  placeholder="Buscar clientes, produtos, vendas..."
                  className="w-full pl-10 pr-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/30"
                />
              </div>
            </div>

            {/* Right: User Menu */}
            <div className="flex items-center space-x-4">
              {/* Search Mobile */}
              <button className="lg:hidden p-2 hover:bg-white/10 rounded-lg">
                <Search className="h-5 w-5" />
              </button>
              
              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  className="p-2 hover:bg-white/10 rounded-lg relative"
                >
                  <Bell className="h-5 w-5" />
                  <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full border-2 border-primary"></span>
                </button>
                
                {notificationsOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setNotificationsOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl z-50">
                      <div className="p-4 border-b">
                        <h3 className="font-semibold text-gray-800">Notificações</h3>
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        {/* Notifications list */}
                      </div>
                    </div>
                  </>
                )}
              </div>
              
              {/* User Menu */}
              <div className="relative">
                <button className="flex items-center space-x-3 p-2 hover:bg-white/10 rounded-lg">
                  <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
                    <User className="h-5 w-5" />
                  </div>
                  <div className="hidden md:block text-left">
                    <div className="font-medium">{user?.name || 'Usuário'}</div>
                    <div className="text-xs opacity-80">{user?.role || 'Administrador'}</div>
                  </div>
                </button>
                
                {/* Dropdown Menu */}
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl z-50 hidden group-hover:block">
                  <div className="py-2">
                    <NavLink
                      to="/profile"
                      className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100"
                    >
                      <User className="h-4 w-4 mr-3" />
                      Meu Perfil
                    </NavLink>
                    <NavLink
                      to="/settings"
                      className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100"
                    >
                      <Settings className="h-4 w-4 mr-3" />
                      Configurações
                    </NavLink>
                    <NavLink
                      to="/help"
                      className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100"
                    >
                      <HelpCircle className="h-4 w-4 mr-3" />
                      Ajuda
                    </NavLink>
                    <hr className="my-2" />
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center px-4 py-2 text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="h-4 w-4 mr-3" />
                      Sair Seguro
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="flex">
          {/* Sidebar */}
          <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          
          {/* Content */}
          <main className="flex-1 lg:ml-64">
            <Outlet />
          </main>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t mt-8">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-gray-600 text-sm">
              © 2024 BizFlow - Sistema de Gestão Integrado Seguro
            </div>
            <div className="flex items-center space-x-6 mt-4 md:mt-0">
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <Shield className="h-4 w-4 text-green-500" />
                <span>Versão 1.0.0 · SSL Ativo · Protegido</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default MainLayout
