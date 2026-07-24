import React from 'react'

export const Y2KBackground = () => {
  return (
    <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden" style={{
      background: 'linear-gradient(135deg, #E8A0D0 0%, #B090D8 50%, #6870C8 100%)',
    }}>
      {/* Grid */}
      <div className="absolute inset-0" style={{
        backgroundImage: `
          linear-gradient(rgba(255, 255, 255, 0.25) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255, 255, 255, 0.25) 1px, transparent 1px)
        `,
        backgroundSize: '80px 80px'
      }} />

      <style>{`
        @keyframes sparkle {
          0%, 100% { opacity: 0.2; transform: scale(0.8) rotate(0deg); }
          50% { opacity: 1; transform: scale(1.2) rotate(15deg); text-shadow: 0 0 10px rgba(255,255,255,0.8); }
        }
        .sparkle-star {
          position: absolute;
          color: white;
          animation: sparkle 3s infinite ease-in-out;
          pointer-events: none;
          line-height: 1;
        }
      `}</style>
      
      {/* Sparkling Stars */}
      <div className="absolute inset-0 z-0">
        {Array.from({ length: 30 }).map((_, i) => {
          const top = Math.random() * 90 + 5;
          const left = Math.random() * 90 + 5;
          const delay = Math.random() * 3;
          // Most stars are small (10-16px), some are medium (20-28px), a few are large (32-48px)
          const isLarge = Math.random() > 0.85;
          const isMedium = !isLarge && Math.random() > 0.6;
          const size = isLarge ? 32 + Math.random() * 16 : isMedium ? 20 + Math.random() * 8 : 10 + Math.random() * 6;
          return (
            <span 
              key={i} 
              className="sparkle-star" 
              style={{ 
                top: `${top}%`, 
                left: `${left}%`, 
                animationDelay: `${delay}s`,
                fontSize: `${size}px`
              }}
            >
              ✦
            </span>
          )
        })}
      </div>
    </div>
  )
}

export const RetroWindow = ({ children, title, className = '' }: { children: React.ReactNode, title?: string, className?: string }) => (
  <div className={`flex flex-col rounded-xl overflow-hidden shadow-[0_15px_35px_rgba(200,180,220,0.5)] transition-all duration-300 hover:shadow-[0_0_30px_rgba(213,186,255,0.6)] ${className}`}
       style={{
         background: 'rgba(255, 255, 255, 0.5)',
         backdropFilter: 'blur(12px)',
         WebkitBackdropFilter: 'blur(12px)',
         border: '2px solid rgba(255, 255, 255, 0.7)',
       }}>
    <div className="h-10 px-4 flex items-center justify-between border-b-2 border-white/60 bg-white/40 select-none">
      <div className="flex items-center gap-2">
        <span className="text-[12px] font-bold text-[#8a63d2] tracking-widest font-mono drop-shadow-sm">{title || "PROGRAM.exe"}</span>
      </div>
      <div className="flex gap-2">
        <div className="w-4 h-4 rounded flex items-center justify-center text-[10px] bg-white/50 border border-white/80 text-[#8a63d2] cursor-pointer hover:bg-white/80 shadow-sm">−</div>
        <div className="w-4 h-4 rounded flex items-center justify-center text-[10px] bg-white/50 border border-white/80 text-[#8a63d2] cursor-pointer hover:bg-white/80 shadow-sm">□</div>
        <div className="w-4 h-4 rounded flex items-center justify-center text-[10px] bg-[#ffb4ab]/50 border border-[#ffb4ab]/80 text-[#d32f2f] cursor-pointer hover:bg-[#ffb4ab]/80 shadow-sm">×</div>
      </div>
    </div>
    <div className="flex-1 overflow-hidden relative flex flex-col bg-transparent text-[#4a4452]">
      {children}
    </div>
  </div>
)
