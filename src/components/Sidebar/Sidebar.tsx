import React from 'react'
import type { NavItem, PageId } from '../../types'
import { NAV_ITEMS } from '../../config/nav'
import { Home, Calendar, CheckSquare, FileText, Wallet, History, Search, Settings, LogOut } from 'lucide-react'

interface SidebarProps {
  activePage: PageId
  onNavigate: (page: PageId, itemId?: string) => void
  onLogout: () => void
}

const Sidebar: React.FC<SidebarProps> = ({ activePage, onNavigate, onLogout }) => {
  const homeItems    = NAV_ITEMS.filter(i => i.group === 'home')
  const inputItems   = NAV_ITEMS.filter(i => i.group === 'input')
  const exploreItems = NAV_ITEMS.filter(i => i.group === 'explore')
  const utilityItems = NAV_ITEMS.filter(i => i.group === 'utility')

  return (
    <aside className="
      w-56 shrink-0 h-full
      bg-[#FCFCFF] border-r border-[#EEF1F6]
      flex flex-col py-5 px-3 gap-1
      select-none
    ">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-3 mb-4 mt-1">
        <div className="
          w-7 h-7 rounded-xl bg-[#8B7CF8]
          flex items-center justify-center
          text-white font-bold text-sm
        ">
          M
        </div>
        <span className="font-semibold text-[#2D334A] tracking-tight text-[15px]">
          Memio
        </span>
      </div>

      <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden gap-1">
        {/* Home nav */}
        <nav className="flex flex-col gap-0.5">
          {homeItems.map(item => (
            <NavItemButton key={item.id} item={item} active={activePage === item.id} onClick={() => onNavigate(item.id)} />
          ))}
        </nav>

        <div className="border-t border-[#e2e4ea] opacity-60 my-2 mx-3" />

        {/* Input nav */}
        <nav className="flex flex-col gap-0.5">
          {inputItems.map(item => (
            <NavItemButton key={item.id} item={item} active={activePage === item.id} onClick={() => onNavigate(item.id)} />
          ))}
        </nav>

        <div className="border-t border-[#e2e4ea] opacity-60 my-2 mx-3" />

        {/* Explore nav */}
        <nav className="flex flex-col gap-0.5">
          {exploreItems.map(item => (
            <NavItemButton key={item.id} item={item} active={activePage === item.id} onClick={() => onNavigate(item.id)} />
          ))}
        </nav>

        <div className="border-t border-[#e2e4ea] opacity-60 my-2 mx-3" />

        {/* Utility nav */}
        <nav className="flex flex-col gap-0.5 mb-2">
          {utilityItems.map(item => (
            <NavItemButton key={item.id} item={item} active={activePage === item.id} onClick={() => onNavigate(item.id)} />
          ))}
          <button 
            onClick={onLogout}
            className="flex items-center gap-2.5 px-3 py-2 mt-1 rounded-xl text-sm font-medium text-red-400 hover:bg-red-50 hover:text-red-500 transition-colors"
          >
            <span className="w-5 flex justify-center text-base leading-none">
              <LogOut size={16} strokeWidth={1.5} />
            </span>
            로그아웃
          </button>
        </nav>
      </div>

      {/* User avatar placeholder */}
      <div className="flex items-center gap-2.5 px-3 pt-3 mt-1">
        <div className="
          w-8 h-8 rounded-full bg-[#8B7CF8]
          flex items-center justify-center text-white text-xs font-semibold
          shrink-0
        ">
          유
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-[#2D334A] truncate">Yuri</p>
          <p className="text-[10px] text-[#717A8C] truncate">Personal</p>
        </div>
      </div>
    </aside>
  )
}

// ─── Sub-component ────────────────────────────────────────────────────────────
interface NavItemButtonProps {
  item: NavItem
  active: boolean
  onClick: () => void
}

const NavItemButton: React.FC<NavItemButtonProps> = ({ item, active, onClick }) => {
  const IconComponent = (({
    'dashboard': Home,
    'calendar': Calendar,
    'tasks': CheckSquare,
    'notes': FileText,
    'ledger': Wallet,
    'history': History,
    'search': Search,
    'settings': Settings
  } as Record<string, any>)[item.id]) || Home

  return (
    <button
      id={`nav-${item.id}`}
      onClick={onClick}
      className={`nav-item w-full text-left ${active ? 'active' : ''}`}
      aria-current={active ? 'page' : undefined}
    >
      <span className="w-5 flex justify-center text-base leading-none">
        <IconComponent size={18} strokeWidth={1.5} />
      </span>
      <span>{item.label}</span>
    </button>
  )
}

export default Sidebar
