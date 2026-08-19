import React, { useState, useMemo, useEffect, Suspense, lazy } from 'react'
import { useJournalStore } from '../../store/JournalStore'
import { useAppStore } from '../../store/AppStore'
import { HighlightText } from '../common/HighlightText'
import { EmptyState } from '../common/EmptyState'
import { DebouncedInput } from '../common/DebouncedInput'

const RichTextEditor = lazy(() => import('../common/RichTextEditor'))
import { Lock, Plus, Trash2, ChevronLeft } from 'lucide-react'
import { isSearchMatch, getSearchPreview, decodeHtmlEntities } from '../../utils/textUtils'
import PinScreen from '../JournalPage/PinScreen'
import { Virtuoso } from 'react-virtuoso'
import type { Note } from '../../types'
import { useConfirm } from '../common/ConfirmModal'

export default function MobileJournalPage() {
  const { journals, addJournal, updateJournal, deleteJournal, isLoading, loadJournalContent } = useJournalStore()
  const { isPrivateUnlocked, lockPrivate } = useAppStore()
  const { confirm } = useConfirm()
  
  const [selNoteId, setSelNoteId] = useState<string | null>(null)
  const [loadedContents, setLoadedContents] = useState<Record<string, string>>({})
  const [isContentLoading, setIsContentLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchOpen, setIsSearchOpen] = useState(false)

  // Listen to popstate to close editor
  useEffect(() => {
    if (selNoteId) {
      window.history.pushState({ modal: 'journalEditor' }, '')
      const handlePopState = () => setSelNoteId(null)
      window.addEventListener('popstate', handlePopState)
      return () => window.removeEventListener('popstate', handlePopState)
    }
  }, [selNoteId])

  // Deselect if the selected note is deleted
  const selectedNote = useMemo(() => journals.find(n => n.id === selNoteId) || null, [journals, selNoteId])

  useEffect(() => {
    if (selectedNote && selectedNote.hasContentDoc && !selectedNote.isFullyLoaded && !loadedContents[selectedNote.id]) {
      setIsContentLoading(true)
      loadJournalContent(selectedNote.id).then(content => {
        if (content !== null) {
          setLoadedContents(prev => ({ ...prev, [selectedNote.id]: content }))
        }
        setIsContentLoading(false)
      })
    } else {
      setIsContentLoading(false)
    }
  }, [selectedNote?.id, selectedNote?.hasContentDoc, selectedNote?.isFullyLoaded, loadJournalContent, loadedContents])

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    if (await confirm({ message: '정말 삭제하시겠습니까?', variant: 'danger', confirmText: '삭제' })) {
      deleteJournal(id)
      if (selNoteId === id) {
        if (window.history.state?.modal === 'journalEditor') window.history.back()
        setSelNoteId(null)
      }
    }
  }

  const handleAdd = async () => {
    const newId = await addJournal('')
    setSelNoteId(newId)
  }

  const closeEditor = () => {
    if (window.history.state?.modal === 'journalEditor') {
      window.history.back()
    }
    setSelNoteId(null)
  }

  const stripHtml = (html: string) => decodeHtmlEntities(html.replace(/<[^>]*>?/gm, ''))

  const getTitle = (note: Note) => {
    const text = loadedContents[note.id] || note.text || note.textPreview || ''
    const trimmed = text.trim()
    if (!trimmed) return '새로운 기록'
    const firstLine = trimmed.split('\n')[0]
    const stripped = stripHtml(firstLine).trim()
    return stripped.length > 30 ? stripped.substring(0, 30) + '...' : (stripped || '새로운 기록')
  }

  const getPreview = (note: Note) => {
    const text = loadedContents[note.id] || note.text || note.textPreview || ''
    const trimmed = text.trim()
    if (!trimmed) return '새로운 기록'
    const lines = trimmed.split('\n')
    const previewRaw = lines.length > 1 ? lines.slice(1).join(' ') : lines[0]
    return getSearchPreview(text, searchQuery, previewRaw) || '새로운 기록'
  }

  const filteredNotes = useMemo(() => {
    let result = journals
    if (searchQuery.trim()) {
      result = result.filter(n => {
        const target = n.searchText || n.text || n.textPreview || ''
        return isSearchMatch(target, searchQuery)
      })
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
    <div className="flex flex-col h-full bg-yuri-50 relative overflow-hidden">
      {/* Header */}
      <header className="shrink-0 h-14 flex items-center justify-between px-4 bg-white border-b border-yuri-100 z-10 shadow-sm">
        <h1 className="text-lg font-bold text-yuri-900 flex items-center gap-2">
          개인 기록 <Lock size={16} className="text-yuri-300" />
        </h1>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className={`p-2 rounded-full transition-colors ${isSearchOpen || searchQuery ? 'bg-accent/10 text-accent' : 'text-yuri-400 hover:text-accent hover:bg-yuri-50'}`}
          >
            <span className="text-xl leading-none">🔍</span>
          </button>
          <button
            onClick={handleAdd}
            className="p-2 text-yuri-400 hover:text-yuri-600 rounded-full hover:bg-yuri-50 transition-colors"
          >
            <Plus size={20} />
          </button>
          <button
            onClick={lockPrivate}
            className="p-2 text-yuri-400 hover:text-yuri-600 rounded-full hover:bg-yuri-50 transition-colors"
          >
            <Lock size={20} />
          </button>
        </div>
      </header>

      {/* Search Bar */}
      {isSearchOpen && (
        <div className="px-4 py-3 bg-white border-b border-yuri-100 flex items-center gap-2 shrink-0">
          <input 
            type="text"
            autoFocus
            placeholder="기록 검색..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Escape') {
                setSearchQuery('')
                setIsSearchOpen(false)
              }
            }}
            className="flex-1 bg-yuri-50 border-none rounded-xl px-4 py-2 text-sm text-yuri-900 outline-none focus:ring-2 focus:ring-accent/20"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="p-2 text-yuri-400 hover:text-yuri-600">
              ✕
            </button>
          )}
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-hidden">
        {filteredNotes.length === 0 ? (
          <div className="flex flex-col h-full items-center justify-center text-yuri-400">
            <EmptyState message={searchQuery ? '검색 결과가 없습니다.' : '작성된 기록이 없습니다.'} />
          </div>
        ) : (
          <Virtuoso
            data={filteredNotes}
            style={{ height: '100%' }}
            itemContent={(_index, note) => {
              const d = new Date(note.createdAt)
              const timeStr = d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
              const dateStr = d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })

              return (
                <div 
                  onClick={() => setSelNoteId(note.id)}
                  className="px-4 py-3 bg-white border-b border-yuri-100 hover:bg-yuri-50 active:bg-yuri-100 transition-colors cursor-pointer group"
                >
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="text-sm font-bold text-yuri-900 truncate pr-4">
                      {searchQuery ? <HighlightText text={getTitle(note)} highlight={searchQuery} /> : getTitle(note)}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold text-yuri-400 shrink-0 bg-yuri-50 px-1.5 py-0.5 rounded">
                        {dateStr} {timeStr}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-yuri-500 line-clamp-2 leading-relaxed h-8">
                    {searchQuery ? <HighlightText text={getPreview(note)} highlight={searchQuery} /> : getPreview(note)}
                  </div>
                </div>
              )
            }}
          />
        )}
      </div>


      {/* Full Screen Editor overlay */}
      {selNoteId && selectedNote && (
        <div className="absolute inset-0 z-50 flex flex-col bg-white animate-in slide-in-from-right-full duration-300">
          <header className="shrink-0 h-14 flex items-center justify-between px-2 border-b border-yuri-100 bg-white shadow-sm">
            <button 
              onClick={closeEditor}
              className="p-2 text-yuri-500 hover:text-accent rounded-full hover:bg-yuri-50 transition-colors flex items-center gap-1"
            >
              <ChevronLeft size={24} />
              <span className="text-sm font-bold">목록</span>
            </button>
            <div className="flex items-center pr-2">
              <button 
                onClick={(e) => handleDelete(selectedNote.id, e)}
                className="p-2 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
              >
                <Trash2 size={20} />
              </button>
            </div>
          </header>
          <div className="flex-1 relative overflow-hidden flex flex-col p-4 bg-white">
            {isContentLoading ? (
              <div className="flex h-full items-center justify-center">
                <div className="animate-pulse text-yuri-300 font-medium">로딩 중...</div>
              </div>
            ) : (
              <>
                <DebouncedInput spellCheck={false}
                  type="text"
                  value={(selectedNote.hasContentDoc ? (loadedContents[selectedNote.id] || selectedNote.text) : selectedNote.text).split('\n')[0] || ''}
                  onChangeValue={(val) => {
                    const fullText = selectedNote.hasContentDoc ? (loadedContents[selectedNote.id] || selectedNote.text) : selectedNote.text
                    const lines = fullText.split('\n')
                    lines[0] = val
                    const newText = lines.join('\n')
                    if (selectedNote.hasContentDoc) {
                      setLoadedContents(prev => ({ ...prev, [selectedNote.id]: newText }))
                    }
                    updateJournal(selectedNote.id, newText)
                  }}
                  className="text-xl font-bold bg-transparent outline-none text-yuri-900 placeholder:text-yuri-300 w-full px-1 mb-2"
                  placeholder="제목"
                />
                <div className="flex-1 overflow-hidden relative">
                  <Suspense fallback={<div className="w-full h-full animate-pulse bg-yuri-50 rounded-xl" />}>
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
                        updateJournal(selectedNote.id, newText)
                      }}
                      placeholder="내용을 입력하세요..."
                      className="h-full bg-transparent overflow-y-auto"
                    />
                  </Suspense>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
