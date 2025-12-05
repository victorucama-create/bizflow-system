import React from 'react'
import clsx from 'clsx'

const Card = React.forwardRef((props, ref) => {
  const {
    children,
    className = '',
    hover = false,
    shadow = 'md',
    border = true,
    padding = true,
    ...rest
  } = props

  const shadowClasses = {
    none: '',
    sm: 'shadow-sm',
    md: 'shadow',
    lg: 'shadow-lg',
    xl: 'shadow-xl'
  }

  const classes = clsx(
    'bg-white rounded-xl',
    border && 'border border-gray-200',
    padding && 'p-6',
    shadowClasses[shadow],
    hover && 'hover:shadow-lg transition-shadow duration-200',
    className
  )

  return (
    <div ref={ref} className={classes} {...rest}>
      {children}
    </div>
  )
})

Card.displayName = 'Card'

const CardHeader = ({ children, className = '', ...rest }) => (
  <div className={clsx('mb-4', className)} {...rest}>
    {children}
  </div>
)

const CardTitle = ({ children, className = '', ...rest }) => (
  <h3 className={clsx('text-lg font-semibold text-gray-900', className)} {...rest}>
    {children}
  </h3>
)

const CardDescription = ({ children, className = '', ...rest }) => (
  <p className={clsx('text-sm text-gray-600', className)} {...rest}>
    {children}
  </p>
)

const CardContent = ({ children, className = '', ...rest }) => (
  <div className={clsx(className)} {...rest}>
    {children}
  </div>
)

const CardFooter = ({ children, className = '', ...rest }) => (
  <div className={clsx('mt-6 pt-6 border-t border-gray-200', className)} {...rest}>
    {children}
  </div>
)

Card.Header = CardHeader
Card.Title = CardTitle
Card.Description = CardDescription
Card.Content = CardContent
Card.Footer = CardFooter

export default Card
