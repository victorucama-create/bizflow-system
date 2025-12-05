import React from 'react'
import { Filter, X } from 'lucide-react'
import Card from '../../../components/ui/Card'
import Button from '../../../components/ui/Button'

const Filters = ({ filters, onChange, onClear }) => {
  const categories = [
    'Todos',
    'Eletrônicos',
    'Informática',
    'Móveis',
    'Escritório',
    'Limpeza',
    'Alimentos',
    'Bebidas'
  ]

  const stockOptions = [
    { value: '', label: 'Todos' },
    { value: 'low', label: 'Estoque Baixo' },
    { value: 'out', label: 'Esgotado' },
    { value: 'available', label: 'Disponível' }
  ]

  const statusOptions = [
    { value: '', label: 'Todos' },
    { value: 'active', label: 'Ativos' },
    { value: 'inactive', label: 'Inativos' }
  ]

  const handleFilterChange = (key, value) => {
    onChange({ ...filters, [key]: value })
  }

  const hasActiveFilters = Object.values(filters).some(value => value !== '')

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-gray-500" />
          <h3 className="font-medium text-gray-900">Filtros</h3>
        </div>
        
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            icon={X}
            onClick={onClear}
          >
            Limpar Filtros
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Category Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Categoria
          </label>
          <select
            value={filters.category}
            onChange={(e) => handleFilterChange('category', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            {categories.map((category) => (
              <option key={category} value={category === 'Todos' ? '' : category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Stock Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Estoque
          </label>
          <select
            value={filters.stock}
            onChange={(e) => handleFilterChange('stock', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            {stockOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Price Range */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Preço Mínimo
          </label>
          <input
            type="number"
            placeholder="R$ 0,00"
            value={filters.minPrice}
            onChange={(e) => handleFilterChange('minPrice', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Preço Máximo
          </label>
          <input
            type="number"
            placeholder="R$ 10.000,00"
            value={filters.maxPrice}
            onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
      </div>

      {/* Active Filters */}
      {hasActiveFilters && (
        <div className="mt-4 pt-4 border-t">
          <div className="flex flex-wrap gap-2">
            {filters.category && (
              <Badge variant="info" dismissible onDismiss={() => handleFilterChange('category', '')}>
                Categoria: {filters.category}
              </Badge>
            )}
            
            {filters.status && (
              <Badge variant="info" dismissible onDismiss={() => handleFilterChange('status', '')}>
                Status: {statusOptions.find(o => o.value === filters.status)?.label}
              </Badge>
            )}
            
            {filters.stock && (
              <Badge variant="info" dismissible onDismiss={() => handleFilterChange('stock', '')}>
                Estoque: {stockOptions.find(o => o.value === filters.stock)?.label}
              </Badge>
            )}
            
            {filters.minPrice && (
              <Badge variant="info" dismissible onDismiss={() => handleFilterChange('minPrice', '')}>
                Preço mínimo: R$ {parseFloat(filters.minPrice).toFixed(2)}
              </Badge>
            )}
            
            {filters.maxPrice && (
              <Badge variant="info" dismissible onDismiss={() => handleFilterChange('maxPrice', '')}>
                Preço máximo: R$ {parseFloat(filters.maxPrice).toFixed(2)}
              </Badge>
            )}
          </div>
        </div>
      )}
    </Card>
  )
}

export default Filters
