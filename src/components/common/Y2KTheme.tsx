import React, { useMemo } from 'react'

export const Y2KBackground = () => {
  const stars = useMemo(() => Array.from({ length: 20 }).map((_, i) => ({
    id: i,
    top: `${Math.floor(Math.random() * 100)}%`,
    left: `${Math.floor(Math.random() * 100)}%`,
    delay: `${(Math.random() * 3).toFixed(2)}s`,
    size: `${Math.floor(Math.random() * 2) + 2}px`,
  })), [])

  return (
    <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden bg-[linear-gradient(135deg,#9D72FF,#FF7EB3,#54E6ED)] bg-[length:200%_200%] animate-gradient-xy">
      <style>{`
        @keyframes twinkle {
          0% { opacity: 0.1; transform: scale(0.8); }
          100% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
      {/* Grid */}
      <div className="absolute inset-0 opacity-20" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
        backgroundSize: '20px 20px'
      }} />
      {/* Scanlines */}
      <div className="absolute inset-0 opacity-[0.15]" style={{
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, #000 2px, #000 4px)'
      }} />
      {/* Stars */}
      {stars.map(star => (
        <div 
          key={star.id} 
          className="absolute bg-white rounded-full"
          style={{
            top: star.top, left: star.left, width: star.size, height: star.size,
            animation: `twinkle 2s infinite alternate ${star.delay}`,
            boxShadow: '0 0 4px 2px rgba(255,255,255,0.8)'
          }}
        />
      ))}
    </div>
  )
}

export const RetroWindow = ({ children, title, className = '' }: { children: React.ReactNode, title?: string, className?: string }) => (
  <div className={`flex flex-col bg-[#C0C0C0] border-t-2 border-l-2 border-t-white border-l-white border-b-2 border-r-2 border-b-[#404040] border-r-[#404040] p-[3px] shadow-[4px_4px_0_0_rgba(0,0,0,0.5)] ${className}`}>
    <div className="flex justify-between items-center bg-[#000080] text-white px-2 py-0.5 mb-1 font-bold text-[11px] select-none" style={{ fontFamily: '"MS Sans Serif", "Tahoma", sans-serif' }}>
      <span>{title || "Program"}</span>
      <div className="flex gap-[2px]">
        {['_', '□', '×'].map(icon => (
          <div key={icon} className="w-[14px] h-[14px] bg-[#C0C0C0] border-t border-l border-t-white border-l-white border-b border-r border-b-[#404040] border-r-[#404040] flex items-center justify-center text-black text-[9px] leading-none cursor-default active:border-t-[#404040] active:border-l-[#404040] active:border-b-white active:border-r-white active:bg-[#dfdfdf]">
            {icon}
          </div>
        ))}
      </div>
    </div>
    <div className="flex-1 bg-transparent border-t-2 border-l-2 border-t-[#808080] border-l-[#808080] border-b-2 border-r-2 border-b-white border-r-white overflow-hidden relative flex flex-col">
      {children}
    </div>
  </div>
)
