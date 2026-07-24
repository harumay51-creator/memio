import React, { useMemo } from 'react'
import twemoji from 'twemoji'
import stickysweetSprite from '../../assets/stickysweet.png'

interface EmojiProps {
  emoji: string
  className?: string
}

const Emoji: React.FC<EmojiProps> = ({ emoji, className = '' }) => {
  if (emoji.startsWith('stickysweet-')) {
    const id = parseInt(emoji.replace('stickysweet-', ''))
    const columns = 9;
    const rows = 6;
    const x = (id % columns) * (100 / (columns - 1));
    const y = Math.floor(id / columns) * (100 / (rows - 1));
    
    return (
      <span 
        className={`inline-block shrink-0 ${className}`}
        style={{
          backgroundImage: `url(${stickysweetSprite})`,
          backgroundPosition: `${x}% ${y}%`,
          backgroundSize: '900% 600%',
          backgroundRepeat: 'no-repeat',
        }}
      />
    )
  }

  const html = useMemo(() => {
    return twemoji.parse(emoji, {
      folder: 'svg',
      ext: '.svg',
      base: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/'
    })
  }, [emoji])

  return (
    <span 
      className={`inline-flex items-center justify-center [&>img]:max-w-full [&>img]:max-h-full [&>img]:object-contain [&>img]:m-0 ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

export default Emoji
