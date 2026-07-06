import React, { useState, useMemo, useEffect } from 'react'
import { useJournalStore } from '../../store/JournalStore'
import { useAppStore } from '../../store/AppStore'
import PinScreen from './PinScreen'
import { Lock } from 'lucide-react'

const JournalPage: React.FC<{ activeItemId?: string | null }> = ({ activeItemId }) => {
  const { journals, addJournal, updateJournal, deleteJournal, isLoading } = useJournalStore()
  const { isPrivateUnlocked, lockPrivate } = useAppStore()
  const [selNoteId, setSelNoteId] = useState<string | null>(activeItemId || null)
  const [searchQuery, setSearchQuery] = useState('')
  const [inputText, setInputText] = useState('')

  // Auto-select when activeItemId changes
  useEffect(() => {
    if (activeItemId) setSelNoteId(activeItemId)
  }, [activeItemId])

  // Deselect if the selected note is deleted
  const selectedNote = useMemo(() => journals.find(n => n.id === selNoteId) || null, [journals, selNoteId])

  const handleDelete = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    deleteJournal(id)
    if (selNoteId === id) setSelNoteId(null)
  }

  const handleAdd = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputText.trim()) {
      const newId = addJournal(inputText.trim())
      setInputText('')
      setSelNoteId(newId) // Auto-select the newly created note
    }
  }

  // Generate a short title from the text (first 30 chars)
  const getTitle = (text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return '새로운 기록'
    const firstLine = trimmed.split('\n')[0]
    return firstLine.length > 30 ? firstLine.slice(0, 30) + '...' : firstLine
  }

  const getPreview = (text: string) => {
    const trimmed = text.trim()
    const lines = trimmed.split('\n')
    if (lines.length <= 1) return '추가 내용 없음'
    const preview = lines.slice(1).join(' ')
    return preview.length > 40 ? preview.slice(0, 40) + '...' : preview
  }

  const filteredNotes = useMemo(() => {
    let result = journals
    if (searchQuery.trim()) {
      const lowerQ = searchQuery.toLowerCase()
      result = journals.filter(n => n.text.toLowerCase().includes(lowerQ))
    }
    return [...result].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [journals, searchQuery])

  if (isLoading) {
    return (
      <div className="flex h-full w-full bg-yuri-50 items-center justify-center">
        <div className="animate-pulse text-accent font-medium">로딩 중...</div>
      </div>
    )
  }

  if (!isPrivateUnlocked) {
    return <PinScreen />
  }

  return (
    <div className="flex h-full w-full bg-white overflow-hidden">
      {/* ── Left: Note List ────────────────────────────────────────────── */}
      <aside className="w-2/5 border-r border-yuri-100 bg-yuri-50/30 flex flex-col shrink-0 h-full">
        <header className="shrink-0 flex flex-col border-b border-yuri-100 bg-white px-6 py-4 gap-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-yuri-900 tracking-tight">개인 기록</h1>
            <button
              onClick={lockPrivate}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-yuri-500 bg-yuri-50 hover:bg-yuri-100 rounded-lg transition-colors cursor-pointer"
            >
              <Lock size={14} />
              잠금
            </button>
          </div>
          <input
            type="text"
            placeholder="기록 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-yuri-50 border border-yuri-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-accent transition-colors"
          />
          <div className="border-t border-yuri-100 my-1" />
          <input
            type="text"
            placeholder="새 기록 입력 (Enter)"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleAdd}
            className="w-full bg-transparent border-none rounded-none px-1 py-1 text-sm outline-none placeholder:text-accent/60 text-accent font-medium focus:border-b focus:border-accent/30 transition-all"
          />
        </header>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
          {filteredNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-yuri-400 p-6 text-center">
              <p className="text-sm">
                {journals.length === 0 ? (
                  <>작성된 기록이 없습니다.<br />아래 입력창에서 바로 기록해보세요!</>
                ) : (
                  <>검색 결과가 없습니다.</>
                )}
              </p>
            </div>
          ) : (
            filteredNotes.map(note => {
              const isSelected = selNoteId === note.id
              const d = new Date(note.createdAt)
              const dateStr = d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })

              return (
                <div
                  key={note.id}
                  onClick={() => setSelNoteId(note.id)}
                  className={`
                    group p-3 rounded-xl cursor-pointer border transition-all duration-150 relative
                    ${isSelected ? 'bg-white border-yuri-300 shadow-sm' : 'bg-transparent border-transparent hover:bg-yuri-100/50 hover:border-yuri-200'}
                  `}
                >
                  <h3 className={`text-sm font-bold truncate ${isSelected ? 'text-yuri-900' : 'text-yuri-800'}`}>
                    {getTitle(note.text)}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] font-semibold text-yuri-400 shrink-0">{dateStr}</span>
                    <span className="text-[11px] text-yuri-400 truncate">{getPreview(note.text)}</span>
                  </div>

                  {/* Delete Button (Hover) */}
                  <button
                    onClick={(e) => handleDelete(note.id, e)}
                    aria-label="기록 삭제"
                    className={`
                      absolute top-3 right-3 w-6 h-6 flex items-center justify-center rounded text-yuri-300
                      opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-red-50 transition-all cursor-pointer
                      ${isSelected ? 'opacity-100' : ''}
                    `}
                  >
                    ✕
                  </button>
                </div>
              )
            })
          )}
        </div>
      </aside>

      {/* ── Right: Detail Editor ───────────────────────────────────────── */}
      <main className="flex-1 flex flex-col h-full bg-white relative min-w-0">
        {selectedNote ? (
          <>
            <header className="shrink-0 h-16 flex items-center justify-between px-8 border-b border-transparent">
              <div className="text-xs font-semibold text-yuri-400">
                {new Date(selectedNote.createdAt).toLocaleString('ko-KR', {
                  year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                })}
              </div>
              <button
                onClick={() => handleDelete(selectedNote.id)}
                className="text-sm font-medium text-red-400 hover:text-red-500 hover:bg-red-50 px-3 py-1.5 rounded transition-colors cursor-pointer"
              >
                삭제
              </button>
            </header>
            
            <div className="flex-1 overflow-hidden flex flex-col px-8 pb-8 gap-4 mt-2">
              <input
                type="text"
                value={selectedNote.text.split('\n')[0] || ''}
                onChange={(e) => {
                  const lines = selectedNote.text.split('\n')
                  lines[0] = e.target.value
                  updateJournal(selectedNote.id, lines.join('\n'))
                }}
                className="text-2xl font-bold bg-transparent outline-none text-yuri-900 placeholder:text-yuri-300 w-full"
                placeholder="제목"
              />
              <textarea
                value={selectedNote.text.split('\n').length > 1 ? selectedNote.text.split('\n').slice(1).join('\n') : ''}
                onChange={(e) => {
                  const lines = selectedNote.text.split('\n')
                  const firstLine = lines[0] || ''
                  updateJournal(selectedNote.id, firstLine + '\n' + e.target.value)
                }}
                placeholder="여기에 비공개 기록을 작성하세요..."
                className="flex-1 w-full resize-none bg-transparent outline-none text-yuri-800 text-sm leading-relaxed placeholder:text-yuri-300"
                spellCheck={false}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-yuri-300">
            <svg className="w-16 h-16 mb-4 text-yuri-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <p className="font-medium">좌측에서 기록을 선택하거나 새로 작성하세요</p>
          </div>
        )}
      </main>
    </div>
  )
}

export default JournalPage
