import React, { useState } from 'react'
import { useAppStore } from '../../store/AppStore'
import { useMergedHolidays } from '../../hooks/useMergedHolidays'

const HolidaySection: React.FC = () => {
  const { updateHolidayConfig } = useAppStore()
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  
  // Custom Holiday Form
  const [newDate, setNewDate] = useState('')
  const [newName, setNewName] = useState('')
  const [isRedDay, setIsRedDay] = useState(true)

  // Editing state for auto holidays
  const [editingDate, setEditingDate] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editRedDay, setEditRedDay] = useState(true)

  const mergedHolidays = useMergedHolidays(selectedYear)
  const sortedDates = Object.keys(mergedHolidays).sort()

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newDate || !newName.trim()) return

    updateHolidayConfig(prev => ({
      ...prev,
      customHolidays: [
        ...prev.customHolidays,
        { id: Date.now().toString(), date: newDate, name: newName.trim(), isRedDay }
      ]
    }))
    setNewDate('')
    setNewName('')
    setIsRedDay(true)
  }

  const handleDeleteCustom = (id: string) => {
    if (!confirm('직접 추가한 공휴일을 삭제하시겠습니까?')) return
    updateHolidayConfig(prev => ({
      ...prev,
      customHolidays: prev.customHolidays.filter(c => c.id !== id)
    }))
  }

  const handleHideRule = (ruleName: string) => {
    if (!confirm(`'${ruleName}' 공휴일을 앞으로 영구히 표시하지 않겠습니까?`)) return
    updateHolidayConfig(prev => ({
      ...prev,
      hiddenRules: [...prev.hiddenRules, ruleName]
    }))
  }

  const handleHideDate = (date: string, name: string) => {
    if (!confirm(`${selectedYear}년의 '${name}' 공휴일을 삭제하시겠습니까?`)) return
    updateHolidayConfig(prev => ({
      ...prev,
      hiddenDates: [...prev.hiddenDates, date]
    }))
  }

  const startEditAuto = (date: string, name: string, redDay: boolean) => {
    setEditingDate(date)
    setEditName(name)
    setEditRedDay(redDay)
  }

  const saveEditAuto = () => {
    if (!editingDate || !editName.trim()) return
    
    updateHolidayConfig(prev => {
      // 1. Remove the custom holiday if it was a custom holiday being edited, or hide the date if it was an auto holiday.
      // Wait, what if it's already a custom holiday? The UX says "Edit auto". For custom holidays we only provided "Delete". Let's support editing both!
      
      const existingCustom = prev.customHolidays.find(c => c.date === editingDate)
      
      let nextCustom = prev.customHolidays
      if (existingCustom) {
        // Update existing
        nextCustom = prev.customHolidays.map(c => 
          c.date === editingDate ? { ...c, name: editName.trim(), isRedDay: editRedDay } : c
        )
      } else {
        // It was an auto holiday. Hide it, and add custom.
        nextCustom = [
          ...prev.customHolidays,
          { id: Date.now().toString(), date: editingDate, name: editName.trim(), isRedDay: editRedDay }
        ]
      }

      const nextHiddenDates = existingCustom ? prev.hiddenDates : [...prev.hiddenDates, editingDate]

      return {
        ...prev,
        hiddenDates: nextHiddenDates,
        customHolidays: nextCustom
      }
    })
    setEditingDate(null)
  }

  const cancelEditAuto = () => {
    setEditingDate(null)
  }

  return (
    <div className="flex flex-col gap-8 animate-fade-in pb-12">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-yuri-900">공휴일 / 기념일 관리</h2>
        <select 
          value={selectedYear}
          onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
          className="bg-white border border-yuri-200 rounded-lg px-3 py-1.5 text-sm font-bold text-yuri-900 outline-none focus:border-accent"
        >
          {Array.from({ length: 10 }).map((_, i) => {
            const y = new Date().getFullYear() - 2 + i
            return <option key={y} value={y}>{y}년</option>
          })}
        </select>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-yuri-200 p-6">
        <h3 className="font-bold text-yuri-800 mb-4 text-sm flex items-center gap-2">
          <span className="w-1.5 h-4 bg-accent rounded-full" />
          공휴일 목록 ({selectedYear}년)
        </h3>
        
        <div className="flex flex-col gap-2">
          {sortedDates.length === 0 && (
            <p className="text-center text-sm text-yuri-400 py-4">표시할 공휴일이 없습니다.</p>
          )}
          {sortedDates.map(date => {
            const h = mergedHolidays[date]
            const isEditingThis = editingDate === date

            return (
              <div key={date} className="flex flex-col gap-2 p-3 rounded-lg border border-yuri-100 bg-yuri-50 hover:bg-yuri-100 transition-colors group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-bold ${h.isRedDay ? 'text-red-500' : 'text-yuri-600'}`}>
                      {date.substring(5).replace('-', '월 ')}일
                    </span>
                    {!isEditingThis ? (
                      <span className="font-bold text-yuri-900">{h.name}</span>
                    ) : (
                      <input spellCheck={false}
                        type="text"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        className="px-2 py-1 text-sm border border-yuri-300 rounded outline-none"
                      />
                    )}
                    
                    {h.isCustom ? (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-600">직접 추가</span>
                    ) : (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-200 text-gray-600">자동</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!isEditingThis ? (
                      <>
                        <button 
                          onClick={() => startEditAuto(date, h.name, h.isRedDay)}
                          className="text-xs font-bold text-yuri-500 hover:text-accent"
                        >수정</button>
                        
                        {!h.isCustom ? (
                          <>
                            <button 
                              onClick={() => handleHideDate(date, h.name)}
                              className="text-xs font-bold text-yuri-500 hover:text-red-500"
                            >올해만 삭제</button>
                            {h.originalRuleName && (
                              <button 
                                onClick={() => handleHideRule(h.originalRuleName!)}
                                className="text-xs font-bold text-yuri-500 hover:text-red-500"
                              >영구 삭제</button>
                            )}
                          </>
                        ) : (
                          <button 
                            onClick={() => handleDeleteCustom(h.id)}
                            className="text-xs font-bold text-red-400 hover:text-red-600"
                          >삭제</button>
                        )}
                      </>
                    ) : (
                      <>
                        <button onClick={saveEditAuto} className="text-xs font-bold text-blue-600 hover:text-blue-700">저장</button>
                        <button onClick={cancelEditAuto} className="text-xs font-bold text-gray-500 hover:text-gray-700">취소</button>
                      </>
                    )}
                  </div>
                </div>
                {isEditingThis && (
                  <div className="flex items-center gap-2 ml-14 mt-1">
                    <label className="flex items-center gap-1 text-xs cursor-pointer">
                      <input type="checkbox" checked={editRedDay} onChange={e => setEditRedDay(e.target.checked)} />
                      쉬는 날 (빨간 글씨)
                    </label>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-yuri-200 p-6">
        <h3 className="font-bold text-yuri-800 mb-4 text-sm flex items-center gap-2">
          <span className="w-1.5 h-4 bg-accent rounded-full" />
          예외 공휴일 추가
        </h3>
        <form onSubmit={handleAddCustom} className="flex flex-col gap-4">
          <div className="flex gap-2">
            <input spellCheck={false}
              type="date"
              value={newDate}
              onChange={e => setNewDate(e.target.value)}
              className="px-4 py-2 bg-yuri-50 border border-yuri-200 rounded-lg outline-none focus:border-accent text-sm flex-1"
              required
            />
            <input spellCheck={false}
              type="text"
              placeholder="공휴일/기념일 이름 (예: 임시공휴일)"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              className="px-4 py-2 bg-yuri-50 border border-yuri-200 rounded-lg outline-none focus:border-accent text-sm flex-[2]"
              required
            />
          </div>
          <div className="flex items-center justify-between mt-2">
            <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-yuri-700">
              <input 
                type="checkbox" 
                checked={isRedDay} 
                onChange={e => setIsRedDay(e.target.checked)}
                className="w-4 h-4 accent-accent"
              />
              쉬는 날 (빨간 글씨 표시)
            </label>
            <button 
              type="submit"
              className="bg-accent hover:bg-accent/90 text-white px-6 py-2 rounded-lg font-bold text-sm transition-colors"
            >
              추가하기
            </button>
          </div>
        </form>
      </div>

    </div>
  )
}

export default HolidaySection
