import React, { useState, useMemo, useEffect } from 'react'
import { useAppStore } from '../../store/AppStore'

type HistoryItem = {
  id: string
  type: 'task' | 'event' | 'memo'
  text: string
  date: Date
  done?: boolean
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

const HistoryPage: React.FC = () => {
  const { tasks, events, notes } = useAppStore()

  // 1. Collect all items
  const allItems = useMemo(() => {
    const items: HistoryItem[] = []
    
    tasks.forEach(t => items.push({ 
      id: t.id, type: 'task', text: t.text, date: new Date(t.createdAt), done: t.done 
    }))
    
    events.forEach(e => items.push({ 
      id: e.id, type: 'event', text: e.text, date: new Date(e.scheduledDate ?? e.createdAt) 
    }))
    
    notes.forEach(n => items.push({ 
      id: n.id, type: 'memo', text: n.text, date: new Date(n.createdAt) 
    }))

    // Sort all by date descending (latest first)
    return items.sort((a, b) => b.date.getTime() - a.date.getTime())
  }, [tasks, events, notes])

  // 2. Group by month for sidebar
  const monthGroups = useMemo(() => {
    const groups = new Map<string, { label: string, items: HistoryItem[] }>()
    
    allItems.forEach(item => {
      const year = item.date.getFullYear()
      const month = item.date.getMonth() + 1
      const key = `${year}-${month.toString().padStart(2, '0')}`
      const label = `${year}년 ${month}월`
      
      if (!groups.has(key)) {
        groups.set(key, { label, items: [] })
      }
      groups.get(key)!.items.push(item)
    })

    return Array.from(groups.entries()).sort((a, b) => b[0].localeCompare(a[0]))
  }, [allItems])

  const [selMonthKey, setSelMonthKey] = useState<string | null>(null)

  // Default to first (latest) month if none selected
  useEffect(() => {
    if (!selMonthKey && monthGroups.length > 0) {
      setSelMonthKey(monthGroups[0][0])
    }
  }, [selMonthKey, monthGroups])

  // 3. Group selected month's items by date
  const selectedMonthItems = useMemo(() => {
    if (!selMonthKey) return []
    const group = monthGroups.find(g => g[0] === selMonthKey)
    return group ? group[1].items : []
  }, [selMonthKey, monthGroups])

  const dayGroups = useMemo(() => {
    const groups = new Map<string, { dateStr: string, date: Date, items: HistoryItem[] }>()
    
    selectedMonthItems.forEach(item => {
      const year = item.date.getFullYear()
      const month = item.date.getMonth() + 1
      const date = item.date.getDate()
      const day = item.date.getDay()
      
      const key = `${year}-${month.toString().padStart(2, '0')}-${date.toString().padStart(2, '0')}`
      const dateStr = `${month}월 ${date}일 ${WEEKDAYS[day]}요일`
      
      if (!groups.has(key)) {
        groups.set(key, { dateStr, date: new Date(year, month - 1, date), items: [] })
      }
      groups.get(key)!.items.push(item)
    })

    // Sort days descending
    const sortedDays = Array.from(groups.values()).sort((a, b) => b.date.getTime() - a.date.getTime())
    
    // Sort items inside each day (latest first)
    sortedDays.forEach(day => {
      day.items.sort((a, b) => b.date.getTime() - a.date.getTime())
    })
    
    return sortedDays
  }, [selectedMonthItems])

  return (
    <div className="flex h-full w-full bg-white overflow-hidden">
      {/* ── Left: Month List ────────────────────────────────────────────── */}
      <aside className="w-64 border-r border-yuri-100 bg-yuri-50/30 flex flex-col shrink-0 h-full">
        <header className="shrink-0 h-16 border-b border-yuri-100 flex items-center px-6">
          <h1 className="text-xl font-bold text-yuri-900 tracking-tight">기록</h1>
        </header>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-1">
          {monthGroups.length === 0 ? (
            <p className="text-sm text-yuri-400 p-4 text-center">기록이 없습니다.</p>
          ) : (
            monthGroups.map(([key, group]) => {
              const isSelected = selMonthKey === key
              return (
                <button
                  key={key}
                  onClick={() => setSelMonthKey(key)}
                  className={`
                    w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all
                    ${isSelected 
                      ? 'bg-white border border-yuri-200 text-yuri-900 shadow-sm' 
                      : 'border border-transparent text-yuri-600 hover:bg-yuri-100/50 hover:text-yuri-800'
                    }
                  `}
                >
                  {group.label}
                  <span className={`ml-2 text-xs font-normal ${isSelected ? 'text-yuri-500' : 'text-yuri-400'}`}>
                    {group.items.length}
                  </span>
                </button>
              )
            })
          )}
        </div>
      </aside>

      {/* ── Right: Timeline ────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col h-full bg-white overflow-y-auto relative min-w-0">
        <div className="max-w-3xl w-full mx-auto p-10 pb-32">
          {dayGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-yuri-400">
              <span className="text-3xl mb-4">📭</span>
              <p>이 달에는 남겨진 기록이 없습니다.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-12">
              {dayGroups.map(dayGroup => (
                <section key={dayGroup.dateStr}>
                  {/* Date Header */}
                  <div className="sticky top-0 bg-white/95 backdrop-blur py-3 mb-4 z-10 border-b border-yuri-100/50">
                    <h2 className="text-lg font-bold text-yuri-900 tracking-tight">{dayGroup.dateStr}</h2>
                  </div>
                  
                  {/* Items List */}
                  <ul className="flex flex-col gap-4 relative before:absolute before:inset-y-2 before:left-[11px] before:w-0.5 before:bg-yuri-100">
                    {dayGroup.items.map(item => {
                      const timeStr = item.date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
                      
                      return (
                        <li key={`${item.type}-${item.id}`} className="flex items-start gap-4 relative">
                          {/* Dot */}
                          <div className="w-6 h-6 rounded-full bg-white border-2 border-yuri-200 flex items-center justify-center z-10 shrink-0 mt-0.5">
                            <div className={`w-2 h-2 rounded-full ${
                              item.type === 'task' ? 'bg-yuri-400' : 
                              item.type === 'event' ? 'bg-amber-400' : 
                              'bg-gray-400'
                            }`} />
                          </div>
                          
                          {/* Content */}
                          <div className="flex-1 bg-yuri-50/50 border border-yuri-100 rounded-xl p-3.5 hover:border-yuri-200 hover:bg-white transition-colors">
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wider shrink-0 ${
                                item.type === 'task' ? 'bg-yuri-100 text-yuri-700' :
                                item.type === 'event' ? 'bg-amber-100 text-amber-700' :
                                'bg-gray-200 text-gray-700'
                              }`}>
                                {item.type === 'task' ? '업무' : item.type === 'event' ? '일정' : '메모'}
                              </span>
                              <span className="text-xs text-yuri-400 font-medium">{timeStr}</span>
                            </div>
                            
                            <p className={`text-sm leading-relaxed ${item.done ? 'text-yuri-400 line-through' : 'text-yuri-800'}`}>
                              {item.text}
                            </p>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default HistoryPage
