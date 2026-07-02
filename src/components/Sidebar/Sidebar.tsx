import React from 'react'
import type { NavItem, PageId } from '../../types'
import { NAV_ITEMS } from '../../config/nav'

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
      bg-yuri-50 border-r border-yuri-100
      flex flex-col py-5 px-3 gap-1
      select-none
    ">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-3 mb-3">
        <div className="
          w-7 h-7 rounded-lg bg-accent
          flex items-center justify-center
          text-white font-bold text-sm
          shadow-sm
        ">
          M
        </div>
        <span className="font-semibold text-yuri-900 tracking-tight text-[15px]">
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

        <div className="border-t border-yuri-200 my-1 mx-2" />

        {/* Input nav */}
        <nav className="flex flex-col gap-0.5">
          {inputItems.map(item => (
            <NavItemButton key={item.id} item={item} active={activePage === item.id} onClick={() => onNavigate(item.id)} />
          ))}
        </nav>

        <div className="border-t border-yuri-200 my-1 mx-2" />

        {/* Explore nav */}
        <nav className="flex flex-col gap-0.5">
          {exploreItems.map(item => (
            <NavItemButton key={item.id} item={item} active={activePage === item.id} onClick={() => onNavigate(item.id)} />
          ))}
        </nav>

        <div className="border-t border-yuri-200 my-1 mx-2" />

        {/* Utility nav */}
        <nav className="flex flex-col gap-0.5 mb-2">
          {utilityItems.map(item => (
            <NavItemButton key={item.id} item={item} active={activePage === item.id} onClick={() => onNavigate(item.id)} />
          ))}
          <button 
            onClick={onLogout}
            className="flex items-center gap-2.5 px-3 py-2 mt-1 rounded-lg text-[13px] font-medium text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <span className="w-4 flex justify-center text-base leading-none">🚪</span>
            로그아웃
          </button>
        </nav>
      </div>

      {/* User avatar placeholder */}
      <div className="flex items-center gap-2.5 px-3 pt-3 mt-1">
        <div className="
          w-7 h-7 rounded-full bg-gradient-to-br from-accent to-purple-400
          flex items-center justify-center text-white text-xs font-semibold
          shrink-0
        ">
          유
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-yuri-800 truncate">Yuri</p>
          <p className="text-[10px] text-yuri-400 truncate">Personal</p>
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

const NavItemButton: React.FC<NavItemButtonProps> = ({ item, active, onClick }) => (
  <button
    id={`nav-${item.id}`}
    onClick={onClick}
    className={`nav-item w-full text-left ${active ? 'active' : ''}`}
    aria-current={active ? 'page' : undefined}
  >
    <span className="w-5 text-center text-base leading-none">{item.icon}</span>
    <span>{item.label}</span>
  </button>
)

export default Sidebar
