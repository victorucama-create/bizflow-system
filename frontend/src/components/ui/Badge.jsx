import React from 'react'
import clsx from 'clsx'
import { X } from 'lucide-react'

const Badge = React.forwardRef((props, ref) => {
  const {
    children,
    variant = 'default',
    size = 'md',
    rounded = 'full',
    dismissible = false,
    onDismiss,
    className = '',
    ...rest
  } = props

  const variants = {
    default: 'bg-gray-100 text-gray-800',
    primary: 'bg-primary/10 text-primary',
    secondary: 'bg-secondary/10 text-secondary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    danger: 'bg-danger/10 text-danger',
    info: 'bg-info/10 text-info'
  }

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base'
  }

  const roundedClasses = {
    none: 'rounded-none',
    sm: 'rounded',
    md: 'rounded-md',
    lg: 'rounded-lg',
    full: 'rounded-full'
  }

  const classes = clsx(
    'inline-flex items-center font-medium',
    variants[variant],
    sizes[size],
    roundedClasses[rounded],
    className
  )

  return (
    <span ref={ref} className={classes} {...rest}>
      {children}
      {dismissible && (
        <button
          type="button"
          onClick={onDismiss}
          className="ml-1.5 inline-flex items-center p-0.5 rounded-full hover:bg-current/20 transition-colors"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  )
})

Badge.displayName = 'Badge'

export default Badge
