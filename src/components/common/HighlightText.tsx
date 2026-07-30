import React from 'react'

interface HighlightTextProps {
  text: string
  highlight: string
}

export const HighlightText: React.FC<HighlightTextProps> = ({ text, highlight }) => {
  if (!highlight.trim() || !text) return <>{text}</>
  
  const tokens = highlight.trim().split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return <>{text}</>

  // Sort by length descending so longer tokens match first
  const escapedTokens = tokens
    .sort((a, b) => b.length - a.length)
    .map(token => token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  
  const regex = new RegExp(`(${escapedTokens.join('|')})`, 'gi')
  const parts = text.split(regex)
  const lowerTokens = tokens.map(t => t.toLowerCase())
  
  return (
    <>
      {parts.map((part, i) => 
        lowerTokens.includes(part.toLowerCase()) 
          ? <span key={i} style={{ backgroundColor: '#CFE7F4', borderRadius: '2px', padding: '0 2px' }}>{part}</span> 
          : <span key={i}>{part}</span>
      )}
    </>
  )
}
