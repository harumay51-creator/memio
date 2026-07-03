import React, { useState, useEffect, useCallback } from 'react'
import type { PageId } from './types'
import { useAppStore, AppStoreProvider } from './store/AppStore'
import Sidebar      from './components/Sidebar'
import QuickCapture from './components/QuickCapture'
import Router       from './router/Router'
import LockScreen   from './components/LockScreen'

// ── Inner app (needs to be inside AppStoreProvider to access useAppStore) ─────
const AppInner: React.FC = () => {
  const { isLoading, loadError } = useAppStore()
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

  if (loadError) {
    return (
      <div className="flex flex-col h-screen w-screen items-center justify-center bg-red-50 p-6 text-center">
        <div className="bg-white p-8 rounded-xl shadow-sm border border-red-200 max-w-md w-full">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-lg font-bold text-red-600 mb-2">데이터베이스 연결 실패</h2>
          <p className="text-sm text-yuri-600 mb-6 break-words">{loadError}</p>
          <div className="text-xs text-left text-yuri-500 bg-yuri-50 p-4 rounded-lg">
            <strong className="block mb-1 text-yuri-700">해결 방법:</strong>
            1. Firebase Console에 접속합니다.<br/>
            2. Firestore Database 메뉴로 이동합니다.<br/>
            3. <strong>규칙(Rules)</strong> 탭을 클릭합니다.<br/>
            4. 아래와 같이 규칙을 변경 후 '게시' 버튼을 누릅니다.<br/>
            <pre className="mt-2 bg-gray-800 text-green-400 p-2 rounded overflow-x-auto">
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}`}
            </pre>
          </div>
          <button onClick={() => window.location.reload()} className="mt-6 w-full bg-red-600 text-white font-bold py-2.5 rounded-lg hover:bg-red-700 transition-colors">
            다시 시도
          </button>
        </div>
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
