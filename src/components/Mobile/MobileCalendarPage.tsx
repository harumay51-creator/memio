import React, { useState, useMemo, useRef } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns'
import { ko } from 'date-fns/locale'
import { useAppStore } from '../../store/AppStore'
import { type ScheduleEvent } from '../../types'
import { useMergedHolidays } from '../../hooks/useMergedHolidays'

const EVENT_COLORS = ['#8B7CF8', '#EF6A7B', '#63D2B0', '#F4B73F']

const MobileCalendarPage: React.FC = () => {
  const { events, addEvent, updateEvent, deleteEvent } = useAppStore()
  
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const mergedHolidays = useMergedHolidays(currentDate.getFullYear())

  // Editor (adding new event)
  const [isAdding, setIsAdding] = useState(false)
  const [newEventText, setNewEventText] = useState('')
  const [newEventColor, setNewEventColor] = useState(EVENT_COLORS[0])
  const [newEventTime, setNewEventTime] = useState('')
  
  // Editor (editing existing event)
  const [editingEventId, setEditingEventId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editColor, setEditColor] = useState(EVENT_COLORS[0])
  const [editDate, setEditDate] = useState('')

  const scrollRef = useRef<HTMLDivElement>(null)

  // Map events to date string 'yyyy-MM-dd'
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

  // Get calendar days for current month view
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const startDate = new Date(monthStart)
  startDate.setDate(startDate.getDate() - startDate.getDay()) // start on Sunday
  const endDate = new Date(monthEnd)
  if (endDate.getDay() !== 6) {
    endDate.setDate(endDate.getDate() + (6 - endDate.getDay()))
  }
  const days = eachDayOfInterval({ start: startDate, end: endDate })

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1))
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1))

  const handleDateClick = (d: Date) => {
    setSelectedDate(d)
    setEditingEventId(null)
    setIsAdding(false)
    setTimeout(() => {
      scrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }

  const selectedDayEvents = eventsByDate.get(format(selectedDate, 'yyyy-MM-dd')) || []

  // Add event
  const handleAddEventSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newEventText.trim()) return

    const dStr = format(selectedDate, 'yyyy-MM-dd')
    const finalDate = newEventTime ? `${dStr}T${newEventTime}:00` : dStr

    addEvent(newEventText.trim(), finalDate, newEventColor)
    setNewEventText('')
    setNewEventTime('')
    setIsAdding(false)
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
    <div className="flex flex-col h-full bg-white relative">
      {/* Calendar Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <button onClick={handlePrevMonth} className="p-2 text-yuri-400 hover:text-accent rounded-full hover:bg-yuri-50 transition-colors">
          <span className="text-xl leading-none">◀</span>
        </button>
        <h2 className="text-lg font-bold text-yuri-900">
          {format(currentDate, 'yyyy년 M월')}
        </h2>
        <button onClick={handleNextMonth} className="p-2 text-yuri-400 hover:text-accent rounded-full hover:bg-yuri-50 transition-colors">
          <span className="text-xl leading-none">▶</span>
        </button>
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
          const isCurrentMonth = isSameMonth(d, currentDate)
          const isToday = isSameDay(d, new Date())

          return (
            <button
              key={d.toISOString()}
              onClick={() => handleDateClick(d)}
              className={`flex flex-col items-center justify-start aspect-square p-1 border border-transparent ${
                isSelected ? 'bg-accent/10 rounded-xl' : ''
              } ${!isCurrentMonth ? 'opacity-30' : ''}`}
            >
              <span className={`text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full ${
                isToday ? 'bg-accent text-white' : (isSelected ? 'text-accent' : ((isHoliday && holidayInfo.isRedDay) || isSunday ? 'text-red-500' : 'text-yuri-900'))
              }`}>
                {format(d, 'd')}
              </span>
              
              {/* Event Dots */}
              <div className="flex gap-0.5 mt-1 flex-wrap justify-center w-full px-1">
                {dayEvents.slice(0, 3).map((ev, i) => (
                  <span key={i} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ev.color || EVENT_COLORS[0] }} />
                ))}
                {dayEvents.length > 3 && (
                  <span className="w-1.5 h-1.5 rounded-full bg-yuri-300" />
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Event List Section */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto bg-yuri-50 p-4">
        <h3 className="text-sm font-bold text-yuri-700 mb-3 border-b border-yuri-200 pb-2 flex items-center gap-2">
          {format(selectedDate, 'M월 d일 (E)', { locale: ko })}
          {mergedHolidays[format(selectedDate, 'yyyy-MM-dd')] && (
            <span className={`text-xs px-2 py-0.5 rounded-full ${mergedHolidays[format(selectedDate, 'yyyy-MM-dd')].isRedDay ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}`}>
              {mergedHolidays[format(selectedDate, 'yyyy-MM-dd')].name}
            </span>
          )}
        </h3>

        {selectedDayEvents.length === 0 && !isAdding && (
          <div className="text-center text-yuri-400 text-sm py-8">
            일정이 없습니다.
          </div>
        )}

        <div className="flex flex-col gap-2 pb-24">
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
                  <div className="flex items-center gap-2">
                    <input type="datetime-local" value={editDate} onChange={e => setEditDate(e.target.value)} className="text-xs text-yuri-500 bg-yuri-50 px-2 py-1.5 rounded-lg border border-yuri-200" />
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
                  setEditDate(ev.scheduledDate ? new Date(ev.scheduledDate).toISOString().slice(0, 16) : format(selectedDate, 'yyyy-MM-dd') + 'T00:00')
                  setIsAdding(false)
                }}
                className="bg-white p-3 rounded-xl shadow-sm border border-yuri-100 flex items-start gap-3 active:scale-[0.98] transition-transform"
              >
                <div className="w-1.5 h-10 rounded-full shrink-0" style={{ backgroundColor: ev.color || EVENT_COLORS[0] }} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-yuri-900 break-words leading-tight">{ev.text}</div>
                  {ev.scheduledDate && ev.scheduledDate.length > 10 && (
                    <div className="text-[11px] text-yuri-500 mt-1 font-mono">
                      {format(new Date(ev.scheduledDate), 'a h:mm', { locale: ko })}
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

          {/* Add form */}
          {isAdding && (
            <form onSubmit={handleAddEventSubmit} className="bg-white p-4 rounded-xl border border-accent shadow-sm flex flex-col gap-3">
              <input spellCheck={false}
                type="text"
                value={newEventText}
                onChange={e => setNewEventText(e.target.value)}
                className="w-full text-sm font-semibold text-yuri-900 focus:outline-none placeholder-yuri-400"
                placeholder="새로운 일정"
                autoFocus
              />
              <div className="flex items-center gap-2">
                <input type="time" value={newEventTime} onChange={e => setNewEventTime(e.target.value)} className="text-xs text-yuri-500 bg-yuri-50 px-2 py-1.5 rounded-lg border border-yuri-200" />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  {EVENT_COLORS.map(c => (
                    <button type="button" key={c} onClick={() => setNewEventColor(c)} className={`w-6 h-6 rounded-full border-2 ${newEventColor === c ? 'border-yuri-900' : 'border-transparent'}`} style={{ backgroundColor: c }} />
                  ))}
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setIsAdding(false)} className="text-xs font-semibold text-yuri-500 hover:text-yuri-700 bg-yuri-100 px-3 py-1.5 rounded-lg">
                    취소
                  </button>
                  <button type="submit" disabled={!newEventText.trim()} className="text-xs font-bold text-white bg-accent px-3 py-1.5 rounded-lg disabled:opacity-50">
                    추가
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* FAB */}
      {!isAdding && (
        <button
          onClick={() => {
            setIsAdding(true)
            setEditingEventId(null)
            setTimeout(() => {
              scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
            }, 100)
          }}
          className="absolute bottom-6 right-6 w-14 h-14 bg-accent hover:bg-accent/90 text-white rounded-full shadow-lg flex items-center justify-center text-3xl font-light transition-transform active:scale-95 z-30"
          style={{ paddingBottom: '2px' }}
        >
          +
        </button>
      )}
    </div>
  )
}

export default MobileCalendarPage
