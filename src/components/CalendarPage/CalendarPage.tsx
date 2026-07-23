import React, { useState, useMemo, useEffect } from 'react'
import { useAppStore } from '../../store/AppStore'
import { useDiaryStore } from '../../store/DiaryStore'
import { useMergedHolidays } from '../../hooks/useMergedHolidays'
import DiaryPanel from './DiaryPanel'

// ── Helpers ───────────────────────────────────────────────────────────────────
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const
const MONTH_KO = [
  '1월','2월','3월','4월','5월','6월',
  '7월','8월','9월','10월','11월','12월',
] as const

const EVENT_COLORS = ['#8B7CF8', '#EF6A7B', '#63D2B0', '#F4B73F']
const EVENT_STYLE_MAP: Record<string, { bg: string, text: string, bar: string }> = {
  '#8B7CF8': { bg: 'transparent', text: '#1C1C1E', bar: '#8B7CF8' }, // Purple
  '#EF6A7B': { bg: 'transparent', text: '#1C1C1E', bar: '#EF6A7B' }, // Red
  '#63D2B0': { bg: 'transparent', text: '#1C1C1E', bar: '#63D2B0' }, // Green
  '#F4B73F': { bg: 'transparent', text: '#1C1C1E', bar: '#F4B73F' }, // Yellow
}

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
    toggleTask, deleteTask, deleteEvent, updateEvent,
    addAgenda, toggleAgenda, deleteAgenda,
    addEvent, updateItemOrders, deleteAnniversary, deleteMonthlyEvent,
    navDate, setNavDate
  } = useAppStore()
  
  const { diaries } = useDiaryStore()

  const today = useMemo(() => new Date(), [])
  const [view, setView] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))
  const [selDay, setSelDay] = useState<Date>(today)
  const [isDiaryMode, setIsDiaryMode] = useState(false)
  const [diaryPanelMode, setDiaryPanelMode] = useState<'day' | 'month'>('day')
  
  const [inlineDate, setInlineDate] = useState<Date | null>(null)
  const [inlineText, setInlineText] = useState('')

  const [editingEventId, setEditingEventId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editColor, setEditColor] = useState('')
  const [editDate, setEditDate] = useState('')

  const year  = view.getFullYear()
  const month = view.getMonth()
  const grid  = useMemo(() => buildGrid(year, month), [year, month])
  const mergedHolidays = useMergedHolidays(year)

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
    const holidayInfo = mergedHolidays[dStr]
    if (holidayInfo) {
      items.push(
        <div key="holiday" className="text-[10.5px] shrink-0 h-[18px] px-1 bg-transparent text-[#1C1C1E] rounded-md flex gap-[6px] items-center w-full overflow-hidden">
          <span className="w-1.5 h-1.5 rounded-full bg-[#D45D6E] shrink-0"></span>
          <span className="font-medium truncate leading-none">{holidayInfo.name}</span>
        </div>
      )
    }

    const dayAnnivs = anniversaries.filter(a => {
      if (a.month !== d.getMonth() + 1 || a.day !== d.getDate()) return false
      const createdTime = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const dEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59).getTime()
      return dEnd >= createdTime
    })
    dayAnnivs.forEach(a => {
      items.push(
        <div key={`a-${a.id}`} className="text-[10.5px] shrink-0 h-[18px] px-1 bg-transparent text-[#1C1C1E] rounded-md flex gap-[6px] items-center w-full overflow-hidden">
          <span className="w-1.5 h-1.5 rounded-full bg-[#C96A95] shrink-0"></span>
          <span className="font-medium truncate leading-none">{a.name}</span>
        </div>
      )
    })

    const dayMonthly = monthlyEvents.filter(m => {
      if (m.day !== d.getDate()) return false
      const createdTime = m.createdAt ? new Date(m.createdAt).getTime() : 0
      const dEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59).getTime()
      return dEnd >= createdTime
    })
    dayMonthly.forEach(m => {
      items.push(
        <div key={`m-${m.id}`} className="text-[10.5px] shrink-0 h-[18px] px-1 bg-transparent text-[#1C1C1E] rounded-md flex gap-[6px] items-center w-full overflow-hidden">
          <span className="w-1.5 h-1.5 rounded-full bg-[#3F9E7A] shrink-0"></span>
          <span className="font-medium truncate leading-none">{m.name}</span>
        </div>
      )
    })

    const dayEvents = events.filter(e => isoMatchesDay(eventDisplayDate(e.scheduledDate, e.createdAt), d)).sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return (a.order ?? timeA) - (b.order ?? timeB)
    })
    dayEvents.forEach(e => {
      const eColor = e.color || '#8B7CF8'
      const styleObj = EVENT_STYLE_MAP[eColor] || EVENT_STYLE_MAP['#8B7CF8']
      items.push(
        <div key={`e-${e.id}`} className="text-[10.5px] shrink-0 h-[18px] px-1 rounded-md flex gap-[6px] items-center w-full overflow-hidden box-border" style={{ backgroundColor: styleObj.bg, color: styleObj.text }}>
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: styleObj.bar }}></span>
          <span className="font-medium truncate leading-none block w-full text-left">{e.text}</span>
        </div>
      )
    })

    const isRedDay = (holidayInfo && holidayInfo.isRedDay) || d.getDay() === 0

    return { items, isRedDay, dayAnnivs, dayMonthly, dayEvents }
  }

  const isSelDayToday = sameDay(selDay, today)
  const selDayFormatted = `${selDay.getMonth() + 1}월 ${selDay.getDate()}일 (${WEEKDAYS[selDay.getDay()]})`

  return (
    <div className="flex h-full w-full bg-[#F5F5F7] overflow-hidden">
      {/* ── Left: Main Calendar ────────────────────────────────────────────── */}
      <main className={`flex flex-col p-6 m-4 mr-2 bg-white rounded-2xl border border-[#E5E5EA] shadow-sm relative overflow-hidden ${isDiaryMode ? 'flex-[4]' : 'flex-1'}`}>
        <header className="relative flex items-center justify-between mb-6 z-10 shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center hover:bg-[#F7F6FF] rounded text-[#717A8C] font-bold transition-colors">←</button>
            <button 
              onClick={() => { 
                if (isDiaryMode) {
                  setDiaryPanelMode('month');
                } else {
                  setPickerYear(year); setShowPicker(!showPicker); 
                }
              }}
              className="text-2xl font-semibold text-[#1C1C1E] tracking-tight hover:text-[#8B7CF8] transition-colors flex items-center gap-2"
            >
              {year}년 {MONTH_KO[month]}
              <span className="text-[12px] text-[#717A8C] mt-1">{showPicker ? '▲' : '▼'}</span>
            </button>
            <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center hover:bg-[#F7F6FF] rounded text-[#717A8C] font-bold transition-colors">→</button>
          </div>
          
          <div className="flex items-center gap-2">
            <button onClick={goToToday} className="px-4 py-1.5 bg-white border border-[#E5E5EA] hover:bg-[#F9FAFB] rounded-lg text-sm font-semibold text-[#1C1C1E] shadow-sm transition-all">
              오늘
            </button>
            <button 
              onClick={() => setIsDiaryMode(!isDiaryMode)} 
              className="w-8 h-8 flex items-center justify-center bg-white border border-[#E5E5EA] hover:bg-[#F9FAFB] rounded-lg text-[#F4B73F] shadow-sm transition-all text-lg"
              title={isDiaryMode ? "스케줄 모드로 전환" : "다이어리 모드로 전환"}
            >
              {isDiaryMode ? '★' : '☆'}
            </button>
          </div>

          {showPicker && (
            <div className="absolute top-full left-12 mt-2 w-64 bg-white border border-[#EEF1F6] shadow-float rounded-xl p-4 z-50 animate-fade-in">
              <div className="flex justify-between items-center mb-4 px-2">
                <button onClick={() => setPickerYear(y => y - 1)} className="text-[#717A8C] hover:text-[#2D334A] font-bold p-1">←</button>
                <span className="font-semibold text-[#2D334A]">{pickerYear}년</span>
                <button onClick={() => setPickerYear(y => y + 1)} className="text-[#717A8C] hover:text-[#2D334A] font-bold p-1">→</button>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {MONTH_KO.map((mName, i) => (
                  <button
                    key={i}
                    onClick={() => handleMonthSelect(i)}
                    className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                      pickerYear === year && i === month 
                        ? 'bg-[#8B7CF8] text-white' 
                        : pickerYear === today.getFullYear() && i === today.getMonth()
                          ? 'bg-[#F1EEFF] text-[#8B7CF8] hover:bg-[#E5E0FF]'
                          : 'hover:bg-[#F7F6FF] text-[#717A8C]'
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
          {WEEKDAYS.map((wd, i) => {
            const isSat = i === 6;
            const isSun = i === 0;
            const wdColor = isSun ? 'text-[#EF6A7B]' : isSat ? 'text-[#5C8CFF]' : 'text-[#717A8C]';
            return (
              <div key={i} className={`text-center text-[11px] font-medium py-1 ${wdColor}`}>
                {wd}
              </div>
            );
          })}
        </div>

        <div className="flex-1 grid grid-cols-7 grid-rows-[repeat(6,minmax(0,1fr))] auto-rows-fr gap-2.5 min-h-0">
          {grid.map((date, idx) => {
            if (!date) return <div key={idx} className="bg-transparent" />
            
            const isToday = sameDay(date, today)
            const isSelected = sameDay(date, selDay)
            const { items, isRedDay } = getDayItems(date)

            return (
              <div 
                key={idx} 
                onClick={() => {
                  if (isDiaryMode) {
                    setDiaryPanelMode('day')
                  }
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
                className={`p-3 rounded-[14px] shadow-[0_1px_4px_rgba(0,0,0,0.08)] flex flex-col cursor-pointer transition-all duration-200 min-h-0 overflow-hidden ${isSelected ? 'bg-[#F7F6FF]' : 'bg-[#FFFFFF] hover:bg-[#FCFCFF]'}`}
              >
                <div 
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelDay(date)
                  }}
                  className={`
                  w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-medium self-start mb-1 shrink-0
                  ${isToday ? 'bg-[#8B7CF8] text-[#FFFFFF] shadow-[0_2px_6px_rgba(139,124,248,0.4)]' : isRedDay ? 'text-[#EF6A7B]' : 'text-[#717A8C]'}
                `}>
                  {date.getDate()}
                </div>
                <div className="flex flex-col gap-1 overflow-hidden flex-1 min-h-0">
                  {!isDiaryMode ? (
                    <>
                      {items.slice(0, 2)}
                      {items.length > 2 && (
                        <div className="text-[9px] shrink-0 text-[#A0AABF] font-medium px-1 bg-transparent">+ {items.length - 2}개</div>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-nowrap items-center justify-center gap-0.5 h-full pb-2 overflow-hidden">
                      {(diaries[`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`]?.emojis || []).map((emoji: string, idx: number) => (
                        <span key={idx} className="text-[15px] shrink-0">{emoji}</span>
                      ))}
                    </div>
                  )}
                </div>
                {!isDiaryMode && inlineDate && sameDay(inlineDate, date) && (
                  <div className="mt-0.5 shrink-0" onClick={e => e.stopPropagation()}>
                    <input spellCheck={false}
                      autoFocus
                      type="text"
                      className="w-full text-[10px] bg-white border border-yuri-300 rounded px-1 py-0.5 outline-none shadow-sm focus:border-amber-400 text-yuri-900 box-border"
                      placeholder="일정 입력 (Enter)"
                      value={inlineText}
                      onChange={e => setInlineText(e.target.value)}
                      onBlur={() => {
                        setTimeout(() => {
                          setInlineDate(null)
                          setInlineText('')
                        }, 100)
                      }}
                      onKeyDown={async e => {
                        if (e.nativeEvent.isComposing) return
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          e.stopPropagation()
                          if (inlineText.trim()) {
                            const iso = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), -9, 0)).toISOString()
                            try {
                              await addEvent(inlineText.trim(), iso)
                              setInlineDate(null)
                              setInlineText('')
                            } catch (err) {
                              console.error('Failed to save inline event', err)
                            }
                          } else {
                            setInlineDate(null)
                            setInlineText('')
                          }
                        } else if (e.key === 'Escape') {
                          setInlineDate(null)
                          setInlineText('')
                        }
                      }}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </main>

      {/* ── Right: Unified Panel ────────────────────────────────────────────── */}
      {isDiaryMode ? (
        <DiaryPanel 
          mode={diaryPanelMode} 
          selDay={selDay} 
          year={diaryPanelMode === 'month' ? pickerYear : year} 
          month={diaryPanelMode === 'month' ? month : selDay.getMonth()} 
        />
      ) : (
        <aside className="relative w-[360px] flex flex-col h-full bg-[#F9FAFB] border-l border-[#E5E5EA] shrink-0 overflow-hidden px-6 py-8">
          
          {/* 1. Selected Day Events (Timeline) */}
          <section className="flex flex-col flex-1 min-h-0 mb-6">
          <header className="mb-4 shrink-0">
            <h1 className="text-lg font-semibold text-[#1C1C1E] tracking-tight">
              {isSelDayToday ? `오늘, ${selDayFormatted}` : selDayFormatted}
            </h1>
          </header>
          
          <div className="relative flex-1 min-h-0 overflow-y-auto pr-2 -mr-2">
            {/* Timeline vertical line */}
            {(selectedDayEvents.length > 0 || getDayItems(selDay).dayAnnivs.length > 0 || getDayItems(selDay).dayMonthly.length > 0) && (
              <div className="absolute left-[7.5px] top-2 bottom-2 w-px bg-[#EEF1F6] z-0" />
            )}
            
            {selectedDayEvents.length > 0 || getDayItems(selDay).dayAnnivs.length > 0 || getDayItems(selDay).dayMonthly.length > 0 ? (
              <ul className="flex flex-col gap-2 relative z-10 pb-4">
                
                {getDayItems(selDay).dayAnnivs.map(a => {
                  const isPastDay = new Date(selDay.getFullYear(), selDay.getMonth(), selDay.getDate()).getTime() < new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
                  return (
                    <li key={`sa-${a.id}`} className={`flex items-start gap-3 relative group transition-opacity ${isPastDay ? 'opacity-40' : 'opacity-100'}`}>
                      <div className="relative w-4 flex justify-center shrink-0 mt-1 z-10">
                        <div className="w-2.5 h-2.5 rounded-full border-2 border-[#C96A95] bg-white" />
                      </div>
                      
                      <div className="flex-1 bg-transparent py-0.5 flex gap-2 items-start rounded-lg">
                        <div className="flex-1 flex flex-col">
                          <span className="text-[10px] font-bold text-[#C96A95] mb-0.5">기념일</span>
                          <span className="text-xs text-[#2D334A] font-medium whitespace-pre-wrap leading-relaxed">
                            {a.name}
                          </span>
                        </div>
                        <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => deleteAnniversary(a.id)} className="w-5 h-5 flex items-center justify-center rounded text-[#717A8C] hover:text-[#EF6A7B] text-[10px]">✕</button>
                        </div>
                      </div>
                    </li>
                  );
                })}

                {getDayItems(selDay).dayMonthly.map(m => {
                  const isPastDay = new Date(selDay.getFullYear(), selDay.getMonth(), selDay.getDate()).getTime() < new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
                  return (
                    <li key={`sm-${m.id}`} className={`flex items-start gap-3 relative group transition-opacity ${isPastDay ? 'opacity-40' : 'opacity-100'}`}>
                      <div className="relative w-4 flex justify-center shrink-0 mt-1 z-10">
                        <div className="w-2.5 h-2.5 rounded-full border-2 border-[#3F9E7A] bg-white" />
                      </div>
                      
                      <div className="flex-1 bg-transparent py-0.5 flex gap-2 items-start rounded-lg">
                        <div className="flex-1 flex flex-col">
                          <span className="text-[10px] font-bold text-[#3F9E7A] mb-0.5">매월 반복</span>
                          <span className="text-xs text-[#2D334A] font-medium whitespace-pre-wrap leading-relaxed">
                            {m.name}
                          </span>
                        </div>
                        <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => deleteMonthlyEvent(m.id)} className="w-5 h-5 flex items-center justify-center rounded text-[#717A8C] hover:text-[#EF6A7B] text-[10px]">✕</button>
                        </div>
                      </div>
                    </li>
                  );
                })}
                
                {selectedDayEvents.map((e, index) => {
                  const isEditing = editingEventId === e.id;
                  const eColor = e.color || '#8B7CF8';
                  const styleObj = EVENT_STYLE_MAP[eColor] || EVENT_STYLE_MAP['#8B7CF8'];
                  const dt = new Date(eventDisplayDate(e.scheduledDate, e.createdAt));
                  const isPastDay = new Date(selDay.getFullYear(), selDay.getMonth(), selDay.getDate()).getTime() < new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();

                  const handleSaveEdit = () => {
                    if (editTitle.trim()) {
                      const parts = editDate.split('-');
                      if (parts.length === 3) {
                        const iso = new Date(Date.UTC(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2]), -9, 0)).toISOString();
                        updateEvent(e.id, { text: editTitle.trim(), color: editColor, scheduledDate: iso });
                      }
                    }
                    setEditingEventId(null);
                  };

                  const match = e.text.match(/^((?:0?[0-9]|1[0-9]|2[0-3]):[0-5][0-9](?:\s?(?:AM|PM|am|pm))?)\s*(.*)/i);
                  const timeStr = match ? match[1] : null;
                  const restStr = match ? match[2] : e.text;

                  return (
                    <li key={e.id} className={`flex items-start gap-3 relative group transition-opacity ${isPastDay && !isEditing ? 'opacity-40' : 'opacity-100'}`}>
                      <div className="relative w-4 flex justify-center shrink-0 mt-1.5 z-10">
                        <div className="w-2.5 h-2.5 rounded-full border-2 bg-white" style={{ borderColor: styleObj.bar }} />
                      </div>
                      
                      <div className="flex-1 bg-transparent flex gap-2 items-start py-0.5">
                        {isEditing ? (
                          <div className="flex-1 flex flex-col gap-2 bg-white p-3 rounded-xl border border-[#EEF1F6] shadow-sm" onClick={ev => ev.stopPropagation()}>
                            <input spellCheck={false}
                              autoFocus
                              type="text"
                              value={editTitle}
                              onChange={ev => setEditTitle(ev.target.value)}
                              onKeyDown={ev => {
                                if (ev.nativeEvent.isComposing) return
                                if (ev.key === 'Enter') handleSaveEdit()
                                if (ev.key === 'Escape') setEditingEventId(null)
                              }}
                              className="w-full text-xs outline-none font-medium text-[#2D334A] border-b border-[#EEF1F6] pb-1.5 bg-transparent"
                              placeholder="일정 내용"
                            />
                            <div className="flex justify-between items-center mt-1">
                              <input spellCheck={false} 
                                type="date" 
                                value={editDate}
                                onChange={ev => setEditDate(ev.target.value)}
                                className="text-[10px] text-[#717A8C] outline-none bg-transparent"
                              />
                              <div className="flex gap-1.5">
                                {EVENT_COLORS.map(c => (
                                  <button
                                    key={c}
                                    onClick={() => setEditColor(c)}
                                    className={`w-3.5 h-3.5 rounded-full transition-all ${editColor === c ? 'ring-2 ring-offset-1 scale-110' : 'opacity-70 hover:opacity-100'}`}
                                    style={{ backgroundColor: c, '--tw-ring-color': c } as React.CSSProperties}
                                  />
                                ))}
                              </div>
                            </div>
                            <div className="flex justify-end gap-1.5 mt-2">
                               <button onClick={handleSaveEdit} className="text-[10px] bg-[#8B7CF8] hover:bg-[#7A6AE6] text-white px-2.5 py-1.5 rounded-md transition-colors font-semibold">저장</button>
                               <button onClick={() => setEditingEventId(null)} className="text-[10px] bg-transparent hover:bg-[#F7F6FF] text-[#717A8C] px-2.5 py-1.5 rounded-md transition-colors font-medium">취소</button>
                            </div>
                          </div>
                        ) : (
                          <div 
                            className="flex-1 cursor-pointer group-hover:bg-[#FFFFFF] group-hover:shadow-card px-2 -ml-2 rounded-xl transition-all"
                            onClick={() => {
                              setEditingEventId(e.id);
                              setEditTitle(e.text);
                              setEditColor(eColor);
                              const localYMD = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
                              setEditDate(localYMD);
                            }}
                          >
                            <div className="flex flex-col">
                              {timeStr && <span className="text-[10.5px] font-bold mb-0.5" style={{ color: styleObj.bar }}>{timeStr}</span>}
                              <span className="text-[13px] font-semibold whitespace-pre-wrap leading-relaxed" style={{ color: isPastDay ? '#717A8C' : styleObj.text }}>
                                {restStr}
                              </span>
                            </div>
                          </div>
                        )}
                        
                        {!isEditing && (
                          <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-1">
                            <div className="flex flex-col justify-center gap-0.5 mr-0.5">
                              <button onClick={() => handleMoveEventUp(index)} disabled={index === 0} className="w-4 h-3 flex items-center justify-center text-[#A0AABF] hover:text-[#2D334A] disabled:opacity-30 text-[9px]">▲</button>
                              <button onClick={() => handleMoveEventDown(index)} disabled={index === selectedDayEvents.length - 1} className="w-4 h-3 flex items-center justify-center text-[#A0AABF] hover:text-[#2D334A] disabled:opacity-30 text-[9px]">▼</button>
                            </div>
                            <button onClick={() => deleteEvent(e.id)} className="w-5 h-5 flex items-center justify-center rounded text-[#A0AABF] hover:text-[#EF6A7B] text-[10px]">✕</button>
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-xs text-[#A0AABF] py-2 relative z-10">이 날짜의 일정이 없습니다.</p>
            )}
          </div>
        </section>

        {/* 2. Tasks (Checklist) */}
        <section className="flex flex-col flex-1 min-h-0 mb-6">
          <header className="mb-4 shrink-0 flex justify-between items-end px-1">
            <h2 className="text-[11px] font-bold text-[#717A8C] tracking-widest uppercase">TASKS</h2>
            <span className="text-[10px] font-medium bg-[#EEF1F6] text-[#717A8C] px-2 py-0.5 rounded-full">{activeTasks.length} left</span>
          </header>
          <div className="relative flex-1 min-h-0 overflow-y-auto pr-2 -mr-2">
            {activeTasks.length > 0 ? (
              <ul className="flex flex-col gap-1">
                {activeTasks.map((t, index) => (
                  <li key={t.id} className="flex items-start gap-3 group bg-transparent px-1 py-2 rounded-xl hover:bg-white hover:shadow-card transition-all">
                    <button 
                      onClick={() => toggleTask(t.id)} 
                      className={`w-4 h-4 mt-0.5 rounded-full border-[1.5px] flex items-center justify-center shrink-0 transition-colors ${t.done ? 'bg-[#EEF1F6] border-[#EEF1F6] text-white' : 'border-[#A0AABF] text-transparent hover:border-[#8B7CF8]'}`}
                    >
                      <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                    
                    <div className="flex-1 mt-0.5">
                      <span className={`text-xs font-medium whitespace-pre-wrap leading-relaxed transition-all ${t.done ? 'text-[#D0D4DF] line-through' : 'text-[#1C1C1E]'}`}>
                        {t.text}
                      </span>
                    </div>
                    
                    <div className="flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5">
                      <div className="flex flex-col justify-center gap-0.5 mr-0.5">
                        <button onClick={() => handleMoveTaskUp(index)} disabled={index === 0} className="w-4 h-3 flex items-center justify-center text-[#A0AABF] hover:text-[#2D334A] disabled:opacity-30 text-[9px]">▲</button>
                        <button onClick={() => handleMoveTaskDown(index)} disabled={index === activeTasks.length - 1} className="w-4 h-3 flex items-center justify-center text-[#A0AABF] hover:text-[#2D334A] disabled:opacity-30 text-[9px]">▼</button>
                      </div>
                      <button onClick={() => deleteTask(t.id)} className="w-5 h-5 flex items-center justify-center rounded text-[#A0AABF] hover:text-[#EF6A7B] text-[10px]">✕</button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-[#A0AABF] py-2 px-1">모든 업무를 완료했습니다!</p>
            )}
          </div>
        </section>

        {/* 3. Monthly Agenda (Card Style) */}
        <section className="flex flex-col shrink-0 min-h-[160px] max-h-[40%]">
          <header className="mb-3 flex justify-between items-end px-1 shrink-0">
             <h2 className="text-[11px] font-bold text-[#717A8C] tracking-widest uppercase">MONTHLY MEMO</h2>
          </header>
          
          <div className="flex-1 flex flex-col min-h-0 bg-white rounded-xl border border-[#E5E5EA] shadow-sm relative overflow-hidden">
            {/* Solid left border */}
            <div className="absolute top-0 bottom-0 left-0 w-1.5 bg-[#8B7CF8]" />
            
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <div className="mb-3 flex justify-between items-center">
                <h3 className="text-xs font-bold text-[#8B7CF8] uppercase tracking-wide">MONTHLY MEMO</h3>
              </div>
              
              <ul className="flex flex-col gap-2 pb-1 pl-1">
                {monthAgendas.map(ag => (
                  <li key={ag.id} className="group flex items-start gap-2.5 bg-transparent -mx-1.5 p-1 rounded-lg hover:bg-white/60 transition-colors">
                    <button onClick={() => toggleAgenda(ag.id)} className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 transition-colors ${ag.done ? 'bg-[#D0D4DF]' : 'bg-[#8B7CF8]'}`} />
                    <span className={`flex-1 text-xs leading-relaxed transition-colors ${ag.done ? 'text-[#D0D4DF] line-through' : 'text-[#1C1C1E] font-medium'}`}>{ag.text}</span>
                    <button onClick={() => deleteAgenda(ag.id)} className="w-5 h-5 flex items-center justify-center rounded text-[#A0AABF] hover:text-[#EF6A7B] opacity-0 group-hover:opacity-100 transition-opacity text-[10px] -mt-0.5">
                      ✕
                    </button>
                  </li>
                ))}
                {monthAgendas.length === 0 && (
                  <p className="text-[11px] text-[#A0AABF] py-2">등록된 이달 목표가 없습니다.</p>
                )}
              </ul>
              
              <form onSubmit={handleAddAgenda} className="mt-3 flex gap-2">
                <input spellCheck={false}
                  type="text" placeholder="새 목표 입력..."
                  value={newAgenda} onChange={e => setNewAgenda(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs bg-white border border-[#EEF1F6] rounded-lg outline-none focus:border-[#8B7CF8] text-[#1C1C1E] placeholder:text-[#A0AABF] transition-colors"
                />
              </form>
            </div>
          </div>
        </section>

        </aside>
      )}
    </div>
  )
}

export default CalendarPage
