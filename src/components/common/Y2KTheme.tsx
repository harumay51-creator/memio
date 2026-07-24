import React from 'react'

export const Y2KBackground = () => {
  return (
    <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden" style={{
      background: 'linear-gradient(135deg, #E8D4F0, #D4E4F5, #F5D4E8)',
    }}>
      <style>{`
        @keyframes float-emoji {
            0% { transform: translateY(110vh) rotate(0deg); }
            100% { transform: translateY(-100px) rotate(360deg); }
        }
        .floating-emoji {
            position: absolute;
            pointer-events: none;
            animation: float-emoji 15s infinite linear;
            opacity: 0.2;
        }
      `}</style>
      
      {/* Soft Scanlines */}
      <div className="absolute inset-0 z-10" style={{
        background: `linear-gradient(to bottom, rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.15) 50%),
                     linear-gradient(90deg, rgba(255, 0, 0, 0.02), rgba(0, 255, 0, 0.01), rgba(0, 0, 255, 0.02))`,
        backgroundSize: '100% 4px, 3px 100%'
      }} />

      {/* Floating Elements */}
      <div className="absolute inset-0 z-0">
        <span className="floating-emoji text-4xl" style={{ left: '10%', animationDelay: '0s' }}>✨</span>
        <span className="floating-emoji text-2xl" style={{ left: '30%', animationDelay: '-5s' }}>⭐</span>
        <span className="floating-emoji text-5xl" style={{ left: '60%', animationDelay: '-2s' }}>💿</span>
        <span className="floating-emoji text-3xl" style={{ left: '85%', animationDelay: '-8s' }}>🦋</span>
        <span className="floating-emoji text-4xl" style={{ left: '45%', animationDelay: '-3s' }}>🎀</span>
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
