import React from 'react'
import { 
  MoreVertical, 
  CheckCircle, 
  Clock, 
  XCircle,
  ArrowUpRight
} from 'lucide-react'
import Card from '../../../components/ui/Card'
import Badge from '../../../components/ui/Badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/ui/Table'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const RecentSales = ({ sales = [] }) => {
  const getStatusBadge = (status) => {
    const statusConfig = {
      completed: { variant: 'success', label: 'Concluída', icon: CheckCircle },
      pending: { variant: 'warning', label: 'Pendente', icon: Clock },
      cancelled: { variant: 'danger', label: 'Cancelada', icon: XCircle }
    }
    
    const config = statusConfig[status] || statusConfig.pending
    
    return (
      <Badge variant={config.variant}>
        <config.icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    )
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  return (
    <Card>
      <Card.Header className="flex items-center justify-between">
        <div>
          <Card.Title>Vendas Recentes</Card.Title>
          <Card.Description>
            Últimas transações realizadas
          </Card.Description>
        </div>
        <button className="p-2 hover:bg-gray-100 rounded-lg">
          <MoreVertical className="h-5 w-5 text-gray-500" />
        </button>
      </Card.Header>
      
      <Card.Content>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID Venda</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          
          <TableBody>
            {sales.length > 0 ? (
              sales.map((sale) => (
                <TableRow key={sale.id}>
                  <TableCell>
                    <div className="font-medium text-primary">#{sale.saleNumber}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{sale.customerName}</div>
                    <div className="text-sm text-gray-500">{sale.customerEmail}</div>
                  </TableCell>
                  <TableCell>
                    {format(new Date(sale.date), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </TableCell>
                  <TableCell className="font-semibold">
                    {formatCurrency(sale.amount)}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(sale.status)}
                  </TableCell>
                  <TableCell>
                    <button className="p-1 hover:bg-gray-100 rounded">
                      <ArrowUpRight className="h-4 w-4 text-gray-500" />
                    </button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  Nenhuma venda recente encontrada
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        
        {sales.length > 0 && (
          <div className="mt-4 text-center">
            <button className="text-primary hover:text-primary/80 font-medium text-sm">
              Ver todas as vendas →
            </button>
          </div>
        )}
      </Card.Content>
    </Card>
  )
}

export default RecentSales
