import React, { useState, useMemo, useEffect } from 'react'
import { useAppStore } from '../../store/AppStore'
import { useDiaryStore } from '../../store/DiaryStore'
import { useMergedHolidays } from '../../hooks/useMergedHolidays'
import { calculateHolidays } from '../../utils/holidays'
import Emoji from '../common/Emoji'
import DiaryPanel from './DiaryPanel'
import DiarySearchPanel from './DiarySearchPanel'
import MonthNavigationBar from '../common/MonthNavigationBar'
import { RetroWindow } from '../common/Y2KTheme'
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

// ── Helpers ───────────────────────────────────────────────────────────────────
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const
const MONTH_KO = [
  '1월','2월','3월','4월','5월','6월',
  '7월','8월','9월','10월','11월','12월',
] as const

const EVENT_COLORS = ['#8B7CF8', '#F4B73F', '#63D2B0', '#EF6A7B']
const EVENT_STYLE_MAP: Record<string, { bg: string, text: string, bar: string, label: string }> = {
  '#8B7CF8': { bg: '#F3F1FF', text: '#5B4FCF', bar: '#8B7CF8', label: '회의' }, // Purple
  '#F4B73F': { bg: '#FFF8E5', text: '#3D3833', bar: '#F4B73F', label: '메모' }, // Yellow
  '#63D2B0': { bg: '#EAF4F0', text: '#2E795B', bar: '#63D2B0', label: '개인' }, // Green
  '#EF6A7B': { bg: '#FFF0F0', text: '#D45D6E', bar: '#EF6A7B', label: '중요' }, // Red
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
    tasks, events, agendas, anniversaries, monthlyEvents, recurringInstances,
    toggleTask, deleteTask, deleteEvent, updateEvent,
    addAgenda, toggleAgenda, deleteAgenda,
    addEvent, updateItemOrders, deleteRecurringOccurrence,
    navDate, setNavDate
  } = useAppStore()
  
  const { diaries, settings, isDiaryMode, setIsDiaryMode } = useDiaryStore()

  const today = useMemo(() => new Date(), [])
  const [view, setView] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))
  const [selDay, setSelDay] = useState<Date>(today)
  const [diaryPanelMode, setDiaryPanelMode] = useState<'day' | 'month'>('day')
  const [isDiarySearchOpen, setIsDiarySearchOpen] = useState(false)
  
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

  const allHolidays = useMemo(() => {
    return {
      ...calculateHolidays(year - 1),
      ...calculateHolidays(year),
      ...calculateHolidays(year + 1),
      ...mergedHolidays
    }
  }, [year, mergedHolidays])

  const adjustedMonthlyEvents = useMemo(() => {
    const adjusted = new Map<string, typeof monthlyEvents>()
    
    const isWorkingDay = (dt: Date) => {
      const w = dt.getDay()
      if (w === 0 || w === 6) return false
      const ds = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
      if (allHolidays[ds]?.isRedDay) return false
      return true
    }

    const calcAdjusted = (y: number, m: number, ev: typeof monthlyEvents[0]) => {
      const lastDate = new Date(y, m + 1, 0).getDate()
      let target = Math.min(ev.day, lastDate)
      let dt = new Date(y, m, target)
      
      let safety = 0
      while (!isWorkingDay(dt) && safety < 30) {
        if (ev.day === 1) {
          dt.setDate(dt.getDate() + 1)
        } else {
          dt.setDate(dt.getDate() - 1)
        }
        safety++
      }
      return dt
    }

    const addForMonth = (y: number, m: number) => {
      monthlyEvents.forEach(ev => {
        const dt = calcAdjusted(y, m, ev)
        const dtStr = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
        if (!adjusted.has(dtStr)) adjusted.set(dtStr, [])
        adjusted.get(dtStr)!.push(ev)
      })
    }

    let prevY = year, prevM = month - 1
    if (prevM < 0) { prevM = 11; prevY-- }
    addForMonth(prevY, prevM)

    addForMonth(year, month)

    let nextY = year, nextM = month + 1
    if (nextM > 11) { nextM = 0; nextY++ }
    addForMonth(nextY, nextM)

    return adjusted
  }, [monthlyEvents, year, month, allHolidays])

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

    const activeIsEvent = selectedDayEvents.some(e => e.id === active.id)
    const activeIsTask = activeTasks.some(t => t.id === active.id)

    if (activeIsEvent) {
      const oldIndex = selectedDayEvents.findIndex(e => e.id === active.id)
      const newIndex = selectedDayEvents.findIndex(e => e.id === over.id)
      if (oldIndex === -1 || newIndex === -1) return
      const reordered = arrayMove(selectedDayEvents, oldIndex, newIndex)
      updateItemOrders(reordered.map((e, i) => ({ id: e.id, type: 'event', order: Date.now() + i })))
    } else if (activeIsTask) {
      const oldIndex = activeTasks.findIndex(t => t.id === active.id)
      const newIndex = activeTasks.findIndex(t => t.id === over.id)
      if (oldIndex === -1 || newIndex === -1) return
      const reordered = arrayMove(activeTasks, oldIndex, newIndex)
      updateItemOrders(reordered.map((t, i) => ({ id: t.id, type: 'task', order: Date.now() + i })))
    }
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

    const isPastCell = d.getTime() < new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()).getTime()
    const cellTextColor = isPastCell ? 'text-[#A3A3A3]' : 'text-[#1C1C1E]'

    const dayAnnivs: { id: string, name: string, isVirtual?: boolean, instanceId?: string }[] = []
    recurringInstances.filter(inst => inst.date === dStr && inst.sourceType === 'yearly' && inst.status === 'materialized').forEach(inst => {
      dayAnnivs.push({ id: inst.sourceRuleId, name: inst.name, instanceId: inst.id })
    })
    anniversaries.forEach(a => {
      if (a.month !== d.getMonth() + 1 || a.day !== d.getDate()) return
      const createdTime = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const dEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59).getTime()
      if (dEnd >= createdTime) {
        const existing = recurringInstances.find(inst => inst.sourceRuleId === a.id && inst.date === dStr)
        if (!existing) {
          dayAnnivs.push({ id: a.id, name: a.name, isVirtual: true })
        }
      }
    })

    dayAnnivs.forEach(a => {
      items.push(
        <div key={`a-${a.id}`} className={`text-[10.5px] shrink-0 h-[18px] px-1 bg-transparent rounded-md flex gap-[6px] items-center w-full overflow-hidden ${cellTextColor}`}>
          <span className="text-[11px] font-bold shrink-0 text-[#B4629C]">↻</span>
          <span className="font-medium truncate leading-none">{a.name}</span>
        </div>
      )
    })

    const dayMonthly: { id: string, name: string, isVirtual?: boolean, instanceId?: string }[] = []
    recurringInstances.filter(inst => inst.date === dStr && inst.sourceType === 'monthly' && inst.status === 'materialized').forEach(inst => {
      dayMonthly.push({ id: inst.sourceRuleId, name: inst.name, instanceId: inst.id })
    })
    const rawMonthly = adjustedMonthlyEvents.get(dStr) || []
    rawMonthly.forEach(m => {
      const createdTime = m.createdAt ? new Date(m.createdAt).getTime() : 0
      const dEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59).getTime()
      if (dEnd >= createdTime) {
        const existing = recurringInstances.find(inst => inst.sourceRuleId === m.id && inst.date === dStr)
        if (!existing) {
          dayMonthly.push({ id: m.id, name: m.name, isVirtual: true })
        }
      }
    })

    dayMonthly.forEach(m => {
      items.push(
        <div key={`m-${m.id}`} className={`text-[10.5px] shrink-0 h-[18px] px-1 bg-transparent rounded-md flex gap-[6px] items-center w-full overflow-hidden ${cellTextColor}`}>
          <span className="text-[11px] font-bold shrink-0 text-[#3A4B8C]">↻</span>
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
        <div key={`e-${e.id}`} className={`text-[10px] shrink-0 h-auto py-0.5 px-1.5 rounded-sm flex gap-[4px] items-center w-full overflow-hidden box-border ${isPastCell ? 'opacity-60' : ''}`} style={{ backgroundColor: styleObj.bg, color: styleObj.text }}>
          <span className="font-medium truncate leading-snug block w-full text-left">{e.text}</span>
        </div>
      )
    })

    const isRedDay = (holidayInfo && holidayInfo.isRedDay) || d.getDay() === 0

    return { items, isRedDay, dayAnnivs, dayMonthly, dayEvents }
  }

  const isSelDayToday = sameDay(selDay, today)
  const selDayFormatted = `${selDay.getMonth() + 1}월 ${selDay.getDate()}일 (${WEEKDAYS[selDay.getDay()]})`
  const isAurora = settings.theme === 'aurora'
  const isY2K = settings.theme === 'y2k'

  return (
    <div className={`flex h-full w-full relative overflow-hidden ${isDiaryMode && isY2K ? 'bg-transparent' : 'bg-transparent'}`}>
      
      <div className="relative z-10 flex h-full w-full">
        {/* ── Left: Main Calendar ────────────────────────────────────────────── */}
        {(() => {
          const Wrapper = isDiaryMode && isY2K ? RetroWindow : 'div';
          const wrapperProps = isDiaryMode && isY2K 
            ? { title: 'Calendar.exe', className: 'flex-[4] m-4 mr-2' } 
            : { className: `flex flex-col m-4 mr-2 relative overflow-hidden ${isAurora && isDiaryMode ? 'glass-card-refined' : 'bg-white rounded-2xl border border-[#E5E5EA] shadow-sm'} ${isDiaryMode ? 'flex-[4]' : 'flex-1'}` };
          
          return (
            <Wrapper {...wrapperProps}>
              <main className={isDiaryMode && isY2K ? 'flex flex-col p-6 h-full relative overflow-hidden bg-transparent' : 'flex flex-col h-full p-6 relative overflow-hidden'}>
                <header className="relative flex flex-col w-full mb-6 z-10 shrink-0">
                  <MonthNavigationBar
                    year={year}
                    monthName={MONTH_KO[month]}
                    onPrev={prevMonth}
                    onNext={nextMonth}
                    onDateClick={() => { 
                      if (isDiaryMode) {
                        setDiaryPanelMode('month');
                      } else {
                        setPickerYear(year); setShowPicker(!showPicker); 
                      }
                    }}
                    isDatePickerOpen={showPicker}
                    rightActions={
                      <>
                        <button 
                          onClick={goToToday} 
                          className="h-9 px-4 flex items-center justify-center rounded-full text-sm font-semibold text-[#494552] transition-colors hover:bg-[#8B7CF8]/10 hover:text-[#8B7CF8]"
                        >
                          오늘
                        </button>
                        <button 
                          onClick={() => setIsDiaryMode(!isDiaryMode)} 
                          className="w-9 h-9 flex items-center justify-center rounded-full text-[#F4B73F] transition-colors hover:bg-[#8B7CF8]/10 text-lg"
                          title={isDiaryMode ? "스케줄 모드로 전환" : "다이어리 모드로 전환"}
                        >
                          {isDiaryMode ? '★' : '☆'}
                        </button>
                        {isDiaryMode && (
                          <button 
                            onClick={() => setIsDiarySearchOpen(!isDiarySearchOpen)} 
                            className="w-9 h-9 flex items-center justify-center rounded-full text-[#494552] transition-colors hover:bg-[#8B7CF8]/10 text-sm"
                            title="다이어리 검색"
                          >
                            🔍
                          </button>
                        )}
                      </>
                    }
                  />

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

            const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            const diaryEntry = diaries[dateStr];
            const hasDiaryRecord = diaryEntry && (
              (diaryEntry.emojis?.length || 0) > 0 || 
              (diaryEntry.answers || []).some(a => a.answer.trim().length > 0) || 
              (diaryEntry.memos?.length || 0) > 0
            );

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
                className={`p-3 flex flex-col cursor-pointer transition-all duration-200 min-h-0 overflow-visible ${isDiaryMode ? 'rounded-[20px]' : 'rounded-[14px]'} ${
                  isDiaryMode && isY2K
                    ? isSelected
                      ? 'bg-white/60 border border-white/80 shadow-[0_4px_16px_rgba(213,186,255,0.6)]'
                      : hasDiaryRecord
                        ? 'bg-white/30 hover:bg-white/50 border border-white/60 shadow-sm'
                        : 'bg-white/10 hover:bg-white/30 border border-white/30'
                    : isAurora && isDiaryMode
                      ? isSelected
                        ? 'bg-white/40 border border-white/40 shadow-[0_4px_16px_rgba(31,38,135,0.07)]'
                        : hasDiaryRecord
                          ? 'bg-[#D8D4F0]/30 hover:bg-[#D8D4F0]/40 border border-[#D8D4F0]/50'
                          : 'bg-white/10 hover:bg-white/30 border-white/20'
                      : isDiaryMode
                        ? isSelected
                          ? 'bg-[#D8D4F0]/40 shadow-[0_1px_4px_rgba(0,0,0,0.08)] border border-[#D8D4F0]/50'
                          : hasDiaryRecord
                            ? 'bg-[#D8D4F0]/20 hover:bg-[#D8D4F0]/30 shadow-sm border border-[#D8D4F0]/50'
                            : 'bg-[#FFFFFF] hover:bg-[#FCFCFF] shadow-[0_1px_4px_rgba(0,0,0,0.05)] border border-transparent'
                        : isSelected 
                          ? 'bg-[#F7F6FF] shadow-[0_1px_4px_rgba(0,0,0,0.08)]' 
                          : isRedDay || date.getDay() === 6
                            ? 'bg-[#FBF3F3] hover:bg-[#F5EAEA] shadow-[0_1px_4px_rgba(0,0,0,0.05)] border border-transparent'
                            : 'bg-[#FFFFFF] hover:bg-[#FCFCFF] shadow-[0_1px_4px_rgba(0,0,0,0.08)]'
                }`}
              >
                <div 
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelDay(date)
                  }}
                  className={`
                  w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-medium self-start mb-1 shrink-0
                  ${
                    isToday ? 'bg-[#8B7CF8] text-[#FFFFFF] shadow-[0_2px_6px_rgba(139,124,248,0.4)]' : 
                    isY2K && isDiaryMode 
                      ? isRedDay ? 'text-[#ff8ca1] drop-shadow-[0_1px_1px_rgba(138,99,210,0.4)]' : 'text-white drop-shadow-[0_1px_2px_rgba(138,99,210,0.8)]'
                      : isRedDay && isDiaryMode ? 'text-[#EF6A7B]' : 'text-[#717A8C]'
                  }
                `}>
                  {date.getDate()}
                </div>
                <div className="flex flex-col gap-1 overflow-hidden flex-1 min-h-0">
                  {!isDiaryMode ? (
                    <>
                      {items.slice(0, 2)}
                    </>
                  ) : (
                    <div className="flex flex-nowrap items-center justify-center gap-0.5 h-full pb-2 overflow-hidden">
                      {(diaries[`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`]?.emojis || []).map((emoji: string, idx: number) => (
                        <Emoji key={idx} emoji={emoji} className="w-3.5 h-3.5 shrink-0" />
                      ))}
                    </div>
                  )}
                </div>
                {!isDiaryMode && items.length > 2 && (
                  <div className="text-[10px] shrink-0 text-gray-600 bg-gray-100 font-bold px-1.5 py-0.5 rounded-full inline-flex items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors mt-0.5 w-fit whitespace-nowrap self-start relative z-10">+ {items.length - 2}개 더보기</div>
                )}
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
            </Wrapper>
          )
        })()}

      {/* ── Right: Unified Panel ────────────────────────────────────────────── */}
      {isDiaryMode ? (
        isDiarySearchOpen ? (
          <DiarySearchPanel 
            onResultClick={(dateKey) => {
              const d = new Date(dateKey)
              setView(new Date(d.getFullYear(), d.getMonth(), 1))
              setSelDay(d)
              setDiaryPanelMode('day')
              setIsDiarySearchOpen(false)
            }}
            onClose={() => setIsDiarySearchOpen(false)}
          />
        ) : (
          <DiaryPanel 
            mode={diaryPanelMode} 
            selDay={selDay} 
            year={diaryPanelMode === 'month' ? pickerYear : year} 
            month={diaryPanelMode === 'month' ? month : selDay.getMonth()} 
          />
        )
      ) : (
        <aside className="relative w-[360px] flex flex-col h-full bg-[#F9FAFB] border-l border-[#E5E5EA] shrink-0 overflow-hidden px-6 py-8">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>

          
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
                    <li key={`sa-${a.id}`} className={`flex items-start gap-3 relative group transition-opacity opacity-100`}>
                      <div className="relative w-4 flex justify-center shrink-0 mt-1 z-10">
                        <span className="text-sm font-bold text-[#B4629C]">↻</span>
                      </div>
                      
                      <div className="flex-1 bg-transparent py-0.5 flex gap-2 items-start rounded-lg">
                        <div className="flex-1 flex flex-col">
                          <span className={`text-[10px] font-bold mb-0.5 ${isPastDay ? 'text-[#B4629C]' : 'text-[#B4629C]'}`}>매년 반복 (기념일)</span>
                          <span className={`text-xs font-medium whitespace-pre-wrap leading-relaxed ${isPastDay ? 'text-[#A3A3A3]' : 'text-[#2D334A]'}`}>
                            {a.name}
                          </span>
                        </div>
                        <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => {
                            const dStr = `${selDay.getFullYear()}-${String(selDay.getMonth() + 1).padStart(2, '0')}-${String(selDay.getDate()).padStart(2, '0')}`
                            deleteRecurringOccurrence(a.id, 'yearly', a.name, dStr, a.instanceId)
                          }} className="w-5 h-5 flex items-center justify-center rounded text-[#717A8C] hover:text-[#EF6A7B] text-[10px]">✕</button>
                        </div>
                      </div>
                    </li>
                  );
                })}

                {getDayItems(selDay).dayMonthly.map(m => {
                  const isPastDay = new Date(selDay.getFullYear(), selDay.getMonth(), selDay.getDate()).getTime() < new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
                  return (
                    <li key={`sm-${m.id}`} className={`flex items-start gap-3 relative group transition-opacity opacity-100`}>
                      <div className="relative w-4 flex justify-center shrink-0 mt-1 z-10">
                        <span className="text-sm font-bold text-[#3A4B8C]">↻</span>
                      </div>
                      
                      <div className="flex-1 bg-transparent py-0.5 flex gap-2 items-start rounded-lg">
                        <div className="flex-1 flex flex-col">
                          <span className={`text-[10px] font-bold mb-0.5 ${isPastDay ? 'text-[#3A4B8C]' : 'text-[#3A4B8C]'}`}>매월 반복</span>
                          <span className={`text-xs font-medium whitespace-pre-wrap leading-relaxed ${isPastDay ? 'text-[#A3A3A3]' : 'text-[#2D334A]'}`}>
                            {m.name}
                          </span>
                        </div>
                        <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => {
                            const dStr = `${selDay.getFullYear()}-${String(selDay.getMonth() + 1).padStart(2, '0')}-${String(selDay.getDate()).padStart(2, '0')}`
                            deleteRecurringOccurrence(m.id, 'monthly', m.name, dStr, m.instanceId)
                          }} className="w-5 h-5 flex items-center justify-center rounded text-[#717A8C] hover:text-[#EF6A7B] text-[10px]">✕</button>
                        </div>
                      </div>
                    </li>
                  );
                })}
                
                {selectedDayEvents.length > 0 && (
                  <SortableContext items={selectedDayEvents.map(e => e.id)} strategy={verticalListSortingStrategy}>
                    {selectedDayEvents.map((e) => {
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
                    <SortableItem key={e.id} id={e.id}>
                      {({ attributes, listeners, setNodeRef, style, isDragging }) => (
                        <li 
                          ref={setNodeRef}
                          style={style}
                          className={`flex items-start gap-2 relative group transition-all duration-200 ${isDragging ? 'shadow-card bg-white rounded-xl z-50' : ''}`}
                        >
                          <div 
                            {...attributes} 
                            {...listeners} 
                            className="w-3 shrink-0 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing text-[#A0AABF] text-[10px] mt-1.5 transition-opacity outline-none"
                          >
                            ⠿
                          </div>
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
                              <div className="flex gap-1.5 flex-wrap">
                                {EVENT_COLORS.map(c => {
                                  const s = EVENT_STYLE_MAP[c];
                                  return (
                                    <button
                                      key={c}
                                      onClick={() => setEditColor(c)}
                                      className={`text-[10px] px-2 py-0.5 rounded transition-all font-semibold ${editColor === c ? 'ring-1 shadow-sm' : 'opacity-60 hover:opacity-100'}`}
                                      style={{ backgroundColor: s.bg, color: s.text, '--tw-ring-color': s.bar } as React.CSSProperties}
                                    >
                                      {s.label}
                                    </button>
                                  )
                                })}
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
                            <div className="flex items-start gap-2">
                              {timeStr && <span className="text-[13px] font-extrabold shrink-0 mt-0.5" style={{ color: styleObj.bar }}>{timeStr}</span>}
                              <span className="text-[13px] font-semibold whitespace-pre-wrap leading-relaxed" style={{ color: isPastDay ? '#A3A3A3' : styleObj.text }}>
                                {restStr}
                              </span>
                            </div>
                          </div>
                        )}
                        {!isEditing && (
                          <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-1">
                            <button onClick={() => deleteEvent(e.id)} className="w-5 h-5 flex items-center justify-center rounded text-[#A0AABF] hover:text-[#EF6A7B] text-[10px]">✕</button>
                          </div>
                        )}
                      </div>
                    </li>
                      )}
                    </SortableItem>
                  );
                })}
              </SortableContext>
            )}
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
              <SortableContext items={activeTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                <ul className="flex flex-col gap-1">
                  {activeTasks.map((t) => (
                    <SortableItem key={t.id} id={t.id}>
                      {({ attributes, listeners, setNodeRef, style, isDragging }) => (
                        <li 
                          ref={setNodeRef}
                          style={style}
                          className={`flex items-start gap-2 group bg-transparent px-1 py-2 rounded-xl hover:bg-white hover:shadow-card transition-all duration-200 ${isDragging ? 'shadow-card bg-white z-50' : ''}`}
                        >
                          <div 
                            {...attributes}
                            {...listeners}
                            className="w-3 shrink-0 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing text-[#A0AABF] text-[10px] mt-1 transition-opacity outline-none"
                          >
                            ⠿
                          </div>
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
                            <button onClick={() => deleteTask(t.id)} className="w-5 h-5 flex items-center justify-center rounded text-[#A0AABF] hover:text-[#EF6A7B] text-[10px]">✕</button>
                          </div>
                        </li>
                      )}
                    </SortableItem>
                  ))}
                </ul>
              </SortableContext>
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
            <div className="absolute top-0 bottom-0 left-0 w-1.5 bg-[#8A8A8A]" />
            
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <div className="mb-3 flex justify-between items-center">
                <h3 className="text-xs font-bold text-[#8A8A8A] uppercase tracking-wide">MONTHLY MEMO</h3>
              </div>
              
              <ul className="flex flex-col gap-2 pb-1 pl-1">
                {monthAgendas.map(ag => (
                  <li key={ag.id} className="group flex items-start gap-2.5 bg-transparent -mx-1.5 p-1 rounded-lg hover:bg-white/60 transition-colors">
                    <button onClick={() => toggleAgenda(ag.id)} className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 transition-colors ${ag.done ? 'bg-[#D0D4DF]' : 'bg-[#8A8A8A]'}`} />
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
                  className="flex-1 px-3 py-1.5 text-xs bg-white border border-[#EEF1F6] rounded-lg outline-none focus:border-[#8A8A8A] text-[#1C1C1E] placeholder:text-[#A0AABF] transition-colors"
                />
              </form>
            </div>
          </div>
        </section>

          {(() => {
            const activeEvent = selectedDayEvents.find(e => e.id === activeId)
            const activeTask = activeTasks.find(t => t.id === activeId)
            return (
              <DragOverlay dropAnimation={{ sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.4' } } }) }}>
                {activeEvent ? (
                  <div className="flex items-start gap-2 bg-white px-2 py-1 rounded-xl shadow-card border border-[#EEF1F6]">
                    <div className="w-3 shrink-0 flex items-center justify-center text-[#A0AABF] text-[10px] mt-1.5">⠿</div>
                    <div className="relative w-4 flex justify-center shrink-0 mt-1.5 z-10">
                      <div className="w-2.5 h-2.5 rounded-full border-2 bg-white" style={{ borderColor: EVENT_STYLE_MAP[activeEvent.color || '#8B7CF8']?.bar || '#8B7CF8' }} />
                    </div>
                    <div className="flex-1 bg-transparent flex gap-2 items-start py-0.5">
                      <div className="flex items-start gap-2">
                        <span className="text-[13px] font-semibold whitespace-pre-wrap leading-relaxed">{activeEvent.text.replace(/^((?:0?[0-9]|1[0-9]|2[0-3]):[0-5][0-9](?:\s?(?:AM|PM|am|pm))?)\s*/i, '')}</span>
                      </div>
                    </div>
                  </div>
                ) : activeTask ? (
                  <div className="flex items-start gap-2 bg-white px-1 py-2 rounded-xl shadow-card">
                    <div className="w-3 shrink-0 flex items-center justify-center text-[#A0AABF] text-[10px] mt-1">⠿</div>
                    <div className="w-4 h-4 mt-0.5 rounded-full border-[1.5px] flex items-center justify-center shrink-0 border-[#A0AABF] text-transparent" />
                    <div className="flex-1 mt-0.5">
                      <span className="text-xs font-medium whitespace-pre-wrap leading-relaxed text-[#1C1C1E]">{activeTask.text}</span>
                    </div>
                  </div>
                ) : null}
              </DragOverlay>
            )
          })()}
          </DndContext>
        </aside>
      )}
      </div>
    </div>
  )
}

export default CalendarPage
