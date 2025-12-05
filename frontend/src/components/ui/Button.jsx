import React from 'react'
import { Loader2 } from 'lucide-react'
import clsx from 'clsx'

const Button = React.forwardRef((props, ref) => {
  const {
    children,
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    fullWidth = false,
    icon: Icon,
    iconPosition = 'left',
    className = '',
    ...rest
  } = props

  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'
  
  const variants = {
    primary: 'bg-primary text-white hover:bg-primary/90 focus:ring-primary/50',
    secondary: 'bg-secondary text-white hover:bg-secondary/90 focus:ring-secondary/50',
    success: 'bg-success text-white hover:bg-success/90 focus:ring-success/50',
    danger: 'bg-danger text-white hover:bg-danger/90 focus:ring-danger/50',
    warning: 'bg-warning text-white hover:bg-warning/90 focus:ring-warning/50',
    outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-300',
    ghost: 'text-gray-700 hover:bg-gray-100 focus:ring-gray-300',
    link: 'text-primary hover:text-primary/80 underline-offset-4 hover:underline focus:ring-primary/50'
  }

  const sizes = {
    xs: 'px-2.5 py-1.5 text-xs',
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
    xl: 'px-8 py-4 text-lg'
  }

  const widthClass = fullWidth ? 'w-full' : ''
  const isDisabled = disabled || loading

  const classes = clsx(
    baseClasses,
    variants[variant],
    sizes[size],
    widthClass,
    className
  )

  return (
    <button
      ref={ref}
      className={classes}
      disabled={isDisabled}
      {...rest}
    >
      {loading && (
        <Loader2 className={clsx(
          'animate-spin',
          iconPosition === 'left' ? 'mr-2' : 'ml-2',
          children ? (iconPosition === 'left' ? 'mr-2' : 'ml-2') : ''
        )} />
      )}
      
      {!loading && Icon && iconPosition === 'left' && (
        <Icon className={clsx('h-4 w-4', children && 'mr-2')} />
      )}
      
      {children}
      
      {!loading && Icon && iconPosition === 'right' && (
        <Icon className={clsx('h-4 w-4', children && 'ml-2')} />
      )}
    </button>
  )
})

Button.displayName = 'Button'

export default Button
