import React, { useState, useEffect, useCallback } from 'react'
import type { PageId } from './types'
import { useAppStore, AppStoreProvider } from './store/AppStore'
import { useDiaryStore, DiaryStoreProvider } from './store/DiaryStore'
import Sidebar      from './components/Sidebar/Sidebar'
import QuickCapture from './components/QuickCapture'
import Router       from './router/Router'
import auroraBg from './assets/aurora.jpg'
import AuthScreen   from './components/AuthScreen'
import MobileApp    from './components/Mobile/MobileApp'
import { Y2KBackground } from './components/common/Y2KTheme'
import { useIsMobile } from './hooks/useIsMobile'
import { auth }     from './config/firebase'
import { onAuthStateChanged, User, signOut } from 'firebase/auth'
import { ToastProvider } from './components/common/Toast'

// ── Inner app (needs to be inside AppStoreProvider to access useAppStore) ─────
const AppInner: React.FC = () => {
  const { isLoading, loadError } = useAppStore()
  const { isDiaryMode, settings } = useDiaryStore()
  const [activePage,    setActivePage]    = useState<PageId>('calendar')
  const [activeItemId,  setActiveItemId]  = useState<string | null>(null)
  
  const isMobile = useIsMobile(768)

  const navigate = useCallback((page: PageId, itemId?: string) => {
    setActiveItemId(itemId || null)
    setActivePage(page)
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

  const handleLogout = () => {
    sessionStorage.removeItem('yuri-private-unlocked')
    auth.signOut()
  }

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

  if (isMobile) {
    return (
      <MobileApp
        activePage={activePage}
        onNavigate={navigate}
        onLogout={handleLogout}
      />
    )
  }

  const isAurora = settings.theme === 'aurora'
  const isY2K = settings.theme === 'y2k'
  const showAuroraBg = isAurora && isDiaryMode && activePage === 'calendar'
  const showY2KBg = isY2K && isDiaryMode && activePage === 'calendar'

  return (
    <div className={`flex h-screen w-screen relative overflow-hidden ${showAuroraBg || showY2KBg ? 'text-[#1C1C1E]' : 'bg-yuri-50 text-yuri-900'}`}>
      {showAuroraBg && (
        <>
          <div className="absolute inset-0 z-0 bg-cover bg-center" style={{ backgroundImage: `url(${auroraBg})` }} />
          <div className="absolute inset-0 z-0 bg-white/20" />
        </>
      )}
      {showY2KBg && <Y2KBackground />}
      <Sidebar
        activePage={activePage}
        onNavigate={navigate}
        onLogout={handleLogout}
        isAuroraBg={showAuroraBg}
        isY2KBg={showY2KBg}
      />
      
      <main className="flex-1 flex flex-col relative h-full min-w-0 z-10 bg-transparent">
        <div className="flex-1 overflow-y-auto w-full relative">
          <Router page={activePage} activeItemId={activeItemId} />
        </div>
        
        {activePage === 'ledger' && (
          <div className="shrink-0 pb-6 pt-2 px-6 border-t border-yuri-100 bg-yuri-50/50">
            <QuickCapture />
          </div>
        )}
      </main>
    </div>
  )
}

// ── Root app ──────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [isAuthLoading, setIsAuthLoading] = useState(true)

  useEffect(() => {
    let timerId: ReturnType<typeof setTimeout> | null = null;
    
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        const now = Date.now();
        let loginTime = sessionStorage.getItem('yuri-login-time');
        if (!loginTime) {
          loginTime = now.toString();
          sessionStorage.setItem('yuri-login-time', loginTime);
        }
        
        // 3 hours = 3 * 60 * 60 * 1000 = 10800000 ms
        const LOGOUT_TIME_MS = 3 * 60 * 60 * 1000; 
        const elapsed = now - parseInt(loginTime, 10);
        const remaining = LOGOUT_TIME_MS - elapsed;
        
        if (remaining <= 0) {
          signOut(auth);
          sessionStorage.removeItem('yuri-login-time');
          sessionStorage.removeItem('yuri-private-unlocked');
          setUser(null);
          setIsAuthLoading(false);
        } else {
          setUser(currentUser);
          setIsAuthLoading(false);
          
          if (timerId) clearTimeout(timerId);
          timerId = setTimeout(() => {
            signOut(auth);
            sessionStorage.removeItem('yuri-login-time');
            sessionStorage.removeItem('yuri-private-unlocked');
          }, remaining);
        }
      } else {
        if (timerId) clearTimeout(timerId);
        setUser(null);
        setIsAuthLoading(false);
        sessionStorage.removeItem('yuri-login-time');
        sessionStorage.removeItem('yuri-private-unlocked');
      }
    })
    return () => {
      if (timerId) clearTimeout(timerId);
      unsubscribe();
    }
  }, [])

  if (isAuthLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-yuri-50">
        <div className="animate-pulse text-accent font-medium text-lg">인증 확인 중...</div>
      </div>
    )
  }

  if (!user) {
    return <AuthScreen />
  }

  return (
    <ToastProvider>
      <AppStoreProvider uid={user.uid}>
        <DiaryStoreProvider uid={user.uid}>
          <AppInner />
        </DiaryStoreProvider>
      </AppStoreProvider>
    </ToastProvider>
  )
}
