import React, { useState } from 'react'
import { 
  Search, 
  Filter, 
  Download, 
  Eye,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  User,
  MapPin
} from 'lucide-react'
import Card from '../../../components/ui/Card'
import Button from '../../../components/ui/Button'
import Input from '../../../components/ui/Input'
import Badge from '../../../components/ui/Badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/ui/Table'
import { formatDateTime } from '../../../utils/formatters'

const SecurityLog = ({ logs = [] }) => {
  const [search, setSearch] = useState('')
  const [selectedLevel, setSelectedLevel] = useState('all')
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  })

  const getEventIcon = (status) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failure':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getEventColor = (status) => {
    switch (status) {
      case 'success':
        return 'text-green-700 bg-green-50'
      case 'failure':
        return 'text-red-700 bg-red-50'
      case 'warning':
        return 'text-yellow-700 bg-yellow-50'
      default:
        return 'text-gray-700 bg-gray-50'
    }
  }

  const translateEvent = (event) => {
    const translations = {
      'login_successful': 'Login bem-sucedido',
      'login_failed': 'Login falhou',
      'logout': 'Logout',
      'password_changed': 'Senha alterada',
      '2fa_enabled': '2FA ativado',
      '2fa_disabled': '2FA desativado',
      'session_started': 'Sessão iniciada',
      'session_ended': 'Sessão encerrada',
      'ip_blocked': 'IP bloqueado',
      'security_alert': 'Alerta de segurança',
      'permission_granted': 'Permissão concedida',
      'permission_revoked': 'Permissão revogada'
    }
    return translations[event] || event
  }

  // Filter logs
  const filteredLogs = logs.filter(log => {
    // Search filter
    const matchesSearch = search === '' || 
      log.description.toLowerCase().includes(search.toLowerCase()) ||
      log.ip.includes(search) ||
      translateEvent(log.event).toLowerCase().includes(search.toLowerCase())

    // Level filter
    const matchesLevel = selectedLevel === 'all' || log.status === selectedLevel

    // Date filter
    const logDate = new Date(log.timestamp)
    const startDate = dateRange.start ? new Date(dateRange.start) : null
    const endDate = dateRange.end ? new Date(dateRange.end) : null
    
    let matchesDate = true
    if (startDate) {
      matchesDate = matchesDate && logDate >= startDate
    }
    if (endDate) {
      // Add one day to include the entire end day
      const endDatePlusOne = new Date(endDate)
      endDatePlusOne.setDate(endDatePlusOne.getDate() + 1)
      matchesDate = matchesDate && logDate < endDatePlusOne
    }

    return matchesSearch && matchesLevel && matchesDate
  })

  const handleExport = () => {
    // Implement export functionality
    console.log('Exporting security logs...')
  }

  const handleClearFilters = () => {
    setSearch('')
    setSelectedLevel('all')
    setDateRange({ start: '', end: '' })
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="md:col-span-2">
            <Input
              placeholder="Buscar por evento, IP, descrição..."
              startIcon={Search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="all">Todos os níveis</option>
            <option value="success">Sucesso</option>
            <option value="failure">Falha</option>
            <option value="warning">Aviso</option>
          </select>

          <Button
            variant="outline"
            icon={Filter}
            onClick={handleClearFilters}
          >
            Limpar Filtros
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data Início
            </label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data Fim
            </label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div className="flex items-end">
            <Button
              variant="primary"
              icon={Download}
              onClick={handleExport}
              fullWidth
            >
              Exportar Logs
            </Button>
          </div>
        </div>
      </Card>

      {/* Logs Table */}
      <Card>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Log de Segurança</h2>
            <p className="text-gray-600">
              {filteredLogs.length} evento{filteredLogs.length !== 1 ? 's' : ''} encontrado{filteredLogs.length !== 1 ? 's' : ''}
            </p>
          </div>
          
          <Badge variant="info">
            Atualizado agora
          </Badge>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data/Hora</TableHead>
              <TableHead>Evento</TableHead>
              <TableHead>IP</TableHead>
              <TableHead>Localização</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          
          <TableBody>
            {filteredLogs.length > 0 ? (
              filteredLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    <div className="text-sm text-gray-900">
                      {formatDateTime(log.timestamp)}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getEventIcon(log.status)}
                      <div>
                        <div className="font-medium">
                          {translateEvent(log.event)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {log.description}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="font-mono text-sm">{log.ip}</div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <MapPin className="h-3 w-3" />
                      São Paulo, BR
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <Badge variant={log.status === 'success' ? 'success' : 'danger'}>
                      {log.status === 'success' ? 'Sucesso' : 'Falha'}
                    </Badge>
                  </TableCell>
                  
                  <TableCell>
                    <button className="p-1 hover:bg-gray-100 rounded">
                      <Eye className="h-4 w-4 text-gray-500" />
                    </button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12">
                  <div className="flex flex-col items-center">
                    <Clock className="h-12 w-12 text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Nenhum evento encontrado
                    </h3>
                    <p className="text-gray-600">
                      Tente ajustar seus filtros de busca
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {filteredLogs.length > 0 && (
          <div className="flex items-center justify-between mt-6 pt-6 border-t">
            <div className="text-sm text-gray-600">
              Mostrando 1-{filteredLogs.length} de {logs.length} eventos
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled>
                Anterior
              </Button>
              
              <div className="flex items-center gap-1">
                {[1, 2, 3].map((page) => (
                  <button
                    key={page}
                    className={`w-8 h-8 rounded text-sm ${
                      page === 1
                        ? 'bg-primary text-white'
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>
              
              <Button variant="outline" size="sm">
                Próxima
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="text-center">
          <div className="text-2xl font-bold text-gray-900 mb-1">
            {logs.filter(l => l.status === 'success').length}
          </div>
          <div className="text-sm text-gray-600">Sucessos</div>
        </Card>
        
        <Card className="text-center">
          <div className="text-2xl font-bold text-red-600 mb-1">
            {logs.filter(l => l.status === 'failure').length}
          </div>
          <div className="text-sm text-gray-600">Falhas</div>
        </Card>
        
        <Card className="text-center">
          <div className="text-2xl font-bold text-blue-600 mb-1">
            {new Set(logs.map(l => l.ip)).size}
          </div>
          <div className="text-sm text-gray-600">IPs Únicos</div>
        </Card>
        
        <Card className="text-center">
          <div className="text-2xl font-bold text-green-600 mb-1">
            100%
          </div>
          <div className="text-sm text-gray-600">Sistema Ativo</div>
        </Card>
      </div>
    </div>
  )
}

export default SecurityLog
