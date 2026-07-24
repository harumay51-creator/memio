import React, { useState, useEffect } from 'react'
import { useDiaryStore, DiaryMemo } from '../../store/DiaryStore'
import Emoji from '../common/Emoji'

const StarDoodle = () => (
  <svg className="absolute -top-3 -right-8 w-8 h-8 text-[#FFD54F] opacity-80 rotate-12 pointer-events-none" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M 50 10 Q 55 35 70 45 Q 90 50 70 60 Q 55 70 50 90 Q 45 70 25 60 Q 10 50 30 45 Q 45 35 50 10" fill="currentColor" />
  </svg>
)

const UnderlineDoodle = () => (
  <svg className="absolute -bottom-2 left-0 w-12 h-2 text-[#81C784] opacity-80 pointer-events-none" viewBox="0 0 100 20" preserveAspectRatio="none" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round">
    <path d="M 5,10 Q 30,15 50,8 T 95,12" />
  </svg>
)

const CloudDoodle = () => (
  <svg className="absolute -top-4 right-10 w-12 h-12 text-[#4FC3F7] opacity-60 pointer-events-none" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M 30,60 Q 20,60 20,50 Q 20,40 30,40 Q 35,25 50,25 Q 65,25 70,40 Q 85,40 85,55 Q 85,70 70,70 L 35,70" />
  </svg>
)

const ArrowDoodle = () => (
  <svg className="absolute top-1 -left-6 w-5 h-5 text-[#F06292] opacity-70 -rotate-12 pointer-events-none" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M 20,80 Q 50,50 80,20 M 50,20 L 80,20 L 80,50" />
  </svg>
)

const SparkleDoodle = ({ className = "" }) => (
  <svg className={`absolute pointer-events-none text-[#FFB74D] opacity-80 ${className}`} viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M 50 10 L 50 90 M 10 50 L 90 50" />
    <circle cx="50" cy="50" r="10" fill="currentColor" />
  </svg>
)

const WavyLineDoodle = ({ className = "" }) => (
  <svg className={`absolute pointer-events-none text-[#64B5F6] opacity-70 ${className}`} viewBox="0 0 100 20" preserveAspectRatio="none" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round">
    <path d="M 0 10 Q 12 0 25 10 T 50 10 T 75 10 T 100 10" />
  </svg>
)

const LeafDoodle = ({ className = "" }) => (
  <svg className={`absolute pointer-events-none text-[#81C784] opacity-80 ${className}`} viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M 20 80 Q 20 20 50 20 Q 80 20 80 50 Q 80 80 20 80" fill="rgba(129, 199, 132, 0.3)" />
    <path d="M 20 80 L 80 20" />
  </svg>
)

const CrownDoodle = ({ className = "" }) => (
  <svg className={`absolute pointer-events-none text-[#FFD54F] opacity-90 ${className}`} viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M 10 80 L 90 80 L 90 30 L 70 50 L 50 20 L 30 50 L 10 30 Z" fill="rgba(255, 213, 79, 0.3)" />
  </svg>
)

const ZigzagDoodle = ({ className = "" }) => (
  <svg className={`absolute pointer-events-none text-[#FF8A65] opacity-70 ${className}`} viewBox="0 0 100 20" preserveAspectRatio="none" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M 0 15 L 10 5 L 20 15 L 30 5 L 40 15 L 50 5 L 60 15 L 70 5 L 80 15 L 90 5 L 100 15" />
  </svg>
)

const RibbonDoodle = ({ className = "" }) => (
  <svg className={`absolute pointer-events-none text-[#BA68C8] opacity-80 ${className}`} viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M 30 50 Q 10 20 30 20 Q 50 20 50 50 Z M 70 50 Q 90 20 70 20 Q 50 20 50 50 Z M 50 50 L 40 90 M 50 50 L 60 90" fill="rgba(186, 104, 200, 0.3)" />
  </svg>
)

const getHash = (idString: string) => {
  let hash = 0;
  for (let i = 0; i < idString.length; i++) {
    hash = idString.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

const CornerDoodle = ({ idString }: { idString: string }) => {
  const hash = getHash(idString);
  if (hash % 3 !== 0) return null; // ~1/3 chance
  
  const doodleType = hash % 6;
  const positionClass = hash % 2 === 0 ? "-top-3 -right-3 rotate-12" : "-bottom-3 -left-3 -rotate-12";
  const sizeClass = "w-8 h-8";
  const cls = `${positionClass} ${sizeClass} z-20`;
  
  switch(doodleType) {
    case 0: return <SparkleDoodle className={cls} />
    case 1: return <WavyLineDoodle className={`${positionClass} w-10 h-4 z-20`} />
    case 2: return <LeafDoodle className={cls} />
    case 3: return <CrownDoodle className={cls} />
    case 4: return <ZigzagDoodle className={`${positionClass} w-10 h-4 z-20`} />
    case 5: return <RibbonDoodle className={cls} />
    default: return null;
  }
}

interface DiaryPanelProps {
  mode: 'day' | 'month'
  selDay: Date
  year: number
  month: number
}

const EMOJI_CATEGORIES = [
  { name: '감정', emojis: ['😀', '🥰', '😂', '🥲', '🥺', '😡', '😴', '😎', '🤔', '😭', '🤯', '🥳', '😱', '🤤', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '😵', '🤐'] },
  { name: '날씨', emojis: ['☀️', '🌤️', '☁️', '🌧️', '⛈️', '❄️', '💨', '🌈', '🌪️', '🌫️', '☔', '⚡', '⛄', '🔥', '💧', '🌊'] },
  { name: '음식', emojis: ['🍎', '🍔', '🍕', '🍣', '🍜', '☕', '🍺', '🍰', '🍿', '🍩', '🥑', '🥩', '🍗', '🌮', '🥗', '🍙', '🍨', '🍉', '🍇', '🍓'] },
  { name: '활동', emojis: ['💻', '📚', '🎮', '🏋️', '🚗', '🏠', '✈️', '🎵', '🎬', '🎨', '🎤', '⚽', '🏀', '🏊', '🚴', '🛒', '🛍️', '⛺'] },
  { name: '상태', emojis: ['👍', '👎', '👏', '🙌', '💪', '🙏', '🤝', '✌️', '👌', '❤️', '💔', '💤', '💢', '💡', '✅', '❌'] }
]

const POST_IT_THEMES = [
  { bg: '#D8D4F0', text: '#3A316E' }, // Lavender
  { bg: '#C4E0F0', text: '#1C435E' }, // Sky Blue
  { bg: '#C4EDDD', text: '#1D5947' }, // Mint
  { bg: '#F0D4DC', text: '#662B3A' }, // Ice Coral
  { bg: '#E0D0F0', text: '#422966' }, // Lilac
  { bg: '#E8EDC0', text: '#48521A' }, // Cool Lemon
]

const getPostItStyle = (idString: string, index?: number) => {
  const hash = getHash(idString);
  const themeIndex = index !== undefined ? index : hash;
  const theme = POST_IT_THEMES[themeIndex % POST_IT_THEMES.length];
  const rotation = (Math.abs(hash) % 7) - 3; // -3 to +3 degrees
  return {
    backgroundColor: theme.bg,
    color: theme.text,
    transform: `rotate(${rotation}deg)`,
    boxShadow: '2px 4px 10px rgba(0,0,0,0.15)',
    borderRadius: '2px 12px 12px 2px'
  };
}

const QuestionItem = ({ q, initialAnswer, saveAnswer, deleteAnswer, index }: { q: any, initialAnswer: string, saveAnswer: (val: string) => void, deleteAnswer: () => void, index?: number }) => {
  const [localVal, setLocalVal] = useState(initialAnswer)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  const handleResize = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }

  useEffect(() => {
    setLocalVal(initialAnswer)
    setTimeout(handleResize, 0)
  }, [initialAnswer])

  return (
    <div className="group relative transition-all duration-300 hover:scale-105 z-0 hover:z-10 p-4 w-36 min-h-[9rem] h-fit flex flex-col shrink-0" style={getPostItStyle(q.id, index)}>
      <CornerDoodle idString={q.id} />
      <div className="flex justify-between items-start mb-1 gap-2">
        <div className="text-[11px] font-bold font-diary opacity-70" style={{ color: 'inherit' }}>{q.text}</div>
        <button 
          onClick={deleteAnswer}
          className="w-5 h-5 flex items-center justify-center rounded text-[#717A8C] hover:text-[#EF6A7B] opacity-0 group-hover:opacity-100 transition-opacity text-[10px] shrink-0"
        >
          ✕
        </button>
      </div>
      <textarea
        ref={textareaRef}
        className="flex-1 w-full bg-transparent resize-none outline-none text-[15px] leading-relaxed transition-all font-diary overflow-hidden"
        style={{ color: 'inherit' }}
        placeholder="답변을 입력하세요..."
        rows={1}
        value={localVal}
        onChange={(e) => {
          setLocalVal(e.target.value)
          handleResize()
        }}
        onBlur={() => saveAnswer(localVal)}
        spellCheck={false}
      />
    </div>
  )
}

const DiaryPanel: React.FC<DiaryPanelProps> = ({ mode, selDay, year, month }) => {
  const { 
    diaries, monthlyDiaries, settings,
    saveDayDiaryEmojis, saveDayDiaryAnswer, deleteDayDiaryAnswer,
    addDayDiaryMemo, deleteDayDiaryMemo,
    saveMonthlyDiary, updateTheme
  } = useDiaryStore()

  const isAurora = settings.theme === 'aurora'

  const dateKey = `${selDay.getFullYear()}-${String(selDay.getMonth() + 1).padStart(2, '0')}-${String(selDay.getDate()).padStart(2, '0')}`
  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`
  
  console.log('[DEBUG DiaryPanel] settings.theme:', settings.theme, 'isAurora:', isAurora)

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
          <h1 className="text-xl font-semibold text-[#1C1C1E] tracking-tight font-diary">
            {year}년 {month + 1}월 메모
          </h1>
        </header>
        <div className="flex-1 flex flex-col min-h-0 bg-white rounded-xl border border-[#E5E5EA] shadow-sm p-4 relative">
          <textarea
            className="flex-1 w-full bg-transparent resize-none outline-none text-base text-[#1C1C1E] placeholder:text-[#A0AABF] leading-relaxed font-diary"
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
    <aside className={`relative flex-[6] flex flex-col h-full border-l border-[#E5E5EA] shrink-0 overflow-hidden px-6 py-6 ${isAurora ? 'bg-transparent' : 'bg-[#F9FAFB]'}`}>
      <header className="mb-6 shrink-0 text-center relative z-10 flex items-center justify-center">
        <h1 className="text-xl font-semibold text-[#1C1C1E] tracking-tight font-diary relative inline-block">
          {formattedDate}
          <StarDoodle />
        </h1>
        <button
          onClick={() => {
            console.log('[DEBUG DiaryPanel] Toggle button clicked. Current isAurora:', isAurora);
            updateTheme(isAurora ? 'default' : 'aurora');
          }}
          className="absolute right-0 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-white/50 hover:bg-white border border-white/60 shadow-sm transition-colors text-[#717A8C]"
        >
          {isAurora ? '기본 테마' : '✨ 오로라'}
        </button>
      </header>

      <div className="relative z-10 flex-1 min-h-0 overflow-y-auto pr-2 -mr-2 flex flex-col gap-6">
        
        {/* 1. Emoji Selector */}
        <section className="p-2">
          <div className="flex justify-between items-center mb-3 relative">
            <h2 className="text-[11px] font-bold text-[#717A8C] tracking-widest uppercase inline-block relative">
              오늘의 기분/날씨
            </h2>
            <CloudDoodle />
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
                <div key={idx} className={`w-10 h-10 rounded-full flex items-center justify-center p-2.5 ${isAurora ? 'bg-white/40 shadow-sm' : 'bg-white border border-[#E5E5EA] shadow-sm'}`}>
                  <Emoji emoji={emoji} className="w-full h-full animate-fade-in" />
                </div>
              ))
            ) : (
              <span className="text-sm text-[#A0AABF]">이모지를 선택해주세요</span>
            )}
          </div>
          
          {isEmojiPickerOpen && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setIsEmojiPickerOpen(false)}
              />
              <div className="mt-4 pt-4 border-t border-[#E5E5EA] flex flex-col gap-3 relative z-50 animate-slide-down">
                {EMOJI_CATEGORIES.map(cat => (
                  <div key={cat.name}>
                    <div className="text-[10px] text-[#717A8C] mb-1.5">{cat.name}</div>
                    <div className="flex flex-nowrap gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                      {cat.emojis.map(emoji => {
                        const isSelected = (dayDiary.emojis || []).includes(emoji)
                        return (
                          <button
                            key={emoji}
                            onClick={() => handleEmojiSelect(emoji)}
                            className={`w-9 h-9 p-2 flex items-center justify-center rounded-full shrink-0 transition-all ${
                              isSelected 
                                ? 'bg-[#8B7CF8] shadow-[0_2px_8px_rgba(139,124,248,0.4)] scale-110' 
                                : 'hover:bg-[#F0F0F5] grayscale-[0.2]'
                            }`}
                          >
                            <Emoji emoji={emoji} className="w-full h-full flex-shrink-0" />
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>

        {/* 2. Questions Snapshot */}
        <section className="p-2 flex flex-col gap-4">
          <div className="relative inline-block w-max">
            <h2 className="text-[11px] font-bold text-[#717A8C] tracking-widest uppercase">Q&A</h2>
            <UnderlineDoodle />
          </div>
          
          <div className="flex flex-row flex-wrap gap-2.5 items-start">
            {settings.questions.map((q, idx) => {
              const answerObj = (dayDiary.answers || []).find(a => a.questionId === q.id)
              const answerText = answerObj ? answerObj.answer : ''
              return (
                <QuestionItem 
                  key={q.id} 
                  q={q} 
                  initialAnswer={answerText} 
                  saveAnswer={(val) => saveDayDiaryAnswer(dateKey, q.id, q.text, val)} 
                  deleteAnswer={() => deleteDayDiaryAnswer(dateKey, q.id)}
                  index={idx}
                />
              )
            })}
            
            {/* Display snapshot answers that are no longer in settings.questions */}
            {(dayDiary.answers || []).filter(a => !settings.questions.some(q => q.id === a.questionId)).map((a, idx) => (
              <div key={a.questionId} className="group relative transition-all duration-300 hover:scale-105 z-0 hover:z-10 p-4 w-36 min-h-[9rem] h-fit flex flex-col shrink-0" style={getPostItStyle(a.questionId, idx + settings.questions.length)}>
                <CornerDoodle idString={a.questionId} />
                <div className="flex justify-between items-start mb-1 gap-2">
                  <div>
                    <div className="text-[11px] font-bold font-diary opacity-70" style={{ color: 'inherit' }}>{a.question} (과거 질문)</div>
                  </div>
                  <button 
                    onClick={() => deleteDayDiaryAnswer(dateKey, a.questionId)}
                    className="w-5 h-5 flex items-center justify-center rounded hover:opacity-50 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] shrink-0"
                    style={{ color: 'inherit' }}
                  >
                    ✕
                  </button>
                </div>
                <div className="flex-1 text-[15px] whitespace-pre-wrap font-diary leading-relaxed" style={{ color: 'inherit' }}>{a.answer}</div>
              </div>
            ))}
          </div>

          {settings.questions.length === 0 && (dayDiary.answers || []).length === 0 && (
            <div className="text-xs text-[#A0AABF]">설정에서 다이어리 질문을 추가해보세요.</div>
          )}
        </section>

        {/* 3. Free Memos */}
        <section className="p-2 flex flex-col gap-4 mb-8">
          <div className="relative inline-block w-max ml-6">
            <ArrowDoodle />
            <h2 className="text-[11px] font-bold text-[#717A8C] tracking-widest uppercase">MEMO</h2>
          </div>
          
          <form onSubmit={handleAddMemo} className="flex gap-2">
            <input
              type="text"
              value={newMemo}
              onChange={(e) => setNewMemo(e.target.value)}
              placeholder="자유롭게 기록을 남겨보세요..."
              className="flex-1 bg-white/30 border border-white/20 rounded-xl px-3 py-2.5 text-[13px] outline-none text-[#1C1C1E] placeholder:text-[#A0AABF] focus:border-white/50 focus:bg-white/40 transition-all font-diary"
              spellCheck={false}
            />
            <button type="submit" disabled={!newMemo.trim()} className="px-3 bg-white/40 border border-white/20 text-[#8B7CF8] rounded-xl font-bold text-xs hover:bg-white/60 disabled:opacity-30 transition-all">
              추가
            </button>
          </form>

          <div className="flex flex-row flex-wrap gap-2.5 items-start mt-2">
            {[...(dayDiary.memos || [])].reverse().map((memo: DiaryMemo, idx: number) => (
              <div key={memo.id} className="group relative transition-all duration-300 hover:scale-105 z-0 hover:z-10 p-5 w-36 min-h-[9rem] h-fit flex flex-col justify-between shrink-0" style={getPostItStyle(memo.id, idx + (dayDiary.answers || []).length)}>
                <CornerDoodle idString={memo.id} />
                <div className="flex justify-between items-start mb-2 gap-2">
                  <div className="flex-1 text-[14px] whitespace-pre-wrap leading-relaxed font-diary" style={{ color: 'inherit' }}>{memo.text}</div>
                  <button 
                    onClick={() => deleteDayDiaryMemo(dateKey, memo.id)}
                    className="w-5 h-5 flex items-center justify-center rounded hover:opacity-50 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] shrink-0"
                    style={{ color: 'inherit' }}
                  >
                    ✕
                  </button>
                </div>
                {memo.createdAt && (
                  <div className="text-[9px] opacity-40 font-diary mt-2 text-right" style={{ color: 'inherit' }}>
                    {new Intl.DateTimeFormat('ko-KR', { hour: 'numeric', minute: 'numeric', hour12: true }).format(new Date(memo.createdAt))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </aside>
  )
}

export default DiaryPanel
