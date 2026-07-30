import React, { useState, useMemo, useEffect } from 'react'
import { useAppStore } from '../../store/AppStore'
import { Trash2 } from 'lucide-react'
import RichTextEditor from '../common/RichTextEditor'
import { HighlightText } from '../common/HighlightText'
import { DebouncedInput } from '../common/DebouncedInput'
import { isSearchMatch, decodeHtmlEntities } from '../../utils/textUtils'
import type { Task } from '../../types'
import { Virtuoso } from 'react-virtuoso'
import { SortableItem } from '../common/SortableItem'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

const TasksPage: React.FC<{ activeItemId?: string | null }> = ({ activeItemId }) => {
  const { tasks, addTask, toggleTask, updateTaskNote, updateTaskText, deleteTask, updateItemOrders } = useAppStore()
  const [selTaskId, setSelTaskId] = useState<string | null>(activeItemId || null)
  const [toastMsg, setToastMsg] = useState('')

  // Auto-select when activeItemId changes
  useEffect(() => {
    if (activeItemId) setSelTaskId(activeItemId)
  }, [activeItemId])
  
  const [inputText, setInputText] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending')

  const stripHtml = (html: string) => html ? html.replace(/<[^>]*>?/gm, '') : ''

  // Migration: Assign order to tasks that don't have it yet
  useEffect(() => {
    const pendingWithoutOrder = tasks.filter(t => !t.done && t.order === undefined)
    if (pendingWithoutOrder.length > 0) {
      const sortedByTime = tasks.filter(t => !t.done).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      updateItemOrders(sortedByTime.map((t, i) => ({ id: t.id, type: 'task', order: Date.now() + i })))
    }
  }, [tasks, updateItemOrders])

  // Split tasks into pending and completed
  const pendingTasks = useMemo(() => tasks.filter(t => {
    if (t.done) return false
    if (!searchQuery.trim()) return true
    const target = t.searchText || t.text + ' ' + stripHtml(t.note || '')
    return isSearchMatch(target, searchQuery)
  }).sort((a, b) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0
    return (a.order ?? timeA) - (b.order ?? timeB)
  }), [tasks, searchQuery])

  const completedTasks = useMemo(() => tasks.filter(t => {
    if (!t.done) return false
    if (!searchQuery.trim()) return true
    const target = t.searchText || t.text + ' ' + stripHtml(t.note || '')
    return isSearchMatch(target, searchQuery)
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [tasks, searchQuery])

  const selectedTask = useMemo(() => tasks.find(t => t.id === selTaskId) || null, [tasks, selTaskId])

  const showToast = (msg: string) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(''), 2000)
  }

  const submitNewTask = () => {
    if (inputText.trim()) {
      addTask(inputText.trim())
      setInputText('')
    }
  }

  const handleAdd = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') submitNewTask()
  }

  const handleDelete = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    deleteTask(id)
    if (selTaskId === id) setSelTaskId(null)
    showToast('삭제되었습니다')
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )
  const [activeId, setActiveId] = useState<string | null>(null)

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id)
  }

  const handleDragEnd = (event: any) => {
    setActiveId(null)
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = pendingTasks.findIndex(t => t.id === active.id)
    const newIndex = pendingTasks.findIndex(t => t.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    
    const reordered = arrayMove(pendingTasks, oldIndex, newIndex)
    updateItemOrders(reordered.map((t, i) => ({ id: t.id, type: 'task', order: Date.now() + i })))
  }

  return (
    <div className="flex h-full w-full bg-white overflow-hidden">
      {/* ── Left: Task List ────────────────────────────────────────────── */}
      <aside className="w-[40%] border-r border-yuri-100 bg-yuri-50/30 flex flex-col shrink-0 h-full">
        <header className="shrink-0 h-16 border-b border-yuri-100 flex items-center px-6">
          <h1 className="text-xl font-bold text-yuri-900 tracking-tight">업무</h1>
        </header>

        {/* Input box */}
        <div className="p-4 pb-2 shrink-0 flex flex-col gap-3 border-b border-yuri-100 bg-white">
          <input spellCheck={false}
            type="text"
            placeholder="업무 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setSearchQuery('')
            }}
            className="w-full bg-yuri-50 border border-yuri-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-accent transition-colors"
          />
          <div className="border-t border-yuri-100 my-0.5" />
          <div className="relative flex items-center">
            <input spellCheck={false}
              type="text"
              placeholder="새 업무 추가 (Enter)"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleAdd}
              className="w-full bg-transparent border-none rounded-none px-1 py-1 pr-8 text-sm outline-none placeholder:text-accent/60 text-accent font-medium focus:border-b focus:border-accent/30 transition-all"
            />
            <button
              onClick={submitNewTask}
              className="absolute right-1 w-6 h-6 flex items-center justify-center text-accent/60 hover:text-accent transition-colors"
              title="업무 추가"
            >
              +
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex shrink-0 px-4 pt-2 border-b border-yuri-100 gap-4">
            <button 
              onClick={() => setActiveTab('pending')}
              className={`pb-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'pending' ? 'border-accent text-accent' : 'border-transparent text-yuri-400 hover:text-yuri-600'}`}
            >
              진행 중 ({pendingTasks.length})
            </button>
            <button 
              onClick={() => setActiveTab('completed')}
              className={`pb-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'completed' ? 'border-accent text-accent' : 'border-transparent text-yuri-400 hover:text-yuri-600'}`}
            >
              완료됨 ({completedTasks.length})
            </button>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden p-4">
            {activeTab === 'pending' ? (
              <section className="flex-1 min-h-0 flex flex-col overflow-hidden">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                  <div className="flex-1 overflow-y-auto flex flex-col gap-1 pr-1">
                    {pendingTasks.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-yuri-400 p-6 text-center">
                        <p className="text-sm whitespace-pre-wrap">
                          {searchQuery.trim() ? '검색 결과가 없습니다.' : '진행 중인 업무가 없습니다.\n위 입력창에서 바로 추가해보세요!'}
                        </p>
                      </div>
                    ) : (
                      <SortableContext items={pendingTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                        {pendingTasks.map(t => (
                          <SortableItem key={t.id} id={t.id}>
                            {({ attributes, listeners, setNodeRef, style, isDragging }) => (
                              <TaskListItem 
                                innerRef={setNodeRef}
                                style={style}
                                isDragging={isDragging}
                                dragHandleProps={{ ...attributes, ...listeners }}
                                task={t} 
                                isSelected={selTaskId === t.id}
                                onSelect={() => setSelTaskId(t.id)}
                                onToggle={(e) => { e.stopPropagation(); toggleTask(t.id) }}
                                onDelete={(e) => handleDelete(t.id, e)}
                                searchQuery={searchQuery}
                              />
                            )}
                          </SortableItem>
                        ))}
                      </SortableContext>
                    )}
                  </div>
                  <DragOverlay dropAnimation={{ sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.4' } } }) }}>
                    {activeId ? (() => {
                      const activeTask = pendingTasks.find(t => t.id === activeId)
                      if (!activeTask) return null
                      return (
                        <TaskListItem
                          task={activeTask}
                          isSelected={selTaskId === activeTask.id}
                          onSelect={() => {}}
                          onToggle={() => {}}
                          onDelete={() => {}}
                          isDragging={true}
                          dragHandleProps={{}}
                          searchQuery={searchQuery}
                        />
                      )
                    })() : null}
                  </DragOverlay>
                </DndContext>
              </section>
            ) : (
              <section className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <div className="flex-1 overflow-hidden p-1">
                  {completedTasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-yuri-400 p-2 text-center">
                      <p className="text-xs">{searchQuery.trim() ? '검색 결과가 없습니다.' : '완료된 업무가 없습니다.'}</p>
                    </div>
                  ) : (
                    <Virtuoso
                      data={completedTasks}
                      totalCount={completedTasks.length}
                      style={{ height: '100%' }}
                      itemContent={(_, t) => (
                        <div className="mb-1">
                          <TaskListItem 
                            task={t} 
                            isSelected={selTaskId === t.id}
                            onSelect={() => setSelTaskId(t.id)}
                            onToggle={(e) => { e.stopPropagation(); toggleTask(t.id) }}
                            onDelete={(e) => handleDelete(t.id, e)}
                            searchQuery={searchQuery}
                          />
                        </div>
                      )}
                    />
                  )}
                </div>
              </section>
            )}
          </div>
        </div>
      </aside>

      {/* ── Right: Detail Editor ───────────────────────────────────────── */}
      <main className="flex-1 flex flex-col h-full bg-white relative min-w-0">
        {selectedTask ? (
          <>
            <header className="shrink-0 h-16 flex items-center justify-between px-8 border-b border-yuri-100">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <button 
                  onClick={() => toggleTask(selectedTask.id)}
                  className={`w-6 h-6 flex items-center justify-center rounded-md border shrink-0 transition-colors ${selectedTask.done ? 'bg-accent border-accent text-white' : 'border-yuri-300 text-transparent hover:border-accent/50 hover:bg-accent/5'}`}
                >
                  ✓
                </button>
                <div className="flex flex-col flex-1 min-w-0">
                  <DebouncedInput spellCheck={false}
                    type="text"
                    value={selectedTask.text}
                    onChangeValue={(val) => updateTaskText(selectedTask.id, val)}
                    className={`text-base font-bold truncate w-full bg-transparent outline-none focus:border-b focus:border-yuri-300 pb-0.5 placeholder:text-yuri-300 ${selectedTask.done ? 'text-yuri-400 line-through' : 'text-yuri-900'}`}
                    placeholder="업무 제목 입력"
                  />
                  <span className="text-xs text-yuri-400">
                    {new Date(selectedTask.createdAt).toLocaleString('ko-KR', {
                      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </span>
                </div>
              </div>
              <button
                onClick={() => handleDelete(selectedTask.id)}
                className="shrink-0 ml-4 p-2 text-yuri-400 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors flex items-center justify-center"
                title="업무 삭제"
              >
                <Trash2 size={16} />
              </button>
            </header>
            <div className="flex-1 overflow-hidden p-6 pb-2">
              <RichTextEditor
                key={selectedTask.id}
                initialContent={selectedTask.note || ''}
                onChange={(html) => updateTaskNote(selectedTask.id, html)}
                placeholder="여기에 진행 상황이나 메모를 자유롭게 작성하세요..."
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-yuri-50/20">
            <p className="text-yuri-400 text-sm font-medium flex flex-col items-center gap-2">
              <span className="text-2xl">📝</span>
              왼쪽 목록에서 업무를 선택하면 메모를 작성할 수 있습니다.
            </p>
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

interface TaskListItemProps {
  task: Task
  isSelected: boolean
  onSelect: () => void
  onToggle: (e: React.MouseEvent) => void
  onDelete: (e: React.MouseEvent) => void
  isDragging?: boolean
  dragHandleProps?: Record<string, any>
  innerRef?: (node: HTMLElement | null) => void
  style?: React.CSSProperties
  searchQuery: string
}

const TaskListItem: React.FC<TaskListItemProps> = ({ task, isSelected, onSelect, onToggle, onDelete, isDragging, dragHandleProps, innerRef, style, searchQuery }) => {
  const d = new Date(task.createdAt)
  const createdAtStr = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  let updatedAtStr = ''
  if (task.updatedAt) {
    const u = new Date(task.updatedAt)
    updatedAtStr = `${u.getFullYear()}.${String(u.getMonth() + 1).padStart(2, '0')}.${String(u.getDate()).padStart(2, '0')} ${String(u.getHours()).padStart(2, '0')}:${String(u.getMinutes()).padStart(2, '0')}`
  }

  return (
    <div
      ref={innerRef}
      style={style}
      onClick={onSelect}
      className={`
        group flex items-start gap-3 p-3 rounded-xl cursor-pointer border transition-all duration-150 relative
        ${isSelected ? 'bg-white border-yuri-300 shadow-sm' : 'bg-transparent border-transparent hover:bg-yuri-100/50 hover:border-yuri-200'}
        ${isDragging ? 'shadow-card bg-white z-50 opacity-90' : ''}
      `}
    >
      {dragHandleProps && (
        <div 
          {...dragHandleProps}
          className="w-3 shrink-0 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing text-yuri-300 text-[10px] mt-1 transition-opacity outline-none"
        >
          ⠿
        </div>
      )}
      <div 
        onClick={onToggle}
        className={`w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5 border transition-all ${
          task.done ? 'bg-yuri-400 border-yuri-400 text-white' : 'border-yuri-300 text-transparent hover:border-accent/50'
        }`}
      >
        <span className="text-xs">✓</span>
      </div>
      
      <div className="flex-1 min-w-0">
        <h3 className={`text-sm font-semibold truncate ${task.done ? 'text-yuri-400 line-through' : isSelected ? 'text-yuri-900' : 'text-yuri-800'}`}>
          <HighlightText text={task.text} highlight={searchQuery} />
        </h3>
        {task.note && (
          <p className="text-xs text-yuri-400 truncate mt-1.5 line-clamp-1">
            <HighlightText 
              text={(() => {
                const stripped = decodeHtmlEntities(task.note.replace(/<[^>]*>?/gm, '').replace(/\n/g, ' '))
                
                const query = searchQuery.trim().toLowerCase()
                if (!query) {
                  return stripped
                }
                
                const lowerPreview = stripped.toLowerCase()
                const matchIndex = lowerPreview.indexOf(query)
                
                if (matchIndex === -1) {
                  return stripped
                }
                
                const start = Math.max(0, matchIndex - 15)
                const end = Math.min(stripped.length, matchIndex + query.length + 25)
                
                let result = stripped.substring(start, end)
                if (start > 0) result = '...' + result
                if (end < stripped.length) result = result + '...'
                
                return result
              })()} 
              highlight={searchQuery} 
            />
          </p>
        )}
      </div>
      <div className="flex flex-col items-end gap-0.5 mt-0.5 shrink-0 mr-6">
        <span className="text-[10px] text-yuri-400">생성일 {createdAtStr}</span>
        {updatedAtStr && <span className="text-[10px] text-yuri-400">최종 저장 {updatedAtStr}</span>}
      </div>

      <button
        onClick={onDelete}
        aria-label="업무 삭제"
        className={`
          absolute top-3 right-3 w-6 h-6 flex items-center justify-center rounded text-yuri-300
          opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-red-50 transition-all
          ${isSelected ? 'opacity-100' : ''}
        `}
      >
        ✕
      </button>
    </div>
  )
}

export default TasksPage
