import React, { useState, useEffect } from 'react'
import { RoutineGroup as RoutineGroupType, useDiaryStore } from '../../store/DiaryStore'
import { ChevronDown, ChevronRight, Plus, Trash2, GripVertical } from 'lucide-react'
import { SortableItem } from '../common/SortableItem'
import { RoutineItem } from './RoutineItem'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'

interface Props {
  group: RoutineGroupType
  routineStates: Record<string, { checked: boolean, memo?: string }>
  onToggleItem: (itemId: string, checked: boolean) => void
  onUpdateItemMemo: (itemId: string, memo: string) => void
  onDeleteItem: (itemId: string) => void
  onAddItem: (text: string) => void
  onDeleteGroup: () => void
}

export const RoutineGroupUI: React.FC<Props> = ({ 
  group, 
  routineStates, 
  onToggleItem, 
  onUpdateItemMemo, 
  onDeleteItem, 
  onAddItem, 
  onDeleteGroup 
}) => {
  // Use session storage for fold state
  const foldKey = `routine_fold_${group.id}`
  const [isExpanded, setIsExpanded] = useState(() => {
    const saved = sessionStorage.getItem(foldKey)
    return saved !== 'false' // default to true
  })

  const [isAddingItem, setIsAddingItem] = useState(false)
  const [newItemText, setNewItemText] = useState('')

  useEffect(() => {
    sessionStorage.setItem(foldKey, isExpanded.toString())
  }, [isExpanded, foldKey])

  const totalItems = group.items.length
  const checkedItems = group.items.filter(item => routineStates[item.id]?.checked).length

  return (
    <SortableItem id={group.id}>
      {({ attributes, listeners, setNodeRef, style, isDragging }) => (
        <div 
          ref={setNodeRef}
          style={style}
          className={`flex flex-col bg-white border border-[#E5E5EA] rounded-xl overflow-hidden mb-3 transition-shadow ${isDragging ? 'shadow-lg z-40' : 'shadow-sm'}`}
        >
          {/* Header */}
          <div 
            className="flex items-center justify-between p-3 bg-white hover:bg-[#F9FAFB] cursor-pointer group/header"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <div className="flex items-center gap-2 flex-1">
              <button 
                {...attributes} 
                {...listeners}
                onClick={(e) => e.stopPropagation()}
                className="text-[#A0AABF] hover:text-[#717A8C] cursor-grab active:cursor-grabbing p-1 -ml-1 opacity-0 group-hover/header:opacity-100 transition-opacity"
              >
                <GripVertical size={16} />
              </button>
              <div className="text-[#A0AABF]">
                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </div>
              <span className="text-[13px] font-bold text-[#3D3833]">
                {group.name} <span className="text-[#A0AABF] font-normal ml-1">({checkedItems}/{totalItems})</span>
              </span>
            </div>
            <button 
              onClick={(e) => {
                e.stopPropagation()
                onDeleteGroup()
              }}
              className="p-1.5 text-[#A0AABF] hover:text-[#EF6A7B] hover:bg-red-50 rounded-md transition-colors opacity-0 group-hover/header:opacity-100"
            >
              <Trash2 size={14} />
            </button>
          </div>

          {/* Items */}
          {isExpanded && (
            <div className="flex flex-col px-3 pb-3 border-t border-[#F0F0F5] bg-[#FAFAFC]">
              <div className="flex flex-col mt-2">
                <SortableContext items={group.items.map(i => i.id)} strategy={verticalListSortingStrategy}>
                  {group.items.map(item => (
                    <RoutineItem 
                      key={item.id}
                      item={item}
                      checked={routineStates[item.id]?.checked || false}
                      memo={routineStates[item.id]?.memo}
                      onToggle={() => onToggleItem(item.id, !(routineStates[item.id]?.checked || false))}
                      onDelete={() => onDeleteItem(item.id)}
                      onUpdateMemo={(memo) => onUpdateItemMemo(item.id, memo)}
                    />
                  ))}
                </SortableContext>
              </div>

              {/* Add Item Input */}
              {isAddingItem ? (
                <div className="flex items-center gap-2 mt-2 px-1">
                  <input
                    autoFocus
                    type="text"
                    value={newItemText}
                    onChange={(e) => setNewItemText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newItemText.trim()) {
                        onAddItem(newItemText.trim())
                        setNewItemText('')
                        setIsAddingItem(false)
                      } else if (e.key === 'Escape') {
                        setIsAddingItem(false)
                        setNewItemText('')
                      }
                    }}
                    onBlur={() => {
                      if (newItemText.trim()) onAddItem(newItemText.trim())
                      setIsAddingItem(false)
                      setNewItemText('')
                    }}
                    placeholder="항목 이름..."
                    className="flex-1 bg-white border border-[#E5E5EA] rounded px-2 py-1.5 text-[13px] outline-none focus:border-[#8B7CF8] text-[#3D3833]"
                  />
                </div>
              ) : (
                <button
                  onClick={() => setIsAddingItem(true)}
                  className="flex items-center gap-1 text-[12px] font-bold text-[#A0AABF] hover:text-[#717A8C] mt-2 px-1 py-1 w-fit transition-colors"
                >
                  <Plus size={14} strokeWidth={3} />
                  항목 추가
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </SortableItem>
  )
}
