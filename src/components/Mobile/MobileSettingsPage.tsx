import { useState } from 'react'
import type { PageId } from '../../types'
import { Lock, LogOut, Settings, History, Key } from 'lucide-react'
import { useAppStore } from '../../store/AppStore'
import MobileAppPinScreen from './MobileAppPinScreen'
import { useToast } from '../common/Toast'
import { useConfirm } from '../common/ConfirmModal'

interface MobileSettingsPageProps {
  onNavigate: (page: PageId) => void
  onLogout?: () => void
}

export default function MobileSettingsPage({ onNavigate, onLogout }: MobileSettingsPageProps) {
  const { hasAppPin, setAppPin, removeAppPin, unlockApp } = useAppStore()
  const { showToast } = useToast()
  const { confirm } = useConfirm()
  
  const [pinMode, setPinMode] = useState<'none' | 'setup' | 'verify_for_change' | 'verify_for_remove' | 'change_new'>('none')
  const [pinError, setPinError] = useState('')

  const handlePinAction = async (pin: string) => {
    if (pinMode === 'setup' || pinMode === 'change_new') {
      await setAppPin(pin)
      showToast('PIN이 설정되었습니다.', 'success')
      setPinMode('none')
    } else if (pinMode === 'verify_for_change') {
      const isValid = await unlockApp(pin)
      if (isValid) {
        setPinMode('change_new')
        setPinError('')
      } else {
        setPinError('PIN이 일치하지 않습니다.')
        setTimeout(() => setPinError(''), 1000)
      }
    } else if (pinMode === 'verify_for_remove') {
      const isValid = await unlockApp(pin)
      if (isValid) {
        await removeAppPin()
        showToast('PIN 잠금이 해제되었습니다.', 'success')
        setPinMode('none')
        setPinError('')
      } else {
        setPinError('PIN이 일치하지 않습니다.')
        setTimeout(() => setPinError(''), 1000)
      }
    }
  }

  if (pinMode !== 'none') {
    return (
      <div className="fixed inset-0 z-[100] bg-white flex flex-col overflow-hidden animate-in fade-in duration-150">
        <div className="flex items-center gap-2 p-3 border-b border-[#E5E5EA] bg-white shrink-0 shadow-sm z-10">
          <button 
            onClick={() => { setPinMode('none'); setPinError(''); }}
            className="p-1 -ml-1 text-[#717A8C] active:bg-[#F0F0F5] rounded-full transition-colors"
          >
            ←
          </button>
          <h2 className="text-[16px] font-bold text-[#3D3833]">
            {pinMode === 'setup' || pinMode === 'change_new' ? '새 PIN 설정' : '기존 PIN 확인'}
          </h2>
        </div>
        <div className="flex-1 relative">
          <MobileAppPinScreen
            mode={pinMode === 'setup' || pinMode === 'change_new' ? 'setup' : 'unlock'}
            onComplete={handlePinAction}
            errorMsg={pinError}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-yuri-50 overflow-y-auto">
      <div className="p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-yuri-100 overflow-hidden">
          {/* App PIN Setting */}
          <div className="w-full flex items-center justify-between p-4 bg-white border-b border-yuri-100">
            <div className="flex items-center gap-3 text-yuri-900 font-bold">
              <span className="w-8 h-8 rounded-full bg-orange-100 text-orange-500 flex items-center justify-center">
                <Key size={16} />
              </span>
              앱 잠금 (PIN)
            </div>
            <div className="flex gap-2">
              {!hasAppPin ? (
                <button
                  onClick={() => setPinMode('setup')}
                  className="px-3 py-1.5 text-xs font-bold bg-accent text-white rounded-lg active:bg-accent/80 transition-colors"
                >
                  설정
                </button>
              ) : (
                <>
                  <button
                    onClick={() => setPinMode('verify_for_change')}
                    className="px-3 py-1.5 text-xs font-bold bg-yuri-100 text-yuri-700 rounded-lg active:bg-yuri-200 transition-colors"
                  >
                    변경
                  </button>
                  <button
                    onClick={() => setPinMode('verify_for_remove')}
                    className="px-3 py-1.5 text-xs font-bold bg-red-100 text-red-600 rounded-lg active:bg-red-200 transition-colors"
                  >
                    해제
                  </button>
                </>
              )}
            </div>
          </div>

          {/* 개인 기록 메뉴 */}
          <button
            onClick={() => onNavigate('journal')}
            className="w-full flex items-center justify-between p-4 bg-white hover:bg-yuri-50 active:bg-yuri-100 transition-colors text-left border-b border-yuri-100"
          >
            <div className="flex items-center gap-3 text-yuri-900 font-bold">
              <span className="w-8 h-8 rounded-full bg-accent/10 text-accent flex items-center justify-center">
                <Lock size={16} />
              </span>
              개인 기록
            </div>
            <span className="text-yuri-400">›</span>
          </button>

          {/* 설정 메뉴 */}
          <button
            onClick={() => onNavigate('pc_settings' as PageId)}
            className="w-full flex items-center justify-between p-4 bg-white hover:bg-yuri-50 active:bg-yuri-100 transition-colors text-left border-b border-yuri-100"
          >
            <div className="flex items-center gap-3 text-yuri-900 font-bold">
              <span className="w-8 h-8 rounded-full bg-yuri-100 text-yuri-500 flex items-center justify-center">
                <Settings size={16} />
              </span>
              전체 설정 (PC 버전)
            </div>
            <span className="text-yuri-400">›</span>
          </button>

          {/* 접속 기록 메뉴 */}
          <button
            onClick={() => onNavigate('login_history' as PageId)}
            className="w-full flex items-center justify-between p-4 bg-white hover:bg-yuri-50 active:bg-yuri-100 transition-colors text-left border-b border-yuri-100"
          >
            <div className="flex items-center gap-3 text-yuri-900 font-bold">
              <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-500 flex items-center justify-center">
                <History size={16} />
              </span>
              접속 기록
            </div>
            <span className="text-yuri-400">›</span>
          </button>

          {/* 로그아웃 (선택) */}
          {onLogout && (
            <button
              onClick={async () => {
                if (await confirm({ message: '로그아웃 하시겠습니까?', confirmText: '로그아웃' })) {
                  onLogout()
                }
              }}
              className="w-full flex items-center justify-between p-4 bg-white hover:bg-red-50 active:bg-red-100 transition-colors text-left"
            >
              <div className="flex items-center gap-3 text-red-500 font-bold">
                <span className="w-8 h-8 rounded-full bg-red-100 text-red-500 flex items-center justify-center">
                  <LogOut size={16} />
                </span>
                로그아웃
              </div>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
