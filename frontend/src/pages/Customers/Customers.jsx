import React, { useState, useEffect } from 'react'
import { 
  Users,
  UserPlus,
  Search,
  Filter,
  Download,
  Mail,
  Phone,
  MapPin,
  Building,
  CreditCard,
  TrendingUp,
  Calendar,
  Edit2,
  Trash2,
  Eye,
  MoreVertical,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Grid,
  List,
  BarChart3,
  MessageSquare,
  Send
} from 'lucide-react'
import { Helmet } from 'react-helmet-async'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Badge from '../../components/ui/Badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TablePagination } from '../../components/ui/Table'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import CustomerModal from './components/CustomerModal'
import DeleteConfirmModal from './components/DeleteConfirmModal'
import BulkActions from './components/BulkActions'
import Filters from './components/Filters'
import CustomerStats from './components/CustomerStats'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { formatCurrency, formatDate, formatDocument } from '../../utils/formatters'

const Customers = () => {
  const [search, setSearch] = useState('')
  const [selectedCustomers, setSelectedCustomers] = useState([])
  const [viewMode, setViewMode] = useState('table')
  const [showCustomerModal, setShowCustomerModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState(null)
  const [filters, setFilters] = useState({
    type: '',
    status: '',
    segment: '',
    minBalance: '',
    maxBalance: ''
  })
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    total: 0
  })

  const queryClient = useQueryClient()

  // Fetch customers
  const { data: customersData, isLoading, refetch } = useQuery(
    ['customers', pagination.page, pagination.pageSize, filters, search],
    async () => {
      const params = {
        page: pagination.page,
        limit: pagination.pageSize,
        search,
        ...filters
      }
      
      const response = await api.get('/customers', { params })
      return response.data
    },
    {
      refetchOnWindowFocus: false,
      keepPreviousData: true
    }
  )

  // Delete mutation
  const deleteMutation = useMutation(
    async (customerIds) => {
      if (customerIds.length === 1) {
        await api.delete(`/customers/${customerIds[0]}`)
      } else {
        await api.delete('/customers/bulk', { data: { ids: customerIds } })
      }
    },
    {
      onSuccess: () => {
        toast.success(selectedCustomers.length === 1 ? 'Cliente excluído!' : 'Clientes excluídos!')
        setSelectedCustomers([])
        setShowDeleteModal(false)
        queryClient.invalidateQueries('customers')
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Erro ao excluir cliente(s)')
      }
    }
  )

  // Toggle customer status
  const toggleStatusMutation = useMutation(
    async ({ customerId, status }) => {
      await api.patch(`/customers/${customerId}/status`, { status })
    },
    {
      onSuccess: () => {
        toast.success('Status atualizado!')
        queryClient.invalidateQueries('customers')
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Erro ao atualizar status')
      }
    }
  )

  // Send welcome email
  const sendWelcomeEmailMutation = useMutation(
    async (customerId) => {
      await api.post(`/customers/${customerId}/welcome-email`)
    },
    {
      onSuccess: () => {
        toast.success('E-mail de boas-vindas enviado!')
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Erro ao enviar e-mail')
      }
    }
  )

  const customers = customersData?.customers || []
  const paginationInfo = customersData?.pagination || pagination

  // Handle customer selection
  const handleSelectCustomer = (customerId) => {
    setSelectedCustomers(prev =>
      prev.includes(customerId)
        ? prev.filter(id => id !== customerId)
        : [...prev, customerId]
    )
  }

  const handleSelectAll = () => {
    if (selectedCustomers.length === customers.length) {
      setSelectedCustomers([])
    } else {
      setSelectedCustomers(customers.map(c => c.id))
    }
  }

  // Handle delete
  const handleDelete = () => {
    if (selectedCustomers.length === 0) return
    setShowDeleteModal(true)
  }

  const confirmDelete = () => {
    deleteMutation.mutate(selectedCustomers)
  }

  // Handle edit
  const handleEdit = (customer) => {
    setEditingCustomer(customer)
    setShowCustomerModal(true)
  }

  // Handle toggle status
  const handleToggleStatus = (customerId, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active'
    toggleStatusMutation.mutate({ customerId, status: newStatus })
  }

  // Handle send welcome email
  const handleSendWelcomeEmail = (customerId) => {
    sendWelcomeEmailMutation.mutate(customerId)
  }

  // Handle page change
  const handlePageChange = (page) => {
    setPagination(prev => ({ ...prev, page }))
  }

  const handlePageSizeChange = (pageSize) => {
    setPagination(prev => ({ ...prev, pageSize, page: 1 }))
  }

  // Export customers
  const handleExport = () => {
    toast.success('Exportação iniciada...')
    // Implement export logic
  }

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success'
      case 'inactive': return 'danger'
      case 'pending': return 'warning'
      default: return 'default'
    }
  }

  // Get customer type label
  const getTypeLabel = (type) => {
    return type === 'business' ? 'Empresa' : 'Pessoa Física'
  }

  // Calculate total balance
  const calculateTotalBalance = () => {
    return customers.reduce((total, customer) => {
      return total + (customer.currentBalance || 0)
    }, 0)
  }

  if (isLoading && !customersData) {
    return <LoadingSpinner fullScreen message="Carregando clientes..." />
  }

  return (
    <>
      <Helmet>
        <title>Clientes - BizFlow</title>
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
            <p className="text-gray-600 mt-1">
              Gerencie sua base de clientes
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              icon={Download}
              onClick={handleExport}
            >
              Exportar
            </Button>
            
            <Button
              variant="primary"
              icon={UserPlus}
              onClick={() => {
                setEditingCustomer(null)
                setShowCustomerModal(true)
              }}
            >
              Novo Cliente
            </Button>
          </div>
        </div>

        {/* Customer Stats */}
        <CustomerStats customers={customers} />

        {/* Filters and Search */}
        <Filters
          filters={filters}
          onChange={setFilters}
          onClear={() => setFilters({
            type: '',
            status: '',
            segment: '',
            minBalance: '',
            maxBalance: ''
          })}
        />

        {/* Search and Actions Bar */}
        <Card>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex-1">
              <Input
                placeholder="Buscar clientes por nome, e-mail, CPF/CNPJ, telefone..."
                startIcon={Search}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                fullWidth
              />
            </div>
            
            <div className="flex items-center space-x-3">
              {/* View Toggle */}
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-2 rounded ${viewMode === 'table' ? 'bg-white shadow' : ''}`}
                >
                  <List className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white shadow' : ''}`}
                >
                  <Grid className="h-4 w-4" />
                </button>
              </div>
              
              <Button
                variant="outline"
                icon={RefreshCw}
                onClick={() => refetch()}
              >
                Atualizar
              </Button>
            </div>
          </div>
        </Card>

        {/* Bulk Actions */}
        {selectedCustomers.length > 0 && (
          <BulkActions
            selectedCount={selectedCustomers.length}
            onDelete={handleDelete}
            onClearSelection={() => setSelectedCustomers([])}
          />
        )}

        {/* Customers Table */}
        {viewMode === 'table' ? (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <input
                      type="checkbox"
                      checked={selectedCustomers.length === customers.length && customers.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-primary focus:ring-primary/50"
                    />
                  </TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Saldo</TableHead>
                  <TableHead>Compras</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Última Compra</TableHost>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              
              <TableBody>
                {customers.length > 0 ? (
                  customers.map((customer) => (
                    <TableRow key={customer.id} hover>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedCustomers.includes(customer.id)}
                          onChange={() => handleSelectCustomer(customer.id)}
                          className="rounded border-gray-300 text-primary focus:ring-primary/50"
                        />
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                            {customer.type === 'business' ? (
                              <Building className="h-5 w-5 text-primary" />
                            ) : (
                              <Users className="h-5 w-5 text-primary" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">
                              {customer.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {customer.cpf_cnpj && formatDocument(customer.cpf_cnpj)}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <Badge variant={customer.type === 'business' ? 'primary' : 'info'}>
                          {getTypeLabel(customer.type)}
                        </Badge>
                      </TableCell>
                      
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-sm">
                            <Mail className="h-3 w-3" />
                            <span className="truncate">{customer.email}</span>
                          </div>
                          <div className="flex items-center gap-1 text-sm text-gray-500">
                            <Phone className="h-3 w-3" />
                            <span>{customer.phone}</span>
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="space-y-1">
                          <div className={`font-bold ${
                            customer.currentBalance > 0 ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {formatCurrency(customer.currentBalance)}
                          </div>
                          <div className="text-xs text-gray-500">
                            Limite: {formatCurrency(customer.creditLimit)}
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">
                            {formatCurrency(customer.totalPurchases || 0)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {customer.totalOrders || 0} pedidos
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant={getStatusColor(customer.status)}>
                            {customer.status === 'active' ? 'Ativo' : 
                             customer.status === 'inactive' ? 'Inativo' : 'Pendente'}
                          </Badge>
                          
                          <button
                            onClick={() => handleToggleStatus(customer.id, customer.status)}
                            className="p-1 hover:bg-gray-100 rounded"
                          >
                            {customer.status === 'active' ? (
                              <XCircle className="h-4 w-4 text-red-500" />
                            ) : (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            )}
                          </button>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="text-sm text-gray-500">
                          {customer.lastPurchaseDate 
                            ? formatDate(customer.lastPurchaseDate)
                            : 'Nenhuma compra'
                          }
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEdit(customer)}
                            className="p-1 hover:bg-blue-50 rounded text-blue-600"
                            title="Editar"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          
                          <button
                            onClick={() => handleSendWelcomeEmail(customer.id)}
                            className="p-1 hover:bg-green-50 rounded text-green-600"
                            title="Enviar e-mail"
                          >
                            <Send className="h-4 w-4" />
                          </button>
                          
                          <button
                            onClick={() => {
                              setSelectedCustomers([customer.id])
                              setShowDeleteModal(true)
                            }}
                            className="p-1 hover:bg-red-50 rounded text-red-600"
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                          
                          <button className="p-1 hover:bg-gray-100 rounded text-gray-600">
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12">
                      <div className="flex flex-col items-center">
                        <Users className="h-12 w-12 text-gray-300 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          Nenhum cliente encontrado
                        </h3>
                        <p className="text-gray-600 mb-4">
                          {search || Object.values(filters).some(f => f) 
                            ? 'Tente ajustar sua busca ou filtros'
                            : 'Comece adicionando seu primeiro cliente'
                          }
                        </p>
                        {!search && !Object.values(filters).some(f => f) && (
                          <Button
                            variant="primary"
                            icon={UserPlus}
                            onClick={() => setShowCustomerModal(true)}
                          >
                            Adicionar Primeiro Cliente
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            {/* Pagination */}
            {customers.length > 0 && (
              <TablePagination
                currentPage={pagination.page}
                totalPages={Math.ceil(paginationInfo.total / pagination.pageSize)}
                onPageChange={handlePageChange}
                pageSize={pagination.pageSize}
                totalItems={paginationInfo.total}
                onPageSizeChange={handlePageSizeChange}
              />
            )}
          </Card>
        ) : (
          /* Grid View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {customers.map((customer) => (
              <Card key={customer.id} hover className="relative">
                {/* Selection Checkbox */}
                <input
                  type="checkbox"
                  checked={selectedCustomers.includes(customer.id)}
                  onChange={() => handleSelectCustomer(customer.id)}
                  className="absolute top-3 left-3 z-10 rounded border-gray-300 text-primary focus:ring-primary/50"
                />
                
                {/* Customer Header */}
                <div className="flex items-start gap-4 mb-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    customer.type === 'business' 
                      ? 'bg-blue-100 text-blue-600' 
                      : 'bg-primary/10 text-primary'
                  }`}>
                    {customer.type === 'business' ? (
                      <Building className="h-6 w-6" />
                    ) : (
                      <Users className="h-6 w-6" />
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {customer.name}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {getTypeLabel(customer.type)}
                        </p>
                      </div>
                      
                      <Badge variant={getStatusColor(customer.status)}>
                        {customer.status === 'active' ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                {/* Contact Info */}
                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="h-4 w-4" />
                    <span className="truncate">{customer.email}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="h-4 w-4" />
                    <span>{customer.phone}</span>
                  </div>
                  
                  {customer.address && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="h-4 w-4" />
                      <span className="truncate">{customer.city}, {customer.state}</span>
                    </div>
                  )}
                </div>
                
                {/* Financial Info */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-600 mb-1">Saldo</div>
                    <div className={`font-bold ${
                      customer.currentBalance > 0 ? 'text-red-600' : 'text-gray-900'
                    }`}>
                      {formatCurrency(customer.currentBalance)}
                    </div>
                  </div>
                  
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-600 mb-1">Compras</div>
                    <div className="font-bold text-gray-900">
                      {formatCurrency(customer.totalPurchases || 0)}
                    </div>
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex space-x-2 pt-4 border-t">
                  <button
                    onClick={() => handleEdit(customer)}
                    className="flex-1 btn-outline py-2 text-sm"
                  >
                    <Edit2 className="h-4 w-4 inline mr-1" />
                    Editar
                  </button>
                  
                  <button
                    onClick={() => handleSendWelcomeEmail(customer.id)}
                    className="px-3 py-2 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg"
                    title="Enviar e-mail"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                  
                  <button
                    onClick={() => handleToggleStatus(customer.id, customer.status)}
                    className={`px-3 py-2 rounded-lg ${
                      customer.status === 'active'
                        ? 'bg-red-50 text-red-600 hover:bg-red-100'
                        : 'bg-green-50 text-green-600 hover:bg-green-100'
                    }`}
                  >
                    {customer.status === 'active' ? (
                      <XCircle className="h-4 w-4" />
                    ) : (
                      <CheckCircle className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Recent Activity */}
        {customers.length > 0 && (
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Atividade Recente
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600 mb-1">
                  {customers.filter(c => c.status === 'active').length}
                </div>
                <div className="text-sm text-gray-600">Clientes Ativos</div>
              </div>
              
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600 mb-1">
                  {customers.filter(c => c.totalPurchases > 0).length}
                </div>
                <div className="text-sm text-gray-600">Compraram Recentemente</div>
              </div>
              
              <div className="p-4 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600 mb-1">
                  {customers.filter(c => c.currentBalance > 0).length}
                </div>
                <div className="text-sm text-gray-600">Com Saldo Pendente</div>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Modals */}
      {showCustomerModal && (
        <CustomerModal
          customer={editingCustomer}
          onClose={() => {
            setShowCustomerModal(false)
            setEditingCustomer(null)
          }}
          onSuccess={() => {
            setShowCustomerModal(false)
            setEditingCustomer(null)
            queryClient.invalidateQueries('customers')
          }}
        />
      )}

      {showDeleteModal && (
        <DeleteConfirmModal
          count={selectedCustomers.length}
          onConfirm={confirmDelete}
          onCancel={() => setShowDeleteModal(false)}
          isDeleting={deleteMutation.isLoading}
        />
      )}
    </>
  )
}

export default Customers
