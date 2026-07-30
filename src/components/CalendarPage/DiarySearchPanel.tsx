import React, { useState, useMemo } from 'react'
import { useDiaryStore } from '../../store/DiaryStore'
import { HighlightText } from '../common/HighlightText'

interface DiarySearchPanelProps {
  onResultClick: (dateKey: string) => void
  onClose: () => void
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const

const DiarySearchPanel: React.FC<DiarySearchPanelProps> = ({ onResultClick, onClose }) => {
  const { diaries, settings } = useDiaryStore()
  const isAurora = settings.theme === 'aurora'
  const [query, setQuery] = useState('')

  const results = useMemo(() => {
    if (!query.trim()) return []
    const q = query.toLowerCase()
    
    const matches: {
      dateKey: string
      dateObj: Date
      snippets: string[]
    }[] = []

    Object.values(diaries).forEach(diary => {
      const daySnippets: string[] = []
      
      // Search answers
      diary.answers?.forEach(a => {
        if (a.answer.toLowerCase().includes(q)) {
          daySnippets.push(a.answer)
        }
      })
      
      // Search memos
      diary.memos?.forEach(m => {
        if (m.text.toLowerCase().includes(q)) {
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

    // Sort descending by date
    return matches.sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime())
  }, [diaries, query])

  const getPreview = (text: string, query: string) => {
    const stripped = text.replace(/<[^>]*>?/gm, '').trim()
    const lowerStripped = stripped.toLowerCase()
    const matchIndex = lowerStripped.indexOf(query)
    
    if (matchIndex === -1) {
      return stripped.length > 40 ? stripped.substring(0, 40) + '...' : stripped
    }
    
    const start = Math.max(0, matchIndex - 15)
    const end = Math.min(stripped.length, matchIndex + query.length + 25)
    
    let result = stripped.substring(start, end)
    if (start > 0) result = '...' + result
    if (end < stripped.length) result = result + '...'
    
    return result || '새로운 기록'
  }

  return (
    <aside className={`relative flex-[6] flex flex-col h-full border-l border-[#E5E5EA] shrink-0 overflow-hidden px-6 py-6 ${isAurora ? 'bg-transparent' : 'bg-[#F9FAFB]'}`}>
      <header className="mb-6 shrink-0 flex items-center gap-3 relative z-10">
        <button 
          onClick={onClose}
          className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${isAurora ? 'bg-white/50 hover:bg-white/70' : 'bg-white hover:bg-gray-50 border border-[#E5E5EA]'}`}
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
            className={`w-full pl-10 pr-4 py-2 text-sm rounded-xl outline-none transition-all ${isAurora ? 'glass-card-refined text-[#1C1C1E] placeholder:text-[#717A8C]' : 'bg-white border border-[#E5E5EA] focus:border-[#8B7CF8] text-[#1C1C1E] placeholder:text-[#A0AABF]'}`}
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[16px]">🔍</span>
        </div>
      </header>

      <div className="relative z-10 flex-1 min-h-0 overflow-y-auto pr-2 -mr-2 flex flex-col gap-3">
        {query.trim() && results.length === 0 && (
          <div className="text-center py-10 text-sm font-medium text-[#717A8C]">
            검색 결과가 없습니다.
          </div>
        )}
        
        {results.map(res => {
          const m = res.dateObj.getMonth() + 1
          const d = res.dateObj.getDate()
          const wd = WEEKDAYS[res.dateObj.getDay()]
          
          return (
            <button
              key={res.dateKey}
              onClick={() => onResultClick(res.dateKey)}
              className={`text-left group transition-colors flex flex-col gap-2 p-4 w-full ${isAurora ? 'glass-card-refined hover:bg-white/80' : 'bg-white rounded-2xl border border-[#E5E5EA] hover:border-[#8B7CF8] shadow-sm'}`}
            >
              <div className="text-xs font-bold text-[#1C1C1E]">
                {m}월 {d}일 ({wd})
              </div>
              <div className="flex flex-col gap-1.5 w-full">
                {res.snippets.slice(0, 3).map((snippet, i) => (
                  <div key={i} className="text-xs text-[#717A8C] line-clamp-2 leading-relaxed">
                    <HighlightText text={getPreview(snippet, query)} highlight={query} />
                  </div>
                ))}
                {res.snippets.length > 3 && (
                  <div className="text-[10px] text-[#A0AABF] mt-1">+ {res.snippets.length - 3}개의 일치 항목 더보기</div>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </aside>
  )
}

export default DiarySearchPanel
