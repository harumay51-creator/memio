import React, { useState, useEffect, useRef } from 'react'
import { useDiaryStore, DiaryMemo } from '../../store/DiaryStore'
import { RetroWindow } from '../common/Y2KTheme'
import Emoji from '../common/Emoji'
import DiaryTextEditor from '../common/DiaryTextEditor'
import { RoutineSection } from './RoutineSection'

export const DIARY_TAGS = [
  { name: '뿌듯', color: '#CFE8DC' },
  { name: '설렘', color: '#DCCFF3' },
  { name: '기쁨', color: '#E2D8EF' },
  { name: '행복', color: '#CFE8DC' },
  { name: '만족', color: '#CFE7F4' },
  { name: '후련', color: '#D4DFEC' },
  { name: '기대', color: '#DCCFF3' },
  { name: '무난', color: '#CFE7F4' },
  { name: '평온', color: '#CFE7F4' },
  { name: '힘듦', color: '#D4DFEC' },
  { name: '우울', color: '#D4DFEC' },
  { name: '눈물', color: '#CFE7F4' },
  { name: '짜증', color: '#E2D8EF' },
  { name: '귀찮', color: '#D4DFEC' },
  { name: '답답', color: '#D4DFEC' },
  { name: '불안', color: '#DCCFF3' },
  { name: '빡침', color: '#E2D8EF' },
  { name: '웃김', color: '#DCCFF3' },
  { name: '감사', color: '#CFE8DC' },
  { name: '고민', color: '#E2D8EF' },
  { name: '홧팅', color: '#CFE8DC' },
  { name: '지침', color: '#D4DFEC' }, // legacy
  { name: '웃긴', color: '#DCCFF3' }, // legacy
];

export const DIARY_TAG_GROUPS = [
  { label: '좋음', tags: ['뿌듯', '설렘', '기쁨', '행복', '만족', '후련', '기대', '무난', '평온'] },
  { label: '안좋음', tags: ['힘듦', '우울', '눈물', '짜증', '귀찮', '답답', '불안', '빡침'] },
  { label: '기타', tags: ['웃김', '감사', '고민', '홧팅'] }
];

const StarDoodle = ({ isY2K }: { isY2K?: boolean }) => (
  <svg style={{ filter: isY2K ? 'drop-shadow(0 0 6px currentColor)' : undefined }} className={`absolute -top-3 -right-8 w-8 h-8 ${isY2K ? 'text-[#ffade4]' : 'text-[#FFD54F]'} opacity-80 rotate-12 pointer-events-none`} viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M 50 10 Q 55 35 70 45 Q 90 50 70 60 Q 55 70 50 90 Q 45 70 25 60 Q 10 50 30 45 Q 45 35 50 10" fill="currentColor" />
  </svg>
)

const UnderlineDoodle = ({ isY2K }: { isY2K?: boolean }) => (
  <svg style={{ filter: isY2K ? 'drop-shadow(0 0 6px currentColor)' : undefined }} className={`absolute -bottom-2 left-0 w-12 h-2 ${isY2K ? 'text-[#63dbb6]' : 'text-[#81C784]'} opacity-80 pointer-events-none`} viewBox="0 0 100 20" preserveAspectRatio="none" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round">
    <path d="M 5,10 Q 30,15 50,8 T 95,12" />
  </svg>
)

const CloudDoodle = ({ isY2K }: { isY2K?: boolean }) => (
  <svg style={{ filter: isY2K ? 'drop-shadow(0 0 6px currentColor)' : undefined }} className={`absolute -top-4 right-10 w-12 h-12 ${isY2K ? 'text-[#d5baff]' : 'text-[#4FC3F7]'} opacity-60 pointer-events-none`} viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M 30,60 Q 20,60 20,50 Q 20,40 30,40 Q 35,25 50,25 Q 65,25 70,40 Q 85,40 85,55 Q 85,70 70,70 L 35,70" />
  </svg>
)

const ArrowDoodle = ({ isY2K }: { isY2K?: boolean }) => (
  <svg style={{ filter: isY2K ? 'drop-shadow(0 0 6px currentColor)' : undefined }} className={`absolute top-1 -left-6 w-5 h-5 ${isY2K ? 'text-[#ffade4]' : 'text-[#F06292]'} opacity-70 -rotate-12 pointer-events-none`} viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
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
  hash = Math.imul(hash ^ (hash >>> 16), 2246822507);
  hash = Math.imul(hash ^ (hash >>> 13), 3266489909);
  return Math.abs(hash ^ (hash >>> 16));
}

const CornerDoodle = ({ idString, isY2K, isAurora }: { idString: string, isY2K?: boolean, isAurora?: boolean }) => {
  if (!isY2K && !isAurora) return null;
  const hash = getHash(idString);
  if (hash % 3 !== 0) return null; // ~1/3 chance
  
  const doodleType = hash % 6;
  const positionClass = hash % 2 === 0 ? "-top-3 -right-3 rotate-12" : "-bottom-3 -left-3 -rotate-12";
  const sizeClass = "w-8 h-8";
  
  const style = isY2K ? { filter: 'drop-shadow(0 0 6px currentColor)' } : undefined;
  const cls = `${positionClass} ${sizeClass} z-20 ${isY2K ? 'text-white scale-110 opacity-70' : ''}`;
  
  let Doodle;
  switch(doodleType) {
    case 0: Doodle = <SparkleDoodle className={cls} />; break;
    case 1: Doodle = <WavyLineDoodle className={`${positionClass} w-10 h-4 z-20 ${isY2K ? 'text-white scale-110' : ''}`} />; break;
    case 2: Doodle = <LeafDoodle className={cls} />; break;
    case 3: Doodle = <CrownDoodle className={cls} />; break;
    case 4: Doodle = <ZigzagDoodle className={`${positionClass} w-10 h-4 z-20 ${isY2K ? 'text-white scale-110' : ''}`} />; break;
    case 5: Doodle = <RibbonDoodle className={cls} />; break;
    default: return null;
  }
  return <div style={style} className="absolute inset-0 pointer-events-none z-20">{Doodle}</div>;
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

const getPostItStyle = (idString: string, index?: number, dateSeed?: string, isY2K?: boolean, isAurora?: boolean) => {
  const hash = getHash(idString);
  let themeIndex = hash;
  const palette = POST_IT_THEMES;
  
  if (index !== undefined && dateSeed) {
    let current = getHash(dateSeed) % palette.length;
    for (let i = 1; i <= index; i++) {
      const step = (getHash(`${dateSeed}-${i}`) % (palette.length - 1)) + 1;
      current = (current + step) % palette.length;
    }
    themeIndex = current;
  } else if (index !== undefined) {
    themeIndex = index;
  }
  
  if (isY2K || isAurora) {
    const theme = palette[themeIndex % palette.length];
    const rotation = (Math.abs(hash) % 7) - 3; // -3 to +3 degrees
    
    if (isY2K) {
      return {
        backgroundColor: theme.bg,
        color: theme.text,
        transform: `rotate(${rotation}deg)`,
        borderTop: `4px solid ${'border' in theme ? theme.border : theme.bg}`,
        boxShadow: '4px 4px 0 rgba(0,0,0,0.4), inset 0 0 10px rgba(255,255,255,0.1)',
        borderRadius: '2px',
        transition: 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
      };
    }

    return {
      backgroundColor: theme.bg,
      color: theme.text,
      transform: `rotate(${rotation}deg)`,
      boxShadow: '2px 4px 10px rgba(0,0,0,0.15)',
      borderRadius: '2px 12px 12px 2px'
    };
  }

  // Default Theme (List style)
  return {
    backgroundColor: 'transparent',
    color: '#3D3833',
    transform: 'rotate(0deg)',
    borderBottom: '1px solid #EDE6D6',
    borderRadius: '0px'
  };
}

const QuestionItem = ({ q, initialAnswer, saveAnswer, deleteAnswer, index, dateSeed, isY2K, isAurora }: { q: any, initialAnswer: string, saveAnswer: (v: string) => void, deleteAnswer: () => void, index: number, dateSeed: string, isY2K: boolean, isAurora?: boolean }) => {
  const [localVal, setLocalVal] = useState(initialAnswer)
  const [isFocused, setIsFocused] = useState(false)

  useEffect(() => {
    setLocalVal(initialAnswer)
  }, [initialAnswer])

  const isDefault = !isY2K && !isAurora;

  return (
    <div 
      className={`group relative transition-all duration-300 flex flex-col shrink-0 cursor-text ${isDefault ? 'w-full min-h-0 py-4 px-2' : 'p-4 w-36 min-h-[9rem] h-auto'} ${isFocused ? 'z-20' : 'z-0 hover:z-10'} ${!isDefault ? 'hover:scale-[1.02]' : ''}`} 
      style={{
        ...getPostItStyle(q.id, index, dateSeed, isY2K, isAurora),
        transform: (isFocused && !isDefault) ? 'scale(1.05) rotate(0deg)' : getPostItStyle(q.id, index, dateSeed, isY2K, isAurora).transform
      }}
    >
      <CornerDoodle idString={q.id} isY2K={isY2K} isAurora={isAurora} />
      <div className="flex justify-between items-start mb-1 gap-2">
        <div className="text-[11px] font-bold font-diary opacity-70" style={{ color: isY2K ? 'inherit' : 'inherit' }}>{q.text}</div>
        <button 
          onClick={deleteAnswer}
          className="w-5 h-5 flex items-center justify-center rounded text-[#717A8C] hover:text-[#EF6A7B] opacity-30 group-hover:opacity-100 transition-opacity text-[10px] shrink-0"
        >
          ✕
        </button>
      </div>
      <DiaryTextEditor
        initialContent={localVal}
        onChange={(html) => {
          setLocalVal(html)
        }}
        onFocus={() => setIsFocused(true)}
        onBlur={() => {
          setIsFocused(false)
          // Normalize empty html to empty string for accurate comparison
          const current = localVal === '<p></p>' ? '' : localVal;
          const initial = initialAnswer === '<p></p>' ? '' : initialAnswer;
          if (current !== initial) {
            saveAnswer(localVal)
          }
        }}
        placeholder="답변을 입력하세요..."
        className={`bg-transparent resize-none outline-none leading-relaxed transition-all font-diary ${isY2K ? 'text-inherit' : 'text-inherit'}`}
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
    <div ref={ref} className="absolute top-full left-0 mt-2 p-3 bg-white/90 backdrop-blur rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-[#E5E5EA] w-64 z-50 animate-slide-down">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-bold text-[#717A8C]">태그 선택 (최대 3개)</span>
        <button onClick={onClose} className="text-[#A0AABF] hover:text-[#717A8C] text-xs">✕</button>
      </div>
      <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto">
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

const MemoItem = ({ memo, index, dateSeed, isY2K, isAurora, deleteMemo, updateMemo }: { memo: DiaryMemo, index: number, dateSeed: string, isY2K: boolean, isAurora?: boolean, deleteMemo: (id: string) => void, updateMemo: (id: string, text: string, tags?: string[]) => void }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localText, setLocalText] = useState(memo.text);
  const [localTags, setLocalTags] = useState<string[]>(memo.tags || []);
  const [isTagPickerOpen, setIsTagPickerOpen] = useState(false);
  const isDefault = !isY2K && !isAurora;
  const editRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isEditing) return;
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
      <div 
        ref={editRef}
        className={`group relative transition-all duration-300 flex flex-col shrink-0 z-20 ${isDefault ? 'w-full min-h-0 py-4 px-2' : 'p-4 w-36 min-h-[9rem] h-auto'}`} 
        style={{
          ...getPostItStyle(memo.id, index, dateSeed, isY2K, isAurora),
          transform: !isDefault ? 'scale(1.05) rotate(0deg)' : getPostItStyle(memo.id, index, dateSeed, isY2K, isAurora).transform
        }}
      >
        <CornerDoodle idString={memo.id} isY2K={isY2K} isAurora={isAurora} />
        
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
            className={`bg-transparent outline-none leading-relaxed transition-all font-diary ${isY2K ? 'text-inherit' : 'text-inherit'}`}
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

  if (isDefault) {
    return (
      <div 
        className="group relative transition-all duration-300 flex flex-col shrink-0 cursor-pointer w-full min-h-0 py-2.5 px-2 border-b border-[#E5E5EA]/50 last:border-b-0 hover:bg-black/5 rounded-lg" 
        onClick={() => setIsEditing(true)}
      >
        <div className="flex justify-between items-start gap-3">
          <div className="flex items-start gap-3 flex-1 overflow-hidden">
            {memo.createdAt && (
              <span className="text-[11px] text-[#A0AABF] font-diary shrink-0 pt-[3px] whitespace-nowrap">
                {new Intl.DateTimeFormat('ko-KR', { hour: 'numeric', minute: 'numeric', hour12: true }).format(new Date(memo.createdAt))}
              </span>
            )}
            <div className="text-[14px] leading-relaxed font-diary flex-1 prose-p:my-0 prose-p:leading-relaxed table-responsive-viewer" style={{ color: 'inherit' }} dangerouslySetInnerHTML={{ __html: memo.text }} />
          </div>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              deleteMemo(memo.id);
            }}
            className="w-6 h-6 flex items-center justify-center rounded text-[#A0AABF] hover:bg-[#F5F5F7] hover:text-[#EF6A7B] opacity-0 group-hover:opacity-100 transition-all text-[11px] shrink-0"
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

  return (
    <div 
      className="group relative transition-all duration-300 flex flex-col justify-between shrink-0 cursor-pointer hover:scale-[1.02] z-0 hover:z-10 p-5 w-36 min-h-[9rem] h-auto"
      style={getPostItStyle(memo.id, index, dateSeed, isY2K, isAurora)}
      onClick={() => setIsEditing(true)}
    >
      <CornerDoodle idString={memo.id} isY2K={isY2K} isAurora={isAurora} />
      
      {(memo.tags && memo.tags.length > 0) && (
        <div className="flex gap-1.5 mb-2 flex-wrap">
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

      <div className="flex justify-between items-start mb-2 gap-2">
        <div className="text-[14px] leading-relaxed font-diary prose-p:my-0 prose-p:leading-relaxed table-responsive-viewer" style={{ color: 'inherit' }} dangerouslySetInnerHTML={{ __html: memo.text }} />
        <button 
          onClick={(e) => {
            e.stopPropagation();
            deleteMemo(memo.id);
          }}
          className="w-5 h-5 flex items-center justify-center rounded hover:opacity-50 opacity-30 group-hover:opacity-100 transition-opacity text-[10px] shrink-0"
          style={{ color: 'inherit' }}
        >
          ✕
        </button>
      </div>
      {memo.createdAt && (
        <div className="text-[9px] opacity-40 font-diary mt-auto pt-2 text-right" style={{ color: 'inherit' }}>
          {new Intl.DateTimeFormat('ko-KR', { hour: 'numeric', minute: 'numeric', hour12: true }).format(new Date(memo.createdAt))}
        </div>
      )}
    </div>
  )
}

const DiaryPanel: React.FC<DiaryPanelProps> = ({ mode, selDay, year, month }) => {
  const { 
    diaries, monthlyDiaries, settings, isLoading,
    saveDayDiaryEmojis, saveDayDiaryAnswer, deleteDayDiaryAnswer,
    addDayDiaryMemo, updateDayDiaryMemo, deleteDayDiaryMemo,
    saveMonthlyDiary, updateTheme
  } = useDiaryStore()

  const isAurora = settings.theme === 'aurora'
  const isY2K = settings.theme === 'y2k'

  const dateKey = `${selDay.getFullYear()}-${String(selDay.getMonth() + 1).padStart(2, '0')}-${String(selDay.getDate()).padStart(2, '0')}`
  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`
  
  const handleToggleTheme = () => {
    let nextTheme: 'default' | 'aurora' | 'y2k' = 'default'
    if (settings.theme === 'default' || !settings.theme) nextTheme = 'aurora'
    else if (settings.theme === 'aurora') nextTheme = 'y2k'
    else nextTheme = 'default'
    updateTheme(nextTheme)
  }

  const dayDiary = diaries[dateKey] || { dateKey, emojis: [], answers: [], memos: [] }
  const monthlyDiary = monthlyDiaries[monthKey] || { monthKey, text: '' }

  const [newMemo, setNewMemo] = useState('')
  const [newMemoTags, setNewMemoTags] = useState<string[]>([])
  const [isNewMemoTagPickerOpen, setIsNewMemoTagPickerOpen] = useState(false)
  const [monthlyText, setMonthlyText] = useState('')
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false)
  const [customEmoji, setCustomEmoji] = useState('')
  const emojiPickerRef = useRef<HTMLDivElement>(null)
  const newMemoFormRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setIsEmojiPickerOpen(false)
      }
      
      if (newMemoFormRef.current && !newMemoFormRef.current.contains(e.target as Node)) {
        if (isNewMemoTagPickerOpen) {
          setIsNewMemoTagPickerOpen(false)
        } else {
          const content = newMemo === '<p></p>' ? '' : newMemo.trim();
          if (content) {
            addDayDiaryMemo(dateKey, content, newMemoTags)
            setNewMemo('')
            setNewMemoTags([])
          }
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [newMemo, newMemoTags, isNewMemoTagPickerOpen, dateKey, addDayDiaryMemo])

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

  const handleAddMemo = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const content = newMemo === '<p></p>' ? '' : newMemo.trim();
    if (content) {
      addDayDiaryMemo(dateKey, content, newMemoTags)
      setNewMemo('')
      setNewMemoTags([])
    }
  }

  const handleSaveMonthly = () => {
    saveMonthlyDiary(monthKey, monthlyText)
  }

  if (isLoading) {
    return (
      <aside className={`relative flex-[6] flex flex-col h-full border-l border-[#E5E5EA] shrink-0 overflow-hidden px-6 py-6 items-center justify-center ${
        isAurora || isY2K ? 'bg-transparent' : 'bg-[#F9FAFB]'
      }`}>
        <div className="text-[#A0AABF] text-sm animate-pulse font-diary">다이어리를 불러오는 중...</div>
      </aside>
    )
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
    <aside className={`relative flex-[6] flex flex-col h-full border-l border-[#E5E5EA] shrink-0 overflow-hidden px-6 py-6 ${
      isAurora || isY2K ? 'bg-transparent' : 'bg-[#F9FAFB]'
    }`}>
      <header className="mb-6 shrink-0 text-center relative z-10 flex items-center justify-center">
        <h1 className={`text-xl font-semibold text-[#1C1C1E] tracking-tight relative inline-block ${isY2K ? 'font-pixel text-[22px]' : 'font-diary'}`}>
          <span className={isY2K ? 'text-white drop-shadow-[2px_2px_0_#b588ff]' : ''}>{formattedDate}</span>
          <StarDoodle isY2K={isY2K} />
        </h1>
        <button
          onClick={handleToggleTheme}
          className={`absolute right-0 text-xs font-semibold px-2.5 py-1.5 rounded-lg border shadow-sm transition-colors ${
            isY2K ? 'bg-black/40 border-white/30 text-white hover:bg-black/60 backdrop-blur-sm font-pixel text-[10px] tracking-widest flex items-center gap-1.5' :
            'bg-white/50 hover:bg-white border-white/60 text-[#717A8C]'
          }`}
        >
          {isY2K ? (
            <>
              <span className="animate-spin-pixel text-[#ffade4]">★</span>
              <span>Y2K</span>
            </>
          ) : isAurora ? '✨ 오로라' : '기본 테마'}
        </button>
      </header>

      <div className="relative z-10 flex-1 min-h-0 flex flex-col">
        {isY2K ? (
          <RetroWindow title="Diary.exe" className="h-full">
            <div className="flex-1 min-h-0 overflow-y-auto pr-2 -mr-2 flex flex-col gap-6 p-4">
              {/* 1. Emoji Selection */}
              <section className="p-2" ref={emojiPickerRef}>
                <div className="flex justify-between items-center mb-3 relative">
                  <h2 className="text-[11px] font-bold text-[#717A8C] tracking-widest uppercase inline-block relative">
                    오늘의 기분/날씨
                  </h2>
                  <CloudDoodle isY2K={isY2K} />
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
                      <div key={idx} className={`group relative w-10 h-10 rounded-full flex items-center justify-center p-2.5 ${isAurora || isY2K ? 'bg-white/40 shadow-sm' : 'bg-white border border-[#E5E5EA] shadow-sm'}`}>
                        <Emoji emoji={emoji} className="w-full h-full animate-fade-in" />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEmojiSelect(emoji);
                          }}
                          className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#EF6A7B] text-white flex items-center justify-center text-[8px] font-bold opacity-30 group-hover:opacity-100 hover:opacity-100 transition-opacity z-10"
                        >
                          ✕
                        </button>
                      </div>
                    ))
                  ) : (
                    <span className="text-sm text-[#A0AABF]">이모지를 선택해주세요</span>
                  )}
                </div>
                
                {isEmojiPickerOpen && (
                  <div className="mt-4 pt-4 border-t border-[#E5E5EA] flex flex-col gap-3 relative z-50 animate-slide-down">
                    <div className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={customEmoji}
                        onChange={(e) => setCustomEmoji(e.target.value)}
                        placeholder="이모지 직접 입력..."
                        className="flex-1 bg-white border border-[#E5E5EA] rounded px-3 py-1.5 text-[13px] outline-none focus:border-[#8B7CF8] font-emoji"
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
                        className="bg-[#8B7CF8] text-white px-3 py-1.5 rounded text-xs font-bold whitespace-nowrap hover:bg-[#7a6aeb] transition-colors"
                      >
                        추가
                      </button>
                    </div>
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
                )}
              </section>

              {/* 2. Questions Snapshot */}
              <section className="p-2 flex flex-col gap-4">
                <div className="relative inline-block w-max">
                  <h2 className="text-[13px] font-bold text-[#717A8C] tracking-[0.2em] uppercase">Q&A</h2>
                  <div className="opacity-40">
                    <UnderlineDoodle isY2K={isY2K} />
                  </div>
                </div>
                
                <div className={`flex ${(!isY2K && !isAurora) ? 'flex-col gap-0' : 'flex-row flex-wrap gap-2.5 items-start'}`}>
                  {settings.questions.map((q, idx) => {
                    const answerObj = (dayDiary.answers || []).find(a => a.questionId === q.id)
                    const answerText = answerObj ? answerObj.answer : ''
                    return (
                      <QuestionItem 
                        key={`${q.id}-${dateKey}`} 
                        q={q} 
                        initialAnswer={answerText} 
                        saveAnswer={(val) => saveDayDiaryAnswer(dateKey, q.id, q.text, val)} 
                        deleteAnswer={() => deleteDayDiaryAnswer(dateKey, q.id)}
                        index={idx}
                        dateSeed={dateKey}
                        isY2K={isY2K}
                        isAurora={isAurora}
                      />
                    )
                  })}
                  
                  {/* Display snapshot answers that are no longer in settings.questions */}
                  {(dayDiary.answers || []).filter(a => !settings.questions.some(q => q.id === a.questionId)).map((a, idx) => (
                    <div key={a.questionId} className={`group relative transition-all duration-300 flex flex-col shrink-0 ${
                      (!isY2K && !isAurora) ? 'w-full min-h-0 py-4 px-2' : 'hover:scale-[1.02] z-0 hover:z-10 p-4 w-36 min-h-[9rem] h-auto'
                    }`} style={getPostItStyle(a.questionId, idx + settings.questions.length, dateKey, isY2K, isAurora)}>
                      <CornerDoodle idString={a.questionId} isY2K={isY2K} isAurora={isAurora} />
                      <div className="flex justify-between items-start mb-1 gap-2">
                        <div>
                          <div className="text-[11px] font-bold font-diary opacity-70" style={{ color: 'inherit' }}>{a.question} (과거 질문)</div>
                        </div>
                        <button 
                          onClick={() => deleteDayDiaryAnswer(dateKey, a.questionId)}
                          className="w-5 h-5 flex items-center justify-center rounded hover:opacity-50 opacity-30 group-hover:opacity-100 transition-opacity text-[10px] shrink-0"
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
                  <div className="opacity-40">
                    <ArrowDoodle isY2K={isY2K} />
                  </div>
                  <h2 className="text-[13px] font-bold text-[#717A8C] tracking-[0.2em] uppercase">MEMO</h2>
                </div>
                
                <form ref={newMemoFormRef} onSubmit={(e) => {
                  e.preventDefault()
                  handleAddMemo(e as any)
                }} className="flex gap-2">
                  <div className="flex flex-col gap-2 flex-1 relative">
                    <div className="flex gap-1.5 flex-wrap items-center">
                      <div className="relative">
                        <button 
                          type="button"
                          onClick={() => setIsNewMemoTagPickerOpen(!isNewMemoTagPickerOpen)}
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-dashed border-[#A0AABF] text-[#717A8C] hover:bg-white/30"
                        >
                          + 태그
                        </button>
                        {isNewMemoTagPickerOpen && (
                          <TagPicker 
                            selectedTags={newMemoTags} 
                            onToggleTag={(t) => setNewMemoTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])}
                            onClose={() => setIsNewMemoTagPickerOpen(false)}
                          />
                        )}
                      </div>
                      {newMemoTags.map(tagName => {
                        const tagDef = DIARY_TAGS.find(t => t.name === tagName);
                        if (!tagDef) return null;
                        return (
                          <span key={tagName} className="text-[10px] font-bold px-2 py-0.5 rounded-full text-[#3D3833] flex items-center gap-1" style={{ backgroundColor: tagDef.color }}>
                            {tagName === '웃긴' ? '웃김' : tagName}
                            <button type="button" onClick={() => setNewMemoTags(prev => prev.filter(t => t !== tagName))} className="opacity-50 hover:opacity-100">✕</button>
                          </span>
                        )
                      })}
                    </div>
                    <DiaryTextEditor
                      initialContent={newMemo}
                      onChange={(html) => setNewMemo(html)}
                      placeholder="자유롭게 기록을 남겨보세요..."
                      className="bg-white/30 border border-white/20 rounded-xl px-4 py-3 outline-none text-[#1C1C1E] focus:border-white/50 focus:bg-white/40 transition-all font-diary"
                    />
                  </div>
                  <button type="submit" disabled={!newMemo.trim()} className="px-4 py-2 h-fit bg-white/40 border border-[#C0C0C0] text-[#1C1C1E] rounded-xl font-bold text-xs hover:bg-[#E5E5EA] disabled:opacity-30 transition-all self-end">
                    추가
                  </button>
                </form>

                <div className={`flex mt-2 ${(!isY2K && !isAurora) ? 'flex-col gap-0' : 'flex-row flex-wrap gap-2.5 items-start'}`}>
                  {[...(dayDiary.memos || [])].reverse().map((memo: DiaryMemo, idx: number) => (
                    <MemoItem
                      key={memo.id}
                      memo={memo}
                      index={idx + (dayDiary.answers || []).length}
                      dateSeed={dateKey}
                      isY2K={isY2K}
                      isAurora={isAurora}
                      deleteMemo={(id) => deleteDayDiaryMemo(dateKey, id)}
                      updateMemo={(id, text, tags) => updateDayDiaryMemo(dateKey, id, text, tags)}
                    />
                  ))}
                </div>
              </section>
            </div>
            
            {/* Retro UI Widgets (Always visible footer) */}
            <div className="shrink-0 flex justify-between items-end border-t border-white/40 bg-white/30 p-3 px-4 shadow-inner mt-2">
              <div className="flex flex-col gap-1">
                <span className="font-pixel text-[10px] text-white tracking-widest animate-blink-fast drop-shadow-md font-bold">NOW LOADING...</span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-white text-[12px] animate-spin-pixel drop-shadow-md">♥</span>
                  <span className="text-[#ffade4] text-[12px] animate-spin-pixel drop-shadow-md" style={{ animationDelay: '0.75s' }}>♥</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="font-pixel text-[9px] text-white tracking-widest drop-shadow-md font-bold">TOTAL VISITOR</span>
                <div className="bg-black/60 border-2 border-[#b588ff] rounded px-3 py-1 shadow-inner backdrop-blur-sm">
                  <span className="font-pixel text-[#ffade4] text-[14px] tracking-widest drop-shadow-[0_0_8px_#ffade4]">00001234</span>
                </div>
              </div>
            </div>
          </RetroWindow>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto pr-2 -mr-2 flex flex-col gap-6">
            {/* 1. Emoji Selector */}
            <section className="p-2" ref={emojiPickerRef}>
              <div className="flex justify-between items-center mb-3 relative">
                <h2 className="text-[11px] font-bold text-[#717A8C] tracking-widest uppercase inline-block relative">
                  오늘의 기분/날씨
                </h2>
                <CloudDoodle isY2K={isY2K} />
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
                    <div key={idx} className={`group relative w-10 h-10 rounded-full flex items-center justify-center p-2.5 ${isAurora || isY2K ? 'bg-white/40 shadow-sm' : 'bg-white border border-[#E5E5EA] shadow-sm'}`}>
                      <Emoji emoji={emoji} className="w-full h-full animate-fade-in" />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEmojiSelect(emoji);
                        }}
                        className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#EF6A7B] text-white flex items-center justify-center text-[8px] font-bold opacity-30 group-hover:opacity-100 hover:opacity-100 transition-opacity z-10"
                      >
                        ✕
                      </button>
                    </div>
                  ))
                ) : (
                  <span className="text-sm text-[#A0AABF]">이모지를 선택해주세요</span>
                )}
              </div>
              
              {isEmojiPickerOpen && (
                  <div className="mt-4 pt-4 border-t border-[#E5E5EA] flex flex-col gap-3 relative z-50 animate-slide-down">
                    <div className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={customEmoji}
                        onChange={(e) => setCustomEmoji(e.target.value)}
                        placeholder="이모지 직접 입력..."
                        className="flex-1 bg-white border border-[#E5E5EA] rounded px-3 py-1.5 text-[13px] outline-none focus:border-[#8B7CF8] font-emoji"
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
                        className="bg-[#8B7CF8] text-white px-3 py-1.5 rounded text-xs font-bold whitespace-nowrap hover:bg-[#7a6aeb] transition-colors"
                      >
                        추가
                      </button>
                    </div>
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
              )}
            </section>

            {/* Middle Row: Q&A and Routine */}
            <div className="flex gap-4 px-2 mt-4 items-start">
              {/* 2. Questions Snapshot */}
              <section className="flex-1 flex flex-col gap-4 bg-white/30 rounded-2xl border border-white/20 pb-4">
                <div className="relative inline-block w-max mt-2 ml-2">
                  <h2 className="text-[13px] font-bold text-[#717A8C] tracking-[0.2em] uppercase">Q&A</h2>
                  <div className="opacity-40">
                    <UnderlineDoodle isY2K={isY2K} />
                  </div>
                </div>
                
                <div className={`flex px-2 ${(!isY2K && !isAurora) ? 'flex-col gap-0' : 'flex-row flex-wrap gap-2.5 items-start'}`}>
                  {settings.questions.map((q, idx) => {
                    const answerObj = (dayDiary.answers || []).find(a => a.questionId === q.id)
                    const answerText = answerObj ? answerObj.answer : ''
                    return (
                      <QuestionItem 
                        key={`${q.id}-${dateKey}`} 
                        q={q} 
                        initialAnswer={answerText} 
                        saveAnswer={(val) => saveDayDiaryAnswer(dateKey, q.id, q.text, val)} 
                        deleteAnswer={() => deleteDayDiaryAnswer(dateKey, q.id)}
                        index={idx}
                        dateSeed={dateKey}
                        isY2K={isY2K}
                        isAurora={isAurora}
                      />
                    )
                  })}
                  
                  {/* Display snapshot answers that are no longer in settings.questions */}
                  {(dayDiary.answers || []).filter(a => !settings.questions.some(q => q.id === a.questionId)).map((a, idx) => (
                    <div key={a.questionId} className={`group relative transition-all duration-300 flex flex-col shrink-0 ${
                      (!isY2K && !isAurora) ? 'w-full min-h-0 py-4 px-2' : 'hover:scale-[1.02] z-0 hover:z-10 p-4 w-36 min-h-[9rem] h-auto'
                    }`} style={getPostItStyle(a.questionId, idx + settings.questions.length, dateKey, isY2K, isAurora)}>
                      <CornerDoodle idString={a.questionId} isY2K={isY2K} isAurora={isAurora} />
                      <div className="flex justify-between items-start mb-1 gap-2">
                        <div>
                          <div className="text-[11px] font-bold font-diary opacity-70" style={{ color: 'inherit' }}>{a.question} (과거 질문)</div>
                        </div>
                        <button 
                          onClick={() => deleteDayDiaryAnswer(dateKey, a.questionId)}
                          className="w-5 h-5 flex items-center justify-center rounded hover:opacity-50 opacity-30 group-hover:opacity-100 transition-opacity text-[10px] shrink-0"
                          style={{ color: 'inherit' }}
                        >
                          ✕
                        </button>
                      </div>
                      <div className="text-[15px] whitespace-pre-wrap font-diary leading-relaxed" style={{ color: 'inherit' }}>{a.answer}</div>
                    </div>
                  ))}
                </div>

                {settings.questions.length === 0 && (dayDiary.answers || []).length === 0 && (
                  <div className="text-xs text-[#A0AABF] px-2">설정에서 다이어리 질문을 추가해보세요.</div>
                )}
              </section>

              {/* 4. Routine Section */}
              <section className="flex-1">
                <RoutineSection dateKey={dateKey} />
              </section>
            </div>

            {/* 3. Free Memos */}
            <section className="p-2 flex flex-col gap-4 mb-8">
              <div className="relative inline-block w-max ml-6">
                <div className="opacity-40">
                  <ArrowDoodle isY2K={isY2K} />
                </div>
                <h2 className="text-[13px] font-bold text-[#717A8C] tracking-[0.2em] uppercase">MEMO</h2>
              </div>
              
              <form ref={newMemoFormRef} onSubmit={(e) => {
                e.preventDefault()
                handleAddMemo(e as any)
              }} className="flex gap-2">
                <div className="flex flex-col gap-2 flex-1 relative">
                  <div className="flex gap-1.5 flex-wrap items-center">
                    <div className="relative">
                      <button 
                        type="button"
                        onClick={() => setIsNewMemoTagPickerOpen(!isNewMemoTagPickerOpen)}
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-dashed border-[#A0AABF] text-[#717A8C] hover:bg-white/30"
                      >
                        + 태그
                      </button>
                      {isNewMemoTagPickerOpen && (
                        <TagPicker 
                          selectedTags={newMemoTags} 
                          onToggleTag={(t) => setNewMemoTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])}
                          onClose={() => setIsNewMemoTagPickerOpen(false)}
                        />
                      )}
                    </div>
                    {newMemoTags.map(tagName => {
                      const tagDef = DIARY_TAGS.find(t => t.name === tagName);
                      if (!tagDef) return null;
                      return (
                        <span key={tagName} className="text-[10px] font-bold px-2 py-0.5 rounded-full text-[#3D3833] flex items-center gap-1" style={{ backgroundColor: tagDef.color }}>
                          {tagName === '웃긴' ? '웃김' : tagName}
                          <button type="button" onClick={() => setNewMemoTags(prev => prev.filter(t => t !== tagName))} className="opacity-50 hover:opacity-100">✕</button>
                        </span>
                      )
                    })}
                  </div>
                  <DiaryTextEditor
                    initialContent={newMemo}
                    onChange={(html) => setNewMemo(html)}
                    placeholder="자유롭게 기록을 남겨보세요..."
                    className="bg-white/30 border border-white/20 rounded-xl px-4 py-3 outline-none text-[#1C1C1E] focus:border-white/50 focus:bg-white/40 transition-all font-diary"
                  />
                </div>
                <button type="submit" disabled={!newMemo.trim()} className="px-4 py-2 h-fit bg-white/40 border border-[#C0C0C0] text-[#1C1C1E] rounded-xl font-bold text-xs hover:bg-[#E5E5EA] disabled:opacity-30 transition-all self-end">
                  추가
                </button>
              </form>

              <div className={`flex mt-2 ${(!isY2K && !isAurora) ? 'flex-col gap-0' : 'flex-row flex-wrap gap-2.5 items-start'}`}>
                {[...(dayDiary.memos || [])].reverse().map((memo: DiaryMemo, idx: number) => (
                  <MemoItem
                    key={memo.id}
                    memo={memo}
                    index={idx + (dayDiary.answers || []).length}
                    dateSeed={dateKey}
                    isY2K={isY2K}
                    isAurora={isAurora}
                    deleteMemo={(id) => deleteDayDiaryMemo(dateKey, id)}
                    updateMemo={(id, text, tags) => updateDayDiaryMemo(dateKey, id, text, tags)}
                  />
                ))}
              </div>
            </section>
          </div>
        )}
      </div>

    </aside>
  )
}

export default DiaryPanel
