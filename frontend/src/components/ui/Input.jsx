import React, { forwardRef } from 'react'
import clsx from 'clsx'
import { AlertCircle } from 'lucide-react'

const Input = forwardRef((props, ref) => {
  const {
    label,
    error,
    helperText,
    startIcon: StartIcon,
    endIcon: EndIcon,
    className = '',
    containerClassName = '',
    fullWidth = true,
    size = 'md',
    ...rest
  } = props

  const inputClasses = clsx(
    'block border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all',
    'placeholder:text-gray-400',
    fullWidth && 'w-full',
    {
      'px-3 py-2 text-sm': size === 'sm',
      'px-4 py-2.5': size === 'md',
      'px-4 py-3': size === 'lg',
      'border-red-300 focus:ring-red-200': error,
      'pl-10': StartIcon,
      'pr-10': EndIcon || error
    },
    className
  )

  const containerClasses = clsx(
    fullWidth && 'w-full',
    containerClassName
  )

  return (
    <div className={containerClasses}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {rest.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        {StartIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <StartIcon className="h-5 w-5 text-gray-400" />
          </div>
        )}
        
        <input
          ref={ref}
          className={inputClasses}
          aria-invalid={error ? 'true' : 'false'}
          {...rest}
        />
        
        {(EndIcon || error) && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            {error ? (
              <AlertCircle className="h-5 w-5 text-red-500" />
            ) : (
              <EndIcon className="h-5 w-5 text-gray-400" />
            )}
          </div>
        )}
      </div>
      
      {(error || helperText) && (
        <p className={clsx(
          'mt-1 text-sm',
          error ? 'text-red-600' : 'text-gray-500'
        )}>
          {error || helperText}
        </p>
      )}
    </div>
  )
})

Input.displayName = 'Input'

export default Input
