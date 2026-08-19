import React, { ReactNode } from 'react'

interface EmptyStateProps {
  type?: 'default' | 'compact'
  message: ReactNode
}

export const EmptyState: React.FC<EmptyStateProps> = ({ type = 'default', message }) => {
  const paddingClass = type === 'default' ? 'py-8' : 'py-4'
  const textClass = type === 'default' ? 'text-sm' : 'text-xs'

  return (
    <div className={`text-center text-yuri-400 ${paddingClass} ${textClass}`}>
      {message}
    </div>
  )
}
