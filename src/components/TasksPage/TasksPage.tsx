import React, { useState, useMemo, useEffect, KeyboardEvent } from 'react'
import { useAppStore } from '../../store/AppStore'
import RichTextEditor from '../common/RichTextEditor'
import type { Task } from '../../types'

const TasksPage: React.FC<{ activeItemId?: string | null }> = ({ activeItemId }) => {
  const { tasks, addTask, toggleTask, updateTaskNote, updateTaskText, deleteTask } = useAppStore()
  const [selTaskId, setSelTaskId] = useState<string | null>(activeItemId || null)

  // Auto-select when activeItemId changes
  useEffect(() => {
    if (activeItemId) setSelTaskId(activeItemId)
  }, [activeItemId])
  const [inputText, setInputText] = useState('')

  // Split tasks into pending and completed
  const pendingTasks = useMemo(() => tasks.filter(t => !t.done).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [tasks])
  const completedTasks = useMemo(() => tasks.filter(t => t.done).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [tasks])

  const selectedTask = useMemo(() => tasks.find(t => t.id === selTaskId) || null, [tasks, selTaskId])

  const handleAdd = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputText.trim()) {
      addTask(inputText.trim())
      setInputText('')
    }
  }

  const handleDelete = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    deleteTask(id)
    if (selTaskId === id) setSelTaskId(null)
  }

  return (
    <div className="flex h-full w-full bg-white overflow-hidden">
      {/* ── Left: Task List ────────────────────────────────────────────── */}
      <aside className="w-[40%] border-r border-yuri-100 bg-yuri-50/30 flex flex-col shrink-0 h-full">
        <header className="shrink-0 h-16 border-b border-yuri-100 flex items-center px-6">
          <h1 className="text-xl font-bold text-yuri-900 tracking-tight">업무</h1>
        </header>

        {/* Input box */}
        <div className="p-4 pb-2 shrink-0">
          <input
            type="text"
            placeholder="새 업무 추가 (Enter)"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleAdd}
            className="w-full px-4 py-2.5 rounded-xl border border-yuri-200 bg-white outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all text-sm font-medium"
          />
        </div>

        <div className="flex-1 flex flex-col gap-4 p-4 pt-2 min-h-0">
          {/* Pending Tasks */}
          <section className="flex-[7] min-h-0 flex flex-col overflow-hidden">
            <h2 className="shrink-0 text-xs font-bold text-yuri-500 mb-3 px-1 uppercase tracking-wider">진행 중</h2>
            <div className="flex-1 overflow-y-auto flex flex-col gap-1 pr-1">
              {pendingTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-yuri-400 p-6 text-center">
                  <p className="text-sm">진행 중인 업무가 없습니다.<br />위 입력창에서 바로 추가해보세요!</p>
                </div>
              ) : (
                pendingTasks.map(t => (
                  <TaskListItem 
                    key={t.id} 
                    task={t} 
                    isSelected={selTaskId === t.id}
                    onSelect={() => setSelTaskId(t.id)}
                    onToggle={(e) => { e.stopPropagation(); toggleTask(t.id) }}
                    onDelete={(e) => handleDelete(t.id, e)}
                  />
                ))
              )}
            </div>
          </section>

          {/* Completed Tasks */}
          <section className="flex-[3] flex flex-col min-h-0 overflow-hidden pt-4 border-t border-yuri-100">
            <h2 className="shrink-0 text-xs font-bold text-yuri-500 mb-3 px-1 uppercase tracking-wider flex justify-between items-center">
              <span>완료됨 ({completedTasks.length}개)</span>
            </h2>
            <div className="flex-1 overflow-y-auto flex flex-col gap-1 pr-1">
              {completedTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-yuri-400 p-2 text-center">
                  <p className="text-xs">완료된 업무가 없습니다.</p>
                </div>
              ) : (
                completedTasks.map(t => (
                  <TaskListItem 
                    key={t.id} 
                    task={t} 
                    isSelected={selTaskId === t.id}
                    onSelect={() => setSelTaskId(t.id)}
                    onToggle={(e) => { e.stopPropagation(); toggleTask(t.id) }}
                    onDelete={(e) => handleDelete(t.id, e)}
                  />
                ))
              )}
            </div>
          </section>
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
                  <input
                    type="text"
                    value={selectedTask.text}
                    onChange={(e) => updateTaskText(selectedTask.id, e.target.value)}
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
                className="shrink-0 ml-4 p-2 text-yuri-400 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors text-sm font-medium"
              >
                삭제
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
    </div>
  )
}

interface TaskListItemProps {
  task: Task
  isSelected: boolean
  onSelect: () => void
  onToggle: (e: React.MouseEvent) => void
  onDelete: (e: React.MouseEvent) => void
}

const TaskListItem: React.FC<TaskListItemProps> = ({ task, isSelected, onSelect, onToggle, onDelete }) => {
  const d = new Date(task.createdAt)
  const createdAtStr = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  let updatedAtStr = ''
  if (task.updatedAt) {
    const u = new Date(task.updatedAt)
    updatedAtStr = `${u.getFullYear()}.${String(u.getMonth() + 1).padStart(2, '0')}.${String(u.getDate()).padStart(2, '0')} ${String(u.getHours()).padStart(2, '0')}:${String(u.getMinutes()).padStart(2, '0')}`
  }

  return (
    <div
      onClick={onSelect}
      className={`
        group flex items-start gap-3 p-3 rounded-xl cursor-pointer border transition-all duration-150 relative
        ${isSelected ? 'bg-white border-yuri-300 shadow-sm' : 'bg-transparent border-transparent hover:bg-yuri-100/50 hover:border-yuri-200'}
      `}
    >
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
          {task.text}
        </h3>
        {task.note && (
          <p className="text-xs text-yuri-400 truncate mt-1.5 line-clamp-1">{task.note.replace(/<[^>]*>?/gm, '').replace(/\n/g, ' ')}</p>
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
