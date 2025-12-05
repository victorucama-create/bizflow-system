import React, { useState, useEffect } from 'react'
import { 
  ShoppingCart, 
  Search, 
  Plus, 
  Minus, 
  Trash2,
  Printer,
  CreditCard,
  DollarSign,
  Barcode,
  History,
  X
} from 'lucide-react'
import { Helmet } from 'react-helmet-async'
import { useQuery } from 'react-query'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Badge from '../../components/ui/Badge'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import api from '../../services/api'
import toast from 'react-hot-toast'

const POS = () => {
  const [cart, setCart] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [customer, setCustomer] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [isProcessing, setIsProcessing] = useState(false)
  const [cashDrawerOpen, setCashDrawerOpen] = useState(false)

  // Fetch products
  const { data: products = [], isLoading } = useQuery(
    'pos-products',
    async () => {
      const response = await api.get('/products')
      return response.data
    },
    {
      refetchOnWindowFocus: false
    }
  )

  // Filter products based on search
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Calculate cart totals
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  const tax = subtotal * 0.18 // 18% tax for example
  const total = subtotal + tax

  const addToCart = (product) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id)
      
      if (existingItem) {
        return prevCart.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      
      return [...prevCart, {
        ...product,
        quantity: 1,
        cartId: Date.now()
      }]
    })
    
    toast.success(`${product.name} adicionado ao carrinho`)
  }

  const updateQuantity = (cartId, newQuantity) => {
    if (newQuantity < 1) {
      removeFromCart(cartId)
      return
    }
    
    setCart(prevCart =>
      prevCart.map(item =>
        item.cartId === cartId
          ? { ...item, quantity: newQuantity }
          : item
      )
    )
  }

  const removeFromCart = (cartId) => {
    setCart(prevCart => prevCart.filter(item => item.cartId !== cartId))
    toast.success('Item removido do carrinho')
  }

  const clearCart = () => {
    setCart([])
    toast.success('Carrinho limpo')
  }

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error('Adicione itens ao carrinho antes de finalizar')
      return
    }

    setIsProcessing(true)
    
    try {
      const saleData = {
        items: cart.map(item => ({
          productId: item.id,
          quantity: item.quantity,
          unitPrice: item.price
        })),
        customerId: customer?.id,
        paymentMethod,
        notes: ''
      }

      const response = await api.post('/sales', saleData)
      
      toast.success('Venda realizada com sucesso!')
      clearCart()
      setCustomer(null)
      
      // Print receipt if needed
      if (response.data.receipt) {
        // Handle receipt printing
        console.log('Receipt:', response.data.receipt)
      }
    } catch (error) {
      toast.error('Erro ao processar venda')
    } finally {
      setIsProcessing(false)
    }
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  if (isLoading) {
    return <LoadingSpinner fullScreen message="Carregando produtos..." />
  }

  return (
    <>
      <Helmet>
        <title>Ponto de Venda - BizFlow</title>
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Ponto de Venda Seguro</h1>
            <p className="text-gray-600 mt-1">
              Sistema de vendas integrado e seguro
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              icon={History}
            >
              Histórico
            </Button>
            
            <Button
              variant="primary"
              icon={cashDrawerOpen ? DollarSign : ShoppingCart}
              onClick={() => setCashDrawerOpen(!cashDrawerOpen)}
            >
              {cashDrawerOpen ? 'Fechar Caixa' : 'Abrir Caixa'}
            </Button>
          </div>
        </div>

        {/* Main POS Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Products Grid - 2/3 width */}
          <div className="lg:col-span-2">
            <Card>
              <div className="mb-6">
                <Input
                  placeholder="Buscar produtos por nome, SKU ou código de barras..."
                  startIcon={Search}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  fullWidth
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredProducts.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className="group border border-gray-200 rounded-lg p-4 text-center hover:border-primary hover:shadow-md transition-all"
                  >
                    <div className="w-16 h-16 bg-gray-100 rounded-lg mx-auto mb-3 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                      <ShoppingCart className="h-8 w-8 text-gray-400 group-hover:text-primary" />
                    </div>
                    
                    <div className="space-y-1">
                      <h3 className="font-medium text-gray-900 text-sm line-clamp-2">
                        {product.name}
                      </h3>
                      <p className="text-xs text-gray-500">{product.sku}</p>
                      <p className="font-bold text-primary">
                        {formatCurrency(product.price)}
                      </p>
                      <p className="text-xs text-gray-500">
                        Estoque: {product.currentStock}
                      </p>
                    </div>
                    
                    <div className="mt-3">
                      <Badge variant={product.currentStock > 0 ? 'success' : 'danger'}>
                        {product.currentStock > 0 ? 'Disponível' : 'Esgotado'}
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
            </Card>
          </div>

          {/* Cart Sidebar - 1/3 width */}
          <div className="lg:col-span-1">
            <Card className="h-full flex flex-col">
              <Card.Header>
                <div className="flex items-center justify-between">
                  <Card.Title>Carrinho de Vendas</Card.Title>
                  <Badge variant="primary">
                    {cart.length} itens
                  </Badge>
                </div>
              </Card.Header>

              {/* Cart Items */}
              <div className="flex-1 overflow-y-auto mb-4">
                {cart.length === 0 ? (
                  <div className="text-center py-12">
                    <ShoppingCart className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">Carrinho vazio</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Adicione produtos para iniciar uma venda
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cart.map((item) => (
                      <div key={item.cartId} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-medium text-gray-900">{item.name}</h4>
                              <p className="text-sm text-gray-500">{formatCurrency(item.price)}</p>
                            </div>
                            <button
                              onClick={() => removeFromCart(item.cartId)}
                              className="p-1 hover:bg-red-50 rounded"
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </button>
                          </div>
                          
                          <div className="flex items-center gap-3 mt-2">
                            <button
                              onClick={() => updateQuantity(item.cartId, item.quantity - 1)}
                              className="p-1 hover:bg-gray-200 rounded"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            
                            <span className="font-medium">{item.quantity}</span>
                            
                            <button
                              onClick={() => updateQuantity(item.cartId, item.quantity + 1)}
                              className="p-1 hover:bg-gray-200 rounded"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                            
                            <span className="ml-auto font-medium">
                              {formatCurrency(item.price * item.quantity)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Cart Totals */}
              <div className="space-y-3 border-t pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">{formatCurrency(subtotal)}</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Impostos (18%):</span>
                  <span className="font-medium">{formatCurrency(tax)}</span>
                </div>
                
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total:</span>
                  <span className="text-primary">{formatCurrency(total)}</span>
                </div>
              </div>

              {/* Payment Method */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Método de Pagamento
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['cash', 'credit_card', 'debit_card', 'pix', 'bank_slip', 'bank_transfer'].map((method) => (
                    <button
                      key={method}
                      onClick={() => setPaymentMethod(method)}
                      className={`
                        p-2 text-center rounded-lg border text-sm
                        ${paymentMethod === method
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-gray-200 hover:border-gray-300'
                        }
                      `}
                    >
                      {method === 'cash' && 'Dinheiro'}
                      {method === 'credit_card' && 'Crédito'}
                      {method === 'debit_card' && 'Débito'}
                      {method === 'pix' && 'PIX'}
                      {method === 'bank_slip' && 'Boleto'}
                      {method === 'bank_transfer' && 'Transferência'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="mt-6 space-y-3">
                <Button
                  variant="success"
                  icon={CreditCard}
                  fullWidth
                  size="lg"
                  loading={isProcessing}
                  onClick={handleCheckout}
                  disabled={cart.length === 0}
                >
                  Finalizar Venda Segura
                </Button>
                
                <Button
                  variant="outline"
                  icon={Printer}
                  fullWidth
                >
                  Imprimir Prévia
                </Button>
                
                <Button
                  variant="danger"
                  icon={Trash2}
                  fullWidth
                  onClick={clearCart}
                  disabled={cart.length === 0}
                >
                  Limpar Carrinho
                </Button>
              </div>

              {/* Customer Selection */}
              <div className="mt-6 p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-blue-900">Cliente</span>
                  <Badge variant={customer ? 'success' : 'warning'}>
                    {customer ? 'Selecionado' : 'Opcional'}
                  </Badge>
                </div>
                
                {customer ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{customer.name}</p>
                      <p className="text-sm text-blue-700">{customer.email}</p>
                    </div>
                    <button
                      onClick={() => setCustomer(null)}
                      className="p-1 hover:bg-blue-100 rounded"
                    >
                      <X className="h-4 w-4 text-blue-500" />
                    </button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    fullWidth
                    onClick={() => {
                      // Open customer selection modal
                      toast.info('Seleção de cliente em desenvolvimento')
                    }}
                  >
                    Selecionar Cliente
                  </Button>
                )}
              </div>
            </Card>
          </div>
        </div>

        {/* Quick Actions Bar */}
        <Card>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button variant="outline" icon={Barcode}>
              Ler Código de Barras
            </Button>
            <Button variant="outline">
              Venda Rápida
            </Button>
            <Button variant="outline">
              Desconto Especial
            </Button>
            <Button variant="outline">
              Orçamento
            </Button>
            <Button variant="outline">
              Devolução
            </Button>
          </div>
        </Card>
      </div>
    </>
  )
}

export default POS
