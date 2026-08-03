import React, { useState, useEffect } from 'react'
import type { PageId } from '../../types'
import MobileCalendarPage from './MobileCalendarPage'
import MobileLedgerInputSheet from './MobileLedgerInputSheet'
import MobileCardTab from './MobileCardTab'
import MobileCashTab from './MobileCashTab'
import MobileLedgerSearchTab from './MobileLedgerSearchTab'
import MobileJournalPage from './MobileJournalPage'
import MobileSettingsPage from './MobileSettingsPage'
import { JournalStoreProvider } from '../../store/JournalStore'
import { auth } from '../../config/firebase'
import SettingsPage from '../SettingsPage/SettingsPage'
import LoginHistorySection from '../SettingsPage/LoginHistorySection'
import { ChevronLeft } from 'lucide-react'

interface MobileAppProps {
  activePage: PageId
  onNavigate: (page: PageId, itemId?: string) => void
  onLogout: () => void
}

const MobileApp: React.FC<MobileAppProps> = ({ activePage, onNavigate, onLogout }) => {
  const getPageTitle = (page: PageId) => {
    switch (page) {
      case 'calendar': return '달력'
      case 'notes': return '메모 (준비 중)'
      case 'ledger': return '가계부 (준비 중)'
      default: return 'Memio'
    }
  }

  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false)
  const [isLedgerInputOpen, setIsLedgerInputOpen] = useState(false)
  
  const [ledgerSubTab, setLedgerSubTab] = useState<'card' | 'cash'>('card')
  const [cardYear, setCardYear] = useState(() => new Date().getFullYear())
  const [cardMonth, setCardMonth] = useState(() => new Date().getMonth())
  const [cashYear, setCashYear] = useState(() => new Date().getFullYear())
  const [cashMonth, setCashMonth] = useState(() => new Date().getMonth())
  const [isLedgerSearchOpen, setIsLedgerSearchOpen] = useState(false)
  const [ledgerSearchQuery, setLedgerSearchQuery] = useState('')

  useEffect(() => {
    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        setIsKeyboardOpen(true)
      }
    }
    const handleBlur = (e: FocusEvent) => {
      const target = e.target as HTMLElement
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        setTimeout(() => {
          // Check if another input is focused
          const active = document.activeElement as HTMLElement
          if (!active || (active.tagName !== 'INPUT' && active.tagName !== 'TEXTAREA' && !active.isContentEditable)) {
            setIsKeyboardOpen(false)
          }
        }, 100)
      }
    }
    document.addEventListener('focusin', handleFocus)
    document.addEventListener('focusout', handleBlur)
    return () => {
      document.removeEventListener('focusin', handleFocus)
      document.removeEventListener('focusout', handleBlur)
    }
  }, [])

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (isLedgerInputOpen) setIsLedgerInputOpen(false)
      if (isLedgerSearchOpen) setIsLedgerSearchOpen(false)
      
      // Handle back button for activePage if state exists
      if (e.state?.page && e.state.page !== activePage) {
        onNavigate(e.state.page)
      }
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [isLedgerInputOpen, isLedgerSearchOpen, activePage, onNavigate])

  const openLedgerInput = () => {
    setIsLedgerInputOpen(true)
  }

  const openLedgerSearch = () => {
    setIsLedgerSearchOpen(true)
    window.history.pushState({ modal: 'ledgerSearch' }, '')
  }

  const closeLedgerSearch = () => {
    if (window.history.state?.modal === 'ledgerSearch') {
      window.history.back()
    }
    setIsLedgerSearchOpen(false)
  }

  const renderPage = () => {
    switch (activePage) {
      case 'calendar':
        return <MobileCalendarPage />
      case 'ledger': {
        const isSearchActive = isLedgerSearchOpen && ledgerSearchQuery.trim() !== ''
        const currentYear = ledgerSubTab === 'card' ? cardYear : cashYear
        const currentMonth = ledgerSubTab === 'card' ? cardMonth : cashMonth
        
        const setYear = ledgerSubTab === 'card' ? setCardYear : setCashYear
        const setMonth = ledgerSubTab === 'card' ? setCardMonth : setCashMonth

        return (
          <div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
            {/* Header */}
            <div className="flex flex-col bg-white shrink-0 z-20 shadow-sm border-b border-yuri-100">
              {/* Row 1: Month Nav & Actions */}
              <div className="flex items-center justify-between px-4 py-2">
                <div className="flex items-center gap-2">
                  <button onClick={() => {
                    let y = currentYear; let m = currentMonth - 1;
                    if (m < 0) { m = 11; y--; }
                    setYear(y); setMonth(m);
                  }} className="p-2 text-yuri-400 hover:text-accent rounded-full hover:bg-yuri-50 transition-colors">
                    <span className="text-xl leading-none">◀</span>
                  </button>
                  <h2 className="text-lg font-bold text-yuri-900 flex items-center justify-center min-w-[90px]">
                    {currentYear}년 {currentMonth + 1}월
                  </h2>
                  <button onClick={() => {
                    let y = currentYear; let m = currentMonth + 1;
                    if (m > 11) { m = 0; y++; }
                    setYear(y); setMonth(m);
                  }} className="p-2 text-yuri-400 hover:text-accent rounded-full hover:bg-yuri-50 transition-colors">
                    <span className="text-xl leading-none">▶</span>
                  </button>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => {
                    setYear(new Date().getFullYear())
                    setMonth(new Date().getMonth())
                  }} className="px-3 py-1 text-xs font-bold text-yuri-500 hover:text-accent bg-yuri-50 rounded-full transition-colors mr-1">
                    이번 달
                  </button>
                  <button onClick={() => {
                    if (isLedgerSearchOpen) closeLedgerSearch()
                    else openLedgerSearch()
                  }} className={`p-2 rounded-full transition-colors ${isLedgerSearchOpen ? 'text-accent bg-accent/10' : 'text-yuri-400 hover:text-accent hover:bg-yuri-50'}`}>
                    <span className="text-xl leading-none">🔍</span>
                  </button>
                  <button 
                    onClick={openLedgerInput}
                    className="p-1 text-accent hover:bg-yuri-50 rounded-full transition-colors ml-1"
                  >
                    <span className="text-3xl font-light leading-none">+</span>
                  </button>
                </div>
              </div>

              {/* Row 2: Sub-tabs */}
              {!isSearchActive && (
                <div className="px-4 pb-3">
                  <div className="flex bg-yuri-50 p-1 rounded-xl w-full">
                    <button 
                      onClick={() => setLedgerSubTab('card')}
                      className={`flex-1 py-1.5 text-sm font-bold rounded-lg transition-all ${ledgerSubTab === 'card' ? 'bg-white text-yuri-900 shadow-sm scale-100' : 'text-yuri-400 scale-95'}`}
                    >
                      카드
                    </button>
                    <button 
                      onClick={() => setLedgerSubTab('cash')}
                      className={`flex-1 py-1.5 text-sm font-bold rounded-lg transition-all ${ledgerSubTab === 'cash' ? 'bg-white text-yuri-900 shadow-sm scale-100' : 'text-yuri-400 scale-95'}`}
                    >
                      현금·계좌
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Search Bar */}
            {isLedgerSearchOpen && (
              <div className="px-4 py-3 bg-yuri-50 border-b border-yuri-100 flex items-center gap-2 z-10 shrink-0">
                <input spellCheck={false}
                  type="text"
                  autoFocus
                  placeholder="내역, 메모 검색"
                  value={ledgerSearchQuery}
                  onChange={e => setLedgerSearchQuery(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Escape') {
                      setLedgerSearchQuery('');
                      closeLedgerSearch();
                    }
                  }}
                  className="flex-1 bg-white border border-yuri-200 rounded-xl px-4 py-2 text-sm text-yuri-900 outline-none focus:border-accent shadow-sm"
                />
                {ledgerSearchQuery && (
                  <button onClick={() => setLedgerSearchQuery('')} className="p-2 text-yuri-400 hover:text-yuri-600">
                    ✕
                  </button>
                )}
              </div>
            )}

            {/* Body */}
            <div className="flex-1 overflow-hidden relative flex flex-col">
              {isSearchActive ? (
                <MobileLedgerSearchTab searchQuery={ledgerSearchQuery} />
              ) : ledgerSubTab === 'card' ? (
                <MobileCardTab year={currentYear} month={currentMonth} searchQuery={ledgerSearchQuery} />
              ) : (
                <MobileCashTab year={currentYear} month={currentMonth} searchQuery={ledgerSearchQuery} />
              )}
            </div>

            <MobileLedgerInputSheet isOpen={isLedgerInputOpen} onClose={() => setIsLedgerInputOpen(false)} />
          </div>
        )
      }
      case 'journal':
        return (
          <JournalStoreProvider uid={auth.currentUser?.uid || ''}>
            <MobileJournalPage />
          </JournalStoreProvider>
        )
      case 'settings':
        return <MobileSettingsPage onNavigate={onNavigate} onLogout={onLogout} />
      case 'pc_settings' as PageId:
        return (
          <div className="flex flex-col h-full bg-white relative">
            <header className="shrink-0 h-14 flex items-center px-2 border-b border-yuri-100 bg-white">
              <button 
                onClick={() => onNavigate('settings')}
                className="p-2 text-yuri-500 hover:text-accent flex items-center gap-1"
              >
                <ChevronLeft size={24} />
                <span className="font-bold">돌아가기</span>
              </button>
            </header>
            <div className="flex-1 overflow-auto">
              <SettingsPage />
            </div>
          </div>
        )
      case 'login_history' as PageId:
        return (
          <div className="flex flex-col h-full bg-white relative">
            <header className="shrink-0 h-14 flex items-center px-2 border-b border-yuri-100 bg-white">
              <button 
                onClick={() => onNavigate('settings')}
                className="p-2 text-yuri-500 hover:text-accent flex items-center gap-1"
              >
                <ChevronLeft size={24} />
                <span className="font-bold">돌아가기</span>
              </button>
            </header>
            <div className="flex-1 overflow-auto p-4">
              <LoginHistorySection />
            </div>
          </div>
        )
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
    <div className="fixed inset-0 flex flex-col bg-yuri-50 font-sans text-yuri-900 selection:bg-accent/20 overflow-hidden w-full h-full">
      {activePage !== 'calendar' && activePage !== 'ledger' && activePage !== 'journal' && activePage !== 'settings' && activePage !== 'pc_settings' as PageId && activePage !== 'login_history' as PageId && (
        <header className="shrink-0 h-14 flex items-center justify-center border-b border-yuri-100 bg-white sticky top-0 z-10 shadow-sm transition-all">
          <h1 className="text-lg font-bold text-yuri-900">{getPageTitle(activePage)}</h1>
        </header>
      )}

      <main className="flex-1 overflow-y-auto relative w-full h-full">
        {renderPage()}
      </main>

      {!isKeyboardOpen && (
        <nav className="shrink-0 h-16 border-t border-yuri-100 bg-white flex items-center justify-around pb-[env(safe-area-inset-bottom)] shadow-[0_-1px_10px_rgba(0,0,0,0.02)] z-20">
          <TabItem icon="📅" label="달력" isActive={activePage === 'calendar'} onClick={() => onNavigate('calendar')} />
          <TabItem icon="📝" label="메모" isActive={activePage === 'notes'} onClick={() => onNavigate('notes')} />
          <TabItem icon="💰" label="가계부" isActive={activePage === 'ledger'} onClick={() => onNavigate('ledger')} />
          <TabItem icon="⋯" label="더보기" isActive={activePage === 'settings'} onClick={() => onNavigate('settings')} />
        </nav>
      )}
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
