import React, { useState, useEffect } from 'react'
import { 
  Package,
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  Edit2,
  Trash2,
  Eye,
  Tag,
  TrendingUp,
  AlertTriangle,
  MoreVertical,
  Grid,
  List,
  BarChart3,
  RefreshCw,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { Helmet } from 'react-helmet-async'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Badge from '../../components/ui/Badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TablePagination } from '../../components/ui/Table'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import ProductModal from './components/ProductModal'
import DeleteConfirmModal from './components/DeleteConfirmModal'
import BulkActions from './components/BulkActions'
import Filters from './components/Filters'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { formatCurrency, formatDate } from '../../utils/formatters'

const Products = () => {
  const [search, setSearch] = useState('')
  const [selectedProducts, setSelectedProducts] = useState([])
  const [viewMode, setViewMode] = useState('table')
  const [showProductModal, setShowProductModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [filters, setFilters] = useState({
    category: '',
    status: '',
    stock: '',
    minPrice: '',
    maxPrice: ''
  })
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    total: 0
  })

  const queryClient = useQueryClient()

  // Fetch products
  const { data: productsData, isLoading, refetch } = useQuery(
    ['products', pagination.page, pagination.pageSize, filters, search],
    async () => {
      const params = {
        page: pagination.page,
        limit: pagination.pageSize,
        search,
        ...filters
      }
      
      const response = await api.get('/products', { params })
      return response.data
    },
    {
      refetchOnWindowFocus: false,
      keepPreviousData: true
    }
  )

  // Delete mutation
  const deleteMutation = useMutation(
    async (productIds) => {
      if (productIds.length === 1) {
        await api.delete(`/products/${productIds[0]}`)
      } else {
        await api.delete('/products/bulk', { data: { ids: productIds } })
      }
    },
    {
      onSuccess: () => {
        toast.success(selectedProducts.length === 1 ? 'Produto excluído!' : 'Produtos excluídos!')
        setSelectedProducts([])
        setShowDeleteModal(false)
        queryClient.invalidateQueries('products')
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Erro ao excluir produto(s)')
      }
    }
  )

  // Toggle product status
  const toggleStatusMutation = useMutation(
    async ({ productId, isActive }) => {
      await api.patch(`/products/${productId}/status`, { isActive })
    },
    {
      onSuccess: () => {
        toast.success('Status atualizado!')
        queryClient.invalidateQueries('products')
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Erro ao atualizar status')
      }
    }
  )

  const products = productsData?.products || []
  const paginationInfo = productsData?.pagination || pagination

  // Handle product selection
  const handleSelectProduct = (productId) => {
    setSelectedProducts(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    )
  }

  const handleSelectAll = () => {
    if (selectedProducts.length === products.length) {
      setSelectedProducts([])
    } else {
      setSelectedProducts(products.map(p => p.id))
    }
  }

  // Handle delete
  const handleDelete = () => {
    if (selectedProducts.length === 0) return
    setShowDeleteModal(true)
  }

  const confirmDelete = () => {
    deleteMutation.mutate(selectedProducts)
  }

  // Handle edit
  const handleEdit = (product) => {
    setEditingProduct(product)
    setShowProductModal(true)
  }

  // Handle toggle status
  const handleToggleStatus = (productId, currentStatus) => {
    toggleStatusMutation.mutate({
      productId,
      isActive: !currentStatus
    })
  }

  // Handle page change
  const handlePageChange = (page) => {
    setPagination(prev => ({ ...prev, page }))
  }

  const handlePageSizeChange = (pageSize) => {
    setPagination(prev => ({ ...prev, pageSize, page: 1 }))
  }

  // Export products
  const handleExport = () => {
    toast.success('Exportação iniciada...')
    // Implement export logic
  }

  // Import products
  const handleImport = () => {
    toast.info('Funcionalidade de importação em desenvolvimento')
  }

  // Get stock status
  const getStockStatus = (current, min) => {
    if (current === 0) return { label: 'Esgotado', variant: 'danger' }
    if (current <= min) return { label: 'Baixo', variant: 'warning' }
    if (current <= min * 2) return { label: 'Médio', variant: 'info' }
    return { label: 'Disponível', variant: 'success' }
  }

  // Calculate total value
  const calculateTotalValue = () => {
    return products.reduce((total, product) => {
      return total + (product.currentStock * product.costPrice)
    }, 0)
  }

  if (isLoading && !productsData) {
    return <LoadingSpinner fullScreen message="Carregando produtos..." />
  }

  return (
    <>
      <Helmet>
        <title>Produtos - BizFlow</title>
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Produtos</h1>
            <p className="text-gray-600 mt-1">
              Gerencie seu catálogo de produtos
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
              variant="outline"
              icon={Upload}
              onClick={handleImport}
            >
              Importar
            </Button>
            
            <Button
              variant="primary"
              icon={Plus}
              onClick={() => {
                setEditingProduct(null)
                setShowProductModal(true)
              }}
            >
              Novo Produto
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="text-center">
            <div className="flex items-center justify-center gap-3 mb-3">
              <Package className="h-6 w-6 text-primary" />
              <span className="text-sm font-medium text-gray-600">Total de Produtos</span>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {paginationInfo.total || 0}
            </div>
            <div className="text-sm text-gray-500">
              {products.filter(p => p.isActive).length} ativos
            </div>
          </Card>
          
          <Card className="text-center">
            <div className="flex items-center justify-center gap-3 mb-3">
              <TrendingUp className="h-6 w-6 text-green-500" />
              <span className="text-sm font-medium text-gray-600">Valor em Estoque</span>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {formatCurrency(calculateTotalValue())}
            </div>
            <div className="text-sm text-gray-500">
              Custo total
            </div>
          </Card>
          
          <Card className="text-center">
            <div className="flex items-center justify-center gap-3 mb-3">
              <AlertTriangle className="h-6 w-6 text-yellow-500" />
              <span className="text-sm font-medium text-gray-600">Estoque Baixo</span>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {products.filter(p => p.currentStock <= p.minStock).length}
            </div>
            <div className="text-sm text-gray-500">
              Precisa de atenção
            </div>
          </Card>
          
          <Card className="text-center">
            <div className="flex items-center justify-center gap-3 mb-3">
              <Tag className="h-6 w-6 text-blue-500" />
              <span className="text-sm font-medium text-gray-600">Categorias</span>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {new Set(products.map(p => p.category)).size}
            </div>
            <div className="text-sm text-gray-500">
              Diversidade
            </div>
          </Card>
        </div>

        {/* Filters and Search */}
        <Filters
          filters={filters}
          onChange={setFilters}
          onClear={() => setFilters({
            category: '',
            status: '',
            stock: '',
            minPrice: '',
            maxPrice: ''
          })}
        />

        {/* Search and Actions Bar */}
        <Card>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex-1">
              <Input
                placeholder="Buscar produtos por nome, SKU, código de barras..."
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
        {selectedProducts.length > 0 && (
          <BulkActions
            selectedCount={selectedProducts.length}
            onDelete={handleDelete}
            onClearSelection={() => setSelectedProducts([])}
          />
        )}

        {/* Products Table */}
        {viewMode === 'table' ? (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <input
                      type="checkbox"
                      checked={selectedProducts.length === products.length && products.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-primary focus:ring-primary/50"
                    />
                  </TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Estoque</TableHead>
                  <TableHead>Preço</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Última Atualização</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              
              <TableBody>
                {products.length > 0 ? (
                  products.map((product) => {
                    const stockStatus = getStockStatus(product.currentStock, product.minStock)
                    
                    return (
                      <TableRow key={product.id} hover>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedProducts.includes(product.id)}
                            onChange={() => handleSelectProduct(product.id)}
                            className="rounded border-gray-300 text-primary focus:ring-primary/50"
                          />
                        </TableCell>
                        
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center">
                              {product.image ? (
                                <img
                                  src={product.image}
                                  alt={product.name}
                                  className="w-10 h-10 object-cover rounded"
                                />
                              ) : (
                                <Package className="h-5 w-5 text-gray-400" />
                              )}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">
                                {product.name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {product.brand}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <div className="font-mono text-sm">{product.sku}</div>
                        </TableCell>
                        
                        <TableCell>
                          <Badge variant="info">
                            {product.category}
                          </Badge>
                        </TableCell>
                        
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{product.currentStock}</span>
                              <Badge variant={stockStatus.variant}>
                                {stockStatus.label}
                              </Badge>
                            </div>
                            <div className="text-xs text-gray-500">
                              Mín: {product.minStock} | Máx: {product.maxStock}
                            </div>
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-bold text-primary">
                              {formatCurrency(product.price)}
                            </div>
                            <div className="text-xs text-gray-500">
                              Custo: {formatCurrency(product.costPrice)}
                            </div>
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleToggleStatus(product.id, product.isActive)}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                                product.isActive ? 'bg-green-500' : 'bg-gray-300'
                              }`}
                            >
                              <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                                  product.isActive ? 'translate-x-6' : 'translate-x-1'
                                }`}
                              />
                            </button>
                            <span className="text-sm">
                              {product.isActive ? 'Ativo' : 'Inativo'}
                            </span>
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <div className="text-sm text-gray-500">
                            {formatDate(product.updatedAt)}
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleEdit(product)}
                              className="p-1 hover:bg-blue-50 rounded text-blue-600"
                              title="Editar"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            
                            <button
                              onClick={() => handleToggleStatus(product.id, product.isActive)}
                              className={`p-1 rounded ${
                                product.isActive
                                  ? 'hover:bg-red-50 text-red-600'
                                  : 'hover:bg-green-50 text-green-600'
                              }`}
                              title={product.isActive ? 'Desativar' : 'Ativar'}
                            >
                              {product.isActive ? (
                                <XCircle className="h-4 w-4" />
                              ) : (
                                <CheckCircle className="h-4 w-4" />
                              )}
                            </button>
                            
                            <button
                              onClick={() => {
                                setSelectedProducts([product.id])
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
                    )
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12">
                      <div className="flex flex-col items-center">
                        <Package className="h-12 w-12 text-gray-300 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          Nenhum produto encontrado
                        </h3>
                        <p className="text-gray-600 mb-4">
                          {search || Object.values(filters).some(f => f) 
                            ? 'Tente ajustar sua busca ou filtros'
                            : 'Comece adicionando seu primeiro produto'
                          }
                        </p>
                        {!search && !Object.values(filters).some(f => f) && (
                          <Button
                            variant="primary"
                            icon={Plus}
                            onClick={() => setShowProductModal(true)}
                          >
                            Adicionar Primeiro Produto
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            {/* Pagination */}
            {products.length > 0 && (
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => {
              const stockStatus = getStockStatus(product.currentStock, product.minStock)
              
              return (
                <Card key={product.id} hover className="relative">
                  {/* Selection Checkbox */}
                  <input
                    type="checkbox"
                    checked={selectedProducts.includes(product.id)}
                    onChange={() => handleSelectProduct(product.id)}
                    className="absolute top-3 left-3 z-10 rounded border-gray-300 text-primary focus:ring-primary/50"
                  />
                  
                  {/* Product Image */}
                  <div className="relative h-48 bg-gray-100 rounded-lg mb-4 overflow-hidden">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-16 w-16 text-gray-400" />
                      </div>
                    )}
                    
                    {/* Quick Actions Overlay */}
                    <div className="absolute top-3 right-3 flex space-x-2">
                      <button
                        onClick={() => handleEdit(product)}
                        className="p-2 bg-white/90 backdrop-blur-sm rounded-lg hover:bg-white"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                    </div>
                    
                    {/* Stock Status */}
                    <div className="absolute bottom-3 left-3">
                      <Badge variant={stockStatus.variant}>
                        {stockStatus.label}
                      </Badge>
                    </div>
                  </div>
                  
                  {/* Product Info */}
                  <div className="space-y-3">
                    <div>
                      <h3 className="font-semibold text-gray-900 line-clamp-2">
                        {product.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {product.brand} • {product.category}
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold text-primary text-lg">
                          {formatCurrency(product.price)}
                        </div>
                        <div className="text-xs text-gray-500">
                          Custo: {formatCurrency(product.costPrice)}
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="font-medium">
                          {product.currentStock} uni
                        </div>
                        <div className="text-xs text-gray-500">
                          SKU: {product.sku}
                        </div>
                      </div>
                    </div>
                    
                    {/* Stock Progress */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Estoque</span>
                        <span>{product.currentStock} / {product.maxStock}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full"
                          style={{ 
                            width: `${Math.min((product.currentStock / product.maxStock) * 100, 100)}%` 
                          }}
                        />
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex space-x-2 pt-4 border-t">
                      <button
                        onClick={() => handleEdit(product)}
                        className="flex-1 btn-outline py-2 text-sm"
                      >
                        <Edit2 className="h-4 w-4 inline mr-1" />
                        Editar
                      </button>
                      
                      <button
                        onClick={() => handleToggleStatus(product.id, product.isActive)}
                        className={`px-3 py-2 rounded-lg text-sm ${
                          product.isActive
                            ? 'bg-red-50 text-red-600 hover:bg-red-100'
                            : 'bg-green-50 text-green-600 hover:bg-green-100'
                        }`}
                      >
                        {product.isActive ? (
                          <XCircle className="h-4 w-4" />
                        ) : (
                          <CheckCircle className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}

        {/* Quick Stats */}
        {products.length > 0 && (
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Estatísticas Rápidas
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">
                  {products.filter(p => p.currentStock <= p.minStock).length}
                </div>
                <div className="text-sm text-gray-600">Com estoque baixo</div>
              </div>
              
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">
                  {products.filter(p => !p.isActive).length}
                </div>
                <div className="text-sm text-gray-600">Inativos</div>
              </div>
              
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">
                  {formatCurrency(Math.max(...products.map(p => p.price)))}
                </div>
                <div className="text-sm text-gray-600">Produto mais caro</div>
              </div>
              
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">
                  {products.reduce((sum, p) => sum + p.currentStock, 0)}
                </div>
                <div className="text-sm text-gray-600">Total em estoque</div>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Modals */}
      {showProductModal && (
        <ProductModal
          product={editingProduct}
          onClose={() => {
            setShowProductModal(false)
            setEditingProduct(null)
          }}
          onSuccess={() => {
            setShowProductModal(false)
            setEditingProduct(null)
            queryClient.invalidateQueries('products')
          }}
        />
      )}

      {showDeleteModal && (
        <DeleteConfirmModal
          count={selectedProducts.length}
          onConfirm={confirmDelete}
          onCancel={() => setShowDeleteModal(false)}
          isDeleting={deleteMutation.isLoading}
        />
      )}
    </>
  )
}

export default Products
