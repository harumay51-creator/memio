import React, { useState, useMemo, useRef, useEffect } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns'
import { ko } from 'date-fns/locale'
import { useAppStore } from '../../store/AppStore'
import { useDiaryStore } from '../../store/DiaryStore'
import { type ScheduleEvent } from '../../types'
import { useMergedHolidays } from '../../hooks/useMergedHolidays'
import { EmptyState } from '../common/EmptyState'
import { calculateHolidays, getSolarFromLunar } from '../../utils/holidays'
import { useConfirm } from '../common/ConfirmModal'

const EVENT_COLORS = ['#8B7CF8', '#EF6A7B', '#63D2B0', '#F4B73F']

import { MobileDiaryView } from './MobileDiaryView'
import { MobileDiarySearchModal } from './MobileDiarySearchModal'
import Emoji from '../common/Emoji'

const MobileCalendarPage: React.FC = () => {
  const { events, addEvent, updateEvent, deleteEvent, anniversaries, monthlyEvents, recurringInstances, deleteRecurringOccurrence } = useAppStore()
  const { isDiaryMode, setIsDiaryMode, diaries } = useDiaryStore()
  const { confirm } = useConfirm()
  
  const [currentDate, setCurrentDate] = useState(new Date())
  const [currentDiaryDate, setCurrentDiaryDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const mergedHolidays = useMergedHolidays(currentDate.getFullYear())

  const [newEventText, setNewEventText] = useState('')
  const [newEventColor, setNewEventColor] = useState(EVENT_COLORS[0])
  const [newEventTime, setNewEventTime] = useState('')
  
  // Editor (editing existing event)
  const [editingEventId, setEditingEventId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editColor, setEditColor] = useState(EVENT_COLORS[0])
  const [editDate, setEditDate] = useState('')

  const gridRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const cleanupTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const closePanel = () => {
    setIsPanelOpen(false)
    if (cleanupTimeoutRef.current) {
      clearTimeout(cleanupTimeoutRef.current)
    }
    cleanupTimeoutRef.current = setTimeout(() => {
      setSelectedDate(null)
    }, 300)
  }

  useEffect(() => {
    return () => {
      if (cleanupTimeoutRef.current) {
        clearTimeout(cleanupTimeoutRef.current)
      }
    }
  }, [])
  const touchStartY = useRef<number>(0)
  const isAtTopOnTouchStart = useRef<boolean>(false)
  const lastTouchY = useRef<number>(0)
  const lastTouchTime = useRef<number>(0)
  const rafRef = useRef<number | null>(null)

  const gridTouchStartX = useRef<number>(0)
  const gridTouchStartY = useRef<number>(0)
  const gridIsSwiping = useRef<boolean>(false)

  const handleTouchStart = (e: React.TouchEvent) => {
    const y = e.touches[0].clientY
    touchStartY.current = y
    lastTouchY.current = y
    lastTouchTime.current = performance.now()
    isAtTopOnTouchStart.current = (scrollRef.current?.scrollTop || 0) <= 0
    if (isAtTopOnTouchStart.current) {
      if (gridRef.current) gridRef.current.style.transition = 'none'
      if (scrollRef.current) scrollRef.current.style.transition = 'none'
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isAtTopOnTouchStart.current) return
    const currentY = e.touches[0].clientY
    const deltaY = currentY - touchStartY.current
    
    if (deltaY > 0 && scrollRef.current) {
      lastTouchY.current = currentY
      lastTouchTime.current = performance.now()

      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(() => {
        if (scrollRef.current) {
          // Direct transform for perfect 1:1 hardware accelerated drag. No layout reflows!
          scrollRef.current.style.transform = `translateY(${deltaY}px)`
        }
      })
    }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isAtTopOnTouchStart.current) return
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    
    const currentY = e.changedTouches[0].clientY
    const deltaY = currentY - touchStartY.current
    const timeDelta = performance.now() - lastTouchTime.current
    const velocity = timeDelta > 0 ? (currentY - lastTouchY.current) / timeDelta : 0
      
    if (deltaY > 100 || velocity > 0.5) {
      // 1. Set close state immediately to prevent popstate delay bounce
      closePanel()
      
      // 2. Clean up inline styles so React CSS transition takes over
      if (gridRef.current) {
        gridRef.current.style.transition = ''
        gridRef.current.style.flex = ''
      }
      if (scrollRef.current) {
        scrollRef.current.style.transition = ''
        scrollRef.current.style.flex = ''
        scrollRef.current.style.transform = ''
      }
      
      // 3. Maintain history popstate
      if (window.history.state?.modal === 'mobileEventList') {
        window.history.back()
      }
    } else {
      // Snap back smoothly without bounce
      if (scrollRef.current) {
        scrollRef.current.style.transition = 'transform 0.3s cubic-bezier(0, 0, 0.2, 1)'
        scrollRef.current.style.transform = 'translateY(0)'
        
        setTimeout(() => {
          if (scrollRef.current) {
            scrollRef.current.style.transition = ''
            scrollRef.current.style.transform = ''
          }
        }, 300)
      }
      if (gridRef.current) gridRef.current.style.transition = ''
    }
  }
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

  const handleGridTouchStart = (e: React.TouchEvent) => {
    gridTouchStartX.current = e.touches[0].clientX
    gridTouchStartY.current = e.touches[0].clientY
    gridIsSwiping.current = false
  }

  const handleGridTouchMove = (e: React.TouchEvent) => {
    const currentX = e.touches[0].clientX
    const currentY = e.touches[0].clientY
    const deltaX = currentX - gridTouchStartX.current
    const deltaY = currentY - gridTouchStartY.current

    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
      gridIsSwiping.current = true
    }
  }

  const handleGridTouchEnd = (e: React.TouchEvent) => {
    const currentX = e.changedTouches[0].clientX
    const deltaX = currentX - gridTouchStartX.current
    
    if (gridIsSwiping.current) {
      if (Math.abs(deltaX) > 50) {
        if (deltaX > 0) {
          handlePrevMonth()
        } else {
          handleNextMonth()
        }
      }
      setTimeout(() => {
        gridIsSwiping.current = false
      }, 50)
    }
  }

  // Handle back button for event list
  useEffect(() => {
    const handlePopState = () => {
      if (!isDiaryMode && isPanelOpen) {
        closePanel()
      }
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [isDiaryMode, isPanelOpen])

  const handleDateClick = (d: Date) => {
    if (gridIsSwiping.current) return;
    if (!isDiaryMode && isPanelOpen && selectedDate && isSameDay(d, selectedDate)) {
      closePanel()
      if (window.history.state?.modal === 'mobileEventList') {
        window.history.back()
      }
      return
    }
    
    if (!isDiaryMode && !isPanelOpen) {
      window.history.pushState({ modal: 'mobileEventList' }, '')
    }

    if (cleanupTimeoutRef.current) {
      clearTimeout(cleanupTimeoutRef.current)
      cleanupTimeoutRef.current = null
    }
    
    setSelectedDate(d)
    if (isDiaryMode) {
      setIsDiaryOpen(true)
    } else {
      setIsPanelOpen(true)
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
      let m = a.month
      let dDay = a.day
      if (a.isLunar) {
        const solarDate = getSolarFromLunar(d.getFullYear(), a.month, a.day, a.isLeapMonth)
        m = solarDate.getMonth() + 1
        dDay = solarDate.getDate()
      }
      if (m !== d.getMonth() + 1 || dDay !== d.getDate()) return
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

  const selectedDayEvents = selectedDate ? (eventsByDate.get(format(selectedDate, 'yyyy-MM-dd')) || []) : []
  const { dayAnnivs: selectedAnnivs, dayMonthly: selectedMonthly } = selectedDate ? getDayRoutines(selectedDate) : { dayAnnivs: [], dayMonthly: [] }

  // Add event
  const [showTimePicker, setShowTimePicker] = useState(false)
  const [isEditingTime, setIsEditingTime] = useState(false)

  const handleAddEventSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newEventText.trim() || !selectedDate) return

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
          <button onClick={() => {
            if (isDiaryMode) {
              setSelectedDate(null)
              setIsPanelOpen(false)
            }
            setIsDiaryMode(!isDiaryMode)
          }} className={`p-2 rounded-full transition-colors ${isDiaryMode ? 'text-accent bg-accent/10' : 'text-yuri-400 hover:text-accent hover:bg-yuri-50'}`}>
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
          <div key={d} className="text-center py-2 text-xs font-normal text-gray-400">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div 
        ref={gridRef}
        className={`grid grid-cols-7 pb-2 transition-[flex,min-height] duration-[300ms] ease-[cubic-bezier(0.4,0,0.2,1)]`}
        style={{ 
          flex: isDiaryMode || !isPanelOpen ? '1 1 100%' : '0 0 45%',
          minHeight: isDiaryMode || !isPanelOpen ? '0' : '280px',
          gridTemplateRows: `repeat(${days.length / 7}, minmax(0, 1fr))` 
        }}
        onTouchStart={handleGridTouchStart}
        onTouchMove={handleGridTouchMove}
        onTouchEnd={handleGridTouchEnd}
      >
        {days.map((d: Date) => {
          const dStr = format(d, 'yyyy-MM-dd')
          const holidayInfo = mergedHolidays[dStr]
          const isHoliday = !!holidayInfo
          const isSunday = d.getDay() === 0
          const dayEvents = eventsByDate.get(dStr) || []
          const isSelected = selectedDate ? isSameDay(d, selectedDate) : false
          const isCurrentMonth = isSameMonth(d, activeMonthDate)
          const isToday = isSameDay(d, new Date())
          const diaryEntry = diaries[dStr]
          const hasDiaryRecord = diaryEntry && ((diaryEntry.answers && diaryEntry.answers.length > 0) || (diaryEntry.memos && diaryEntry.memos.length > 0))

          const { dayAnnivs, dayMonthly } = getDayRoutines(d)

          return (
            <button
              key={d.toISOString()}
              onClick={() => handleDateClick(d)}
              className={`flex flex-col items-center justify-start border-b border-gray-100 transition-[padding,background-color] duration-150 overflow-hidden w-full h-full min-h-0 ${
                isDiaryMode || !selectedDate ? 'py-2' : 'pt-1 pb-0.5'
              } ${
                isSelected ? 'bg-accent/10 rounded-xl' : ''
              } ${!isCurrentMonth ? 'opacity-30' : ''}`}
            >
              <span className={`${isDiaryMode ? 'text-[15px] w-8 h-8 shrink-0' : 'text-sm w-6 h-6 shrink-0'} font-normal flex items-center justify-center rounded-full ${
                isToday ? 'bg-accent text-white font-medium' : (isSelected ? 'text-accent font-medium' : ((isHoliday && holidayInfo.isRedDay) || isSunday ? 'text-red-500' : 'text-yuri-900'))
              }`}>
                {format(d, 'd')}
              </span>
              
              {/* Event Dots or Emojis */}
              {isDiaryMode ? (
                <div className="flex flex-nowrap items-center justify-center gap-0.5 w-full overflow-hidden mt-0.5 px-0.5 flex-1 min-h-[14px]">
                  {(diaryEntry?.emojis || []).length > 0 ? (
                    diaryEntry!.emojis!.map((emoji: string, idx: number) => (
                      <Emoji key={idx} emoji={emoji} className="w-3 h-3 shrink-0" />
                    ))
                  ) : hasDiaryRecord ? (
                    <span className="text-[10px] leading-none opacity-70 shrink-0">📝</span>
                  ) : null}
                </div>
              ) : (
                <div className={
                  selectedDate
                    ? "flex flex-row flex-wrap justify-center items-start gap-[3px] mt-1 w-full px-2 overflow-hidden flex-1 min-h-0"
                    : "flex flex-col gap-[2px] mt-1.5 w-full px-0.5 overflow-hidden flex-1 justify-start min-h-0"
                }>
                  {(() => {
                    const badgeItems: { name: string; type: 'holiday' | 'routine' | 'event'; isRedDay?: boolean; color?: string }[] = []
                    if (holidayInfo) {
                       // Give holidays a dot color mapping
                      badgeItems.push({ name: holidayInfo.name, type: 'holiday', isRedDay: holidayInfo.isRedDay, color: holidayInfo.isRedDay ? '#EF4444' : '#6B7280' })
                    }
                    dayAnnivs.forEach(a => badgeItems.push({ name: a.name, color: '#B4629C', type: 'routine' }))
                    dayMonthly.forEach(m => badgeItems.push({ name: m.name, color: '#3A4B8C', type: 'routine' }))
                    dayEvents.forEach(e => badgeItems.push({ name: e.text, color: e.color || EVENT_COLORS[0], type: 'event' }))
                    
                    if (selectedDate) {
                      // DOT MODE
                      return badgeItems.map((item, i) => (
                        <div key={`d-${i}`} className="w-[5px] h-[5px] rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      ))
                    }

                    // BADGE MODE
                    return (
                      <>
                        {badgeItems.slice(0, 2).map((item, i) => {
                          if (item.type === 'holiday') {
                            return (
                              <div key={`b-${i}`} className={`text-[9px] px-[2px] py-[0px] w-full truncate rounded-[1px] font-normal shrink-0 leading-none ${item.isRedDay ? 'bg-red-50 text-red-500' : 'bg-gray-50 text-gray-400'}`}>
                                {item.name}
                              </div>
                            )
                          }
                          if (item.type === 'routine') {
                            return (
                              <div key={`b-${i}`} className="text-[9px] px-[2px] py-[0px] w-full truncate rounded-[1px] font-normal shrink-0 leading-none flex items-center gap-[2px] bg-transparent" style={{ color: item.color }}>
                                <span className="shrink-0 text-[8px] font-black mt-[0.5px]">↻</span>
                                <span className="truncate">{item.name}</span>
                              </div>
                            )
                          }
                          return (
                            <div key={`b-${i}`} className="text-[9px] px-[2px] py-[0px] w-full truncate rounded-[1px] font-normal shrink-0 leading-none" style={{ backgroundColor: item.color + '14', color: item.color }}>
                              {item.name}
                            </div>
                          )
                        })}
                        {badgeItems.length > 2 && (
                          <div className="text-[8px] text-gray-400 font-normal text-center mt-[2px]">
                            +{badgeItems.length - 2}개
                          </div>
                        )}
                      </>
                    )
                  })()}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {isDiaryMode && isDiaryOpen && (
        <div className="absolute inset-0 z-50 bg-white flex flex-col overflow-hidden animate-in fade-in duration-150">
          <MobileDiaryView selectedDate={selectedDate || new Date()} onClose={() => {
            if (window.history.state?.modal === 'mobileDiary') window.history.back()
            setIsDiaryOpen(false)
          }} />
        </div>
      )}

      {/* Event List Section */}
      {!isDiaryMode && (
        <div 
          ref={scrollRef} 
          onTransitionEnd={(e) => {
            // 2. 자식 요소에서 발생한 이벤트 무시 (버블링 방지)
            if (e.target !== e.currentTarget) return;
            // 1. 레이아웃(flex) 트랜지션 완료 시점에만 동작 (여러 속성 트랜지션 방어)
            if (e.propertyName !== 'flex-basis' && e.propertyName !== 'flex') return;
            // 3. 패널이 완전히 닫힌 상태인지 확인 (닫히는 도중 재선택 방어)
            if (!isPanelOpen && selectedDate) {
              setSelectedDate(null);
            }
          }}
          className={`flex flex-col overflow-y-auto overscroll-none bg-yuri-50 transition-[flex,opacity] duration-[300ms] ease-[cubic-bezier(0.4,0,0.2,1)] will-change-[flex] ${
            isPanelOpen ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            flex: isPanelOpen ? '1 1 55%' : '0 0 0%'
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Inner content wrapper with padding so layout doesn't shift during height transition */}
          <div className="flex flex-col px-4 pt-2 pb-4">
            {/* Swipe handle */}
            <div className="w-full flex justify-center pb-3 shrink-0">
              <div className="w-10 h-1.5 bg-gray-300 rounded-full" />
            </div>

            <h3 className="text-sm font-bold text-yuri-700 mb-3 border-b border-yuri-200 pb-2 flex items-center gap-2 shrink-0">
              {format(selectedDate || new Date(), 'M월 d일 (E)', { locale: ko })}
              {mergedHolidays[format(selectedDate || new Date(), 'yyyy-MM-dd')] && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${mergedHolidays[format(selectedDate || new Date(), 'yyyy-MM-dd')].isRedDay ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}`}>
                  {mergedHolidays[format(selectedDate || new Date(), 'yyyy-MM-dd')].name}
                </span>
              )}
            </h3>

          {selectedDate && selectedDayEvents.length === 0 && selectedAnnivs.length === 0 && selectedMonthly.length === 0 && (
            <EmptyState type="compact" message="일정이 없습니다." />
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
                const dStr = format(selectedDate || new Date(), 'yyyy-MM-dd')
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
                const dStr = format(selectedDate || new Date(), 'yyyy-MM-dd')
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
                    setEditDate(format(selectedDate || new Date(), 'yyyy-MM-dd'))
                  }
                }}
                className={`bg-white p-3 rounded-xl shadow-sm border border-yuri-100 flex items-start gap-3 transition-all duration-150 active:scale-[0.98] ${ev._isRollback ? 'opacity-40 bg-red-50/50 grayscale' : ''}`}
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
                  onClick={async (e) => {
                    e.stopPropagation()
                    if (await confirm({ message: '일정을 삭제하시겠습니까?', variant: 'danger', confirmText: '삭제' })) deleteEvent(ev.id)
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
              const d = editDate.split('T')[0] || format(selectedDate || new Date(), 'yyyy-MM-dd')
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
