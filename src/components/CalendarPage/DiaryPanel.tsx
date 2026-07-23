import React, { useState, useEffect } from 'react'
import { useDiaryStore, DiaryMemo } from '../../store/DiaryStore'

interface DiaryPanelProps {
  mode: 'day' | 'month'
  selDay: Date
  year: number
  month: number
}

const EMOJI_CATEGORIES = [
  { name: '감정', emojis: ['😀', '🥰', '😂', '🥲', '🥺', '😡', '😴', '😎'] },
  { name: '날씨', emojis: ['☀️', '🌤️', '☁️', '🌧️', '⛈️', '❄️', '💨', '🌈'] },
  { name: '일상', emojis: ['💻', '📚', '☕', '🍺', '🎮', '🏋️', '🚗', '🏠'] },
]

const DiaryPanel: React.FC<DiaryPanelProps> = ({ mode, selDay, year, month }) => {
  const { 
    diaries, monthlyDiaries, settings,
    saveDayDiaryEmojis, saveDayDiaryAnswer, addDayDiaryMemo, deleteDayDiaryMemo,
    saveMonthlyDiary
  } = useDiaryStore()

  const dateKey = `${selDay.getFullYear()}-${String(selDay.getMonth() + 1).padStart(2, '0')}-${String(selDay.getDate()).padStart(2, '0')}`
  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`

  const dayDiary = diaries[dateKey] || { dateKey, emojis: [], answers: [], memos: [] }
  const monthlyDiary = monthlyDiaries[monthKey] || { monthKey, text: '' }

  const [newMemo, setNewMemo] = useState('')
  const [monthlyText, setMonthlyText] = useState('')
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false)

  useEffect(() => {
    setMonthlyText(monthlyDiary.text)
  }, [monthlyDiary.text, monthKey])

  const handleEmojiSelect = (emoji: string) => {
    let newEmojis = [...(dayDiary.emojis || [])]
    if (newEmojis.includes(emoji)) {
      newEmojis = newEmojis.filter(e => e !== emoji)
    } else {
      if (newEmojis.length < 3) {
        newEmojis.push(emoji)
      } else {
        return // Max 3
      }
    }
    saveDayDiaryEmojis(dateKey, newEmojis)
  }

  const handleAddMemo = (e: React.FormEvent) => {
    e.preventDefault()
    if (newMemo.trim()) {
      addDayDiaryMemo(dateKey, newMemo.trim())
      setNewMemo('')
    }
  }

  const handleSaveMonthly = () => {
    saveMonthlyDiary(monthKey, monthlyText)
  }

  if (mode === 'month') {
    return (
      <aside className="relative flex-[6] flex flex-col h-full bg-[#F9FAFB] border-l border-[#E5E5EA] shrink-0 overflow-hidden px-6 py-8">
        <header className="mb-6 shrink-0">
          <h1 className="text-lg font-semibold text-[#1C1C1E] tracking-tight">
            {year}년 {month + 1}월 메모
          </h1>
        </header>
        <div className="flex-1 flex flex-col min-h-0 bg-white rounded-xl border border-[#E5E5EA] shadow-sm p-4 relative">
          <textarea
            className="flex-1 w-full bg-transparent resize-none outline-none text-sm text-[#1C1C1E] placeholder:text-[#A0AABF] leading-relaxed"
            placeholder="이달의 기억하고 싶은 일들을 자유롭게 기록해보세요."
            value={monthlyText}
            onChange={(e) => setMonthlyText(e.target.value)}
            onBlur={handleSaveMonthly}
            spellCheck={false}
          />
        </div>
      </aside>
    )
  }

  // mode === 'day'
  const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
  const formattedDate = `${selDay.getMonth() + 1}월 ${selDay.getDate()}일 (${WEEKDAYS[selDay.getDay()]})`

  return (
    <aside className="relative flex-[6] flex flex-col h-full bg-[#F9FAFB] border-l border-[#E5E5EA] shrink-0 overflow-hidden px-6 py-6">
      <header className="mb-6 shrink-0 text-center">
        <h1 className="text-lg font-semibold text-[#1C1C1E] tracking-tight">
          {formattedDate}
        </h1>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto pr-2 -mr-2 flex flex-col gap-6">
        
        {/* 1. Emoji Selector */}
        <section className="bg-white rounded-2xl border border-[#E5E5EA] shadow-sm p-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-[11px] font-bold text-[#717A8C] tracking-widest uppercase">오늘의 기분/날씨</h2>
            <button 
              onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
              className="text-[#8B7CF8] text-[11px] font-bold hover:underline"
            >
              {isEmojiPickerOpen ? '닫기' : '선택하기'}
            </button>
          </div>
          
          <div className="flex gap-2 min-h-[40px] items-center justify-center">
            {(dayDiary.emojis || []).length > 0 ? (
              (dayDiary.emojis || []).map((emoji: string, idx: number) => (
                <span key={idx} className="text-3xl animate-fade-in">{emoji}</span>
              ))
            ) : (
              <span className="text-sm text-[#A0AABF]">이모지를 선택해주세요</span>
            )}
          </div>

          {isEmojiPickerOpen && (
            <div className="mt-4 pt-4 border-t border-[#E5E5EA] animate-fade-in flex flex-col gap-3">
              {EMOJI_CATEGORIES.map(cat => (
                <div key={cat.name}>
                  <div className="text-[10px] text-[#717A8C] mb-1.5">{cat.name}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {cat.emojis.map(emoji => {
                      const isSelected = (dayDiary.emojis || []).includes(emoji)
                      return (
                        <button
                          key={emoji}
                          onClick={() => handleEmojiSelect(emoji)}
                          className={`text-xl w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${isSelected ? 'bg-[#F1EEFF] border border-[#8B7CF8]' : 'hover:bg-[#F9FAFB] border border-transparent'}`}
                        >
                          {emoji}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 2. Questions Snapshot */}
        <section className="flex flex-col gap-3">
          <h2 className="text-[11px] font-bold text-[#717A8C] tracking-widest uppercase px-1">Q&A</h2>
          
          {settings.questions.map(q => {
            const answerObj = (dayDiary.answers || []).find(a => a.questionId === q.id)
            const answerText = answerObj ? answerObj.answer : ''
            
            return (
              <div key={q.id} className="bg-white rounded-xl border border-[#E5E5EA] shadow-sm p-4">
                <div className="text-xs font-semibold text-[#8B7CF8] mb-2">{q.text}</div>
                <textarea
                  className="w-full bg-transparent resize-none outline-none text-xs text-[#1C1C1E] placeholder:text-[#A0AABF] leading-relaxed"
                  placeholder="답변을 입력하세요..."
                  rows={2}
                  value={answerText}
                  onChange={(e) => saveDayDiaryAnswer(dateKey, q.id, q.text, e.target.value)}
                  spellCheck={false}
                />
              </div>
            )
          })}
          
          {/* Display snapshot answers that are no longer in settings.questions */}
          {(dayDiary.answers || []).filter(a => !settings.questions.some(q => q.id === a.questionId)).map(a => (
            <div key={a.questionId} className="bg-white rounded-xl border border-[#E5E5EA] shadow-sm p-4 opacity-70">
              <div className="text-[10px] font-bold text-[#A0AABF] mb-1">과거 질문</div>
              <div className="text-xs font-semibold text-[#8B7CF8] mb-2">{a.question}</div>
              <div className="text-xs text-[#1C1C1E] whitespace-pre-wrap">{a.answer}</div>
            </div>
          ))}

          {settings.questions.length === 0 && (dayDiary.answers || []).length === 0 && (
            <div className="text-xs text-[#A0AABF] px-1">설정에서 다이어리 질문을 추가해보세요.</div>
          )}
        </section>

        {/* 3. Free Memos */}
        <section className="flex flex-col gap-3 pb-8">
          <h2 className="text-[11px] font-bold text-[#717A8C] tracking-widest uppercase px-1">MEMO</h2>
          
          <form onSubmit={handleAddMemo} className="bg-white rounded-xl border border-[#E5E5EA] shadow-sm flex overflow-hidden">
            <input
              type="text"
              value={newMemo}
              onChange={(e) => setNewMemo(e.target.value)}
              placeholder="자유롭게 기록을 남겨보세요..."
              className="flex-1 px-4 py-3 text-xs outline-none text-[#1C1C1E] placeholder:text-[#A0AABF]"
              spellCheck={false}
            />
            <button type="submit" disabled={!newMemo.trim()} className="px-4 text-[#8B7CF8] font-bold text-xs disabled:opacity-30">
              추가
            </button>
          </form>

          <div className="flex flex-col gap-2">
            {(dayDiary.memos || []).map((memo: DiaryMemo) => (
              <div key={memo.id} className="group bg-white rounded-xl border border-[#E5E5EA] p-3 flex items-start gap-3 relative">
                <div className="flex-1 text-xs text-[#1C1C1E] whitespace-pre-wrap leading-relaxed">{memo.text}</div>
                <button 
                  onClick={() => deleteDayDiaryMemo(dateKey, memo.id)}
                  className="w-5 h-5 flex items-center justify-center rounded text-[#A0AABF] hover:text-[#EF6A7B] opacity-0 group-hover:opacity-100 transition-opacity text-[10px] shrink-0"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </aside>
  )
}

export default DiaryPanel
