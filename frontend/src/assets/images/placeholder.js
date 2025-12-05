// Image placeholders and constants
export const PLACEHOLDER_IMAGES = {
  PRODUCT: 'https://images.unsplash.com/photo-1556656793-08538906a9f8?w=400&h=400&fit=crop',
  USER: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop',
  COMPANY: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w-400&h=200&fit=crop',
  LOGO: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiM0MzYxZWUiIHJ4PSIyMCIvPjxwYXRoIGQ9Ik0zMCwzMCBMNTAsNTAgTDcwLDMwIEw3MCw3MCBMMzAsNzAgWiIgZmlsbD0id2hpdGUiIGZpbGwtb3BhY2l0eT0iMC45Ii8+PHBhdGggZD0iTTQwLDQwIEw2MCw0MCBMNjAsNjAgTDQwLDYwIFoiIGZpbGw9IiM0MzYxZWUiLz48cGF0aCBkPSJNNDUsNDUgTDU1LDQ1IEw1NSw1NSBMNDUsNTUgWiIgZmlsbD0id2hpdGUiLz48L3N2Zz4='
}

// Export as React component for lazy loading
export const ImagePlaceholder = ({ type = 'PRODUCT', className = '', alt = '' }) => {
  const src = PLACEHOLDER_IMAGES[type] || PLACEHOLDER_IMAGES.PRODUCT
  
  return (
    <img
      src={src}
      alt={alt}
      className={`object-cover ${className}`}
      loading="lazy"
      onError={(e) => {
        e.target.src = PLACEHOLDER_IMAGES.PRODUCT
      }}
    />
  )
}
