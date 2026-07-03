import React, { useState, useMemo, useEffect } from 'react'
import { useAppStore } from '../../store/AppStore'

// ── Helpers ───────────────────────────────────────────────────────────────────
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const
const MONTH_KO = [
  '1월','2월','3월','4월','5월','6월',
  '7월','8월','9월','10월','11월','12월',
] as const

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
      && a.getMonth()    === b.getMonth()
      && a.getDate()     === b.getDate()
}

function isoMatchesDay(iso: string, day: Date): boolean {
  return sameDay(new Date(iso), day)
}

function eventDisplayDate(iso: string | undefined, fallback: string): string {
  return iso ?? fallback
}

function buildGrid(year: number, month: number): (Date | null)[] {
  const firstDay  = new Date(year, month, 1)
  const lastDate  = new Date(year, month + 1, 0).getDate()
  const startWeek = firstDay.getDay()

  const grid: (Date | null)[] = Array<null>(startWeek).fill(null)
  for (let d = 1; d <= lastDate; d++) grid.push(new Date(year, month, d))
  while (grid.length < 42) grid.push(null)
  return grid
}

// ── Component ─────────────────────────────────────────────────────────────────
const CalendarPage: React.FC = () => {
  const {
    tasks, events, agendas,
    toggleTask, deleteTask, deleteEvent,
    addAgenda, toggleAgenda, deleteAgenda,
    addEvent, updateItemOrders,
    navDate, setNavDate
  } = useAppStore()

  const today = useMemo(() => new Date(), [])
  const [view, setView] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))
  const [selDay, setSelDay] = useState<Date>(today)
  
  const [inlineDate, setInlineDate] = useState<Date | null>(null)
  const [inlineText, setInlineText] = useState('')

  const year  = view.getFullYear()
  const month = view.getMonth()
  const grid  = useMemo(() => buildGrid(year, month), [year, month])

  const goToToday = () => {
    setView(new Date(today.getFullYear(), today.getMonth(), 1))
    setSelDay(today)
  }

  const prevMonth = () => setView(new Date(year, month - 1, 1))
  const nextMonth = () => setView(new Date(year, month + 1, 1))

  const [showPicker, setShowPicker] = useState(false)
  const [pickerYear, setPickerYear] = useState(year)

  const handleMonthSelect = (m: number) => {
    setView(new Date(pickerYear, m, 1))
    setShowPicker(false)
  }

  useEffect(() => {
    if (navDate) {
      setSelDay(navDate)
      setView(new Date(navDate.getFullYear(), navDate.getMonth(), 1))
      setNavDate(null)
    }
  }, [navDate, setNavDate])

  // ── Unified Timeline for Selected Day ────────
  const timelineItems = useMemo(() => {
    const items: { id: string, type: 'task'|'event', text: string, date: Date, done?: boolean, order?: number }[] = []
    
    tasks.filter(t => isoMatchesDay(t.createdAt, selDay)).forEach(t => {
      items.push({ id: t.id, type: 'task', text: t.text, date: new Date(t.createdAt), done: t.done, order: t.order })
    })
    events.filter(e => isoMatchesDay(eventDisplayDate(e.scheduledDate, e.createdAt), selDay)).forEach(e => {
      items.push({ id: e.id, type: 'event', text: e.text, date: new Date(e.createdAt), order: e.order })
    })

    return items.sort((a, b) => {
      const orderA = a.order ?? a.date.getTime()
      const orderB = b.order ?? b.date.getTime()
      return orderA - orderB
    })
  }, [tasks, events, selDay])

  const [draggedIdx, setDraggedIdx] = useState<number | null>(null)

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIdx(index)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIdx === null || draggedIdx === index) return

    const reordered = [...timelineItems]
    const [draggedItem] = reordered.splice(draggedIdx, 1)
    reordered.splice(index, 0, draggedItem)

    const updates = reordered.map((item, i) => ({
      id: item.id,
      type: item.type,
      order: Date.now() + i
    }))
    updateItemOrders(updates)
    setDraggedIdx(null)
  }

  const handleMoveUp = (index: number) => {
    if (index === 0) return
    const reordered = [...timelineItems]
    const [itemToMove] = reordered.splice(index, 1)
    reordered.splice(index - 1, 0, itemToMove)

    const updates = reordered.map((item, i) => ({
      id: item.id,
      type: item.type,
      order: Date.now() + i
    }))
    updateItemOrders(updates)
  }

  const handleMoveDown = (index: number) => {
    if (index === timelineItems.length - 1) return
    const reordered = [...timelineItems]
    const [itemToMove] = reordered.splice(index, 1)
    reordered.splice(index + 1, 0, itemToMove)

    const updates = reordered.map((item, i) => ({
      id: item.id,
      type: item.type,
      order: Date.now() + i
    }))
    updateItemOrders(updates)
  }

  // ── Monthly Agenda ────────
  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`
  const monthAgendas = useMemo(() => agendas.filter(a => a.monthKey === monthKey), [agendas, monthKey])
  
  const [newAgenda, setNewAgenda] = useState('')
  const handleAddAgenda = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newAgenda.trim()) return
    addAgenda(newAgenda.trim(), monthKey)
    setNewAgenda('')
  }

  // Helper for mini calendar dots & text
  const getDayItems = (d: Date) => {
    const dayEvents = events.filter(e => isoMatchesDay(eventDisplayDate(e.scheduledDate, e.createdAt), d))
    const total = dayEvents.length
    return { dayEvents, total }
  }

  const isSelDayToday = sameDay(selDay, today)
  const selDayFormatted = `${selDay.getMonth() + 1}월 ${selDay.getDate()}일 (${WEEKDAYS[selDay.getDay()]})`

  return (
    <div className="flex h-full w-full bg-yuri-50/10">
      {/* ── Left: Main Calendar ────────────────────────────────────────────── */}
      <main className="flex-1 border-r border-yuri-100 flex flex-col p-6 overflow-hidden relative">
        <header className="relative flex items-center justify-between mb-6 z-10 shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center hover:bg-yuri-100 rounded text-yuri-500 font-bold transition-colors">←</button>
            <button 
              onClick={() => { setPickerYear(year); setShowPicker(!showPicker); }}
              className="text-2xl font-extrabold text-yuri-900 tracking-tight hover:text-accent transition-colors flex items-center gap-2"
            >
              {year}년 {MONTH_KO[month]}
              <span className="text-[12px] text-yuri-400 mt-1">{showPicker ? '▲' : '▼'}</span>
            </button>
            <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center hover:bg-yuri-100 rounded text-yuri-500 font-bold transition-colors">→</button>
          </div>
          
          <button onClick={goToToday} className="px-4 py-2 bg-white border border-yuri-200 hover:border-yuri-300 hover:bg-yuri-50 rounded-lg text-sm font-bold text-yuri-700 transition-all shadow-sm">
            오늘
          </button>

          {showPicker && (
            <div className="absolute top-full left-12 mt-2 w-64 bg-white border border-yuri-200 shadow-xl rounded-xl p-4 z-50 animate-fade-in">
              <div className="flex justify-between items-center mb-4 px-2">
                <button onClick={() => setPickerYear(y => y - 1)} className="text-yuri-400 hover:text-yuri-800 font-bold p-1">←</button>
                <span className="font-bold text-yuri-900">{pickerYear}년</span>
                <button onClick={() => setPickerYear(y => y + 1)} className="text-yuri-400 hover:text-yuri-800 font-bold p-1">→</button>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {MONTH_KO.map((mName, i) => (
                  <button
                    key={i}
                    onClick={() => handleMonthSelect(i)}
                    className={`py-2 rounded-lg text-sm font-bold transition-colors ${
                      pickerYear === year && i === month 
                        ? 'bg-yuri-900 text-white' 
                        : pickerYear === today.getFullYear() && i === today.getMonth()
                          ? 'bg-accent/10 text-accent hover:bg-accent/20'
                          : 'hover:bg-yuri-100 text-yuri-700'
                    }`}
                  >
                    {mName}
                  </button>
                ))}
              </div>
            </div>
          )}
        </header>

        <div className="grid grid-cols-7 mb-2">
          {WEEKDAYS.map((wd, i) => (
            <div key={i} className="text-center text-[10px] font-bold text-yuri-400 py-1">
              {wd}
            </div>
          ))}
        </div>

        <div className="flex-1 grid grid-cols-7 grid-rows-[repeat(6,minmax(0,1fr))] auto-rows-fr border-l border-b border-yuri-200">
          {grid.map((date, idx) => {
            if (!date) return <div key={idx} className="border-t border-r border-yuri-200" />
            
            const isToday = sameDay(date, today)
            const isSelected = sameDay(date, selDay)
            const { dayEvents, total } = getDayItems(date)

            return (
              <div 
                key={idx} 
                onClick={() => {
                  if (inlineDate && !sameDay(inlineDate, date)) {
                    setInlineDate(null)
                    setInlineText('')
                  }
                  setSelDay(date)
                  if (!inlineDate || !sameDay(inlineDate, date)) {
                    setInlineDate(date)
                    setInlineText('')
                  }
                }}
                className={`p-1.5 border-t border-r border-yuri-200 flex flex-col cursor-pointer transition-colors min-h-[100px] ${isSelected ? 'bg-amber-50/50' : 'hover:bg-yuri-50'}`}
              >
                <div className={`
                  w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold self-start mb-1
                  ${isToday ? 'bg-accent text-white shadow-sm' : isSelected ? 'text-amber-700' : 'text-yuri-700'}
                `}>
                  {date.getDate()}
                </div>
                <div className="flex flex-col gap-0.5 overflow-hidden flex-1">
                  {dayEvents.slice(0, 3).map(e => (
                    <div key={e.id} className="text-[10px] text-amber-700 bg-amber-100/50 px-1 rounded truncate w-full">
                      {e.text}
                    </div>
                  ))}
                  {total > 3 && (
                    <div className="text-[9px] text-yuri-400 font-bold px-1">+ {total - 3}개</div>
                  )}
                  {inlineDate && sameDay(inlineDate, date) && (
                    <input
                      autoFocus
                      type="text"
                      className="w-full text-[10px] bg-white border border-yuri-300 rounded px-1 py-0.5 outline-none shadow-sm focus:border-amber-400 mt-0.5 text-yuri-900"
                      placeholder="일정 입력 (Enter)"
                      value={inlineText}
                      onChange={e => setInlineText(e.target.value)}
                      onBlur={() => {
                        // Delay clearing so click can register if needed, though simple UI is just close on blur
                        setTimeout(() => setInlineDate(null), 100)
                      }}
                      onKeyDown={e => {
                        if (e.nativeEvent.isComposing) return
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          e.stopPropagation()
                          if (inlineText.trim()) {
                            const iso = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), -9, 0)).toISOString()
                            console.log('Adding event from Calendar:', inlineText.trim(), iso)
                            addEvent(inlineText.trim(), iso)
                          }
                          setInlineDate(null)
                          setInlineText('')
                        } else if (e.key === 'Escape') {
                          setInlineDate(null)
                          setInlineText('')
                        }
                      }}
                    />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </main>

      {/* ── Right: Timeline & Agenda ─────────────────────────────────────────── */}
      <aside className="w-96 flex flex-col h-full bg-white overflow-hidden shrink-0 border-l border-yuri-100">
        
        {/* 1. Today's Record (Top 60%) */}
        <div className="h-[60%] flex flex-col bg-white overflow-y-auto">
          <header className="shrink-0 px-8 pt-8 pb-4">
            <h1 className="text-2xl font-extrabold text-yuri-900 tracking-tight">
              {isSelDayToday ? `오늘, ${selDayFormatted}` : selDayFormatted}
            </h1>
          </header>

          <div className="px-8 pb-12 flex-1">
            <section>
            {timelineItems.length > 0 ? (
              <ul className="flex flex-col gap-3 relative before:absolute before:inset-y-4 before:left-[11px] before:w-0.5 before:bg-yuri-100">
                {timelineItems.map((item, index) => (
                  <li 
                    key={`${item.type}-${item.id}`} 
                    className={`flex items-start gap-4 relative cursor-grab active:cursor-grabbing ${draggedIdx === index ? 'opacity-50' : ''}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, index)}
                  >
                    <div className="w-6 h-6 rounded-full bg-white border-2 border-yuri-200 flex items-center justify-center z-10 shrink-0 mt-0.5">
                      <div className={`w-2 h-2 rounded-full ${item.type === 'task' ? 'bg-yuri-400' : item.type === 'event' ? 'bg-amber-400' : 'bg-gray-400'}`} />
                    </div>
                    
                    <div className="flex-1 bg-yuri-50/50 border border-yuri-100 rounded-xl p-3 flex gap-3 items-start hover:border-yuri-200 transition-colors group">
                      {/* Badge */}
                      <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wider ${
                        item.type === 'task' ? 'bg-yuri-100 text-yuri-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {item.type === 'task' ? '업무' : '일정'}
                      </span>
                      
                      {/* Content */}
                      <div className="flex-1 pt-0.5">
                        <span className={`text-sm ${item.done ? 'text-yuri-400 line-through' : 'text-yuri-900 font-medium whitespace-pre-wrap'}`}>
                          {item.text}
                        </span>
                      </div>
                      
                      {/* Delete / Toggle Actions */}
                      <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex flex-col mr-1 justify-center gap-0.5">
                          <button onClick={() => handleMoveUp(index)} disabled={index === 0} className="w-4 h-3 flex items-center justify-center text-yuri-300 hover:text-yuri-600 disabled:opacity-30 text-[10px]" aria-label="위로 이동">▲</button>
                          <button onClick={() => handleMoveDown(index)} disabled={index === timelineItems.length - 1} className="w-4 h-3 flex items-center justify-center text-yuri-300 hover:text-yuri-600 disabled:opacity-30 text-[10px]" aria-label="아래로 이동">▼</button>
                        </div>
                        {item.type === 'task' && (
                          <button onClick={() => toggleTask(item.id)} className="w-6 h-6 flex items-center justify-center rounded text-yuri-400 hover:text-accent hover:bg-accent/10">✓</button>
                        )}
                        <button onClick={() => {
                          if (item.type === 'task') deleteTask(item.id)
                          else if (item.type === 'event') deleteEvent(item.id)
                        }} className="w-6 h-6 flex items-center justify-center rounded text-yuri-300 hover:text-red-400 hover:bg-red-50">✕</button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-yuri-400 bg-yuri-50 rounded-xl p-4">이 날짜에 기록된 항목이 없습니다.</p>
            )}
            </section>
          </div>
        </div>

        {/* 2. Monthly Agenda (Bottom 40%) */}
        <div className="h-[40%] flex flex-col border-t border-yuri-100 bg-yuri-50/30">
          <header className="shrink-0 px-6 py-4 border-b border-yuri-100 flex justify-between items-center bg-white">
            <h2 className="text-sm font-bold text-yuri-900">이달 목표</h2>
            <span className="text-[10px] font-bold text-yuri-400 bg-yuri-100 px-1.5 py-0.5 rounded">{monthKey}</span>
          </header>
          
          <div className="flex-1 overflow-y-auto p-6">
            <form onSubmit={handleAddAgenda} className="mb-4 flex gap-2">
              <input
                type="text" placeholder="이번 달 목표나 업무를 기록하세요..."
                value={newAgenda} onChange={e => setNewAgenda(e.target.value)}
                className="flex-1 px-3 py-2 text-sm bg-white border border-yuri-200 rounded-lg outline-none focus:border-accent"
              />
              <button type="submit" disabled={!newAgenda.trim()} className="px-4 py-2 bg-yuri-900 text-white text-sm font-bold rounded-lg disabled:opacity-50">
                추가
              </button>
            </form>

            <ul className="flex flex-col gap-2">
              {monthAgendas.map(ag => (
                <li key={ag.id} className="group flex items-start gap-3 bg-white border border-yuri-100 p-3 rounded-lg hover:border-yuri-200">
                  <button onClick={() => toggleAgenda(ag.id)} className={`w-5 h-5 mt-0.5 flex items-center justify-center border-2 rounded ${ag.done ? 'bg-accent border-accent text-white' : 'border-yuri-300 text-transparent hover:border-accent'}`}>
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                  <span className={`flex-1 text-sm pt-0.5 ${ag.done ? 'text-yuri-400 line-through' : 'text-yuri-900'}`}>{ag.text}</span>
                  <button onClick={() => deleteAgenda(ag.id)} className="w-6 h-6 flex items-center justify-center rounded text-yuri-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity">
                    ✕
                  </button>
                </li>
              ))}
              {monthAgendas.length === 0 && (
                <p className="text-sm text-yuri-400 text-center py-4">등록된 어젠다가 없습니다.</p>
              )}
            </ul>
          </div>
        </div>
      </aside>
    </div>
  )
}

export default CalendarPage
