import React, { useState, useMemo, useRef, useEffect } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns'
import { ko } from 'date-fns/locale'
import { useAppStore } from '../../store/AppStore'
import { useDiaryStore } from '../../store/DiaryStore'
import { type ScheduleEvent } from '../../types'
import { useMergedHolidays } from '../../hooks/useMergedHolidays'
import { calculateHolidays } from '../../utils/holidays'

const EVENT_COLORS = ['#8B7CF8', '#EF6A7B', '#63D2B0', '#F4B73F']

import { MobileDiaryView } from './MobileDiaryView'
import { MobileDiarySearchModal } from './MobileDiarySearchModal'
import Emoji from '../common/Emoji'

const MobileCalendarPage: React.FC = () => {
  const { events, addEvent, updateEvent, deleteEvent, anniversaries, monthlyEvents, recurringInstances, deleteRecurringOccurrence } = useAppStore()
  const { isDiaryMode, setIsDiaryMode, diaries } = useDiaryStore()
  
  const [currentDate, setCurrentDate] = useState(new Date())
  const [currentDiaryDate, setCurrentDiaryDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const mergedHolidays = useMergedHolidays(currentDate.getFullYear())

  useEffect(() => {
    console.timeEnd('[MobileApp] Calendar UI Rendered')
  }, [])

  const [newEventText, setNewEventText] = useState('')
  const [newEventColor, setNewEventColor] = useState(EVENT_COLORS[0])
  const [newEventTime, setNewEventTime] = useState('')
  
  // Editor (editing existing event)
  const [editingEventId, setEditingEventId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editColor, setEditColor] = useState(EVENT_COLORS[0])
  const [editDate, setEditDate] = useState('')

  const scrollRef = useRef<HTMLDivElement>(null)

  const eventsByDate = useMemo(() => {
    const map = new Map<string, ScheduleEvent[]>()
    events.forEach(e => {
      if (e.scheduledDate) {
        const dStr = format(new Date(e.scheduledDate), 'yyyy-MM-dd')
        const arr = map.get(dStr) || []
        arr.push(e)
        map.set(dStr, arr)
      }
    })
    return map
  }, [events])

  const activeMonthDate = isDiaryMode ? currentDiaryDate : currentDate

  const allHolidays = useMemo(() => {
    const y = activeMonthDate.getFullYear()
    return {
      ...calculateHolidays(y - 1),
      ...calculateHolidays(y),
      ...calculateHolidays(y + 1),
      ...mergedHolidays
    }
  }, [activeMonthDate, mergedHolidays])

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

    const y = activeMonthDate.getFullYear()
    const m = activeMonthDate.getMonth()

    let prevY = y, prevM = m - 1
    if (prevM < 0) { prevM = 11; prevY-- }
    addForMonth(prevY, prevM)

    addForMonth(y, m)

    let nextY = y, nextM = m + 1
    if (nextM > 11) { nextM = 0; nextY++ }
    addForMonth(nextY, nextM)

    return adjusted
  }, [monthlyEvents, activeMonthDate, allHolidays])

  // Get calendar days for current month view
  const monthStart = startOfMonth(activeMonthDate)
  const monthEnd = endOfMonth(activeMonthDate)
  const startDate = new Date(monthStart)
  startDate.setDate(startDate.getDate() - startDate.getDay()) // start on Sunday
  const endDate = new Date(monthEnd)
  if (endDate.getDay() !== 6) {
    endDate.setDate(endDate.getDate() + (6 - endDate.getDay()))
  }
  const days = eachDayOfInterval({ start: startDate, end: endDate })

  const [isDiaryOpen, setIsDiaryOpen] = useState(false)

  useEffect(() => {
    if (isDiaryOpen) {
      window.history.pushState({ modal: 'mobileDiary' }, '')
      const handlePopState = () => setIsDiaryOpen(false)
      window.addEventListener('popstate', handlePopState)
      return () => window.removeEventListener('popstate', handlePopState)
    }
  }, [isDiaryOpen])

  const handlePrevMonth = () => {
    if (isDiaryMode) setCurrentDiaryDate(subMonths(currentDiaryDate, 1))
    else setCurrentDate(subMonths(currentDate, 1))
  }
  const handleNextMonth = () => {
    if (isDiaryMode) setCurrentDiaryDate(addMonths(currentDiaryDate, 1))
    else setCurrentDate(addMonths(currentDate, 1))
  }

  const handleDateClick = (d: Date) => {
    setSelectedDate(d)
    if (isDiaryMode) {
      setIsDiaryOpen(true)
    } else {
      setEditingEventId(null)
      setTimeout(() => {
        scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
      }, 100)
    }
  }

  const getDayRoutines = (d: Date) => {
    const dStr = format(d, 'yyyy-MM-dd')
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
    return { dayAnnivs, dayMonthly }
  }

  const selectedDayEvents = eventsByDate.get(format(selectedDate, 'yyyy-MM-dd')) || []
  const { dayAnnivs: selectedAnnivs, dayMonthly: selectedMonthly } = getDayRoutines(selectedDate)

  // Add event
  const [showTimePicker, setShowTimePicker] = useState(false)
  const [isEditingTime, setIsEditingTime] = useState(false)

  const handleAddEventSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newEventText.trim()) return

    const dStr = format(selectedDate, 'yyyy-MM-dd')
    const finalDate = newEventTime ? `${dStr}T${newEventTime}:00` : dStr

    addEvent(newEventText.trim(), finalDate, newEventColor)
    setNewEventText('')
    setNewEventTime('')
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
    }, 100)
  }

  const checkHasTime = (dStr: string | undefined) => {
    if (!dStr) return false;
    if (dStr.length <= 10) return false;
    const d = new Date(dStr);
    return d.getHours() !== 0 || d.getMinutes() !== 0;
  }

  // Update event
  const handleUpdateEvent = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingEventId || !editTitle.trim()) return
    updateEvent(editingEventId, {
      text: editTitle.trim(),
      scheduledDate: editDate,
      color: editColor
    })
    setEditingEventId(null)
  }

  return (
    <div className="flex flex-col h-full bg-white relative overflow-hidden">
      {/* Calendar Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <button onClick={handlePrevMonth} className="p-2 text-yuri-400 hover:text-accent rounded-full hover:bg-yuri-50 transition-colors">
            <span className="text-xl leading-none">◀</span>
          </button>
          <h2 className="text-lg font-bold text-yuri-900 flex items-center justify-center relative">
            {format(activeMonthDate, 'yyyy년 M월')}
          </h2>
          <button onClick={handleNextMonth} className="p-2 text-yuri-400 hover:text-accent rounded-full hover:bg-yuri-50 transition-colors">
            <span className="text-xl leading-none">▶</span>
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => {
            const today = new Date()
            if (isDiaryMode) setCurrentDiaryDate(today)
            else setCurrentDate(today)
            setSelectedDate(today)
          }} className="px-3 py-1 text-xs font-bold text-yuri-500 hover:text-accent bg-yuri-50 rounded-full transition-colors mr-1">
            오늘
          </button>
          {isDiaryMode && (
            <button onClick={() => setIsSearchOpen(true)} className="p-2 text-yuri-400 hover:text-accent rounded-full hover:bg-yuri-50 transition-colors">
              <span className="text-xl leading-none">🔍</span>
            </button>
          )}
          <button onClick={() => setIsDiaryMode(!isDiaryMode)} className={`p-2 rounded-full transition-colors ${isDiaryMode ? 'text-accent bg-accent/10' : 'text-yuri-400 hover:text-accent hover:bg-yuri-50'}`}>
            <span className="text-xl leading-none">{isDiaryMode ? '★' : '☆'}</span>
          </button>
          <button onClick={handleNextMonth} className="p-2 text-yuri-400 hover:text-accent rounded-full hover:bg-yuri-50 transition-colors">
            <span className="text-xl leading-none">▶</span>
          </button>
        </div>
      </div>

      {/* Weekdays */}
      <div className="grid grid-cols-7 border-b border-yuri-100">
        {['일', '월', '화', '수', '목', '금', '토'].map(d => (
          <div key={d} className="text-center py-2 text-xs font-semibold text-yuri-400">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 border-b border-yuri-100 pb-2">
        {days.map((d: Date) => {
          const dStr = format(d, 'yyyy-MM-dd')
          const holidayInfo = mergedHolidays[dStr]
          const isHoliday = !!holidayInfo
          const isSunday = d.getDay() === 0
          const dayEvents = eventsByDate.get(dStr) || []
          const isSelected = isSameDay(d, selectedDate)
          const isCurrentMonth = isSameMonth(d, activeMonthDate)
          const isToday = isSameDay(d, new Date())
          const diaryEntry = diaries[dStr]
          const hasDiaryRecord = diaryEntry && ((diaryEntry.answers && diaryEntry.answers.length > 0) || (diaryEntry.memos && diaryEntry.memos.length > 0))

          const { dayAnnivs, dayMonthly } = getDayRoutines(d)

          const totalEventsAndRoutinesCount = dayEvents.length + dayAnnivs.length + dayMonthly.length

          return (
            <button
              key={d.toISOString()}
              onClick={() => handleDateClick(d)}
              className={`flex flex-col items-center justify-start border border-transparent ${isDiaryMode ? 'py-0.5 h-11' : 'aspect-square p-1'} ${
                isSelected ? 'bg-accent/10 rounded-xl' : ''
              } ${!isCurrentMonth ? 'opacity-30' : ''}`}
            >
              <span className={`text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full ${
                isToday ? 'bg-accent text-white' : (isSelected ? 'text-accent' : ((isHoliday && holidayInfo.isRedDay) || isSunday ? 'text-red-500' : 'text-yuri-900'))
              }`}>
                {format(d, 'd')}
              </span>
              
              {/* Event Dots or Emojis */}
              {isDiaryMode ? (
                <div className="flex flex-nowrap items-center justify-center gap-0.5 w-full overflow-hidden mt-0.5 px-0.5 h-3.5">
                  {(diaryEntry?.emojis || []).length > 0 ? (
                    diaryEntry!.emojis!.map((emoji: string, idx: number) => (
                      <Emoji key={idx} emoji={emoji} className="w-3 h-3 shrink-0" />
                    ))
                  ) : hasDiaryRecord ? (
                    <span className="text-[10px] leading-none opacity-70">📝</span>
                  ) : null}
                </div>
              ) : (
                <div className="flex gap-0.5 mt-1 flex-wrap justify-center w-full px-1">
                  {dayAnnivs.slice(0, 3).map((_, i) => (
                    <span key={`a-${i}`} className="w-1.5 h-1.5 rounded-full bg-[#B4629C]" />
                  ))}
                  {dayMonthly.slice(0, Math.max(0, 3 - dayAnnivs.length)).map((_, i) => (
                    <span key={`m-${i}`} className="w-1.5 h-1.5 rounded-full bg-[#3A4B8C]" />
                  ))}
                  {dayEvents.slice(0, Math.max(0, 3 - dayAnnivs.length - dayMonthly.length)).map((ev, i) => (
                    <span key={`e-${i}`} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ev.color || EVENT_COLORS[0] }} />
                  ))}
                  {totalEventsAndRoutinesCount > 3 && (
                    <span className="w-1.5 h-1.5 rounded-full bg-yuri-300" />
                  )}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {isDiaryMode && isDiaryOpen && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col overflow-hidden">
          <MobileDiaryView selectedDate={selectedDate} onClose={() => {
            if (window.history.state?.modal === 'mobileDiary') window.history.back()
            setIsDiaryOpen(false)
          }} />
        </div>
      )}

      {isDiaryMode && !isDiaryOpen ? (
        <div className="flex-1 bg-white"></div>
      ) : !isDiaryMode ? (
        /* Event List Section */
        <div ref={scrollRef} className="flex-1 overflow-y-auto bg-yuri-50 p-4">
        <h3 className="text-sm font-bold text-yuri-700 mb-3 border-b border-yuri-200 pb-2 flex items-center gap-2">
          {format(selectedDate, 'M월 d일 (E)', { locale: ko })}
          {mergedHolidays[format(selectedDate, 'yyyy-MM-dd')] && (
            <span className={`text-xs px-2 py-0.5 rounded-full ${mergedHolidays[format(selectedDate, 'yyyy-MM-dd')].isRedDay ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}`}>
              {mergedHolidays[format(selectedDate, 'yyyy-MM-dd')].name}
            </span>
          )}
        </h3>

        {selectedDayEvents.length === 0 && (
          <div className="text-center text-yuri-400 text-sm py-8">
            일정이 없습니다.
          </div>
        )}

        <div className="flex flex-col gap-2 pb-24">
          {selectedAnnivs.map(a => (
            <div key={`a-${a.id}`} className="bg-white p-4 rounded-xl border border-yuri-100 shadow-sm flex items-start gap-3 relative">
              <span className="text-sm font-bold text-[#B4629C] shrink-0 mt-0.5">↻</span>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-[#B4629C] mb-0.5">매년 반복</p>
                <p className="text-sm font-semibold text-yuri-900 leading-tight whitespace-pre-wrap">{a.name}</p>
              </div>
              <button onClick={() => {
                const dStr = format(selectedDate, 'yyyy-MM-dd')
                deleteRecurringOccurrence(a.id, 'yearly', a.name, dStr, a.instanceId)
              }} className="text-yuri-400 hover:text-[#EF6A7B] p-1 -mr-2 -mt-2">
                ✕
              </button>
            </div>
          ))}

          {selectedMonthly.map(m => (
            <div key={`m-${m.id}`} className="bg-white p-4 rounded-xl border border-yuri-100 shadow-sm flex items-start gap-3 relative">
              <span className="text-sm font-bold text-[#3A4B8C] shrink-0 mt-0.5">↻</span>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-[#3A4B8C] mb-0.5">매월 반복</p>
                <p className="text-sm font-semibold text-yuri-900 leading-tight whitespace-pre-wrap">{m.name}</p>
              </div>
              <button onClick={() => {
                const dStr = format(selectedDate, 'yyyy-MM-dd')
                deleteRecurringOccurrence(m.id, 'monthly', m.name, dStr, m.instanceId)
              }} className="text-yuri-400 hover:text-[#EF6A7B] p-1 -mr-2 -mt-2">
                ✕
              </button>
            </div>
          ))}

          {selectedDayEvents.map(ev => {
            const isEditing = editingEventId === ev.id
            if (isEditing) {
              return (
                <form key={ev.id} onSubmit={handleUpdateEvent} className="bg-white p-4 rounded-xl border border-accent shadow-sm flex flex-col gap-3">
                  <input spellCheck={false}
                    type="text"
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    className="w-full text-sm font-semibold text-yuri-900 focus:outline-none placeholder-yuri-400"
                    placeholder="일정 내용"
                    autoFocus
                  />
                  <div className="flex items-center gap-2 mt-1">
                    {editDate.length > 10 ? (
                      <div className="flex items-center gap-1 text-xs font-semibold text-accent bg-accent/10 px-3 py-1.5 rounded-lg border border-accent/20">
                        <span>{format(new Date(editDate), 'a h:mm', { locale: ko })}</span>
                        <button type="button" onClick={() => setEditDate(editDate.split('T')[0])} className="ml-1 text-accent/70 hover:text-accent">✕</button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => { setIsEditingTime(true); setShowTimePicker(true) }} className="text-xs font-semibold text-accent bg-accent/10 px-3 py-1.5 rounded-lg border border-accent/20">
                        시간 추가
                      </button>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      {EVENT_COLORS.map(c => (
                        <button type="button" key={c} onClick={() => setEditColor(c)} className={`w-6 h-6 rounded-full border-2 ${editColor === c ? 'border-yuri-900' : 'border-transparent'}`} style={{ backgroundColor: c }} />
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setEditingEventId(null)} className="text-xs font-semibold text-yuri-500 hover:text-yuri-700 bg-yuri-100 px-3 py-1.5 rounded-lg">
                        취소
                      </button>
                      <button type="submit" className="text-xs font-bold text-white bg-accent px-3 py-1.5 rounded-lg">
                        저장
                      </button>
                    </div>
                  </div>
                </form>
              )
            }

            // Normal View
            return (
              <div 
                key={ev.id} 
                onClick={() => {
                  setEditingEventId(ev.id)
                  setEditTitle(ev.text)
                  setEditColor(ev.color || EVENT_COLORS[0])
                  if (ev.scheduledDate) {
                    if (checkHasTime(ev.scheduledDate)) {
                      setEditDate(format(new Date(ev.scheduledDate), "yyyy-MM-dd'T'HH:mm"))
                    } else {
                      setEditDate(format(new Date(ev.scheduledDate), "yyyy-MM-dd"))
                    }
                  } else {
                    setEditDate(format(selectedDate, 'yyyy-MM-dd'))
                  }
                }}
                className="bg-white p-3 rounded-xl shadow-sm border border-yuri-100 flex items-start gap-3 active:scale-[0.98] transition-transform"
              >
                <div className="w-1.5 h-10 rounded-full shrink-0" style={{ backgroundColor: ev.color || EVENT_COLORS[0] }} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-yuri-900 break-words leading-tight">{ev.text}</div>
                  {checkHasTime(ev.scheduledDate) && (
                    <div className="text-[11px] text-yuri-500 mt-1 font-mono">
                      {format(new Date(ev.scheduledDate!), 'a h:mm', { locale: ko })}
                    </div>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    if (confirm('일정을 삭제하시겠습니까?')) deleteEvent(ev.id)
                  }}
                  className="p-2 -mr-2 text-yuri-300 hover:text-red-500 transition-colors shrink-0"
                >
                  ✕
                </button>
              </div>
            )
          })}

          {/* Add form always visible at bottom */}
          <form onSubmit={handleAddEventSubmit} className="bg-white p-4 rounded-xl border border-yuri-100 shadow-sm flex flex-col gap-3 mt-4 shrink-0 mb-4">
            <input spellCheck={false}
              type="text"
              value={newEventText}
              onChange={e => setNewEventText(e.target.value)}
              className="w-full text-sm font-semibold text-yuri-900 focus:outline-none placeholder-yuri-400"
              placeholder="새로운 일정을 입력하세요..."
            />
            <div className="flex items-center gap-2 mt-1">
              {newEventTime ? (
                <div className="flex items-center gap-1 text-xs font-semibold text-accent bg-accent/10 px-3 py-1.5 rounded-lg border border-accent/20">
                  <span>{format(new Date(`2000-01-01T${newEventTime}`), 'a h:mm', { locale: ko })}</span>
                  <button type="button" onClick={() => setNewEventTime('')} className="ml-1 text-accent/70 hover:text-accent">✕</button>
                </div>
              ) : (
                <button type="button" onClick={() => { setIsEditingTime(false); setShowTimePicker(true) }} className="text-xs font-semibold text-accent bg-accent/10 px-3 py-1.5 rounded-lg border border-accent/20">
                  시간 추가
                </button>
              )}
            </div>
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                {EVENT_COLORS.map(c => (
                  <button type="button" key={c} onClick={() => setNewEventColor(c)} className={`w-6 h-6 rounded-full border-2 ${newEventColor === c ? 'border-yuri-900' : 'border-transparent'}`} style={{ backgroundColor: c }} />
                ))}
              </div>
              <button type="submit" disabled={!newEventText.trim()} className="text-xs font-bold text-white bg-accent px-4 py-1.5 rounded-lg disabled:opacity-50">
                추가
              </button>
            </div>
          </form>
        </div>
      </div>
      )}

      {isSearchOpen && (
        <MobileDiarySearchModal 
          onClose={() => setIsSearchOpen(false)}
          onResultClick={(date) => {
            setCurrentDiaryDate(date)
            setSelectedDate(date)
            setIsSearchOpen(false)
          }}
        />
      )}

      {showTimePicker && (
        <TimePickerModal
          onClose={() => setShowTimePicker(false)}
          onSelect={(timeStr) => {
            if (isEditingTime) {
              const d = editDate.split('T')[0] || format(selectedDate, 'yyyy-MM-dd')
              setEditDate(`${d}T${timeStr}`)
            } else {
              setNewEventTime(timeStr)
            }
            setShowTimePicker(false)
          }}
        />
      )}
    </div>
  )
}

const TimePickerModal: React.FC<{ onClose: () => void, onSelect: (timeStr: string) => void }> = ({ onClose, onSelect }) => {
  const [ampm, setAmpm] = useState('오후')
  const [hour, setHour] = useState('1')
  const [minute, setMinute] = useState('00')

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-[280px] p-6 shadow-xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-yuri-900 mb-6 text-center">시간 설정</h3>
        <div className="flex items-center justify-center gap-2 mb-8">
          <select value={ampm} onChange={e => setAmpm(e.target.value)} className="text-base font-bold bg-yuri-50 border border-yuri-100 outline-none rounded-xl px-2 py-2.5 text-center text-yuri-900 appearance-none">
            <option value="오전">오전</option>
            <option value="오후">오후</option>
          </select>
          <select value={hour} onChange={e => setHour(e.target.value)} className="text-base font-bold bg-yuri-50 border border-yuri-100 outline-none rounded-xl px-3 py-2.5 text-center text-yuri-900 appearance-none">
            {Array.from({length: 12}, (_, i) => i + 1).map(h => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>
          <span className="text-xl font-bold text-yuri-400 -mt-1">:</span>
          <select value={minute} onChange={e => setMinute(e.target.value)} className="text-base font-bold bg-yuri-50 border border-yuri-100 outline-none rounded-xl px-3 py-2.5 text-center text-yuri-900 appearance-none">
            {['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'].map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-3 bg-yuri-100 text-yuri-600 font-bold rounded-xl active:bg-yuri-200 transition-colors">취소</button>
          <button onClick={() => {
            let h = parseInt(hour, 10)
            if (ampm === '오후' && h < 12) h += 12
            if (ampm === '오전' && h === 12) h = 0
            onSelect(`${h.toString().padStart(2, '0')}:${minute}`)
          }} className="flex-1 py-3 bg-accent text-white font-bold rounded-xl active:bg-accent/90 transition-colors">확인</button>
        </div>
      </div>
    </div>
  )
}

export default MobileCalendarPage
