import React, { ReactNode } from 'react'
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react'

interface MonthNavigationBarProps {
  year: number
  monthName: string
  onPrev: () => void
  onNext: () => void
  onDateClick: () => void
  isDatePickerOpen: boolean
  rightActions?: ReactNode
  className?: string
}

const MonthNavigationBar: React.FC<MonthNavigationBarProps> = ({
  year,
  monthName,
  onPrev,
  onNext,
  onDateClick,
  isDatePickerOpen,
  rightActions,
  className
}) => {
  // Unified styles
  const iconBtnClass = "w-9 h-9 flex items-center justify-center rounded-full text-[#494552] transition-colors hover:bg-[#8B7CF8]/10 hover:text-[#8B7CF8]"
  const dateBtnClass = "h-9 px-4 flex items-center gap-2 rounded-full text-[#2D334A] font-bold text-lg tracking-tight transition-colors hover:bg-[#8B7CF8]/10 hover:text-[#8B7CF8]"

  return (
    <div className={`flex items-center justify-between relative z-10 shrink-0 ${className ?? 'w-full'}`}>
      <div className="flex items-center gap-2">
        <button onClick={onPrev} className={iconBtnClass} title="이전 달">
          <ChevronLeft size={20} strokeWidth={2.5} />
        </button>
        
        <button onClick={onDateClick} className={dateBtnClass}>
          {year}년 {monthName}
          {isDatePickerOpen ? (
            <ChevronUp size={16} strokeWidth={2.5} className="text-[#8B7CF8]" />
          ) : (
            <ChevronDown size={16} strokeWidth={2.5} className="text-[#A0AABF]" />
          )}
        </button>
        
        <button onClick={onNext} className={iconBtnClass} title="다음 달">
          <ChevronRight size={20} strokeWidth={2.5} />
        </button>
      </div>

      <div className="flex items-center gap-2">
        {rightActions}
      </div>
    </div>
  )
}

export default MonthNavigationBar
