import React from 'react'
import clsx from 'clsx'

const Tabs = ({ tabs, activeTab, onChange, className = '' }) => {
  return (
    <div className={clsx('border-b border-gray-200', className)}>
      <nav className="flex space-x-8">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={clsx(
              'py-3 px-1 border-b-2 font-medium text-sm transition-colors',
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            )}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  )
}

export default Tabs
