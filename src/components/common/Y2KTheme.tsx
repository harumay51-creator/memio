import React from 'react'

export const Y2KBackground = () => {
  return (
    <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden" style={{
      backgroundColor: '#151219',
      backgroundImage: `
        radial-gradient(circle at 20% 30%, rgba(213, 186, 255, 0.15) 0%, transparent 50%),
        radial-gradient(circle at 80% 70%, rgba(99, 219, 182, 0.1) 0%, transparent 50%),
        linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)
      `,
      backgroundSize: '100% 100%, 100% 100%, 32px 32px, 32px 32px'
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
  <div className={`flex flex-col rounded-xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-all duration-300 hover:shadow-[0_0_30px_rgba(213,186,255,0.3)] ${className}`}
       style={{
         background: 'rgba(21, 18, 25, 0.7)',
         backdropFilter: 'blur(12px)',
         WebkitBackdropFilter: 'blur(12px)',
         border: '2px solid rgba(213, 186, 255, 0.2)',
       }}>
    <div className="h-10 px-4 flex items-center justify-between border-b-2 border-[#d5baff]/30 bg-[#d5baff]/10 select-none">
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-bold text-[#d5baff] tracking-widest font-mono">{title || "PROGRAM.exe"}</span>
      </div>
      <div className="flex gap-2">
        <div className="w-4 h-4 rounded flex items-center justify-center text-[10px] bg-white/5 border border-white/20 text-[#e8e0ea] cursor-pointer hover:bg-white/10">−</div>
        <div className="w-4 h-4 rounded flex items-center justify-center text-[10px] bg-white/5 border border-white/20 text-[#e8e0ea] cursor-pointer hover:bg-white/10">□</div>
        <div className="w-4 h-4 rounded flex items-center justify-center text-[10px] bg-[#ffb4ab]/20 border border-[#ffb4ab]/50 text-[#ffb4ab] cursor-pointer hover:bg-[#ffb4ab]/30">×</div>
      </div>
    </div>
    <div className="flex-1 overflow-hidden relative flex flex-col bg-transparent text-[#e8e0ea]">
      {children}
    </div>
  </div>
)
