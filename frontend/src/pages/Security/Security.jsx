import React, { useState, useEffect } from 'react'
import { 
  Shield, 
  Lock, 
  UserCheck, 
  Clock, 
  Network, 
  ClipboardList,
  Save,
  Download,
  QrCode,
  Key,
  LogOut,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Bell,
  Eye,
  EyeOff,
  Trash2,
  Plus,
  RefreshCw
} from 'lucide-react'
import { Helmet } from 'react-helmet-async'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Badge from '../../components/ui/Badge'
import Tabs from '../../components/ui/Tabs'
import TwoFactorSetup from './components/TwoFactorSetup'
import SecurityLog from './components/SecurityLog'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { formatDateTime } from '../../utils/formatters'

const Security = () => {
  const [activeTab, setActiveTab] = useState('overview')
  const [showTwoFactorSetup, setShowTwoFactorSetup] = useState(false)
  const [newIP, setNewIP] = useState('')
  const [securitySettings, setSecuritySettings] = useState({
    securityAlerts: true,
    loginNotifications: true,
    autoLogout: true,
    sessionTimeout: 30,
    require2FA: false,
    ipWhitelist: true
  })

  const queryClient = useQueryClient()

  // Fetch security data
  const { data: securityData, isLoading } = useQuery(
    'security',
    async () => {
      const response = await api.get('/security/status')
      return response.data
    },
    {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000 // 5 minutes
    }
  )

  // Tabs configuration
  const tabs = [
    { id: 'overview', label: 'Visão Geral', icon: Shield },
    { id: '2fa', label: 'Autenticação 2FA', icon: UserCheck },
    { id: 'sessions', label: 'Sessões', icon: Clock },
    { id: 'ips', label: 'IPs Permitidos', icon: Network },
    { id: 'logs', label: 'Logs', icon: ClipboardList },
    { id: 'settings', label: 'Configurações', icon: Lock }
  ]

  // Mock data for demo
  const mockData = {
    overview: {
      status: 'protected',
      lastCheck: new Date().toISOString(),
      blockedAttacks: 0,
      threatsDetected: 0,
      securityScore: 98
    },
    twoFactor: {
      enabled: false,
      lastUsed: null,
      backupCodes: []
    },
    sessions: [
      {
        id: 'sess_1',
        device: 'Chrome on Windows',
        ip: '192.168.1.100',
        location: 'São Paulo, BR',
        lastActivity: new Date(Date.now() - 300000).toISOString(),
        current: true
      },
      {
        id: 'sess_2',
        device: 'Safari on iPhone',
        ip: '192.168.1.101',
        location: 'São Paulo, BR',
        lastActivity: new Date(Date.now() - 86400000).toISOString(),
        current: false
      }
    ],
    ipWhitelist: [
      { ip: '192.168.1.1', status: 'active', addedAt: new Date(Date.now() - 86400000).toISOString() },
      { ip: '10.0.0.1', status: 'pending', addedAt: new Date(Date.now() - 43200000).toISOString() }
    ],
    securityLog: [
      {
        id: 1,
        timestamp: new Date(Date.now() - 60000).toISOString(),
        event: 'login_successful',
        description: 'Login realizado com sucesso',
        ip: '192.168.1.100',
        status: 'success'
      },
      {
        id: 2,
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        event: 'failed_login',
        description: 'Tentativa de login falhou',
        ip: '203.0.113.1',
        status: 'failure'
      },
      {
        id: 3,
        timestamp: new Date(Date.now() - 172800000).toISOString(),
        event: 'password_changed',
        description: 'Senha alterada com sucesso',
        ip: '192.168.1.100',
        status: 'success'
      }
    ]
  }

  // Mutation for enabling 2FA
  const enable2FAMutation = useMutation(
    async (code) => {
      const response = await api.post('/security/2fa/enable', { code })
      return response.data
    },
    {
      onSuccess: () => {
        toast.success('Autenticação de dois fatores ativada com sucesso!')
        setShowTwoFactorSetup(false)
        queryClient.invalidateQueries('security')
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Erro ao ativar 2FA')
      }
    }
  )

  // Mutation for adding IP
  const addIPMutation = useMutation(
    async (ip) => {
      const response = await api.post('/security/ips', { ip })
      return response.data
    },
    {
      onSuccess: () => {
        toast.success('IP adicionado à lista de permitidos')
        setNewIP('')
        queryClient.invalidateQueries('security')
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'IP inválido')
      }
    }
  )

  // Mutation for logout all sessions
  const logoutAllMutation = useMutation(
    async () => {
      await api.post('/security/sessions/logout-all')
    },
    {
      onSuccess: () => {
        toast.success('Todas as sessões foram encerradas')
        queryClient.invalidateQueries('security')
      },
      onError: () => {
        toast.error('Erro ao encerrar sessões')
      }
    }
  )

  const handleSaveSettings = async () => {
    try {
      await api.put('/security/settings', securitySettings)
      toast.success('Configurações de segurança salvas!')
    } catch (error) {
      toast.error('Erro ao salvar configurações')
    }
  }

  const handleAddIP = () => {
    if (!newIP.trim()) {
      toast.error('Digite um endereço IP')
      return
    }

    // Basic IP validation
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
    if (!ipRegex.test(newIP)) {
      toast.error('Endereço IP inválido')
      return
    }

    addIPMutation.mutate(newIP)
  }

  const handleEnable2FA = () => {
    setShowTwoFactorSetup(true)
  }

  const handleVerify2FA = (code) => {
    enable2FAMutation.mutate(code)
  }

  const handleLogoutAll = () => {
    if (window.confirm('Tem certeza que deseja encerrar todas as sessões?')) {
      logoutAllMutation.mutate()
    }
  }

  const handleDownloadReport = () => {
    toast.success('Relatório de segurança gerado. Download iniciado...')
    // Implement report download
  }

  const renderTabContent = () => {
    if (isLoading) {
      return <LoadingSpinner message="Carregando dados de segurança..." />
    }

    const data = securityData || mockData

    switch (activeTab) {
      case 'overview':
        return <OverviewTab data={data.overview} />
      case '2fa':
        return <TwoFactorTab 
          data={data.twoFactor} 
          onEnable={handleEnable2FA}
          showSetup={showTwoFactorSetup}
          onVerify={handleVerify2FA}
          onCancel={() => setShowTwoFactorSetup(false)}
        />
      case 'sessions':
        return <SessionsTab 
          sessions={data.sessions} 
          onLogoutAll={handleLogoutAll}
        />
      case 'ips':
        return <IPTab 
          ips={data.ipWhitelist}
          newIP={newIP}
          setNewIP={setNewIP}
          onAddIP={handleAddIP}
        />
      case 'logs':
        return <SecurityLog logs={data.securityLog} />
      case 'settings':
        return <SettingsTab 
          settings={securitySettings}
          onChange={setSecuritySettings}
          onSave={handleSaveSettings}
        />
      default:
        return null
    }
  }

  return (
    <>
      <Helmet>
        <title>Segurança - BizFlow</title>
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Central de Segurança</h1>
            <p className="text-gray-600 mt-1">
              Gerencie e monitore a segurança da sua conta
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              icon={Download}
              onClick={handleDownloadReport}
            >
              Relatório
            </Button>
            
            <Button
              variant="primary"
              icon={RefreshCw}
              onClick={() => queryClient.invalidateQueries('security')}
            >
              Atualizar
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs
          tabs={tabs}
          activeTab={activeTab}
          onChange={setActiveTab}
        />

        {/* Content */}
        {renderTabContent()}
      </div>
    </>
  )
}

// Tab Components
const OverviewTab = ({ data }) => (
  <div className="space-y-6">
    {/* Security Status Card */}
    <Card>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-green-100 rounded-lg">
            <Shield className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Status de Segurança</h2>
            <p className="text-gray-600">Última verificação: {formatDateTime(data.lastCheck)}</p>
          </div>
        </div>
        <Badge 
          variant={data.status === 'protected' ? 'success' : 'danger'}
          size="lg"
        >
          {data.status === 'protected' ? 'PROTEGIDO' : 'EM RISCO'}
        </Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-3xl font-bold text-gray-900 mb-1">
            {data.securityScore}
          </div>
          <div className="text-sm text-gray-600">Pontuação</div>
        </div>
        
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-3xl font-bold text-green-600 mb-1">
            {data.blockedAttacks}
          </div>
          <div className="text-sm text-gray-600">Ataques Bloqueados</div>
        </div>
        
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-3xl font-bold text-red-600 mb-1">
            {data.threatsDetected}
          </div>
          <div className="text-sm text-gray-600">Ameaças Detectadas</div>
        </div>
        
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-3xl font-bold text-blue-600 mb-1">
            24/7
          </div>
          <div className="text-sm text-gray-600">Monitoramento</div>
        </div>
      </div>
    </Card>

    {/* Security Recommendations */}
    <Card>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        <AlertTriangle className="inline h-5 w-5 text-yellow-500 mr-2" />
        Recomendações de Segurança
      </h3>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
          <div className="flex items-center gap-3">
            <UserCheck className="h-5 w-5 text-yellow-600" />
            <div>
              <h4 className="font-medium">Autenticação de Dois Fatores</h4>
              <p className="text-sm text-gray-600">Adicione uma camada extra de segurança</p>
            </div>
          </div>
          <Badge variant="warning">PENDENTE</Badge>
        </div>
        
        <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
          <div className="flex items-center gap-3">
            <Network className="h-5 w-5 text-green-600" />
            <div>
              <h4 className="font-medium">Lista de IPs Permitidos</h4>
              <p className="text-sm text-gray-600">Apenas IPs autorizados podem acessar</p>
            </div>
          </div>
          <Badge variant="success">CONFIGURADO</Badge>
        </div>
        
        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-blue-600" />
            <div>
              <h4 className="font-medium">Alertas de Segurança</h4>
              <p className="text-sm text-gray-600">Notificações sobre atividades suspeitas</p>
            </div>
          </div>
          <Badge variant="success">ATIVO</Badge>
        </div>
      </div>
    </Card>

    {/* Recent Security Events */}
    <Card>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Eventos de Segurança Recentes
      </h3>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded">
              <CheckCircle className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <h4 className="font-medium">Login bem-sucedido</h4>
              <p className="text-sm text-gray-600">Há 5 minutos · 192.168.1.100</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded">
              <XCircle className="h-4 w-4 text-red-600" />
            </div>
            <div>
              <h4 className="font-medium">Tentativa de acesso bloqueada</h4>
              <p className="text-sm text-gray-600">Hoje, 10:25 · 203.0.113.1</p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  </div>
)

const TwoFactorTab = ({ data, onEnable, showSetup, onVerify, onCancel }) => (
  <div className="space-y-6">
    {/* 2FA Status */}
    <Card>
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-lg ${data.enabled ? 'bg-green-100' : 'bg-gray-100'}`}>
            <UserCheck className={`h-6 w-6 ${data.enabled ? 'text-green-600' : 'text-gray-600'}`} />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Autenticação de Dois Fatores
            </h2>
            <p className="text-gray-600 mt-1">
              Adicione uma camada extra de segurança à sua conta
            </p>
            <div className="flex items-center gap-4 mt-3">
              <Badge variant={data.enabled ? 'success' : 'warning'}>
                {data.enabled ? 'ATIVADO' : 'DESATIVADO'}
              </Badge>
              {data.lastUsed && (
                <span className="text-sm text-gray-500">
                  Último uso: {formatDateTime(data.lastUsed)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {!data.enabled && (
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-2">Por que ativar 2FA?</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Proteção contra acessos não autorizados</li>
              <li>• Segurança mesmo se sua senha for comprometida</li>
              <li>• Requisito para certas operações sensíveis</li>
              <li>• Conformidade com normas de segurança</li>
            </ul>
          </div>

          <div className="flex items-center justify-center">
            <Button
              variant="primary"
              icon={QrCode}
              size="lg"
              onClick={onEnable}
            >
              Ativar Autenticação de Dois Fatores
            </Button>
          </div>
        </div>
      )}

      {data.enabled && (
        <div className="space-y-4">
          <div className="p-4 bg-green-50 rounded-lg">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="font-medium text-green-900">
                2FA está ativo e protegendo sua conta
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button variant="outline" icon={Key}>
              Ver Códigos de Backup
            </Button>
            <Button variant="outline" icon={UserCheck}>
              Gerenciar Dispositivos
            </Button>
          </div>
        </div>
      )}
    </Card>

    {/* Backup Codes */}
    {data.enabled && data.backupCodes && data.backupCodes.length > 0 && (
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          <Key className="inline h-5 w-5 text-gray-500 mr-2" />
          Códigos de Backup
        </h3>
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600 mb-3">
            Guarde estes códigos em um local seguro. Eles podem ser usados para acessar sua conta se você perder seu dispositivo.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {data.backupCodes.slice(0, 8).map((code, index) => (
              <div
                key={index}
                className="bg-white p-3 text-center font-mono rounded border"
              >
                {code}
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" size="sm">
              Imprimir Códigos
            </Button>
            <Button variant="outline" size="sm">
              Gerar Novos Códigos
            </Button>
          </div>
        </div>
      </Card>
    )}

    {/* 2FA Setup Modal */}
    {showSetup && (
      <TwoFactorSetup
        onVerify={onVerify}
        onCancel={onCancel}
      />
    )}
  </div>
)

const SessionsTab = ({ sessions, onLogoutAll }) => (
  <div className="space-y-6">
    {/* Current Session */}
    <Card>
      <h2 className="text-xl font-semibold text-gray-900 mb-6">
        Sessões Ativas
      </h2>

      <div className="space-y-4">
        {sessions.map((session) => (
          <div
            key={session.id}
            className={`flex items-center justify-between p-4 rounded-lg ${
              session.current ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-lg ${
                session.current ? 'bg-blue-100' : 'bg-gray-100'
              }`}>
                <Clock className={`h-5 w-5 ${
                  session.current ? 'text-blue-600' : 'text-gray-600'
                }`} />
              </div>
              
              <div>
                <h3 className="font-medium text-gray-900">
                  {session.device}
                  {session.current && (
                    <Badge variant="primary" className="ml-2">
                      Atual
                    </Badge>
                  )}
                </h3>
                <div className="text-sm text-gray-600 space-y-1 mt-1">
                  <p>IP: {session.ip}</p>
                  <p>Local: {session.location}</p>
                  <p>Última atividade: {formatDateTime(session.lastActivity)}</p>
                </div>
              </div>
            </div>
            
            {!session.current && (
              <Button variant="danger" size="sm">
                Encerrar
              </Button>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mt-6 pt-6 border-t">
        <div className="text-sm text-gray-600">
          {sessions.length} sessão{sessions.length !== 1 ? 's' : ''} ativa{sessions.length !== 1 ? 's' : ''}
        </div>
        <Button
          variant="danger"
          icon={LogOut}
          onClick={onLogoutAll}
        >
          Encerrar Todas as Sessões
        </Button>
      </div>
    </Card>

    {/* Session Settings */}
    <Card>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Configurações de Sessão
      </h3>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium">Timeout Automático</h4>
            <p className="text-sm text-gray-600">Encerrar sessão após 30 minutos de inatividade</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" defaultChecked />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium">Notificar sobre Novas Sessões</h4>
            <p className="text-sm text-gray-600">Receber alertas quando novas sessões forem abertas</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" defaultChecked />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>
      </div>
    </Card>
  </div>
)

const IPTab = ({ ips, newIP, setNewIP, onAddIP }) => (
  <div className="space-y-6">
    {/* IP Whitelist */}
    <Card>
      <h2 className="text-xl font-semibold text-gray-900 mb-6">
        Lista de IPs Permitidos
      </h2>
      
      <div className="mb-6">
        <p className="text-gray-600">
          Apenas IPs autorizados podem acessar sua conta. Todos os outros endereços serão bloqueados.
        </p>
      </div>

      {/* IP List */}
      <div className="space-y-3 mb-6">
        {ips.map((ip, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
          >
            <div className="flex items-center gap-4">
              <div className={`p-2 rounded ${
                ip.status === 'active' ? 'bg-green-100' : 'bg-yellow-100'
              }`}>
                <Network className={`h-4 w-4 ${
                  ip.status === 'active' ? 'text-green-600' : 'text-yellow-600'
                }`} />
              </div>
              
              <div>
                <h3 className="font-medium text-gray-900">{ip.ip}</h3>
                <div className="text-sm text-gray-600 space-y-1 mt-1">
                  <p>Adicionado em: {formatDateTime(ip.addedAt)}</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant={ip.status === 'active' ? 'success' : 'warning'}>
                {ip.status === 'active' ? 'Ativo' : 'Pendente'}
              </Badge>
              
              <button className="p-2 hover:bg-red-50 rounded">
                <Trash2 className="h-4 w-4 text-red-500" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add IP Form */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Adicionar Novo IP
        </h3>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <Input
            placeholder="Digite o endereço IP (ex: 192.168.1.100)"
            value={newIP}
            onChange={(e) => setNewIP(e.target.value)}
            className="flex-1"
          />
          <Button
            variant="primary"
            icon={Plus}
            onClick={onAddIP}
          >
            Adicionar IP
          </Button>
        </div>
        
        <p className="text-sm text-gray-500 mt-3">
          Você receberá um e-mail de confirmação para autorizar o novo IP.
        </p>
      </div>
    </Card>

    {/* IP Security Tips */}
    <Card>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        <Shield className="inline h-5 w-5 text-primary mr-2" />
        Dicas de Segurança para IPs
      </h3>
      
      <div className="space-y-3 text-sm text-gray-600">
        <div className="flex items-start gap-2">
          <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
          <p>Adicione apenas IPs de redes confiáveis (casa, escritório)</p>
        </div>
        
        <div className="flex items-start gap-2">
          <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
          <p>Evite adicionar IPs de redes públicas (cafés, aeroportos)</p>
        </div>
        
        <div className="flex items-start gap-2">
          <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
          <p>Revise regularmente a lista de IPs e remova os não utilizados</p>
        </div>
        
        <div className="flex items-start gap-2">
          <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
          <p>Use VPN corporativa para acessar de locais remotos</p>
        </div>
      </div>
    </Card>
  </div>
)

const SettingsTab = ({ settings, onChange, onSave }) => (
  <div className="space-y-6">
    <Card>
      <h2 className="text-xl font-semibold text-gray-900 mb-6">
        Configurações de Segurança
      </h2>

      <div className="space-y-6">
        {/* Security Alerts */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">
            <Bell className="inline h-5 w-5 text-gray-500 mr-2" />
            Alertas de Segurança
          </h3>
          
          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <span className="font-medium">Receber alertas de segurança por e-mail</span>
                <p className="text-sm text-gray-600">Notificações sobre atividades suspeitas</p>
              </div>
              <input
                type="checkbox"
                checked={settings.securityAlerts}
                onChange={(e) => onChange({ ...settings, securityAlerts: e.target.checked })}
                className="h-4 w-4 text-primary rounded border-gray-300 focus:ring-primary/50"
              />
            </label>
            
            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <span className="font-medium">Notificar sobre logins suspeitos</span>
                <p className="text-sm text-gray-600">Alertas para logins de novos dispositivos ou locais</p>
              </div>
              <input
                type="checkbox"
                checked={settings.loginNotifications}
                onChange={(e) => onChange({ ...settings, loginNotifications: e.target.checked })}
                className="h-4 w-4 text-primary rounded border-gray-300 focus:ring-primary/50"
              />
            </label>
          </div>
        </div>

        {/* Session Management */}
        <div className="space-y-4 border-t pt-6">
          <h3 className="text-lg font-medium text-gray-900">
            <Clock className="inline h-5 w-5 text-gray-500 mr-2" />
            Gerenciamento de Sessões
          </h3>
          
          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <span className="font-medium">Logout automático após inatividade</span>
                <p className="text-sm text-gray-600">Encerrar sessão automaticamente</p>
              </div>
              <input
                type="checkbox"
                checked={settings.autoLogout}
                onChange={(e) => onChange({ ...settings, autoLogout: e.target.checked })}
                className="h-4 w-4 text-primary rounded border-gray-300 focus:ring-primary/50"
              />
            </label>
            
            {settings.autoLogout && (
              <div className="pl-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tempo de timeout (minutos)
                </label>
                <select
                  value={settings.sessionTimeout}
                  onChange={(e) => onChange({ ...settings, sessionTimeout: parseInt(e.target.value) })}
                  className="w-full md:w-48 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value={15}>15 minutos</option>
                  <option value={30}>30 minutos</option>
                  <option value={60}>1 hora</option>
                  <option value={120}>2 horas</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Access Control */}
        <div className="space-y-4 border-t pt-6">
          <h3 className="text-lg font-medium text-gray-900">
            <Lock className="inline h-5 w-5 text-gray-500 mr-2" />
            Controle de Acesso
          </h3>
          
          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <span className="font-medium">Requerir autenticação de dois fatores</span>
                <p className="text-sm text-gray-600">2FA obrigatório para todas as contas</p>
              </div>
              <input
                type="checkbox"
                checked={settings.require2FA}
                onChange={(e) => onChange({ ...settings, require2FA: e.target.checked })}
                className="h-4 w-4 text-primary rounded border-gray-300 focus:ring-primary/50"
              />
            </label>
            
            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <span className="font-medium">Lista de IPs permitidos</span>
                <p className="text-sm text-gray-600">Restringir acesso apenas a IPs autorizados</p>
              </div>
              <input
                type="checkbox"
                checked={settings.ipWhitelist}
                onChange={(e) => onChange({ ...settings, ipWhitelist: e.target.checked })}
                className="h-4 w-4 text-primary rounded border-gray-300 focus:ring-primary/50"
              />
            </label>
          </div>
        </div>

        {/* Password Policy */}
        <div className="space-y-4 border-t pt-6">
          <h3 className="text-lg font-medium text-gray-900">
            <Key className="inline h-5 w-5 text-gray-500 mr-2" />
            Política de Senhas
          </h3>
          
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              Política atual: Senhas devem ter no mínimo 8 caracteres, incluindo letras maiúsculas, minúsculas, números e caracteres especiais. Senhas expiram a cada 90 dias.
            </p>
          </div>
          
          <Button variant="outline">
            Configurar Política de Senhas
          </Button>
        </div>

        {/* Save Button */}
        <div className="border-t pt-6">
          <Button
            variant="primary"
            icon={Save}
            size="lg"
            onClick={onSave}
          >
            Salvar Configurações de Segurança
          </Button>
        </div>
      </div>
    </Card>
  </div>
)

export default Security
