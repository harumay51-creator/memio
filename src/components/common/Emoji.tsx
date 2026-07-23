import React, { useMemo } from 'react'
import twemoji from 'twemoji'

interface EmojiProps {
  emoji: string
  className?: string
}

const Emoji: React.FC<EmojiProps> = ({ emoji, className = '' }) => {
  const html = useMemo(() => {
    return twemoji.parse(emoji, {
      folder: 'svg',
      ext: '.svg',
      base: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/'
    })
  }, [emoji])

  return (
    <span 
      className={`inline-block [&>img]:w-full [&>img]:h-full [&>img]:m-0 [&>img]:align-top ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

export default Emoji
