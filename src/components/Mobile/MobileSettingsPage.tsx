import type { PageId } from '../../types'
import { Lock, LogOut, Settings, History } from 'lucide-react'

interface MobileSettingsPageProps {
  onNavigate: (page: PageId) => void
  onLogout?: () => void
}

export default function MobileSettingsPage({ onNavigate, onLogout }: MobileSettingsPageProps) {
  return (
    <div className="flex flex-col h-full bg-yuri-50 overflow-y-auto">
      <div className="p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-yuri-100 overflow-hidden">
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
              onClick={() => {
                if (confirm('로그아웃 하시겠습니까?')) {
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
