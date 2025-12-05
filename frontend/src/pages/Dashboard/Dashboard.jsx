import React, { useState, useEffect } from 'react'
import { 
  TrendingUp, 
  Users, 
  Package, 
  DollarSign, 
  ShoppingCart,
  Calendar,
  ArrowUp,
  ArrowDown,
  MoreVertical,
  RefreshCw,
  Download
} from 'lucide-react'
import { Helmet } from 'react-helmet-async'
import { useQuery } from 'react-query'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import DashboardStats from './components/DashboardStats'
import RecentSales from './components/RecentSales'
import ActivityLog from './components/ActivityLog'
import SecurityOverview from './components/SecurityOverview'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import api from '../../services/api'

const Dashboard = () => {
  const [timeRange, setTimeRange] = useState('today')
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Fetch dashboard data
  const { data: dashboardData, isLoading, refetch } = useQuery(
    ['dashboard', timeRange],
    async () => {
      const response = await api.get('/dashboard', {
        params: { range: timeRange }
      })
      return response.data
    },
    {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000 // 5 minutes
    }
  )

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await refetch()
    setTimeout(() => setIsRefreshing(false), 1000)
  }

  const handleExport = () => {
    // Implement export functionality
    console.log('Exporting dashboard data...')
  }

  // Stats cards data
  const statsCards = [
    {
      title: 'Vendas Hoje',
      value: dashboardData?.todaySales || 'R$ 0,00',
      change: dashboardData?.salesChange || 0,
      icon: ShoppingCart,
      color: 'primary',
      loading: isLoading
    },
    {
      title: 'Clientes',
      value: dashboardData?.totalCustomers || 0,
      change: dashboardData?.customersChange || 0,
      icon: Users,
      color: 'success',
      loading: isLoading
    },
    {
      title: 'Produtos',
      value: dashboardData?.totalProducts || 0,
      subtitle: `${dashboardData?.lowStockCount || 0} em stock baixo`,
      change: -dashboardData?.lowStockCount || 0,
      icon: Package,
      color: 'warning',
      loading: isLoading
    },
    {
      title: 'Receita Mensal',
      value: dashboardData?.monthlyRevenue || 'R$ 0,00',
      change: dashboardData?.revenueChange || 0,
      icon: DollarSign,
      color: 'danger',
      loading: isLoading
    }
  ]

  if (isLoading && !dashboardData) {
    return <LoadingSpinner fullScreen message="Carregando dashboard..." />
  }

  return (
    <>
      <Helmet>
        <title>Dashboard - BizFlow</title>
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Visão geral do seu negócio - {new Date().toLocaleDateString('pt-BR')}
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Time Range Selector */}
            <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
              {['today', 'week', 'month', 'quarter'].map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`
                    px-3 py-1.5 text-sm font-medium rounded-md transition-colors
                    ${timeRange === range 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                    }
                  `}
                >
                  {range === 'today' && 'Hoje'}
                  {range === 'week' && 'Semana'}
                  {range === 'month' && 'Mês'}
                  {range === 'quarter' && 'Trimestre'}
                </button>
              ))}
            </div>
            
            <Button
              variant="outline"
              icon={Download}
              onClick={handleExport}
            >
              Exportar
            </Button>
            
            <Button
              variant="primary"
              icon={RefreshCw}
              loading={isRefreshing}
              onClick={handleRefresh}
            >
              Atualizar
            </Button>
          </div>
        </div>

        {/* Security Overview */}
        <SecurityOverview />

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statsCards.map((stat, index) => (
            <DashboardStats key={index} {...stat} />
          ))}
        </div>

        {/* Charts and Tables Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Sales - 2/3 width */}
          <div className="lg:col-span-2">
            <RecentSales sales={dashboardData?.recentSales || []} />
          </div>
          
          {/* Activity Log - 1/3 width */}
          <div className="lg:col-span-1">
            <ActivityLog activities={dashboardData?.recentActivities || []} />
          </div>
        </div>

        {/* Additional Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Top Products */}
          <Card>
            <Card.Header>
              <Card.Title>Produtos Mais Vendidos</Card.Title>
            </Card.Header>
            <Card.Content>
              <div className="space-y-4">
                {(dashboardData?.topProducts || []).map((product, index) => (
                  <div key={product.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-gray-500">Vendidos: {product.sold}</p>
                      </div>
                    </div>
                    <Badge variant="primary">
                      {product.revenue}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card.Content>
          </Card>

          {/* Revenue Chart Placeholder */}
          <Card className="md:col-span-2">
            <Card.Header>
              <Card.Title>Receita por Categoria</Card.Title>
            </Card.Header>
            <Card.Content>
              <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                <div className="text-center">
                  <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">Gráfico de receitas</p>
                  <p className="text-sm text-gray-500">(Integração com Chart.js)</p>
                </div>
              </div>
            </Card.Content>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <Card.Header>
            <Card.Title>Ações Rápidas</Card.Title>
          </Card.Header>
          <Card.Content>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button variant="outline" fullWidth icon={ShoppingCart}>
                Nova Venda
              </Button>
              <Button variant="outline" fullWidth icon={Package}>
                Adicionar Produto
              </Button>
              <Button variant="outline" fullWidth icon={Users}>
                Novo Cliente
              </Button>
              <Button variant="outline" fullWidth icon={Calendar}>
                Agendar
              </Button>
            </div>
          </Card.Content>
        </Card>
      </div>
    </>
  )
}

export default Dashboard
