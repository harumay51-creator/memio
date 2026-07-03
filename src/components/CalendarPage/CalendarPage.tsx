import React, { useState, useMemo, useEffect } from 'react'
import { useAppStore } from '../../store/AppStore'
import { HOLIDAYS } from '../../utils/holidays'

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
    tasks, events, agendas, anniversaries, monthlyEvents,
    toggleTask, deleteTask, deleteEvent,
    addAgenda, toggleAgenda, deleteAgenda,
    addEvent, updateItemOrders, deleteAnniversary, deleteMonthlyEvent,
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

  // ── 1. Selected Day Events ────────
  const selectedDayEvents = useMemo(() => {
    return events
      .filter(e => isoMatchesDay(eventDisplayDate(e.scheduledDate, e.createdAt), selDay))
      .sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return (a.order ?? timeA) - (b.order ?? timeB)
      })
  }, [events, selDay])

  // ── 2. Active Tasks (Date Independent) ────────
  const activeTasks = useMemo(() => {
    return tasks
      .filter(t => !t.done)
      .sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return (a.order ?? timeA) - (b.order ?? timeB)
      })
  }, [tasks])

  const handleMoveEventUp = (index: number) => {
    if (index === 0) return
    const reordered = [...selectedDayEvents]
    const [item] = reordered.splice(index, 1)
    reordered.splice(index - 1, 0, item)
    updateItemOrders(reordered.map((e, i) => ({ id: e.id, type: 'event', order: Date.now() + i })))
  }

  const handleMoveEventDown = (index: number) => {
    if (index === selectedDayEvents.length - 1) return
    const reordered = [...selectedDayEvents]
    const [item] = reordered.splice(index, 1)
    reordered.splice(index + 1, 0, item)
    updateItemOrders(reordered.map((e, i) => ({ id: e.id, type: 'event', order: Date.now() + i })))
  }

  const handleMoveTaskUp = (index: number) => {
    if (index === 0) return
    const reordered = [...activeTasks]
    const [item] = reordered.splice(index, 1)
    reordered.splice(index - 1, 0, item)
    updateItemOrders(reordered.map((t, i) => ({ id: t.id, type: 'task', order: Date.now() + i })))
  }

  const handleMoveTaskDown = (index: number) => {
    if (index === activeTasks.length - 1) return
    const reordered = [...activeTasks]
    const [item] = reordered.splice(index, 1)
    reordered.splice(index + 1, 0, item)
    updateItemOrders(reordered.map((t, i) => ({ id: t.id, type: 'task', order: Date.now() + i })))
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
    const items: React.ReactNode[] = []

    const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const holidayInfo = HOLIDAYS[dStr]
    if (holidayInfo) {
      items.push(<div key="holiday" className={`text-[10px] px-1.5 py-0.5 rounded-md truncate w-full font-bold ${holidayInfo.isRedDay ? 'text-[#BE123C] bg-[#FFE4E6]' : 'text-[#6D28D9] bg-[#F5F3FF]'}`}>{holidayInfo.name}</div>)
    }

    const dayAnnivs = anniversaries.filter(a => {
      if (a.month !== d.getMonth() + 1 || a.day !== d.getDate()) return false
      const createdTime = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const dEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59).getTime()
      return dEnd >= createdTime
    })
    dayAnnivs.forEach(a => {
      items.push(<div key={`a-${a.id}`} className="text-[10px] text-[#C2410C] bg-[#FFF7ED] px-1.5 py-0.5 rounded-md truncate w-full">🎂 {a.name}</div>)
    })

    const dayMonthly = monthlyEvents.filter(m => {
      if (m.day !== d.getDate()) return false
      const createdTime = m.createdAt ? new Date(m.createdAt).getTime() : 0
      const dEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59).getTime()
      return dEnd >= createdTime
    })
    dayMonthly.forEach(m => {
      items.push(<div key={`m-${m.id}`} className="text-[10px] text-[#0369A1] bg-[#E0F2FE] px-1.5 py-0.5 rounded-md truncate w-full">🔄 {m.name}</div>)
    })

    const dayEvents = events.filter(e => isoMatchesDay(eventDisplayDate(e.scheduledDate, e.createdAt), d)).sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return (a.order ?? timeA) - (b.order ?? timeB)
    })
    dayEvents.forEach(e => {
      items.push(<div key={`e-${e.id}`} className="text-[10px] text-[#6D28D9] bg-[#F5F3FF] px-1.5 py-0.5 rounded-md truncate w-full">{e.text}</div>)
    })

    const isRedDay = (holidayInfo && holidayInfo.isRedDay) || d.getDay() === 0

    return { items, isRedDay, dayAnnivs, dayMonthly, dayEvents }
  }

  const isSelDayToday = sameDay(selDay, today)
  const selDayFormatted = `${selDay.getMonth() + 1}월 ${selDay.getDate()}일 (${WEEKDAYS[selDay.getDay()]})`

  return (
    <div className="flex h-full w-full bg-[#FCFCFE]">
      {/* ── Left: Main Calendar ────────────────────────────────────────────── */}
      <main className="flex-1 border-r border-[#F2F3F7] flex flex-col p-6 overflow-hidden relative">
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
            <div key={i} className="text-center text-[10px] font-bold text-purple-400/80 py-1">
              {wd}
            </div>
          ))}
        </div>

        <div className="flex-1 grid grid-cols-7 grid-rows-[repeat(6,minmax(0,1fr))] auto-rows-fr border-l border-b border-[#F2F3F7]">
          {grid.map((date, idx) => {
            if (!date) return <div key={idx} className="border-t border-r border-[#F2F3F7]" />
            
            const isToday = sameDay(date, today)
            const isSelected = sameDay(date, selDay)
            const { items, isRedDay } = getDayItems(date)

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
                className={`p-1.5 border-t border-r border-[#F2F3F7] flex flex-col cursor-pointer transition-all duration-200 min-h-[100px] ${isSelected ? 'bg-[#F9F8FF]' : 'hover:bg-[#FCFCFE]'}`}
              >
                <div className={`
                  w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold self-start mb-1
                  ${isToday ? 'bg-[#8B7CF8] text-white shadow-sm' : isSelected ? (isRedDay ? 'text-[#BE123C]' : 'text-[#6D28D9]') : (isRedDay ? 'text-[#BE123C]' : 'text-slate-700')}
                `}>
                  {date.getDate()}
                </div>
                <div className="flex flex-col gap-0.5 overflow-hidden flex-1">
                  {items.slice(0, 3)}
                  {items.length > 3 && (
                    <div className="text-[9px] text-yuri-400 font-bold px-1">+ {items.length - 3}개</div>
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
      <aside className="w-[360px] flex flex-col h-full bg-[#FCFCFE] overflow-hidden shrink-0 border-l border-[#F2F3F7] p-4 gap-4">
        
        {/* 1. Selected Day Events */}
        <div className="flex-[3.5] min-h-0 flex flex-col bg-white rounded-2xl border border-[#F2F3F7] shadow-sm overflow-hidden">
          <header className="shrink-0 px-5 pt-5 pb-3">
            <h1 className="text-lg font-extrabold text-yuri-900 tracking-tight">
              {isSelDayToday ? `오늘, ${selDayFormatted}` : selDayFormatted}
            </h1>
          </header>

          <div className="px-5 pb-5 flex-1 overflow-y-auto">
            {selectedDayEvents.length > 0 || getDayItems(selDay).dayAnnivs.length > 0 || getDayItems(selDay).dayMonthly.length > 0 ? (
              <ul className="flex flex-col gap-2 relative before:absolute before:inset-y-3 before:left-[9px] before:w-0.5 before:bg-yuri-100">
                
                {getDayItems(selDay).dayAnnivs.map(a => (
                  <li key={`sa-${a.id}`} className="flex items-start gap-3 relative">
                    <div className="w-5 h-5 rounded-full bg-white border-2 border-[#F2F3F7] flex items-center justify-center z-10 shrink-0 mt-0.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#C2410C]" />
                    </div>
                    
                    <div className="flex-1 bg-white border border-[#F2F3F7] shadow-sm rounded-xl p-2.5 flex gap-2 items-start hover:border-[#FFF7ED] hover:bg-[#FFF7ED] transition-colors group">
                      <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-md tracking-wider bg-[#FFF7ED] text-[#C2410C] mt-0.5">
                        기념일
                      </span>
                      
                      <div className="flex-1">
                        <span className="text-xs text-yuri-900 font-medium whitespace-pre-wrap leading-tight">
                          {a.name}
                        </span>
                      </div>
                      
                      <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => deleteAnniversary(a.id)} className="w-5 h-5 flex items-center justify-center rounded text-yuri-300 hover:text-red-400 hover:bg-red-50 text-[10px]">✕</button>
                      </div>
                    </div>
                  </li>
                ))}

                {getDayItems(selDay).dayMonthly.map(m => (
                  <li key={`sm-${m.id}`} className="flex items-start gap-3 relative">
                    <div className="w-5 h-5 rounded-full bg-white border-2 border-[#F2F3F7] flex items-center justify-center z-10 shrink-0 mt-0.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#0369A1]" />
                    </div>
                    
                    <div className="flex-1 bg-white border border-[#F2F3F7] shadow-sm rounded-xl p-2.5 flex gap-2 items-start hover:border-[#E0F2FE] hover:bg-[#E0F2FE] transition-colors group">
                      <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-md tracking-wider bg-[#E0F2FE] text-[#0369A1] mt-0.5">
                        반복일정
                      </span>
                      
                      <div className="flex-1">
                        <span className="text-xs text-yuri-900 font-medium whitespace-pre-wrap leading-tight">
                          {m.name}
                        </span>
                      </div>
                      
                      <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => deleteMonthlyEvent(m.id)} className="w-5 h-5 flex items-center justify-center rounded text-yuri-300 hover:text-red-400 hover:bg-red-50 text-[10px]">✕</button>
                      </div>
                    </div>
                  </li>
                ))}
                {selectedDayEvents.map((e, index) => (
                  <li key={e.id} className="flex items-start gap-3 relative">
                    <div className="w-5 h-5 rounded-full bg-white border-2 border-[#F2F3F7] flex items-center justify-center z-10 shrink-0 mt-0.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#6D28D9]" />
                    </div>
                    
                    <div className="flex-1 bg-white border border-[#F2F3F7] shadow-sm rounded-xl p-2.5 flex gap-2 items-start hover:border-[#F5F3FF] hover:bg-[#F5F3FF] transition-colors group">
                      <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-md tracking-wider bg-[#F5F3FF] text-[#6D28D9] mt-0.5">
                        일정
                      </span>
                      
                      <div className="flex-1">
                        <span className="text-xs text-yuri-900 font-medium whitespace-pre-wrap leading-tight">
                          {e.text}
                        </span>
                      </div>
                      
                      <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex flex-col mr-1 justify-center gap-0.5">
                          <button onClick={() => handleMoveEventUp(index)} disabled={index === 0} className="w-4 h-3 flex items-center justify-center text-yuri-300 hover:text-yuri-600 disabled:opacity-30 text-[9px]" aria-label="위로 이동">▲</button>
                          <button onClick={() => handleMoveEventDown(index)} disabled={index === selectedDayEvents.length - 1} className="w-4 h-3 flex items-center justify-center text-yuri-300 hover:text-yuri-600 disabled:opacity-30 text-[9px]" aria-label="아래로 이동">▼</button>
                        </div>
                        <button onClick={() => deleteEvent(e.id)} className="w-5 h-5 flex items-center justify-center rounded text-yuri-300 hover:text-red-400 hover:bg-red-50 text-[10px]">✕</button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-yuri-400 bg-yuri-50 rounded-lg p-3 text-center">이 날짜의 일정이 없습니다.</p>
            )}
          </div>
        </div>

        {/* 2. Active Tasks */}
        <div className="flex-[3.5] min-h-0 flex flex-col bg-white rounded-2xl border border-[#F2F3F7] shadow-sm overflow-hidden">
          <header className="shrink-0 px-5 pt-4 pb-2 flex justify-between items-center">
            <h2 className="text-sm font-bold text-yuri-900">진행 중인 업무</h2>
            <span className="text-[9px] font-bold text-yuri-400 bg-yuri-100 px-1.5 py-0.5 rounded">{activeTasks.length}건</span>
          </header>

          <div className="px-5 pb-4 flex-1 overflow-y-auto">
            {activeTasks.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {activeTasks.map((t, index) => (
                  <li key={t.id} className="flex items-start gap-2 bg-white border border-[#F2F3F7] shadow-sm rounded-xl p-2.5 hover:border-[#E2E4EA] transition-colors group">
                    <button onClick={() => toggleTask(t.id)} className="w-4 h-4 mt-0.5 flex items-center justify-center border-2 rounded border-yuri-300 text-transparent hover:border-accent shrink-0">
                      <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                    
                    <div className="flex-1">
                      <span className="text-xs text-yuri-900 font-medium whitespace-pre-wrap leading-tight">
                        {t.text}
                      </span>
                    </div>
                    
                    <div className="flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="flex flex-col mr-1 justify-center gap-0.5">
                        <button onClick={() => handleMoveTaskUp(index)} disabled={index === 0} className="w-4 h-3 flex items-center justify-center text-yuri-300 hover:text-yuri-600 disabled:opacity-30 text-[9px]" aria-label="위로 이동">▲</button>
                        <button onClick={() => handleMoveTaskDown(index)} disabled={index === activeTasks.length - 1} className="w-4 h-3 flex items-center justify-center text-yuri-300 hover:text-yuri-600 disabled:opacity-30 text-[9px]" aria-label="아래로 이동">▼</button>
                      </div>
                      <button onClick={() => deleteTask(t.id)} className="w-5 h-5 flex items-center justify-center rounded text-yuri-300 hover:text-red-400 hover:bg-red-50 text-[10px]">✕</button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-yuri-400 bg-yuri-50 rounded-lg p-3 text-center">모든 업무를 완료했습니다!</p>
            )}
          </div>
        </div>

        {/* 3. Monthly Agenda */}
        <div className="flex-[3] min-h-0 flex flex-col bg-[#FCFCFE] rounded-2xl border border-[#F2F3F7] shadow-sm overflow-hidden">
          <header className="shrink-0 px-5 pt-4 pb-2 flex justify-between items-center bg-white border-b border-[#F2F3F7]">
            <h2 className="text-sm font-bold text-yuri-900">이달 목표</h2>
            <span className="text-[9px] font-bold text-yuri-400 bg-yuri-100 px-1.5 py-0.5 rounded">{monthKey}</span>
          </header>
          
          <div className="flex-1 overflow-y-auto p-5">
            <form onSubmit={handleAddAgenda} className="mb-3 flex gap-2">
              <input
                type="text" placeholder="새 목표 입력..."
                value={newAgenda} onChange={e => setNewAgenda(e.target.value)}
                className="flex-1 px-2.5 py-1.5 text-xs bg-white border border-yuri-200 rounded-lg outline-none focus:border-accent"
              />
              <button type="submit" disabled={!newAgenda.trim()} className="px-3 py-1.5 bg-yuri-900 text-white text-xs font-bold rounded-lg disabled:opacity-50">
                추가
              </button>
            </form>

            <ul className="flex flex-col gap-1.5 px-1 pb-1">
              {monthAgendas.map(ag => (
                <li key={ag.id} className="group flex items-start gap-2 bg-white border border-[#F2F3F7] shadow-sm p-2.5 rounded-xl hover:border-[#E2E4EA] transition-colors">
                  <button onClick={() => toggleAgenda(ag.id)} className={`w-4 h-4 mt-0.5 flex items-center justify-center border-2 rounded shrink-0 ${ag.done ? 'bg-accent border-accent text-white' : 'border-yuri-300 text-transparent hover:border-accent'}`}>
                    <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                  <span className={`flex-1 text-xs leading-tight ${ag.done ? 'text-yuri-400 line-through' : 'text-yuri-900'}`}>{ag.text}</span>
                  <button onClick={() => deleteAgenda(ag.id)} className="w-5 h-5 flex items-center justify-center rounded text-yuri-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity text-[10px]">
                    ✕
                  </button>
                </li>
              ))}
              {monthAgendas.length === 0 && (
                <p className="text-xs text-yuri-400 text-center py-2">등록된 어젠다가 없습니다.</p>
              )}
            </ul>
          </div>
        </div>
      </aside>
    </div>
  )
}

export default CalendarPage
