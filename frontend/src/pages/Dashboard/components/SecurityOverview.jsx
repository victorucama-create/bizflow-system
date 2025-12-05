import React from 'react'
import { Shield, Lock, CheckCircle, AlertTriangle } from 'lucide-react'
import Card from '../../../components/ui/Card'
import Badge from '../../../components/ui/Badge'

const SecurityOverview = () => {
  const securityItems = [
    {
      icon: Shield,
      title: 'Ataques Bloqueados',
      value: '0',
      status: 'success',
      description: 'Nenhuma ameaça detectada'
    },
    {
      icon: Lock,
      title: 'Sistema Protegido',
      value: '100%',
      status: 'success',
      description: 'Todas as defesas ativas'
    },
    {
      icon: CheckCircle,
      title: 'Monitoramento',
      value: '24/7',
      status: 'success',
      description: 'Ativo e vigilante'
    },
    {
      icon: AlertTriangle,
      title: 'Recomendações',
      value: '2',
      status: 'warning',
      description: 'Ações sugeridas'
    }
  ]

  return (
    <Card className="border-l-4 border-l-primary">
      <Card.Header>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <Card.Title>Visão Geral de Segurança</Card.Title>
              <Card.Description>
                Status do sistema de segurança
              </Card.Description>
            </div>
          </div>
          <Badge variant="success">PROTEGIDO</Badge>
        </div>
      </Card.Header>
      
      <Card.Content>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {securityItems.map((item, index) => (
            <div 
              key={index}
              className="text-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg mb-3 ${
                item.status === 'success' ? 'bg-green-100 text-green-600' :
                item.status === 'warning' ? 'bg-yellow-100 text-yellow-600' :
                'bg-gray-100 text-gray-600'
              }`}>
                <item.icon className="h-6 w-6" />
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {item.value}
              </div>
              <div className="text-sm font-medium text-gray-700 mb-1">
                {item.title}
              </div>
              <div className="text-xs text-gray-500">
                {item.description}
              </div>
            </div>
          ))}
        </div>
      </Card.Content>
      
      <Card.Footer className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Última verificação: {new Date().toLocaleTimeString('pt-BR')}
        </div>
        <button className="text-sm text-primary hover:text-primary/80 font-medium">
          Ver detalhes de segurança →
        </button>
      </Card.Footer>
    </Card>
  )
}

export default SecurityOverview
