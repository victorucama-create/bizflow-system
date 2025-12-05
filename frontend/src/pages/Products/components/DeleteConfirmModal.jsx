import React from 'react'
import { AlertTriangle, Trash2, X } from 'lucide-react'
import Card from '../../../components/ui/Card'
import Button from '../../../components/ui/Button'

const DeleteConfirmModal = ({ count, onConfirm, onCancel, isDeleting }) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-md w-full">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
          
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Confirmar Exclusão
          </h2>
          
          <p className="text-gray-600 mb-6">
            {count === 1 
              ? 'Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita.'
              : `Tem certeza que deseja excluir ${count} produtos selecionados? Esta ação não pode ser desfeita.`
            }
          </p>

          {/* Warning Details */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 text-left">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-yellow-900 mb-1">
                  Atenção!
                </h3>
                <ul className="text-sm text-yellow-800 space-y-1">
                  <li>• Esta ação é irreversível</li>
                  <li>• Histórico de vendas será preservado</li>
                  <li>• Relatórios serão mantidos</li>
                  {count > 1 && (
                    <li>• Todos os produtos selecionados serão excluídos</li>
                  )}
                </ul>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={isDeleting}
              className="flex-1"
            >
              <X className="h-4 w-4 inline mr-2" />
              Cancelar
            </Button>
            
            <Button
              variant="danger"
              onClick={onConfirm}
              loading={isDeleting}
              className="flex-1"
            >
              <Trash2 className="h-4 w-4 inline mr-2" />
              {isDeleting 
                ? (count === 1 ? 'Excluindo...' : 'Excluindo...') 
                : (count === 1 ? 'Excluir Produto' : `Excluir ${count} Produtos`)
              }
            </Button>
          </div>
          
          <p className="text-sm text-gray-500 mt-4">
            Pressione ESC para cancelar
          </p>
        </div>
      </Card>
    </div>
  )
}

export default DeleteConfirmModal
