import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react'
import type { PageId } from './types'
import { useAppStore, AppStoreProvider } from './store/AppStore'
import { useDiaryStore, DiaryStoreProvider } from './store/DiaryStore'
import auroraBg from './assets/aurora.jpg'
import AuthScreen   from './components/AuthScreen'
import MobileApp    from './components/Mobile/MobileApp'
import MobileAppPinScreen from './components/Mobile/MobileAppPinScreen'
import { hashPin } from './store/AppStore'
import { Y2KBackground } from './components/common/Y2KTheme'
import { useIsMobile } from './hooks/useIsMobile'

const Sidebar = lazy(() => import('./components/Sidebar/Sidebar'))
const QuickCapture = lazy(() => import('./components/QuickCapture'))
const Router = lazy(() => import('./router/Router'))
import { auth }     from './config/firebase'
import { onAuthStateChanged, User, signOut, setPersistence, browserSessionPersistence } from 'firebase/auth'
import { isMobileDevice } from './utils/isMobileDevice'
import { ToastProvider } from './components/common/Toast'

// ── Inner app (needs to be inside AppStoreProvider to access useAppStore) ─────
const AppInner: React.FC = () => {
  const { isSettingsLoading, isLoading, hasAppPin, isAppUnlocked, loadError } = useAppStore()
  const { isDiaryMode, settings, setIsDiaryMode } = useDiaryStore()
  const [activePage,    setActivePage]    = useState<PageId>('calendar')
  const [activeItemId,  setActiveItemId]  = useState<string | null>(null)
  
  const isMobile = useIsMobile(768)

  const navigate = useCallback((page: PageId, itemId?: string) => {
    setActiveItemId(itemId || null)
    setActivePage(page)
    if (page === 'calendar') {
      setIsDiaryMode(false)
    }
  }, [setIsDiaryMode])

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

  // If mobile and locked (we know this instantly from localStorage cache), bypass all loading screens so MobileApp can render the PIN screen immediately!
  const isLockedMobile = isMobile && hasAppPin && !isAppUnlocked;

  if ((isSettingsLoading || isLoading) && !isLockedMobile) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-yuri-50">
        <div className="animate-pulse text-accent font-medium text-lg">불러오는 중...</div>
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
      
      <Suspense fallback={<div className="w-64 h-full bg-white/50 border-r border-yuri-200 animate-pulse shrink-0" />}>
        <Sidebar
          activePage={activePage}
          onNavigate={navigate}
          onLogout={handleLogout}
          isAuroraBg={showAuroraBg}
          isY2KBg={showY2KBg}
        />
      </Suspense>
      
      <main className="flex-1 flex flex-col relative h-full min-w-0 z-10 bg-transparent">
        <div className="flex-1 overflow-y-auto w-full relative min-h-0">
          <Suspense fallback={<div className="w-full h-full flex items-center justify-center"><div className="animate-pulse text-yuri-400">화면을 불러오는 중...</div></div>}>
            <Router page={activePage} activeItemId={activeItemId} />
          </Suspense>
        </div>
        
        {activePage === 'ledger' && (
          <div className="shrink-0 pb-6 pt-2 px-6 border-t border-yuri-100 bg-yuri-50/50">
            <Suspense fallback={<div className="h-[72px] w-full animate-pulse bg-white/60 rounded-xl" />}>
              <QuickCapture />
            </Suspense>
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
  const [pendingPinUnlock, setPendingPinUnlock] = useState(false)
  const [earlyPinError, setEarlyPinError] = useState('')

  useEffect(() => {
    console.timeEnd('[App] 0. Script Load to App Render')
    console.time('[App] 1. Auth Initialization Time')
    let timerId: ReturnType<typeof setTimeout> | null = null;
    
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        const isMobileForAuth = isMobileDevice();
        localStorage.setItem('yuri-last-uid', currentUser.uid);
        
        if (!isMobileForAuth) {
          setPersistence(auth, browserSessionPersistence).catch(console.error);

          const LOGOUT_TIME_MS = 3 * 60 * 60 * 1000; 
          
          const now = Date.now();
          let loginTimeStr = sessionStorage.getItem('yuri-login-time');
          let parsedLoginTime = loginTimeStr ? parseInt(loginTimeStr, 10) : NaN;
          
          if (!loginTimeStr || isNaN(parsedLoginTime) || parsedLoginTime > now) {
            parsedLoginTime = now;
            sessionStorage.setItem('yuri-login-time', parsedLoginTime.toString());
          }
          
          const elapsed = now - parsedLoginTime;
          const remaining = LOGOUT_TIME_MS - elapsed;
          
          if (remaining <= 0) {
            signOut(auth);
            sessionStorage.removeItem('yuri-login-time');
            sessionStorage.removeItem('yuri-private-unlocked');
            localStorage.removeItem('yuri-last-uid');
            setUser(null);
            console.timeEnd('[App] 1. Auth Initialization Time')
            setIsAuthLoading(false);
          } else {
            setUser(currentUser);
            console.timeEnd('[App] 1. Auth Initialization Time')
            setIsAuthLoading(false);
            
            if (timerId) clearTimeout(timerId);
            timerId = setTimeout(() => {
              signOut(auth);
              sessionStorage.removeItem('yuri-login-time');
              sessionStorage.removeItem('yuri-private-unlocked');
              localStorage.removeItem('yuri-last-uid');
            }, remaining);
          }
        } else {
          setUser(currentUser);
          console.timeEnd('[App] 1. Auth Initialization Time')
          setIsAuthLoading(false);
        }
      } else {
        if (timerId) clearTimeout(timerId);
        setUser(null);
        console.timeEnd('[App] 1. Auth Initialization Time')
        setIsAuthLoading(false);
        sessionStorage.removeItem('yuri-login-time');
        sessionStorage.removeItem('yuri-private-unlocked');
        localStorage.removeItem('yuri-last-uid');
      }
    })
    return () => {
      if (timerId) clearTimeout(timerId);
      unsubscribe();
    }
  }, [])

  const isMobileForAuth = isMobileDevice();
  const lastUid = localStorage.getItem('yuri-last-uid');
  const cachedAppPin = lastUid ? localStorage.getItem(`yuri-appPinHash-${lastUid}`) : null;
  const isAppUnlocked = sessionStorage.getItem('yuri-app-unlocked') === 'true';
  const showEarlyPinScreen = isMobileForAuth && cachedAppPin && !isAppUnlocked && !pendingPinUnlock;

  if (isAuthLoading) {
    if (showEarlyPinScreen) {
      return (
        <div className="relative h-[100dvh] w-screen bg-white">
          <MobileAppPinScreen
            mode="unlock"
            errorMsg={earlyPinError}
            onComplete={async (pin) => {
              const hash = await hashPin(pin);
              if (hash === cachedAppPin) {
                performance.mark('auth-start');
                sessionStorage.setItem('yuri-app-unlocked', 'true');
                window.dispatchEvent(new Event('app-unlocked'));
                setPendingPinUnlock(true);
              } else {
                setEarlyPinError('PIN이 일치하지 않습니다.');
                setTimeout(() => setEarlyPinError(''), 2000);
              }
            }}
          />
        </div>
      )
    }

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
