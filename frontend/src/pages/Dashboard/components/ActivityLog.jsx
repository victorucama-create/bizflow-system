import React from 'react'
import { UserCheck, Shield, ShoppingBag, AlertCircle, CheckCircle } from 'lucide-react'
import Card from '../../../components/ui/Card'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const ActivityLog = ({ activities = [] }) => {
  const getActivityIcon = (type) => {
    const icons = {
      login: UserCheck,
      security: Shield,
      sale: ShoppingBag,
      warning: AlertCircle,
      success: CheckCircle
    }
    
    const Icon = icons[type] || AlertCircle
    return <Icon className="h-5 w-5" />
  }

  const getActivityColor = (type) => {
    const colors = {
      login: 'text-blue-500 bg-blue-50',
      security: 'text-green-500 bg-green-50',
      sale: 'text-purple-500 bg-purple-50',
      warning: 'text-yellow-500 bg-yellow-50',
      success: 'text-green-500 bg-green-50'
    }
    
    return colors[type] || 'text-gray-500 bg-gray-50'
  }

  // Default activities if none provided
  const defaultActivities = [
    {
      id: 1,
      type: 'login',
      description: 'Login realizado',
      timestamp: new Date().toISOString(),
      user: 'Sistema'
    },
    {
      id: 2,
      type: 'security',
      description: 'Sistema seguro ativado',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      user: 'Sistema'
    },
    {
      id: 3,
      type: 'sale',
      description: 'Nova venda registrada',
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      user: 'Operador'
    },
    {
      id: 4,
      type: 'warning',
      description: 'Estoque baixo detectado',
      timestamp: new Date(Date.now() - 10800000).toISOString(),
      user: 'Sistema'
    }
  ]

  const displayActivities = activities.length > 0 ? activities : defaultActivities

  return (
    <Card>
      <Card.Header>
        <Card.Title>Atividade Recente</Card.Title>
        <Card.Description>
          Últimas ações no sistema
        </Card.Description>
      </Card.Header>
      
      <Card.Content>
        <div className="space-y-4">
          {displayActivities.map((activity) => (
            <div key={activity.id} className="flex items-start gap-3 pb-4 border-b border-gray-100 last:border-0">
              <div className={`p-2 rounded-lg ${getActivityColor(activity.type)}`}>
                {getActivityIcon(activity.type)}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">
                  {activity.description}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-500">
                    {formatDistanceToNow(new Date(activity.timestamp), {
                      addSuffix: true,
                      locale: ptBR
                    })}
                  </span>
                  {activity.user && (
                    <>
                      <span className="text-xs text-gray-300">•</span>
                      <span className="text-xs text-gray-500">{activity.user}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 text-center">
          <button className="text-primary hover:text-primary/80 font-medium text-sm">
            Ver log completo →
          </button>
        </div>
      </Card.Content>
    </Card>
  )
}

export default ActivityLog
