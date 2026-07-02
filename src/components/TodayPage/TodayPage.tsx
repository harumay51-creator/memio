import React, { useMemo } from 'react'
import { useAppStore } from '../../store/AppStore'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

const isToday = (isoDate: string) => {
  const d = new Date(isoDate)
  const today = new Date()
  return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate()
}

const TodayPage: React.FC = () => {
  const { tasks, events, notes, toggleTask } = useAppStore()

  const todayStr = useMemo(() => {
    const d = new Date()
    return `${d.getMonth() + 1}월 ${d.getDate()}일 ${WEEKDAYS[d.getDay()]}요일`
  }, [])

  // 1. Pending Tasks
  const pendingTasks = useMemo(() => {
    return tasks.filter(t => !t.done).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [tasks])

  // 2. Today's Events
  const todayEvents = useMemo(() => {
    return events
      .filter(e => isToday(e.scheduledDate ?? e.createdAt))
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  }, [events])

  // 3. Recent Notes (top 5)
  const recentNotes = useMemo(() => {
    return [...notes]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
  }, [notes])

  return (
    <div className="flex-1 h-full bg-white overflow-y-auto">
      <div className="max-w-4xl mx-auto px-10 py-12 pb-32">
        {/* Header */}
        <header className="mb-12">
          <p className="text-yuri-400 font-semibold mb-1 tracking-wide uppercase text-sm">Today</p>
          <h1 className="text-4xl font-extrabold text-yuri-900 tracking-tight">{todayStr}</h1>
        </header>

        <div className="flex flex-col gap-14">
          {/* ── 1. 진행 중인 업무 ─────────────────────────────────── */}
          <section>
            <h2 className="text-lg font-bold text-yuri-800 mb-5 flex items-center gap-2">
              <span className="w-1.5 h-6 bg-yuri-400 rounded-full inline-block"></span>
              진행 중인 업무
              <span className="text-sm font-medium text-yuri-400 bg-yuri-100 px-2 py-0.5 rounded-full ml-1">
                {pendingTasks.length}
              </span>
            </h2>
            
            {pendingTasks.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {pendingTasks.map(t => (
                  <li key={t.id} className="flex items-start gap-4 p-4 hover:bg-yuri-50/50 rounded-xl transition-colors group">
                    <button
                      onClick={() => toggleTask(t.id)}
                      className="w-5 h-5 rounded border-2 border-yuri-300 text-transparent flex items-center justify-center shrink-0 mt-0.5 transition-all group-hover:border-accent hover:border-accent/80"
                    >
                      <span className="text-xs">✓</span>
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-semibold text-yuri-800">{t.text}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-yuri-400 p-4 border border-dashed border-yuri-200 rounded-xl">진행 중인 업무가 없습니다.</p>
            )}
          </section>

          {/* ── 2. 오늘 일정 ─────────────────────────────────────── */}
          <section>
            <h2 className="text-lg font-bold text-yuri-800 mb-5 flex items-center gap-2">
              <span className="w-1.5 h-6 bg-amber-400 rounded-full inline-block"></span>
              오늘 일정
            </h2>
            
            {todayEvents.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {todayEvents.map(e => (
                  <li key={e.id} className="flex items-start gap-4 p-4 hover:bg-yuri-50/50 rounded-xl transition-colors">
                    <div className="w-2 h-2 rounded-full bg-amber-400 mt-2 shrink-0"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-medium text-yuri-900">{e.text}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-yuri-400 p-4 border border-dashed border-yuri-200 rounded-xl">오늘 예정된 일정이 없습니다.</p>
            )}
          </section>

          {/* ── 3. 최근 메모 ─────────────────────────────────────── */}
          <section>
            <h2 className="text-lg font-bold text-yuri-800 mb-5 flex items-center gap-2">
              <span className="w-1.5 h-6 bg-gray-400 rounded-full inline-block"></span>
              최근 메모
            </h2>
            
            {recentNotes.length > 0 ? (
              <ul className="flex flex-col gap-3">
                {recentNotes.map(n => (
                  <li key={n.id} className="p-5 border border-yuri-100 bg-yuri-50/30 rounded-2xl hover:bg-white hover:shadow-sm hover:border-yuri-200 transition-all">
                    <p className="text-yuri-800 text-sm whitespace-pre-wrap leading-relaxed">{n.text}</p>
                    <p className="text-xs text-yuri-400 mt-3 font-medium">
                      {new Date(n.createdAt).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-yuri-400 p-4 border border-dashed border-yuri-200 rounded-xl">작성된 메모가 없습니다.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

export default TodayPage
