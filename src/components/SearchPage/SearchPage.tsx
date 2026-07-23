import React, { useState, useMemo, useEffect, useRef } from 'react'
import { useAppStore } from '../../store/AppStore'
import RichTextEditor from '../common/RichTextEditor'

type SearchResultItem = {
  id: string
  type: 'task' | 'event' | 'memo'
  text: string
  note?: string
  date: Date
  done?: boolean
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

const SearchPage: React.FC = () => {
  const { tasks, events, notes, updateNote, updateTaskText, updateTaskNote, toggleTask, updateEvent, deleteNote, deleteTask, deleteEvent } = useAppStore()
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  
  // local selection state
  const [selItemId, setSelItemId] = useState<string | null>(null)

  // Auto focus on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const getTitle = (text: string) => {
    const stripped = text.replace(/<[^>]*>?/gm, '')
    const trimmed = stripped.trim()
    if (!trimmed) return '새로운 기록'
    const firstLine = trimmed.split('\n')[0]
    return firstLine.length > 30 ? firstLine.slice(0, 30) + '...' : firstLine
  }

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []

    const matched: SearchResultItem[] = []

    // Tasks
    tasks.forEach(t => {
      if (t.text.toLowerCase().includes(q) || (t.note && t.note.toLowerCase().includes(q))) {
        matched.push({ id: t.id, type: 'task', text: t.text, note: t.note, date: new Date(t.createdAt), done: t.done })
      }
    })

    // Events
    events.forEach(e => {
      if (e.text.toLowerCase().includes(q)) {
        matched.push({ id: e.id, type: 'event', text: e.text, date: new Date(e.scheduledDate ?? e.createdAt) })
      }
    })

    // Notes
    notes.forEach(n => {
      if (n.text.toLowerCase().includes(q)) {
        matched.push({ id: n.id, type: 'memo', text: n.text, date: new Date(n.createdAt) })
      }
    })

    return matched.sort((a, b) => b.date.getTime() - a.date.getTime())
  }, [tasks, events, notes, query])

  // Deselect if current selected item is no longer in results (or if query is cleared)
  useEffect(() => {
    if (query.trim() === '') {
      setSelItemId(null)
    } else if (selItemId) {
      const stillExists = results.some(r => `${r.type}-${r.id}` === selItemId)
      if (!stillExists) setSelItemId(null)
    }
  }, [results, query, selItemId])

  // Group by date
  const dayGroups = useMemo(() => {
    const groups = new Map<string, { dateStr: string, date: Date, items: SearchResultItem[] }>()
    
    results.forEach(item => {
      const year = item.date.getFullYear()
      const month = item.date.getMonth() + 1
      const date = item.date.getDate()
      const day = item.date.getDay()
      
      const key = `${year}-${month.toString().padStart(2, '0')}-${date.toString().padStart(2, '0')}`
      const dateStr = `${year}년 ${month}월 ${date}일 ${WEEKDAYS[day]}요일`
      
      if (!groups.has(key)) {
        groups.set(key, { dateStr, date: new Date(year, month - 1, date), items: [] })
      }
      groups.get(key)!.items.push(item)
    })

    return Array.from(groups.values()).sort((a, b) => b.date.getTime() - a.date.getTime())
  }, [results])

  const selectedItem = useMemo(() => {
    if (!selItemId) return null
    return results.find(r => `${r.type}-${r.id}` === selItemId) || null
  }, [selItemId, results])

  return (
    <div className="flex h-full w-full bg-white overflow-hidden">
      {/* ── Left: Search Input & List ────────────────────────────────────────────── */}
      <aside className="w-[40%] border-r border-yuri-100 bg-yuri-50/30 flex flex-col shrink-0 h-full">
        <header className="shrink-0 h-16 border-b border-yuri-100 flex items-center px-6">
          <h1 className="text-xl font-bold text-yuri-900 tracking-tight">검색</h1>
        </header>

        {/* Input box */}
        <div className="p-4 pb-2 shrink-0 relative">
          <div className="absolute inset-y-0 left-4 pl-4 pt-4 flex pointer-events-none text-yuri-400">
            <span className="text-lg">⌕</span>
          </div>
          <input spellCheck={false}
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="기록 검색 (키워드 입력)"
            className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-yuri-200 bg-white outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all text-sm font-medium"
          />
          {query && (
            <button
              onClick={() => { setQuery(''); inputRef.current?.focus(); }}
              className="absolute right-6 top-[22px] flex items-center justify-center w-5 h-5 bg-yuri-100 hover:bg-yuri-200 text-yuri-500 rounded-full transition-colors text-[10px]"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 pt-2 flex flex-col gap-6">
          {query.trim() === '' ? (
            <div className="flex flex-col items-center justify-center h-full text-yuri-400 p-6 text-center">
              <span className="text-3xl mb-4 opacity-50">🔍</span>
              <p className="text-sm">검색어를 입력하시면<br />전체 기록에서 찾아드립니다.</p>
            </div>
          ) : dayGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-yuri-400 p-6 text-center">
              <span className="text-3xl mb-4 opacity-80">🤔</span>
              <p className="text-sm">'{query}'에 대한<br />검색 결과가 없습니다.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-6 pb-20">
              <p className="text-xs text-yuri-400 font-medium px-1">
                총 <span className="text-accent font-bold">{results.length}</span>개의 결과
              </p>
              
              {dayGroups.map(group => (
                <section key={group.dateStr}>
                  <h3 className="text-xs font-bold text-yuri-500 mb-3 px-1 tracking-wide">{group.dateStr}</h3>
                  <div className="flex flex-col gap-1">
                    {group.items.map(item => {
                      const itemKey = `${item.type}-${item.id}`
                      const isSelected = selItemId === itemKey
                      
                      return (
                        <div
                          key={itemKey}
                          onClick={() => setSelItemId(itemKey)}
                          className={`
                            group flex items-start gap-3 p-3 rounded-xl cursor-pointer border transition-all duration-150
                            ${isSelected ? 'bg-white border-yuri-300 shadow-sm' : 'bg-transparent border-transparent hover:bg-yuri-100/50 hover:border-yuri-200'}
                          `}
                        >
                          {/* Badge */}
                          <div className="shrink-0 mt-0.5">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wider ${
                              item.type === 'task' ? 'bg-yuri-100 text-yuri-700' :
                              item.type === 'event' ? 'bg-amber-100 text-amber-700' :
                              'bg-gray-200 text-gray-700'
                            }`}>
                              {item.type === 'task' ? '업무' : item.type === 'event' ? '일정' : '메모'}
                            </span>
                          </div>
                          
                          {/* Content Preview */}
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-semibold truncate ${item.done ? 'text-yuri-400 line-through' : isSelected ? 'text-yuri-900' : 'text-yuri-800'}`}>
                              {item.type === 'memo' ? getTitle(item.text) : item.text}
                            </p>
                            {item.type === 'memo' && (
                              <p className="text-xs text-yuri-400 mt-1 line-clamp-1">{item.text.replace(/<[^>]*>?/gm, '').replace(/\n/g, ' ').replace(getTitle(item.text), '').trim() || '내용 없음'}</p>
                            )}
                            {item.type === 'task' && item.note && (
                              <p className="text-xs text-yuri-400 mt-1 line-clamp-1">{item.note.replace(/<[^>]*>?/gm, '').replace(/\n/g, ' ')}</p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </aside>

        {/* ── Right: Detail Editor ───────────────────────────────────────── */}
      <main className="flex-1 flex flex-col h-full bg-white relative min-w-0">
        {selectedItem ? (
          <>
            {selectedItem.type === 'memo' && (
              <>
                <header className="shrink-0 h-16 flex items-center justify-between px-8 border-b border-transparent">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold px-2 py-0.5 rounded tracking-wider bg-gray-100 text-gray-700">메모</span>
                    <div className="text-xs font-semibold text-yuri-400">
                      {selectedItem.date.toLocaleString('ko-KR', {
                        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </div>
                  </div>
                  <button
                    onClick={() => { deleteNote(selectedItem.id); setSelItemId(null); }}
                    className="shrink-0 p-2 text-yuri-400 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors text-sm font-medium"
                  >
                    삭제
                  </button>
                </header>
                <div className="flex-1 w-full flex flex-col min-h-0 relative p-6 pb-0">
                  <RichTextEditor 
                    key={selectedItem.id}
                    initialContent={selectedItem.text}
                    onChange={(html) => updateNote(selectedItem.id, html)}
                  />
                </div>
              </>
            )}

            {selectedItem.type === 'task' && (
              <>
                <header className="shrink-0 min-h-16 flex items-center justify-between px-8 py-4 border-b border-yuri-100">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <button 
                      onClick={() => toggleTask(selectedItem.id)}
                      className={`w-6 h-6 flex items-center justify-center rounded-md border shrink-0 transition-colors ${selectedItem.done ? 'bg-accent border-accent text-white' : 'border-yuri-300 text-transparent hover:border-accent/50 hover:bg-accent/5'}`}
                    >
                      ✓
                    </button>
                    <div className="flex flex-col flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wider bg-yuri-100 text-yuri-700 shrink-0">업무</span>
                        <input spellCheck={false}
                          type="text"
                          value={selectedItem.text}
                          onChange={(e) => updateTaskText(selectedItem.id, e.target.value)}
                          className={`text-base font-bold truncate w-full bg-transparent outline-none focus:border-b focus:border-yuri-300 pb-0.5 placeholder:text-yuri-300 ${selectedItem.done ? 'text-yuri-400 line-through' : 'text-yuri-900'}`}
                          placeholder="업무 제목 입력"
                        />
                      </div>
                      <span className="text-xs text-yuri-400">
                        {selectedItem.date.toLocaleString('ko-KR', {
                          year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => { deleteTask(selectedItem.id); setSelItemId(null); }}
                    className="shrink-0 ml-4 p-2 text-yuri-400 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors text-sm font-medium"
                  >
                    삭제
                  </button>
                </header>
                <div className="flex-1 overflow-hidden p-6 pb-2">
                  <RichTextEditor
                    key={selectedItem.id}
                    initialContent={selectedItem.note || ''}
                    onChange={(html) => updateTaskNote(selectedItem.id, html)}
                    placeholder="여기에 진행 상황이나 메모를 자유롭게 작성하세요..."
                  />
                </div>
              </>
            )}

            {selectedItem.type === 'event' && (
              <>
                <header className="shrink-0 min-h-16 flex items-center px-8 py-4 border-b border-yuri-100 justify-between">
                  <div className="flex flex-col gap-2 flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wider bg-amber-100 text-amber-700">일정</span>
                      <span className="text-xs font-medium text-yuri-400">
                        {selectedItem.date.toLocaleString('ko-KR', {
                          year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                      </span>
                    </div>
                    <input spellCheck={false}
                      type="text"
                      value={selectedItem.text}
                      onChange={(e) => updateEvent(selectedItem.id, { text: e.target.value })}
                      className="text-xl font-bold leading-snug text-yuri-900 bg-transparent outline-none focus:border-b focus:border-yuri-300 w-full"
                      placeholder="일정 제목 입력"
                    />
                  </div>
                  <button
                    onClick={() => { deleteEvent(selectedItem.id); setSelItemId(null); }}
                    className="shrink-0 ml-4 p-2 text-yuri-400 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors text-sm font-medium"
                  >
                    삭제
                  </button>
                </header>
                <div className="flex-1 w-full p-8 overflow-y-auto">
                  <div className="text-yuri-500 italic text-sm">
                    일정은 별도의 상세 메모를 지원하지 않습니다.
                  </div>
                </div>
              </>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-yuri-50/20">
            <p className="text-yuri-400 text-sm font-medium flex flex-col items-center gap-2">
              <span className="text-3xl mb-1 opacity-50">👀</span>
              왼쪽 목록에서 검색 결과를 선택하면<br/>상세 내용을 볼 수 있습니다.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}

export default SearchPage
