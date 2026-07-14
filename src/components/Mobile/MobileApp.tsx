import React from 'react'
import type { PageId } from '../../types'
import MobileCalendarPage from './MobileCalendarPage'

interface MobileAppProps {
  activePage: PageId
  onNavigate: (page: PageId, itemId?: string) => void
  onLogout: () => void
}

const MobileApp: React.FC<MobileAppProps> = ({ activePage, onNavigate }) => {
  const getPageTitle = (page: PageId) => {
    switch (page) {
      case 'calendar': return '달력'
      case 'notes': return '메모 (준비 중)'
      case 'ledger': return '가계부 (준비 중)'
      default: return 'Memio'
    }
  }

  const renderPage = () => {
    switch (activePage) {
      case 'calendar':
        return <MobileCalendarPage />
      default:
        return (
          <div className="flex-1 flex flex-col h-full items-center justify-center text-yuri-400 p-6 text-center">
            <span className="text-4xl mb-4">🚧</span>
            <p>이 탭은 모바일 버전에서<br/>아직 준비 중입니다.</p>
          </div>
        )
    }
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-yuri-50 font-sans text-yuri-900 selection:bg-accent/20">
      <header className="shrink-0 h-14 flex items-center justify-center border-b border-yuri-100 bg-white sticky top-0 z-10 shadow-sm">
        <h1 className="text-lg font-bold text-yuri-900">{getPageTitle(activePage)}</h1>
      </header>

      <main className="flex-1 overflow-y-auto relative w-full h-full">
        {renderPage()}
      </main>

      <nav className="shrink-0 h-16 border-t border-yuri-100 bg-white flex items-center justify-around pb-[env(safe-area-inset-bottom)] shadow-[0_-1px_10px_rgba(0,0,0,0.02)] z-20">
        <TabItem icon="📅" label="달력" isActive={activePage === 'calendar'} onClick={() => onNavigate('calendar')} />
        <TabItem icon="📝" label="메모" isActive={activePage === 'notes'} onClick={() => onNavigate('notes')} />
        <TabItem icon="💰" label="가계부" isActive={activePage === 'ledger'} onClick={() => onNavigate('ledger')} />
        <TabItem icon="⋯" label="더보기" isActive={activePage === 'settings'} onClick={() => onNavigate('settings')} />
      </nav>
    </div>
  )
}

const TabItem: React.FC<{ icon: string; label: string; isActive: boolean; onClick: () => void }> = ({ icon, label, isActive, onClick }) => {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${isActive ? 'text-accent' : 'text-yuri-400 hover:text-yuri-600'}`}
    >
      <span className={`text-xl leading-none transition-transform ${isActive ? 'scale-110' : ''}`}>{icon}</span>
      <span className="text-[10px] font-semibold">{label}</span>
    </button>
  )
}

export default MobileApp
