import React, { useState, useMemo } from 'react'
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isSameDay } from 'date-fns'

interface MiniCalendarPickerProps {
  isOpen: boolean
  onClose: () => void
  selectedDate: Date
  onSelectDate: (date: Date) => void
}

const MiniCalendarPicker: React.FC<MiniCalendarPickerProps> = ({ isOpen, onClose, selectedDate, onSelectDate }) => {
  const [activeMonth, setActiveMonth] = useState<Date>(startOfMonth(selectedDate))

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(activeMonth))
    const end = endOfWeek(endOfMonth(activeMonth))
    return eachDayOfInterval({ start, end })
  }, [activeMonth])

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation()
    setActiveMonth(subMonths(activeMonth, 1))
  }

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation()
    setActiveMonth(addMonths(activeMonth, 1))
  }

  const handleDateClick = (d: Date, e: React.MouseEvent) => {
    e.stopPropagation()
    onSelectDate(d)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-white rounded-3xl w-full max-w-sm shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b border-yuri-100 flex items-center justify-between">
          <button type="button" onClick={handlePrevMonth} className="p-2 text-yuri-400 hover:text-accent rounded-full hover:bg-yuri-50 transition-colors">
            <span className="text-xl leading-none">◀</span>
          </button>
          <h2 className="text-base font-bold text-yuri-900">
            {format(activeMonth, 'yyyy년 M월')}
          </h2>
          <button type="button" onClick={handleNextMonth} className="p-2 text-yuri-400 hover:text-accent rounded-full hover:bg-yuri-50 transition-colors">
            <span className="text-xl leading-none">▶</span>
          </button>
        </div>
        
        <div className="p-4">
          <div className="grid grid-cols-7 mb-2">
            {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
              <div key={d} className={`text-center py-2 text-xs font-semibold ${i === 0 ? 'text-red-400' : 'text-yuri-400'}`}>
                {d}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-y-2">
            {days.map((d: Date) => {
              const isSelected = isSameDay(d, selectedDate)
              const isCurrentMonth = isSameMonth(d, activeMonth)
              const isToday = isSameDay(d, new Date())
              const isSunday = d.getDay() === 0

              return (
                <button
                  key={d.toISOString()}
                  type="button"
                  onClick={(e) => handleDateClick(d, e)}
                  className={`flex flex-col items-center justify-center aspect-square p-1 mx-auto w-9 h-9 rounded-full transition-all ${
                    isSelected ? 'bg-accent text-white font-bold shadow-md' : 'hover:bg-yuri-50'
                  } ${!isCurrentMonth ? 'opacity-30' : ''}`}
                >
                  <span className={`text-sm ${
                    isSelected ? 'text-white' : 
                    isToday ? 'text-accent font-bold' : 
                    isSunday ? 'text-red-500' : 'text-yuri-900'
                  }`}>
                    {format(d, 'd')}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
        
        <div className="p-4 bg-yuri-50 border-t border-yuri-100 flex justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-bold text-yuri-600 hover:bg-black/5 rounded-xl transition-colors">
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}

export default MiniCalendarPicker
