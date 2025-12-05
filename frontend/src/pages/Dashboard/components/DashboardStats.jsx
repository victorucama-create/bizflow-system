import React from 'react'
import Card from '../../../components/ui/Card'
import { ArrowUp, ArrowDown } from 'lucide-react'

const DashboardStats = ({ 
  title, 
  value, 
  change, 
  subtitle,
  icon: Icon, 
  color = 'primary',
  loading = false
}) => {
  const colorClasses = {
    primary: 'bg-primary/10 text-primary',
    secondary: 'bg-secondary/10 text-secondary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    danger: 'bg-danger/10 text-danger'
  }

  const isPositive = change > 0
  const isNegative = change < 0

  return (
    <Card hover className="relative overflow-hidden">
      {/* Decorative corner */}
      <div className="absolute top-0 right-0 w-24 h-24 opacity-5">
        <div className={`w-full h-full ${colorClasses[color].split(' ')[0]}`} />
      </div>

      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 mb-2">{title}</p>
          {loading ? (
            <div className="h-8 w-32 bg-gray-200 rounded animate-pulse"></div>
          ) : (
            <h3 className="text-2xl font-bold text-gray-900 mb-1">{value}</h3>
          )}
          
          {subtitle && (
            <p className="text-sm text-gray-600">{subtitle}</p>
          )}
          
          <div className="flex items-center mt-3">
            {isPositive ? (
              <ArrowUp className="h-4 w-4 text-green-500 mr-1" />
            ) : isNegative ? (
              <ArrowDown className="h-4 w-4 text-red-500 mr-1" />
            ) : null}
            
            <span className={`text-sm font-medium ${
              isPositive ? 'text-green-600' :
              isNegative ? 'text-red-600' :
              'text-gray-600'
            }`}>
              {isPositive && '+'}{change}%
            </span>
            
            <span className="text-sm text-gray-500 ml-2">
              {isPositive ? 'aumento' : isNegative ? 'redução'} 
            </span>
          </div>
        </div>
        
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </Card>
  )
}

export default DashboardStats
