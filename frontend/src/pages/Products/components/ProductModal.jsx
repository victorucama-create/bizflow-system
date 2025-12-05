import React, { useState, useEffect } from 'react'
import { 
  X,
  Save,
  Upload,
  Package,
  DollarSign,
  Percent,
  Hash,
  Weight,
  Ruler,
  Barcode,
  Building,
  Tag,
  AlertCircle,
  Image as ImageIcon
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { useMutation, useQueryClient } from 'react-query'
import Card from '../../../components/ui/Card'
import Button from '../../../components/ui/Button'
import Input from '../../../components/ui/Input'
import Badge from '../../../components/ui/Badge'
import api from '../../../services/api'
import toast from 'react-hot-toast'
import { formatCurrency } from '../../../utils/formatters'

// Validation schema
const productSchema = yup.object({
  sku: yup.string().required('SKU é obrigatório'),
  name: yup.string().required('Nome é obrigatório'),
  description: yup.string(),
  category: yup.string().required('Categoria é obrigatória'),
  brand: yup.string().required('Marca é obrigatória'),
  unit: yup.string().required('Unidade é obrigatória'),
  price: yup.number()
    .typeError('Preço deve ser um número')
    .required('Preço é obrigatório')
    .positive('Preço deve ser positivo'),
  costPrice: yup.number()
    .typeError('Custo deve ser um número')
    .required('Custo é obrigatório')
    .positive('Custo deve ser positivo'),
  taxRate: yup.number()
    .typeError('Taxa de imposto deve ser um número')
    .min(0, 'Taxa não pode ser negativa')
    .max(100, 'Taxa não pode ser maior que 100%'),
  minStock: yup.number()
    .typeError('Estoque mínimo deve ser um número')
    .required('Estoque mínimo é obrigatório')
    .integer('Deve ser um número inteiro')
    .min(0, 'Não pode ser negativo'),
  currentStock: yup.number()
    .typeError('Estoque atual deve ser um número')
    .required('Estoque atual é obrigatório')
    .integer('Deve ser um número inteiro')
    .min(0, 'Não pode ser negativo'),
  maxStock: yup.number()
    .typeError('Estoque máximo deve ser um número')
    .required('Estoque máximo é obrigatório')
    .integer('Deve ser um número inteiro')
    .min(yup.ref('minStock'), 'Deve ser maior que o estoque mínimo'),
  location: yup.string(),
  weight: yup.number()
    .typeError('Peso deve ser um número')
    .positive('Peso deve ser positivo'),
  dimensions: yup.string(),
  barcode: yup.string(),
  supplier: yup.string(),
  isActive: yup.boolean().default(true)
})

const ProductModal = ({ product, onClose, onSuccess }) => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [imagePreview, setImagePreview] = useState(null)
  const [categories, setCategories] = useState([
    'Eletrônicos',
    'Informática',
    'Móveis',
    'Escritório',
    'Limpeza',
    'Alimentos',
    'Bebidas',
    'Vestuário',
    'Calçados',
    'Acessórios'
  ])
  
  const queryClient = useQueryClient()
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue
  } = useForm({
    resolver: yupResolver(productSchema),
    defaultValues: product || {
      sku: '',
      name: '',
      description: '',
      category: '',
      brand: '',
      unit: 'un',
      price: 0,
      costPrice: 0,
      taxRate: 18,
      minStock: 0,
      currentStock: 0,
      maxStock: 0,
      location: '',
      weight: 0,
      dimensions: '',
      barcode: '',
      supplier: '',
      isActive: true
    }
  })

  // Watch for price and cost changes to calculate margin
  const price = watch('price') || 0
  const costPrice = watch('costPrice') || 0
  const margin = price > 0 ? ((price - costPrice) / price) * 100 : 0

  // Product mutation
  const productMutation = useMutation(
    async (data) => {
      if (product) {
        const response = await api.put(`/products/${product.id}`, data)
        return response.data
      } else {
        const response = await api.post('/products', data)
        return response.data
      }
    },
    {
      onSuccess: () => {
        toast.success(product ? 'Produto atualizado!' : 'Produto criado!')
        queryClient.invalidateQueries('products')
        onSuccess()
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Erro ao salvar produto')
      }
    }
  )

  useEffect(() => {
    if (product) {
      reset(product)
      if (product.image) {
        setImagePreview(product.image)
      }
    }
  }, [product, reset])

  const onSubmit = async (data) => {
    setIsSubmitting(true)
    try {
      await productMutation.mutateAsync(data)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      // In a real app, you would upload to server
      // For demo, create object URL
      const previewUrl = URL.createObjectURL(file)
      setImagePreview(previewUrl)
      // You would set the image file for form submission here
    }
  }

  const generateSKU = () => {
    const random = Math.random().toString(36).substr(2, 8).toUpperCase()
    const timestamp = Date.now().toString(36).toUpperCase()
    return `SKU-${timestamp}-${random}`
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <Card className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pb-6 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Package className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {product ? 'Editar Produto' : 'Novo Produto'}
              </h2>
              <p className="text-gray-600">
                {product ? `ID: ${product.id}` : 'Preencha os dados do produto'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setValue('sku', generateSKU())}
            >
              Gerar SKU
            </Button>
            
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Basic Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Product Info */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Informações do Produto
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="SKU"
                    placeholder="Código único do produto"
                    startIcon={Hash}
                    {...register('sku')}
                    error={errors.sku?.message}
                  />
                  
                  <Input
                    label="Código de Barras"
                    placeholder="Código de barras (EAN/UPC)"
                    startIcon={Barcode}
                    {...register('barcode')}
                  />
                  
                  <Input
                    label="Nome do Produto"
                    placeholder="Nome completo do produto"
                    className="md:col-span-2"
                    {...register('name')}
                    error={errors.name?.message}
                  />
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Descrição
                    </label>
                    <textarea
                      {...register('description')}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="Descreva o produto..."
                    />
                  </div>
                </div>
              </div>

              {/* Pricing */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Preços e Custos
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    label="Preço de Venda"
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    startIcon={DollarSign}
                    {...register('price')}
                    error={errors.price?.message}
                  />
                  
                  <Input
                    label="Custo"
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    startIcon={DollarSign}
                    {...register('costPrice')}
                    error={errors.costPrice?.message}
                  />
                  
                  <Input
                    label="Imposto (%)"
                    type="number"
                    step="0.01"
                    placeholder="0"
                    startIcon={Percent}
                    {...register('taxRate')}
                    error={errors.taxRate?.message}
                  />
                </div>
                
                {/* Margin Display */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-sm text-gray-600">Margem</div>
                      <div className={`text-xl font-bold ${
                        margin >= 30 ? 'text-green-600' :
                        margin >= 15 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {margin.toFixed(2)}%
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-sm text-gray-600">Lucro Unitário</div>
                      <div className="text-xl font-bold text-primary">
                        {formatCurrency(price - costPrice)}
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-sm text-gray-600">Preço com Imposto</div>
                      <div className="text-xl font-bold text-gray-900">
                        {formatCurrency(price * (1 + (watch('taxRate') || 0) / 100))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stock */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Controle de Estoque
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    label="Estoque Atual"
                    type="number"
                    placeholder="0"
                    {...register('currentStock')}
                    error={errors.currentStock?.message}
                  />
                  
                  <Input
                    label="Estoque Mínimo"
                    type="number"
                    placeholder="0"
                    {...register('minStock')}
                    error={errors.minStock?.message}
                  />
                  
                  <Input
                    label="Estoque Máximo"
                    type="number"
                    placeholder="0"
                    {...register('maxStock')}
                    error={errors.maxStock?.message}
                  />
                </div>
                
                <Input
                  label="Localização no Armazém"
                  placeholder="Ex: Prateleira A1"
                  {...register('location')}
                />
              </div>
            </div>

            {/* Right Column - Additional Info */}
            <div className="space-y-6">
              {/* Image Upload */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Imagem do Produto
                </h3>
                
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  {imagePreview ? (
                    <div className="relative">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-48 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => setImagePreview(null)}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="py-8">
                      <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-sm text-gray-600 mb-3">
                        Arraste uma imagem ou clique para selecionar
                      </p>
                      <label className="btn-outline cursor-pointer inline-block">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                        <Upload className="h-4 w-4 inline mr-2" />
                        Selecionar Imagem
                      </label>
                    </div>
                  )}
                </div>
              </div>

              {/* Category & Brand */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Categoria
                    </label>
                    <select
                      {...register('category')}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      <option value="">Selecione...</option>
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                    {errors.category && (
                      <p className="mt-1 text-sm text-red-600">{errors.category.message}</p>
                    )}
                  </div>
                  
                  <Input
                    label="Unidade"
                    placeholder="un, kg, m, etc."
                    {...register('unit')}
                    error={errors.unit?.message}
                  />
                </div>
                
                <Input
                  label="Marca/Fornecedor"
                  placeholder="Nome da marca ou fornecedor"
                  startIcon={Building}
                  {...register('brand')}
                  error={errors.brand?.message}
                />
                
                <Input
                  label="Fornecedor Principal"
                  placeholder="Nome do fornecedor"
                  {...register('supplier')}
                />
              </div>

              {/* Physical Attributes */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Atributos Físicos
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Peso (kg)"
                    type="number"
                    step="0.001"
                    placeholder="0.000"
                    startIcon={Weight}
                    {...register('weight')}
                  />
                  
                  <Input
                    label="Dimensões"
                    placeholder="L x A x C"
                    startIcon={Ruler}
                    {...register('dimensions')}
                  />
                </div>
              </div>

              {/* Status */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Status
                </h3>
                
                <div className="space-y-3">
                  <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <span className="font-medium">Produto Ativo</span>
                      <p className="text-sm text-gray-600">Produto visível para vendas</p>
                    </div>
                    <input
                      type="checkbox"
                      {...register('isActive')}
                      className="h-4 w-4 text-primary rounded border-gray-300 focus:ring-primary/50"
                    />
                  </label>
                </div>
              </div>

              {/* Quick Stats */}
              {product && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Estatísticas
                  </h3>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Criado em:</span>
                      <span>{new Date(product.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Última atualização:</span>
                      <span>{new Date(product.updatedAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total vendido:</span>
                      <span>{product.totalSold || 0} unidades</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 mt-8 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Cancelar
            </Button>
            
            <Button
              type="submit"
              variant="primary"
              icon={Save}
              loading={isSubmitting}
            >
              {product ? 'Atualizar Produto' : 'Criar Produto'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

export default ProductModal
