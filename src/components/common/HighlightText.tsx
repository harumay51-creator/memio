import React from 'react'

interface HighlightTextProps {
  text: string
  highlight: string
}

export const HighlightText: React.FC<HighlightTextProps> = ({ text, highlight }) => {
  if (!highlight.trim() || !text) return <>{text}</>
  
  const highlightStr = highlight.trim()
  const regex = new RegExp(`(${highlightStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  const parts = text.split(regex)
  const lowerHighlight = highlightStr.toLowerCase()
  
  return (
    <>
      {parts.map((part, i) => 
        part.toLowerCase() === lowerHighlight 
          ? <span key={i} style={{ backgroundColor: '#CFE7F4', borderRadius: '2px', padding: '0 2px' }}>{part}</span> 
          : <span key={i}>{part}</span>
      )}
    </>
  )
}
