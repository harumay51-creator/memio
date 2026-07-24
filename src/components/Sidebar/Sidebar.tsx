import React from 'react'
import type { NavItem, PageId } from '../../types'
import { NAV_ITEMS } from '../../config/nav'
import { Home, Calendar, CheckSquare, FileText, Wallet, History, Search, Settings, LogOut } from 'lucide-react'

interface SidebarProps {
  activePage: PageId
  onNavigate: (page: PageId, itemId?: string) => void
  onLogout: () => void
  isAuroraBg?: boolean
}

const Sidebar: React.FC<SidebarProps> = ({ activePage, onNavigate, onLogout, isAuroraBg = false }) => {
  const inputItems   = NAV_ITEMS.filter(i => i.group === 'input')
  const exploreItems = NAV_ITEMS.filter(i => i.group === 'explore')
  const utilityItems = NAV_ITEMS.filter(i => i.group === 'utility')

  return (
    <aside className={`
      w-56 shrink-0 h-full
      flex flex-col py-5 px-3 gap-1
      select-none relative z-50
      ${isAuroraBg 
        ? 'bg-[#1C1C1E]/10 backdrop-blur-[20px] border-r border-white/20' 
        : 'bg-[#FCFCFF] border-r border-[#EEF1F6]'}
    `}>
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-3 mb-4 mt-1">
        <div className="
          w-7 h-7 rounded-xl bg-[#8B7CF8]
          flex items-center justify-center
          text-white font-bold text-sm shadow-[0_2px_8px_rgba(139,124,248,0.4)]
        ">
          M
        </div>
        <span className={`font-semibold tracking-tight text-[15px] ${isAuroraBg ? 'text-white/90' : 'text-[#2D334A]'}`}>
          Memio
        </span>
      </div>

      <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden gap-1">
        {/* Input nav */}
        <nav className="flex flex-col gap-0.5">
          {inputItems.map(item => (
            <NavItemButton key={item.id} item={item} active={activePage === item.id} onClick={() => onNavigate(item.id)} isAuroraBg={isAuroraBg} />
          ))}
        </nav>

        <div className="border-t border-[#e2e4ea] opacity-60 my-2 mx-3" />

        {/* Explore nav */}
        <nav className="flex flex-col gap-0.5">
          {exploreItems.map(item => (
            <NavItemButton key={item.id} item={item} active={activePage === item.id} onClick={() => onNavigate(item.id)} isAuroraBg={isAuroraBg} />
          ))}
        </nav>

        <div className="border-t border-[#e2e4ea] opacity-60 my-2 mx-3" />

        {/* Utility nav */}
        <nav className="flex flex-col gap-0.5 mb-2">
          {utilityItems.map(item => (
            <NavItemButton key={item.id} item={item} active={activePage === item.id} onClick={() => onNavigate(item.id)} isAuroraBg={isAuroraBg} />
          ))}
          <button 
            onClick={onLogout}
            className={`flex items-center gap-2.5 px-3 py-2 mt-1 rounded-xl text-sm font-medium transition-colors ${
              isAuroraBg 
                ? 'text-red-300/80 hover:bg-white/10 hover:text-red-300' 
                : 'text-red-400 hover:bg-red-50 hover:text-red-500'
            }`}
          >
            <span className="w-5 flex justify-center text-base leading-none">
              <LogOut size={16} strokeWidth={1.5} />
            </span>
            로그아웃
          </button>
        </nav>
      </div>

      {/* User avatar placeholder */}
      <button 
        onClick={() => onNavigate('journal')}
        className={`flex items-center gap-2.5 px-3 py-2 mt-1 rounded-xl transition-colors text-left cursor-pointer ${
          isAuroraBg ? 'hover:bg-white/10' : 'hover:bg-yuri-100'
        }`}
      >
        <div className="
          w-8 h-8 rounded-full bg-[#8B7CF8] shadow-[0_2px_8px_rgba(139,124,248,0.4)]
          flex items-center justify-center text-white text-xs font-semibold
          shrink-0
        ">
          유
        </div>
        <div className="min-w-0">
          <p className={`text-xs font-semibold truncate ${isAuroraBg ? 'text-white/90' : 'text-[#2D334A]'}`}>Yuri</p>
          <p className={`text-[10px] truncate ${isAuroraBg ? 'text-white/50' : 'text-[#717A8C]'}`}>개인 기록 (PIN)</p>
        </div>
      </button>
    </aside>
  )
}

// ─── Sub-component ────────────────────────────────────────────────────────────
interface NavItemButtonProps {
  item: NavItem
  active: boolean
  onClick: () => void
  isAuroraBg?: boolean
}

const NavItemButton: React.FC<NavItemButtonProps> = ({ item, active, onClick, isAuroraBg }) => {
  const Icon = (({
    'calendar': Calendar,
    'tasks': CheckSquare,
    'notes': FileText,
    'ledger': Wallet,
    'history': History,
    'search': Search,
    'settings': Settings
  } as Record<string, any>)[item.id]) || Home
  
  const baseClasses = "flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all duration-200 group"
  
  let activeClasses = ""
  let inactiveClasses = ""
  
  if (isAuroraBg) {
    activeClasses = "bg-white/20 text-white font-bold shadow-[0_4px_16px_rgba(0,0,0,0.1)]"
    inactiveClasses = "text-white/60 hover:bg-white/10 hover:text-white/90 font-medium"
  } else {
    activeClasses = "bg-[#8B7CF8] text-white font-bold shadow-[0_4px_12px_rgba(139,124,248,0.25)]"
    inactiveClasses = "text-[#717A8C] hover:bg-[#F7F6FF] hover:text-[#2D334A] font-medium"
  }

  return (
    <button
      onClick={onClick}
      className={`${baseClasses} ${active ? activeClasses : inactiveClasses}`}
    >
      <span className={`w-5 flex justify-center text-base leading-none transition-transform ${active ? 'scale-110' : 'group-hover:scale-110'}`}>
        <Icon size={18} strokeWidth={active ? 2.5 : 2} />
      </span>
      <span className="text-sm tracking-wide">
        {item.label}
      </span>
    </button>
  )
}

export default Sidebar
