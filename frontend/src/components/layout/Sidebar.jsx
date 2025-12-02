import React from 'react'
import { NavLink } from 'react-router-dom'
import { 
  LayoutDashboard,
  ShoppingCart,
  Package,
  Warehouse,
  Users,
  PieChart,
  FileText,
  CreditCard,
  Shield,
  Settings,
  ClipboardList,
  TrendingUp,
  Bell,
  AlertTriangle,
  HelpCircle
} from 'lucide-react'

const Sidebar = ({ open, onClose }) => {
  const menuItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', badge: null },
    { path: '/pos', icon: ShoppingCart, label: 'Ponto de Venda', badge: 'new' },
    { path: '/products', icon: Package, label: 'Produtos', badge: null },
    { path: '/inventory', icon: Warehouse, label: 'Inventário', badge: '3' },
    { path: '/customers', icon: Users, label: 'Clientes', badge: null },
    { path: '/sales', icon: TrendingUp, label: 'Vendas', badge: null },
    { path: '/finance', icon: PieChart, label: 'Financeiro', badge: null },
    { path: '/documents', icon: FileText, label: 'Documentos', badge: '2' },
    { path: '/subscription', icon: CreditCard, label: 'Assinatura', badge: null },
    { path: '/security', icon: Shield, label: 'Segurança', badge: '!' },
    { path: '/settings', icon: Settings, label: 'Configurações', badge: null },
    { path: '/audit', icon: ClipboardList, label: 'Auditoria', badge: null },
  ]

  return (
    <>
      {/* Mobile Overlay */}
      {open && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r transform
        ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
        transition-transform duration-300 ease-in-out
      `}>
        <div className="h-full flex flex-col">
          {/* Sidebar Header */}
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">Navegação</h2>
              <button
                onClick={onClose}
                className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Menu Items */}
          <nav className="flex-1 overflow-y-auto p-4">
            <div className="space-y-1">
              {menuItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/dashboard'}
                  className={({ isActive }) => `
                    flex items-center justify-between px-4 py-3 rounded-lg transition-all
                    ${isActive 
                      ? 'bg-primary/10 text-primary font-medium' 
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    }
                  `}
                  onClick={onClose}
                >
                  <div className="flex items-center space-x-3">
                    <item.icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`
                      px-2 py-1 text-xs rounded-full
                      ${item.badge === 'new' ? 'bg-green-100 text-green-800' :
                        item.badge === '!' ? 'bg-red-100 text-red-800' :
                        'bg-blue-100 text-blue-800'}
                    `}>
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              ))}
            </div>
          </nav>

          {/* Sidebar Footer - Security Status */}
          <div className="p-4 border-t">
            <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <Shield className="h-5 w-5 text-green-600" />
                <div>
                  <h3 className="font-semibold text-gray-800">Status de Segurança</h3>
                  <p className="text-sm text-gray-600">Sistema Protegido</p>
                </div>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Sessão:</span>
                  <span className="font-medium text-green-600">Ativa</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">SSL:</span>
                  <span className="font-medium text-green-600">Ativo</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">2FA:</span>
                  <span className="font-medium text-yellow-600">Recomendado</span>
                </div>
              </div>
              
              <button className="mt-4 w-full btn-primary text-sm py-2">
                <Shield className="h-4 w-4 inline mr-2" />
                Verificar Segurança
              </button>
            </div>
          </div>

          {/* Help Section */}
          <div className="p-4 border-t">
            <button className="flex items-center gap-3 w-full p-3 text-gray-600 hover:bg-gray-100 rounded-lg">
              <HelpCircle className="h-5 w-5" />
              <span className="font-medium">Ajuda & Suporte</span>
            </button>
            <button className="flex items-center gap-3 w-full p-3 text-gray-600 hover:bg-gray-100 rounded-lg">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-medium">Reportar Problema</span>
            </button>
            <button className="flex items-center gap-3 w-full p-3 text-gray-600 hover:bg-gray-100 rounded-lg">
              <Bell className="h-5 w-5" />
              <span className="font-medium">Notificações</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}

export default Sidebar
