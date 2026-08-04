import React, { useState, useRef, useEffect } from 'react'
import { RoutineItem as RoutineItemType } from '../../store/DiaryStore'
import { MessageSquare, Trash2, GripVertical, Check, Pencil } from 'lucide-react'
import { SortableItem } from '../common/SortableItem'

interface Props {
  item: RoutineItemType
  checked: boolean
  memo?: string
  isEditMode: boolean
  onToggle: () => void
  onDelete: () => void
  onUpdateMemo: (memo: string) => void
  onRename: (newName: string) => void
}

export const RoutineItem: React.FC<Props> = ({ item, checked, memo, isEditMode, onToggle, onDelete, onUpdateMemo, onRename }) => {
  const [isMemoOpen, setIsMemoOpen] = useState(false)
  const [memoText, setMemoText] = useState(memo || '')
  const memoRef = useRef<HTMLDivElement>(null)

  const [isRenaming, setIsRenaming] = useState(false)
  const [renameText, setRenameText] = useState(item.text)

  useEffect(() => {
    setMemoText(memo || '')
  }, [memo])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (memoRef.current && !memoRef.current.contains(e.target as Node)) {
        setIsMemoOpen(false)
        if (memoText !== memo) {
          onUpdateMemo(memoText)
        }
      }
    }
    if (isMemoOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isMemoOpen, memoText, memo, onUpdateMemo])

  const handleToggleClick = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent dragging or bubbling
    onToggle()
  }

  const handleRenameSubmit = () => {
    if (renameText.trim() && renameText.trim() !== item.text) {
      onRename(renameText.trim())
    } else {
      setRenameText(item.text)
    }
    setIsRenaming(false)
  }

  return (
    <SortableItem id={item.id}>
      {({ attributes, listeners, setNodeRef, style, isDragging }) => (
        <div 
          ref={setNodeRef}
          style={style}
          className={`group flex flex-col relative transition-colors hover:bg-white/50 rounded-lg ${isDragging ? 'z-50 bg-white shadow-sm' : ''}`}
        >
          <div className="flex items-center justify-between py-2 px-1">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {isEditMode && (
                <button 
                  {...attributes} 
                  {...listeners}
                  className="text-[#A0AABF] hover:text-[#717A8C] cursor-grab active:cursor-grabbing p-1 -ml-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                >
                  <GripVertical size={14} />
                </button>
              )}
              <button
                type="button"
                onClick={handleToggleClick}
                className={`w-5 h-5 rounded flex items-center justify-center shrink-0 border transition-all ${
                  checked 
                    ? 'bg-[#8B7CF8] border-[#8B7CF8] text-white' 
                    : 'bg-white border-[#E5E5EA] text-transparent hover:border-[#8B7CF8]'
                }`}
              >
                <Check size={12} strokeWidth={3} />
              </button>
              
              {isRenaming ? (
                <input
                  autoFocus
                  type="text"
                  value={renameText}
                  onChange={(e) => setRenameText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRenameSubmit()
                    if (e.key === 'Escape') {
                      setRenameText(item.text)
                      setIsRenaming(false)
                    }
                  }}
                  onBlur={handleRenameSubmit}
                  className="flex-1 bg-transparent border-b border-[#8B7CF8] px-1 py-0.5 text-[15px] font-diary outline-none text-[#3D3833]"
                />
              ) : (
                <div 
                  className="flex flex-col flex-1 min-w-0 cursor-pointer"
                  onClick={handleToggleClick}
                >
                  <span 
                    className={`text-[15px] font-diary truncate select-none transition-colors ${
                      checked ? 'text-[#A0AABF] line-through' : 'text-[#3D3833]'
                    }`}
                  >
                    {item.text}
                  </span>
                  {memo && !isMemoOpen && (
                    <span 
                      className="text-[13px] font-diary text-[#8B7CF8] truncate mt-0.5"
                      onClick={(e) => {
                        e.stopPropagation()
                        setIsMemoOpen(true)
                      }}
                    >
                      {memo}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0 transition-opacity">
              <button 
                onClick={(e) => {
                  e.stopPropagation()
                  setIsMemoOpen(!isMemoOpen)
                }}
                className={`p-1.5 rounded-md transition-colors ${
                  memo ? 'text-[#8B7CF8]' : 'text-[#A0AABF] opacity-0 group-hover:opacity-100 hover:text-[#717A8C] hover:bg-white/80'
                }`}
              >
                <MessageSquare size={14} />
              </button>
              
              {isEditMode && !isRenaming && (
                <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation()
                      setIsRenaming(true)
                    }}
                    className="p-1.5 text-[#A0AABF] hover:text-[#8B7CF8] hover:bg-[#F0F0F5] rounded-md transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation()
                      onDelete()
                    }}
                    className="p-1.5 text-[#A0AABF] hover:text-[#EF6A7B] hover:bg-red-50 rounded-md transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Inline Memo Expansion */}
          {isMemoOpen && (
            <div className="pl-8 pr-2 pb-2 w-full" ref={memoRef}>
              <textarea
                autoFocus
                value={memoText}
                onChange={(e) => setMemoText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    setIsMemoOpen(false)
                    onUpdateMemo(memoText)
                  }
                  if (e.key === 'Escape') {
                    setIsMemoOpen(false)
                    setMemoText(memo || '')
                  }
                }}
                onBlur={() => {
                  setIsMemoOpen(false)
                  if (memoText !== memo) {
                    onUpdateMemo(memoText)
                  }
                }}
                placeholder="메모를 남겨주세요..."
                className="w-full h-16 text-[15px] font-diary bg-white/60 border border-[#E5E5EA] focus:border-[#8B7CF8] rounded-lg p-2 outline-none resize-none text-[#3D3833] placeholder:text-[#A0AABF]"
              />
            </div>
          )}
        </div>
      )}
    </SortableItem>
  )
}
