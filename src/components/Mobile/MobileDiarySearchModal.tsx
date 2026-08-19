import React, { useState, useMemo } from 'react'
import { useDiaryStore } from '../../store/DiaryStore'
import { EmptyState } from '../common/EmptyState'
import { HighlightText } from '../common/HighlightText'
import { isSearchMatch, getSearchPreview } from '../../utils/textUtils'

interface MobileDiarySearchModalProps {
  onClose: () => void
  onResultClick: (date: Date) => void
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const

export const MobileDiarySearchModal: React.FC<MobileDiarySearchModalProps> = ({ onClose, onResultClick }) => {
  const { diaries } = useDiaryStore()
  const [query, setQuery] = useState('')

  const results = useMemo(() => {
    if (!query.trim()) return []
    
    const matches: {
      dateKey: string
      dateObj: Date
      snippets: string[]
    }[] = []

    Object.values(diaries).forEach(diary => {
      const daySnippets: string[] = []
      
      diary.answers?.forEach(a => {
        if (isSearchMatch(a.answer, query)) {
          daySnippets.push(a.answer)
        }
      })
      
      diary.memos?.forEach(m => {
        if (isSearchMatch(m.text, query)) {
          daySnippets.push(m.text)
        }
      })

      if (daySnippets.length > 0) {
        matches.push({
          dateKey: diary.dateKey,
          dateObj: new Date(diary.dateKey),
          snippets: daySnippets
        })
      }
    })

    return matches.sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime())
  }, [diaries, query])

  const getPreview = (text: string, query: string) => {
    return getSearchPreview(text, query) || '새로운 기록'
  }

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col animate-slide-up">
      {/* Search Header */}
      <header className="shrink-0 flex items-center gap-3 p-4 border-b border-[#E5E5EA]">
        <button 
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-[#E5E5EA] text-[#717A8C]"
        >
          ←
        </button>
        <div className="flex-1 relative">
          <input
            autoFocus
            type="text"
            placeholder="다이어리 내용 검색..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl outline-none border border-[#E5E5EA] focus:border-[#8B7CF8] text-[#1C1C1E] placeholder:text-[#A0AABF]"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm">🔍</span>
        </div>
      </header>

      {/* Results */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 bg-[#F9FAFB]">
        {query.trim() && results.length === 0 ? (
          <EmptyState type="compact" message="검색 결과가 없습니다." />
        ) : (
          results.map(res => {
            const m = res.dateObj.getMonth() + 1
            const d = res.dateObj.getDate()
            const wd = WEEKDAYS[res.dateObj.getDay()]
            
            return (
              <button
                key={res.dateKey}
                onClick={() => onResultClick(res.dateObj)}
                className="text-left bg-white p-3 rounded-xl border border-[#E5E5EA] shadow-sm hover:border-[#8B7CF8] transition-colors group"
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-[#8B7CF8]">
                    {res.dateObj.getFullYear()}년 {m}월 {d}일 ({wd})
                  </span>
                </div>
                <div className="flex flex-col gap-1.5">
                  {res.snippets.map((snippet, idx) => (
                    <div key={idx} className="text-sm text-[#3D3833] line-clamp-2 leading-relaxed">
                      <HighlightText text={getPreview(snippet, query)} highlight={query} />
                    </div>
                  ))}
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
