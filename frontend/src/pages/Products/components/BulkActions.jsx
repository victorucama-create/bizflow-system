import React from 'react'
import { 
  Trash2, 
  Download, 
  Tag, 
  Package,
  Edit2,
  Archive,
  EyeOff,
  Eye,
  CheckCircle,
  XCircle
} from 'lucide-react'
import Card from '../../../components/ui/Card'
import Button from '../../../components/ui/Button'
import Badge from '../../../components/ui/Badge'

const BulkActions = ({ selectedCount, onDelete, onClearSelection }) => {
  return (
    <Card className="border-l-4 border-l-primary">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Badge variant="primary" size="lg">
            {selectedCount}
          </Badge>
          <div>
            <h3 className="font-semibold text-gray-900">
              {selectedCount} produto{selectedCount !== 1 ? 's' : ''} selecionado{selectedCount !== 1 ? 's' : ''}
            </h3>
            <p className="text-sm text-gray-600">
              Ações em lote disponíveis
            </p>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={Edit2}
          >
            Editar
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            icon={Tag}
          >
            Alterar Preço
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            icon={Package}
          >
            Atualizar Estoque
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            icon={Eye}
          >
            Ativar
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            icon={EyeOff}
          >
            Desativar
          </Button>
          
          <Button
            variant="danger"
            size="sm"
            icon={Trash2}
            onClick={onDelete}
          >
            Excluir
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
          >
            Limpar Seleção
          </Button>
        </div>
      </div>
    </Card>
  )
}

export default BulkActions
