import React from 'react'
import { useAppStore } from '../../store/AppStore'

const TrashSection: React.FC = () => {
  const { trashedItems, restoreItem, hardDeleteItem } = useAppStore()

  const getTypeStyle = (type: string) => {
    switch (type) {
      case 'note':
        return { bg: '#5B4FCF1A', text: '#5B4FCF', label: '메모' }
      case 'task':
        return { bg: '#D45D6E1A', text: '#D45D6E', label: '업무' }
      case 'ledger':
        return { bg: '#3F9E7A1A', text: '#3F9E7A', label: '가계부 거래' }
      case 'fixedExpense':
        return { bg: '#C96A951A', text: '#C96A95', label: '고정지출' }
      default:
        return { bg: '#F3F4F6', text: '#374151', label: '기타' }
    }
  }

  const handleHardDelete = (type: 'note'|'task'|'ledger'|'fixedExpense', id: string) => {
    if (window.confirm('정말 영구 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      hardDeleteItem(type, id)
    }
  }

  const getDDay = (deletedAt: number) => {
    const passedMs = Date.now() - deletedAt
    const passedDays = Math.floor(passedMs / (1000 * 60 * 60 * 24))
    const remain = 30 - passedDays
    return remain > 0 ? remain : 0
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-yuri-200 overflow-hidden mt-6 mb-8">
      <div className="p-5 border-b border-yuri-100 bg-yuri-50/30">
        <h2 className="text-lg font-bold text-yuri-900 flex items-center gap-2">
          <span>🗑️</span>
          휴지통
        </h2>
        <p className="text-sm text-yuri-400 mt-1">
          삭제된 항목은 이곳에 최대 30일간 보관된 후 영구 삭제됩니다. 개인 기록(Journal)은 휴지통을 거치지 않고 즉시 삭제됩니다.
        </p>
      </div>
      
      <div className="p-0">
        {trashedItems.length === 0 ? (
          <div className="p-8 text-center text-yuri-400 text-sm font-medium">
            휴지통이 비어 있습니다.
          </div>
        ) : (
          <ul className="divide-y divide-yuri-100 max-h-[400px] overflow-y-auto">
            {trashedItems.map(item => {
              const style = getTypeStyle(item.type)
              const dDay = getDDay(item.deletedAt)
              const dateStr = new Date(item.deletedAt).toLocaleDateString('ko-KR', {
                year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
              })

              return (
                <li key={item.id} className="p-4 hover:bg-yuri-50/50 transition-colors flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span 
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: style.bg, color: style.text }}
                      >
                        {style.label}
                      </span>
                      <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                        D-{dDay}
                      </span>
                      <span className="text-[11px] text-yuri-400 font-medium">
                        {dateStr} 삭제
                      </span>
                    </div>
                    <p className="text-sm text-yuri-800 font-medium truncate">
                      {item.label}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => restoreItem(item.type, item.id)}
                      className="px-3 py-1.5 text-xs font-bold text-accent bg-accent/10 hover:bg-accent/20 rounded-lg transition-colors cursor-pointer"
                    >
                      복구
                    </button>
                    <button
                      onClick={() => handleHardDelete(item.type, item.id)}
                      className="px-3 py-1.5 text-xs font-bold text-yuri-400 bg-yuri-100 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                    >
                      지금 완전히 삭제
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

export default TrashSection
