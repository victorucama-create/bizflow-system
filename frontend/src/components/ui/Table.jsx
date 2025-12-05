import React from 'react'
import clsx from 'clsx'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'

export const Table = ({ children, className = '', ...props }) => (
  <div className="overflow-x-auto rounded-lg border border-gray-200">
    <table className={clsx('min-w-full divide-y divide-gray-200', className)} {...props}>
      {children}
    </table>
  </div>
)

export const TableHeader = ({ children, className = '', ...props }) => (
  <thead className={clsx('bg-gray-50', className)} {...props}>
    {children}
  </thead>
)

export const TableBody = ({ children, className = '', ...props }) => (
  <tbody className={clsx('bg-white divide-y divide-gray-200', className)} {...props}>
    {children}
  </tbody>
)

export const TableRow = ({ children, className = '', hover = true, ...props }) => (
  <tr className={clsx(
    hover && 'hover:bg-gray-50 transition-colors',
    className
  )} {...props}>
    {children}
  </tr>
)

export const TableHead = React.forwardRef((props, ref) => {
  const { children, className = '', sortable, sortDirection, onSort, ...rest } = props
  
  const handleClick = () => {
    if (sortable && onSort) {
      onSort()
    }
  }
  
  return (
    <th
      ref={ref}
      className={clsx(
        'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
        sortable && 'cursor-pointer select-none',
        className
      )}
      onClick={handleClick}
      {...rest}
    >
      <div className="flex items-center gap-2">
        {children}
        {sortable && (
          <span className="inline-flex">
            {sortDirection === 'asc' ? (
              <ChevronUp className="h-4 w-4" />
            ) : sortDirection === 'desc' ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronsUpDown className="h-4 w-4" />
            )}
          </span>
        )}
      </div>
    </th>
  )
})

TableHead.displayName = 'TableHead'

export const TableCell = ({ children, className = '', ...props }) => (
  <td className={clsx('px-6 py-4 whitespace-nowrap text-sm text-gray-900', className)} {...props}>
    {children}
  </td>
)

export const TableFooter = ({ children, className = '', ...props }) => (
  <tfoot className={clsx('bg-gray-50 border-t border-gray-200', className)} {...props}>
    {children}
  </tfoot>
)

// Pagination component for tables
export const TablePagination = ({ 
  currentPage, 
  totalPages, 
  onPageChange,
  pageSize,
  totalItems,
  onPageSizeChange,
  className = ''
}) => {
  const pageSizes = [10, 25, 50, 100]
  
  return (
    <div className={clsx('flex items-center justify-between px-6 py-3 bg-white border-t border-gray-200', className)}>
      <div className="flex items-center space-x-2">
        <span className="text-sm text-gray-700">
          Mostrando{' '}
          <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span>
          {' a '}
          <span className="font-medium">{Math.min(currentPage * pageSize, totalItems)}</span>
          {' de '}
          <span className="font-medium">{totalItems}</span>
          {' resultados'}
        </span>
        
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="text-sm border-gray-300 rounded-md focus:ring-primary focus:border-primary"
        >
          {pageSizes.map(size => (
            <option key={size} value={size}>
              {size} por página
            </option>
          ))}
        </select>
      </div>
      
      <div className="flex items-center space-x-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-1 text-sm border rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Anterior
        </button>
        
        <div className="flex items-center space-x-1">
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNumber
            if (totalPages <= 5) {
              pageNumber = i + 1
            } else if (currentPage <= 3) {
              pageNumber = i + 1
            } else if (currentPage >= totalPages - 2) {
              pageNumber = totalPages - 4 + i
            } else {
              pageNumber = currentPage - 2 + i
            }
            
            return (
              <button
                key={pageNumber}
                onClick={() => onPageChange(pageNumber)}
                className={clsx(
                  'px-3 py-1 text-sm rounded-md',
                  currentPage === pageNumber
                    ? 'bg-primary text-white'
                    : 'hover:bg-gray-100'
                )}
              >
                {pageNumber}
              </button>
            )
          })}
        </div>
        
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-1 text-sm border rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Próxima
        </button>
      </div>
    </div>
  )
}
