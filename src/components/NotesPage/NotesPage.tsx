import React, { useState, useMemo, useEffect } from 'react'
import { useAppStore } from '../../store/AppStore'
import RichTextEditor from '../common/RichTextEditor'
import { Virtuoso } from 'react-virtuoso'

const NotesPage: React.FC<{ activeItemId?: string | null }> = ({ activeItemId }) => {
  const { notes, addNote, updateNote, deleteNote, loadNoteContent } = useAppStore()
  const [selNoteId, setSelNoteId] = useState<string | null>(activeItemId || null)
  const [loadedContents, setLoadedContents] = useState<Record<string, string>>({})
  const [isContentLoading, setIsContentLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [inputText, setInputText] = useState('')
  const [toastMsg, setToastMsg] = useState('')

  // Auto-select when activeItemId changes
  useEffect(() => {
    if (activeItemId) setSelNoteId(activeItemId)
  }, [activeItemId])

  // Deselect if the selected note is deleted
  const selectedNote = useMemo(() => notes.find(n => n.id === selNoteId) || null, [notes, selNoteId])
  
  useEffect(() => {
    if (selectedNote && selectedNote.hasContentDoc && !loadedContents[selectedNote.id]) {
      setIsContentLoading(true)
      loadNoteContent(selectedNote.id).then(content => {
        if (content !== null) {
          setLoadedContents(prev => ({ ...prev, [selectedNote.id]: content }))
        }
        setIsContentLoading(false)
      })
    } else {
      setIsContentLoading(false)
    }
  }, [selectedNote?.id, selectedNote?.hasContentDoc, loadNoteContent, loadedContents])

  const showToast = (msg: string) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(''), 2000)
  }

  const handleDelete = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    deleteNote(id)
    if (selNoteId === id) setSelNoteId(null)
    showToast('삭제되었습니다')
  }

  const handleAdd = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputText.trim()) {
      const newId = await addNote(inputText.trim())
      if (newId) {
        setInputText('')
        setSelNoteId(newId) // Auto-select the newly created note
      }
    }
  }

  // Generate a short title from the text
  const getTitle = (note: any) => {
    const text = loadedContents[note.id] || note.text || note.textPreview || ''
    const trimmed = text.trim()
    if (!trimmed) return '새로운 메모'
    const firstLine = trimmed.split('\n')[0]
    const stripped = stripHtml(firstLine).trim()
    return stripped.length > 50 ? stripped.substring(0, 50) + '...' : (stripped || '새로운 메모')
  }

  const stripHtml = (html: string) => html.replace(/<[^>]*>?/gm, '')

  const filteredNotes = useMemo(() => {
    let result = notes
    if (searchQuery.trim()) {
      const lowerQ = searchQuery.toLowerCase()
      result = notes.filter(n => {
        const textToSearch = loadedContents[n.id] || n.text || n.textPreview || ''
        return stripHtml(textToSearch).toLowerCase().includes(lowerQ)
      })
    }
    return [...result].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [notes, searchQuery, loadedContents])

  const HighlightText = ({ text, highlight }: { text: string, highlight: string }) => {
    if (!highlight.trim()) return <>{text}</>
    const regex = new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    const parts = text.split(regex)
    const lowerHighlight = highlight.toLowerCase()
    return (
      <>
        {parts.map((part, i) => 
          part.toLowerCase() === lowerHighlight ? <span key={i} style={{ backgroundColor: '#CFE7F4', borderRadius: '2px', padding: '0 2px' }}>{part}</span> : <span key={i}>{part}</span>
        )}
      </>
    )
  }

  return (
    <div className="flex h-full w-full bg-white overflow-hidden">
      {/* ── Left: Note List ────────────────────────────────────────────── */}
      <aside className="w-2/5 border-r border-yuri-100 bg-yuri-50/30 flex flex-col shrink-0 h-full">
        <header className="shrink-0 flex flex-col border-b border-yuri-100 bg-white px-6 py-4 gap-3">
          <h1 className="text-xl font-bold text-yuri-900 tracking-tight">메모</h1>
          <input spellCheck={false}
            type="text"
            placeholder="메모 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-yuri-50 border border-yuri-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-accent transition-colors"
          />
          <div className="border-t border-yuri-100 my-1" />
          <input spellCheck={false}
            type="text"
            placeholder="새 메모 입력 (Enter)"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleAdd}
            className="w-full bg-transparent border-none rounded-none px-1 py-1 text-sm outline-none placeholder:text-accent/60 text-accent font-medium focus:border-b focus:border-accent/30 transition-all"
          />
        </header>

        <div className="flex-1 overflow-hidden p-4 flex flex-col gap-2">
          {filteredNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-yuri-400 p-6 text-center">
              <p className="text-sm">
                {notes.length === 0 ? (
                  <>작성된 메모가 없습니다.<br />아래 입력창에서 바로 기록해보세요!</>
                ) : (
                  <>검색 결과가 없습니다.</>
                )}
              </p>
            </div>
          ) : (
            <Virtuoso
              data={filteredNotes}
              totalCount={filteredNotes.length}
              style={{ height: '100%' }}
              itemContent={(_, note) => {
                const isSelected = selNoteId === note.id
                const d = new Date(note.createdAt)
                const createdAtStr = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
                let updatedAtStr = ''
                if (note.updatedAt) {
                  const u = new Date(note.updatedAt)
                  updatedAtStr = `${u.getFullYear()}.${String(u.getMonth() + 1).padStart(2, '0')}.${String(u.getDate()).padStart(2, '0')} ${String(u.getHours()).padStart(2, '0')}:${String(u.getMinutes()).padStart(2, '0')}`
                }

                return (
                  <div
                    key={note.id}
                    onClick={() => setSelNoteId(note.id)}
                    className={`
                      group p-3 rounded-xl cursor-pointer border transition-all duration-150 relative flex items-start gap-2 mb-2
                      ${isSelected ? 'bg-[#F3F0FF] border-[#F3F0FF] shadow-sm' : 'bg-transparent border-transparent hover:bg-yuri-100/50 hover:border-yuri-200'}
                    `}
                  >
                    <div className="flex-1 min-w-0">
                      <h3 className={`text-sm font-bold truncate ${isSelected ? 'text-yuri-900' : 'text-yuri-800'}`}>
                        <HighlightText text={getTitle(note)} highlight={searchQuery} />
                      </h3>
                      <div className="text-[11px] text-yuri-400 line-clamp-2 leading-relaxed mt-1">
                        <HighlightText 
                          text={(() => {
                            const full = loadedContents[note.id] || note.text || note.textPreview || ''
                            const lines = full.trim().split('\n')
                            const body = lines.length > 1 ? lines.slice(1).join(' ') : lines[0]
                            const stripped = stripHtml(body).trim()
                            return stripped.length > 40 ? stripped.substring(0, 40) + '...' : stripped
                          })()} 
                          highlight={searchQuery} 
                        />
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-0.5 shrink-0 mr-6 mt-0.5">
                      <span className="text-[10px] text-yuri-400">생성일 {createdAtStr}</span>
                      {updatedAtStr && <span className="text-[10px] text-yuri-400">최종 저장 {updatedAtStr}</span>}
                    </div>

                    {/* Delete Button (Hover) */}
                    <button
                      onClick={(e) => handleDelete(note.id, e)}
                      aria-label="메모 삭제"
                      className={`
                        absolute top-3 right-3 w-6 h-6 flex items-center justify-center rounded text-yuri-300
                        opacity-30 group-hover:opacity-100 hover:text-red-400 hover:bg-red-50 transition-all
                        ${isSelected ? 'opacity-100' : ''}
                      `}
                    >
                      ✕
                    </button>
                  </div>
                )
              }}
            />
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
                className="text-sm font-medium text-red-400 hover:text-red-500 hover:bg-red-50 px-3 py-1.5 rounded transition-colors"
              >
                삭제
              </button>
            </header>
            
            <div className="flex-1 overflow-hidden flex flex-col px-8 pb-8 gap-4 mt-2">
              <input spellCheck={false}
                type="text"
                value={(selectedNote.hasContentDoc ? (loadedContents[selectedNote.id] || selectedNote.text) : selectedNote.text).split('\n')[0] || ''}
                onChange={(e) => {
                  const fullText = selectedNote.hasContentDoc ? (loadedContents[selectedNote.id] || selectedNote.text) : selectedNote.text
                  const lines = fullText.split('\n')
                  lines[0] = e.target.value
                  const newText = lines.join('\n')
                  // Also optimistically update local loaded contents
                  if (selectedNote.hasContentDoc) {
                    setLoadedContents(prev => ({ ...prev, [selectedNote.id]: newText }))
                  }
                  updateNote(selectedNote.id, newText)
                }}
                className="text-2xl font-bold bg-transparent outline-none text-yuri-900 placeholder:text-yuri-300 w-full"
                placeholder="메모 제목"
              />
              <div className="text-[11px] text-yuri-300 font-medium px-1">
                ※ 이미지는 메모당 최대 5장까지 첨부할 수 있어요 (Ctrl+V)
              </div>
              <div className="flex-1 overflow-hidden relative">
                {isContentLoading ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
                    <div className="w-8 h-8 border-4 border-yuri-200 border-t-accent rounded-full animate-spin"></div>
                  </div>
                ) : null}
                <RichTextEditor
                  key={selectedNote.id}
                  initialContent={(() => {
                    const fullText = selectedNote.hasContentDoc ? (loadedContents[selectedNote.id] || selectedNote.text) : selectedNote.text;
                    return fullText.split('\n').length > 1 ? fullText.split('\n').slice(1).join('\n') : '';
                  })()}
                  onChange={(html) => {
                    const fullText = selectedNote.hasContentDoc ? (loadedContents[selectedNote.id] || selectedNote.text) : selectedNote.text
                    const lines = fullText.split('\n')
                    const firstLine = lines[0] || ''
                    const newText = firstLine + '\n' + html
                    if (selectedNote.hasContentDoc) {
                      setLoadedContents(prev => ({ ...prev, [selectedNote.id]: newText }))
                    }
                    updateNote(selectedNote.id, newText)
                  }}
                  placeholder="여기에 내용을 작성하세요..."
                />
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-yuri-300">
            <svg className="w-16 h-16 mb-4 text-yuri-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <p className="font-medium">좌측에서 메모를 선택하거나 새로 작성하세요</p>
          </div>
        )}
      </main>

      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-lg text-sm shadow-lg z-50 animate-in fade-in slide-in-from-bottom-2">
          {toastMsg}
        </div>
      )}
    </div>
  )
}

export default NotesPage
