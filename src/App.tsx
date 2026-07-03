import React, { useState, useEffect, useCallback } from 'react'
import type { PageId } from './types'
import { useAppStore, AppStoreProvider } from './store/AppStore'
import Sidebar      from './components/Sidebar'
import QuickCapture from './components/QuickCapture'
import Router       from './router/Router'
import LockScreen   from './components/LockScreen'

// ── Inner app (needs to be inside AppStoreProvider to access useAppStore) ─────
const AppInner: React.FC = () => {
  const { isLoading } = useAppStore()
  const [activePage,    setActivePage]    = useState<PageId>(() => (localStorage.getItem('yuri-active-page') as PageId) || 'dashboard')
  const [activeItemId,  setActiveItemId]  = useState<string | null>(null)
  const [unlocked,      setUnlocked]      = useState<boolean>(() => localStorage.getItem('yuri-auth') === 'true')

  const navigate = useCallback((page: PageId, itemId?: string) => {
    setActiveItemId(itemId || null)
    setActivePage(page)
    localStorage.setItem('yuri-active-page', page)
  }, [])

  // Ctrl+K / Cmd+K → open search page
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        navigate('search')
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [navigate])

  const handleUnlock = useCallback(() => {
    setUnlocked(true)
    localStorage.setItem('yuri-auth', 'true')
  }, [])

  const handleLogout = useCallback(() => {
    setUnlocked(false)
    localStorage.removeItem('yuri-auth')
  }, [])

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-yuri-50">
        <div className="animate-pulse text-accent font-medium text-lg">데이터를 불러오는 중...</div>
      </div>
    )
  }

  if (!unlocked) {
    return <LockScreen onUnlock={handleUnlock} />
  }

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      {/* ── Left sidebar ────────────────────────────────────────────── */}
      <Sidebar
        activePage={activePage}
        onNavigate={navigate}
        onLogout={handleLogout}
      />

      {/* ── Main content & Bottom Bar ────────────────────────────────────────────── */}
      <main className="flex-1 min-w-0 flex flex-col h-screen">
        <div className="flex-1 min-h-0 relative overflow-hidden bg-white">
          <Router page={activePage} activeItemId={activeItemId} />
        </div>

        {/* ── Quick Capture (Only in Ledger) ──────────────────────────── */}
        {activePage === 'ledger' && (
          <div className="shrink-0 pb-6 pt-2 px-6 border-t border-yuri-100 bg-yuri-50/50">
            <QuickCapture />
          </div>
        )}
      </main>
    </div>
  )
}

// ── Root ──────────────────────────────────────────────────────────────────────
const App: React.FC = () => (
  <AppStoreProvider>
    <AppInner />
  </AppStoreProvider>
)

export default App
