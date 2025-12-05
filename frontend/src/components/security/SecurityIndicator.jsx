import React, { useState, useEffect } from 'react'
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { formatDateTime } from '../../utils/formatters'

const SecurityIndicator = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [securityStatus, setSecurityStatus] = useState('secure')
  const [lastCheck, setLastCheck] = useState(new Date())
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  const { user } = useAuthStore()

  useEffect(() => {
    // Simulate security status updates
    const interval = setInterval(() => {
      setLastCheck(new Date())
    }, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    setLastCheck(new Date())
    setIsRefreshing(false)
  }

  const getStatusConfig = () => {
    switch (securityStatus) {
      case 'secure':
        return {
          icon: Shield,
          color: 'text-green-500',
          bgColor: 'bg-green-100',
          borderColor: 'border-green-200',
          label: 'Conectado Seguro',
          description: 'Sistema protegido e monitorado'
        }
      case 'warning':
        return {
          icon: AlertTriangle,
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-100',
          borderColor: 'border-yellow-200',
          label: 'Atenção Necessária',
          description: 'Verifique as configurações de segurança'
        }
      case 'danger':
        return {
          icon: XCircle,
          color: 'text-red-500',
          bgColor: 'bg-red-100',
          borderColor: 'border-red-200',
          label: 'Risco Detectado',
          description: 'Ação imediata requerida'
        }
      default:
        return {
          icon: Shield,
          color: 'text-gray-500',
          bgColor: 'bg-gray-100',
          borderColor: 'border-gray-200',
          label: 'Verificando...',
          description: 'Analisando status de segurança'
        }
    }
  }

  const statusConfig = getStatusConfig()
  const Icon = statusConfig.icon

  return (
    <>
      {/* Fixed Indicator */}
      <div className="fixed bottom-6 right-6 z-40">
        <div className="relative">
          {/* Main Indicator Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`
              flex items-center gap-3 px-4 py-3 rounded-full shadow-lg
              ${statusConfig.bgColor} ${statusConfig.borderColor}
              border transition-all duration-200 hover:shadow-xl
            `}
          >
            <div className={`p-2 rounded-full ${statusConfig.bgColor}`}>
              <Icon className={`h-5 w-5 ${statusConfig.color}`} />
            </div>
            
            <div className="text-left">
              <div className="font-medium text-gray-900">
                {statusConfig.label}
              </div>
              <div className="text-xs text-gray-600">
                {statusConfig.description}
              </div>
            </div>
            
            {isOpen ? (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronUp className="h-4 w-4 text-gray-500" />
            )}
          </button>

          {/* Dropdown Panel */}
          {isOpen && (
            <div className="absolute bottom-full right-0 mb-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200">
              {/* Header */}
              <div className="p-4 border-b">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">
                    Status de Segurança
                  </h3>
                  <button
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  </button>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Última verificação: {formatDateTime(lastCheck)}
                </p>
              </div>

              {/* Security Status */}
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Conexão SSL</span>
                  </div>
                  <Badge variant="success">Ativo</Badge>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Proteção em Tempo Real</span>
                  </div>
                  <Badge variant="success">Ativo</Badge>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm">Autenticação 2FA</span>
                  </div>
                  <Badge variant="warning">Recomendado</Badge>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-blue-500" />
                    <span className="text-sm">Monitoramento 24/7</span>
                  </div>
                  <Badge variant="success">Ativo</Badge>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="p-4 border-t">
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="flex items-center justify-between w-full p-2 hover:bg-gray-50 rounded"
                >
                  <span className="text-sm font-medium text-gray-700">
                    Detalhes Técnicos
                  </span>
                  {showDetails ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>

                {showDetails && (
                  <div className="mt-3 p-3 bg-gray-50 rounded text-xs">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Protocolo:</span>
                        <span className="font-mono">TLS 1.3</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Criptografia:</span>
                        <span className="font-mono">AES-256-GCM</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">IP Atual:</span>
                        <span className="font-mono">192.168.1.100</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Sessão:</span>
                        <span className="font-mono">Ativa há 15m</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-3 border-t bg-gray-50">
                <button className="w-full text-sm text-primary hover:text-primary/80 font-medium">
                  Ver painel completo de segurança →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Badge Component */}
      const Badge = ({ variant = 'default', children }) => {
        const variants = {
          default: 'bg-gray-100 text-gray-800',
          success: 'bg-green-100 text-green-800',
          warning: 'bg-yellow-100 text-yellow-800',
          danger: 'bg-red-100 text-red-800'
        }
        
        return (
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${variants[variant]}`}>
            {children}
          </span>
        )
      }
    </>
  )
}

export default SecurityIndicator
