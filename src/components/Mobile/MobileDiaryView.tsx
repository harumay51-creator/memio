import { useState, useEffect, useRef } from 'react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { useDiaryStore, DiaryMemo } from '../../store/DiaryStore'
import Emoji from '../common/Emoji'
import DiaryTextEditor from '../common/DiaryTextEditor'

const DIARY_TAGS = [
  { name: '뿌듯', color: '#CFE8DC' }, { name: '설렘', color: '#DCCFF3' }, { name: '기쁨', color: '#E2D8EF' },
  { name: '행복', color: '#CFE8DC' }, { name: '만족', color: '#CFE7F4' }, { name: '후련', color: '#D4DFEC' },
  { name: '기대', color: '#DCCFF3' }, { name: '무난', color: '#CFE7F4' }, { name: '평온', color: '#CFE7F4' },
  { name: '힘듦', color: '#D4DFEC' }, { name: '우울', color: '#D4DFEC' }, { name: '눈물', color: '#CFE7F4' },
  { name: '짜증', color: '#E2D8EF' }, { name: '귀찮', color: '#D4DFEC' }, { name: '답답', color: '#D4DFEC' },
  { name: '불안', color: '#DCCFF3' }, { name: '빡침', color: '#E2D8EF' }, { name: '웃김', color: '#DCCFF3' },
  { name: '감사', color: '#CFE8DC' }, { name: '고민', color: '#E2D8EF' }, { name: '홧팅', color: '#CFE8DC' },
];

const DIARY_TAG_GROUPS = [
  { label: '좋음', tags: ['뿌듯', '설렘', '기쁨', '행복', '만족', '후련', '기대', '무난', '평온'] },
  { label: '안좋음', tags: ['힘듦', '우울', '눈물', '짜증', '귀찮', '답답', '불안', '빡침'] },
  { label: '기타', tags: ['웃김', '감사', '고민', '홧팅'] }
];

const EMOJI_CATEGORIES = [
  { name: '날씨', emojis: ['☀️', '🌤️', '⛅', '☁️', '🌧️', '⛈️', '🌨️', '🌬️'] },
  { name: '표정', emojis: ['😀', '🥰', '😂', '🥲', '😎', '🤔', '😐', '😔', '😭', '😡', '😱', '😴'] },
  { name: '건강/컨디션', emojis: ['💪', '🏃', '🤒', '🤕', '🥱', '🤢', '💊', '🔋', '🪫'] },
  { name: '활동', emojis: ['💻', '📚', '🎮', '🎬', '🎵', '🎨', '✈️', '🚗', '🛍️', '🧹', '🍽️', '☕', '🍺'] },
]

const QuestionItem = ({ q, initialAnswer, saveAnswer, deleteAnswer }: { q: any, initialAnswer: string, saveAnswer: (v: string) => void, deleteAnswer: () => void }) => {
  const [localVal, setLocalVal] = useState(initialAnswer)

  useEffect(() => {
    setLocalVal(initialAnswer)
  }, [initialAnswer])

  return (
    <div className="group relative transition-all duration-300 flex flex-col shrink-0 cursor-text w-full min-h-0 py-4 px-2 bg-transparent text-[#3D3833] border-b border-[#EDE6D6]">
      <div className="flex justify-between items-start mb-1 gap-2">
        <div className="text-[11px] font-bold font-diary opacity-70">{q.text}</div>
        <button 
          onClick={deleteAnswer}
          className="w-5 h-5 flex items-center justify-center rounded text-[#717A8C] hover:text-[#EF6A7B] opacity-30 group-hover:opacity-100 transition-opacity text-[10px] shrink-0"
        >
          ✕
        </button>
      </div>
      <DiaryTextEditor
        initialContent={localVal}
        onChange={(html) => setLocalVal(html)}
        onBlur={() => {
          const current = localVal === '<p></p>' ? '' : localVal;
          const initial = initialAnswer === '<p></p>' ? '' : initialAnswer;
          if (current !== initial) saveAnswer(localVal)
        }}
        placeholder="답변을 입력하세요..."
        className="bg-transparent resize-none outline-none leading-relaxed transition-all font-diary"
      />
    </div>
  )
}

const TagPicker = ({ selectedTags, onToggleTag, onClose }: { selectedTags: string[], onToggleTag: (tag: string) => void, onClose: () => void }) => {
  const ref = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div ref={ref} className="absolute top-full left-0 mt-2 p-3 bg-white/90 backdrop-blur rounded-xl shadow-lg border border-[#E5E5EA] w-64 z-50">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-bold text-[#717A8C]">태그 선택 (최대 3개)</span>
        <button onClick={onClose} className="text-[#A0AABF] hover:text-[#717A8C] text-xs">✕</button>
      </div>
      <div className="flex flex-col gap-3 max-h-[40vh] overflow-y-auto">
        {DIARY_TAG_GROUPS.map(group => (
          <div key={group.label} className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-[#A0AABF]">{group.label}</span>
            <div className="flex flex-wrap gap-1.5">
              {group.tags.map(tagName => {
                const tag = DIARY_TAGS.find(t => t.name === tagName)!;
                const isSelected = selectedTags.includes(tag.name);
                const isDisabled = !isSelected && selectedTags.length >= 3;
                return (
                  <button
                    key={tag.name}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!isDisabled) onToggleTag(tag.name);
                    }}
                    disabled={isDisabled}
                    style={{ backgroundColor: isSelected ? tag.color : 'transparent', borderColor: isSelected ? tag.color : '#E5E5EA' }}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors ${isSelected ? 'text-[#3D3833]' : 'text-[#717A8C] hover:bg-[#F5F5F7]'} ${isDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    {tag.name}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const MemoItem = ({ memo, deleteMemo, updateMemo }: { memo: DiaryMemo, deleteMemo: (id: string) => void, updateMemo: (id: string, text: string, tags?: string[]) => void }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localText, setLocalText] = useState(memo.text);
  const [localTags, setLocalTags] = useState<string[]>(memo.tags || []);
  const [isTagPickerOpen, setIsTagPickerOpen] = useState(false);
  const editRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isEditing) return;

    setTimeout(() => {
      if (editRef.current) {
        const container = editRef.current.closest('.overflow-y-auto') as HTMLElement;
        if (container) {
          const top = editRef.current.offsetTop - container.offsetTop - 20;
          container.scrollTo({ top, behavior: 'smooth' });
        }
      }
    }, 50);

    const handleClickOutside = (e: MouseEvent) => {
      if (editRef.current && !editRef.current.contains(e.target as Node)) {
        updateMemo(memo.id, localText, localTags);
        setIsEditing(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isEditing, localText, localTags, memo.id, updateMemo]);

  if (isEditing) {
    return (
      <div ref={editRef} className="group relative transition-all duration-300 flex flex-col shrink-0 z-20 w-full min-h-0 py-4 px-2 bg-transparent text-[#3D3833] border-b border-[#EDE6D6]">
        <div className="flex gap-1.5 mb-2 flex-wrap items-center">
          <div className="relative">
            <button 
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsTagPickerOpen(!isTagPickerOpen);
              }}
              className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-dashed border-[#A0AABF] text-[#717A8C] hover:bg-white/30"
            >
              + 태그
            </button>
            {isTagPickerOpen && (
              <TagPicker 
                selectedTags={localTags} 
                onToggleTag={(t) => setLocalTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])}
                onClose={() => setIsTagPickerOpen(false)}
              />
            )}
          </div>
          {localTags.map(tagName => {
            const tagDef = DIARY_TAGS.find(t => t.name === tagName);
            if (!tagDef) return null;
            return (
              <span key={tagName} className="text-[10px] font-bold px-2 py-0.5 rounded-full text-[#3D3833] flex items-center gap-1" style={{ backgroundColor: tagDef.color }}>
                {tagName === '웃긴' ? '웃김' : tagName}
                <button onClick={(e) => {
                  e.stopPropagation();
                  setLocalTags(prev => prev.filter(t => t !== tagName));
                }} className="opacity-50 hover:opacity-100">✕</button>
              </span>
            )
          })}
        </div>

        <div className="flex-1 min-h-[60px] cursor-text">
          <DiaryTextEditor
            initialContent={localText}
            onChange={(html) => setLocalText(html)}
            placeholder="기록을 남겨보세요..."
            autoFocus
            className="bg-transparent outline-none leading-relaxed transition-all font-diary"
          />
        </div>

        <div className="flex justify-end gap-2 mt-2">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setLocalText(memo.text);
              setLocalTags(memo.tags || []);
              setIsEditing(false);
            }}
            className="px-2 py-1 text-[10px] font-bold rounded bg-black/5 hover:bg-black/10 transition-colors"
          >
            취소
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              updateMemo(memo.id, localText, localTags);
              setIsEditing(false);
            }}
            className="px-2 py-1 text-[10px] font-bold rounded bg-black/10 hover:bg-black/20 transition-colors"
          >
            저장
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="group relative transition-all duration-300 flex flex-col shrink-0 cursor-pointer w-full min-h-0 py-2.5 px-2 border-b border-[#E5E5EA]/50 hover:bg-black/5 rounded-lg" 
      onClick={() => setIsEditing(true)}
    >
      <div className="flex justify-between items-start gap-3">
        <div className="flex items-start gap-3 flex-1 overflow-hidden">
          {memo.createdAt && (
            <span className="text-[11px] text-[#A0AABF] font-diary shrink-0 pt-[3px] whitespace-nowrap">
              {new Intl.DateTimeFormat('ko-KR', { hour: 'numeric', minute: 'numeric', hour12: true }).format(new Date(memo.createdAt))}
            </span>
          )}
          <div className="text-[14px] leading-relaxed font-diary flex-1 prose-p:my-0 prose-p:leading-relaxed" dangerouslySetInnerHTML={{ __html: memo.text }} />
        </div>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            deleteMemo(memo.id);
          }}
          className="w-6 h-6 flex items-center justify-center rounded text-[#A0AABF] hover:bg-[#F5F5F7] hover:text-[#EF6A7B] opacity-30 group-hover:opacity-100 transition-all text-[11px] shrink-0"
        >
          ✕
        </button>
      </div>
      {(memo.tags && memo.tags.length > 0) && (
        <div className="flex gap-1.5 mt-2 flex-wrap pl-[3.25rem]">
          {memo.tags.map(tagName => {
            const tagDef = DIARY_TAGS.find(t => t.name === tagName);
            if (!tagDef) return null;
            return (
              <span key={tagName} className="text-[10px] font-bold px-2 py-0.5 rounded-full text-[#3D3833]" style={{ backgroundColor: tagDef.color }}>
                {tagName === '웃긴' ? '웃김' : tagName}
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}

export const MobileDiaryView = ({ selectedDate }: { selectedDate: Date }) => {
  const { 
    diaries, settings,
    saveDayDiaryEmojis, saveDayDiaryAnswer, deleteDayDiaryAnswer,
    addDayDiaryMemo, updateDayDiaryMemo, deleteDayDiaryMemo 
  } = useDiaryStore()
  
  const dateStr = format(selectedDate, 'yyyy-MM-dd')
  const dayDiary = diaries[dateStr] || {}
  
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false)
  const [customEmoji, setCustomEmoji] = useState('')
  const emojiPickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setIsEmojiPickerOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleEmojiSelect = (emoji: string) => {
    const current = dayDiary.emojis || []
    let next: string[]
    if (current.includes(emoji)) {
      next = current.filter((e: string) => e !== emoji)
    } else {
      if (current.length >= 3) return
      next = [...current, emoji]
    }
    saveDayDiaryEmojis(dateStr, next)
  }

  const handleSaveQuestion = (qId: string, qText: string, answer: string) => {
    saveDayDiaryAnswer(dateStr, qId, qText, answer)
  }

  const handleDeleteQuestion = (qId: string) => {
    deleteDayDiaryAnswer(dateStr, qId)
  }

  const handleAddMemo = () => {
    addDayDiaryMemo(dateStr, '', [])
  }

  const updateMemo = (id: string, text: string, tags?: string[]) => {
    updateDayDiaryMemo(dateStr, id, text, tags)
  }

  const deleteMemo = (id: string) => {
    if (!confirm('메모를 삭제하시겠습니까?')) return
    deleteDayDiaryMemo(dateStr, id)
  }

  return (
    <div className="flex-1 overflow-y-auto bg-white p-4">
      {/* Date Header */}
      <h3 className="text-sm font-bold text-[#2D334A] mb-4 border-b border-[#E5E5EA] pb-2 flex items-center justify-between">
        {format(selectedDate, 'M월 d일 (E)', { locale: ko })}
      </h3>

      <div className="flex flex-col gap-6 pb-24">
        {/* Emoji Section */}
        <section className="bg-[#FBFBFC] rounded-xl p-3 border border-[#F1F0F5]" ref={emojiPickerRef}>
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-[11px] font-bold text-[#717A8C]">오늘의 기분/날씨</h2>
            <button 
              onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
              className="text-[#8B7CF8] text-[11px] font-bold"
            >
              {isEmojiPickerOpen ? '닫기' : '선택하기'}
            </button>
          </div>
          
          <div className="flex gap-2 min-h-[40px] items-center">
            {(dayDiary.emojis || []).length > 0 ? (
              (dayDiary.emojis || []).map((emoji: string, idx: number) => (
                <div key={idx} className="group relative w-10 h-10 rounded-full flex items-center justify-center bg-white border border-[#E5E5EA] shadow-sm">
                  <Emoji emoji={emoji} className="w-full h-full" />
                  <button
                    onClick={(e) => { e.stopPropagation(); handleEmojiSelect(emoji); }}
                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#EF6A7B] text-white flex items-center justify-center text-[8px] font-bold"
                  >✕</button>
                </div>
              ))
            ) : (
              <span className="text-sm text-[#A0AABF]">이모지를 선택해주세요</span>
            )}
          </div>
          
          {isEmojiPickerOpen && (
            <div className="mt-3 pt-3 border-t border-[#E5E5EA] flex flex-col gap-3">
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={customEmoji}
                  onChange={(e) => setCustomEmoji(e.target.value)}
                  placeholder="직접 입력..."
                  className="flex-1 bg-white border border-[#E5E5EA] rounded px-3 py-1.5 text-sm outline-none focus:border-[#8B7CF8]"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && customEmoji.trim()) {
                      e.preventDefault();
                      handleEmojiSelect(customEmoji.trim());
                      setCustomEmoji('');
                    }
                  }}
                />
                <button
                  onClick={() => {
                    if (customEmoji.trim()) {
                      handleEmojiSelect(customEmoji.trim());
                      setCustomEmoji('');
                    }
                  }}
                  className="bg-[#8B7CF8] text-white px-3 py-1.5 rounded text-xs font-bold"
                >추가</button>
              </div>
              <div className="flex flex-col gap-2 max-h-40 overflow-y-auto">
                {EMOJI_CATEGORIES.map(cat => (
                  <div key={cat.name}>
                    <div className="text-[10px] text-[#717A8C] mb-1">{cat.name}</div>
                    <div className="flex flex-wrap gap-1">
                      {cat.emojis.map(emoji => (
                        <button
                          key={emoji}
                          onClick={() => handleEmojiSelect(emoji)}
                          className={`w-9 h-9 p-2 flex items-center justify-center rounded-full shrink-0 transition-all ${
                            (dayDiary.emojis || []).includes(emoji) ? 'bg-[#8B7CF8] shadow-md scale-110' : 'bg-white hover:bg-[#F0F0F5] border border-[#E5E5EA]'
                          }`}
                        >
                          <Emoji emoji={emoji} className="w-full h-full flex-shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Q&A Section */}
        {settings.questions && settings.questions.length > 0 && (
          <section className="flex flex-col gap-2">
            {settings.questions.map((q: any) => {
              const answerObj = (dayDiary.answers || []).find((a: any) => a.questionId === q.id)
              const answer = answerObj ? answerObj.answer : ''
              return (
                <QuestionItem 
                  key={q.id}
                  q={q} 
                  initialAnswer={answer || ''} 
                  saveAnswer={(v) => handleSaveQuestion(q.id, q.text, v)} 
                  deleteAnswer={() => handleDeleteQuestion(q.id)}
                />
              )
            })}
          </section>
        )}

        {/* Memos Section */}
        <section className="flex flex-col gap-2">
          {(dayDiary.memos || []).map((memo: DiaryMemo) => (
            <MemoItem 
              key={memo.id}
              memo={memo}
              deleteMemo={deleteMemo}
              updateMemo={updateMemo}
            />
          ))}
          <button 
            onClick={handleAddMemo}
            className="w-full py-4 rounded-xl border border-dashed border-[#CFD6E4] text-[#A0AABF] text-sm font-bold flex flex-col items-center justify-center gap-1 hover:border-[#8B7CF8] hover:text-[#8B7CF8] transition-colors mt-2"
          >
            <span className="text-xl leading-none">+</span>
            자유 메모 추가
          </button>
        </section>
      </div>
    </div>
  )
}
