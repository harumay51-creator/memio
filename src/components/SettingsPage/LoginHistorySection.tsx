import React, { useState, useEffect } from 'react'
import { auth, db } from '../../config/firebase'
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore'
import { EmptyState } from '../common/EmptyState'

interface LoginHistoryItem {
  id: string
  timestamp: string
  deviceInfo: string
}

const LoginHistorySection: React.FC = () => {
  const [history, setHistory] = useState<LoginHistoryItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchHistory = async () => {
      if (!auth.currentUser) return
      try {
        const q = query(
          collection(db, 'users', auth.currentUser.uid, 'loginHistory'),
          orderBy('timestamp', 'desc'),
          limit(30)
        )
        const snap = await getDocs(q)
        const items = snap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as LoginHistoryItem[]
        setHistory(items)
      } catch (err) {
        console.error('Failed to fetch login history', err)
      } finally {
        setLoading(false)
      }
    }

    fetchHistory()
  }, [])

  return (
    <div className="flex flex-col h-full bg-[#FBFBFC]">
      <header className="shrink-0 h-16 flex items-center px-8 border-b border-[#F0F0F2] bg-white">
        <h2 className="text-xl font-bold text-[#1C1C1E]">접속 기록</h2>
      </header>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-[#E5E5EA] overflow-hidden">
            <div className="p-6">
              <h3 className="text-lg font-bold text-[#1C1C1E] mb-2">로그인 이력</h3>
              <p className="text-sm text-[#A0AABF] mb-6">
                최근 로그인한 기기와 시간 정보를 확인하여 의심스러운 접속이 있는지 점검하세요. (최대 30건)
              </p>

              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="w-8 h-8 border-4 border-[#F0F0F2] border-t-accent rounded-full animate-spin"></div>
                </div>
              ) : history.length === 0 ? (
                <EmptyState type="compact" message="접속 기록이 없습니다." />
              ) : (
                <div className="space-y-4">
                  {history.map(item => (
                    <div key={item.id} className="flex justify-between items-center p-4 bg-[#F9FAFB] rounded-xl border border-[#E5E5EA]">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-semibold text-[#1C1C1E]">
                          {item.deviceInfo || '알 수 없는 기기'}
                        </span>
                        <span className="text-xs text-[#8E8E93]">
                          {new Date(item.timestamp).toLocaleString('ko-KR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginHistorySection
