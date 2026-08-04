import React, { useState, useEffect } from 'react'
import { RoutineGroup as RoutineGroupType } from '../../store/DiaryStore'
import { ChevronDown, ChevronRight, Plus, Trash2, GripVertical, Pencil } from 'lucide-react'
import { SortableItem } from '../common/SortableItem'
import { RoutineItem } from './RoutineItem'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'

interface Props {
  group: RoutineGroupType
  isEditMode: boolean
  routineStates: Record<string, { checked: boolean, memo?: string }>
  onToggleItem: (itemId: string, checked: boolean) => void
  onUpdateItemMemo: (itemId: string, memo: string) => void
  onDeleteItem: (itemId: string) => void
  onAddItem: (text: string) => void
  onDeleteGroup: () => void
  onRenameGroup: (newName: string) => void
  onRenameItem: (itemId: string, newName: string) => void
}

export const RoutineGroupUI: React.FC<Props> = ({ 
  group, 
  isEditMode,
  routineStates, 
  onToggleItem, 
  onUpdateItemMemo, 
  onDeleteItem, 
  onAddItem, 
  onDeleteGroup,
  onRenameGroup,
  onRenameItem
}) => {
  const foldKey = `routine_fold_${group.id}`
  const [isExpanded, setIsExpanded] = useState(() => {
    const saved = sessionStorage.getItem(foldKey)
    return saved !== 'false'
  })

  const [isAddingItem, setIsAddingItem] = useState(false)
  const [newItemText, setNewItemText] = useState('')
  
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameText, setRenameText] = useState(group.name)

  useEffect(() => {
    sessionStorage.setItem(foldKey, isExpanded.toString())
  }, [isExpanded, foldKey])

  const totalItems = group.items.length
  const checkedItems = group.items.filter(item => routineStates[item.id]?.checked).length

  const handleRenameSubmit = () => {
    if (renameText.trim() && renameText.trim() !== group.name) {
      onRenameGroup(renameText.trim())
    } else {
      setRenameText(group.name)
    }
    setIsRenaming(false)
  }

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
            onClick={() => {
              if (!isRenaming) setIsExpanded(!isExpanded)
            }}
          >
            <div className="flex items-center gap-2 flex-1">
              {isEditMode && (
                <button 
                  {...attributes} 
                  {...listeners}
                  onClick={(e) => e.stopPropagation()}
                  className="text-[#A0AABF] hover:text-[#717A8C] cursor-grab active:cursor-grabbing p-1 -ml-1 opacity-0 group-hover/header:opacity-100 transition-opacity"
                >
                  <GripVertical size={16} />
                </button>
              )}
              <div className="text-[#A0AABF]">
                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </div>
              
              {isRenaming ? (
                <input
                  autoFocus
                  type="text"
                  value={renameText}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => setRenameText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRenameSubmit()
                    if (e.key === 'Escape') {
                      setRenameText(group.name)
                      setIsRenaming(false)
                    }
                  }}
                  onBlur={handleRenameSubmit}
                  className="flex-1 bg-white border border-[#E5E5EA] rounded px-2 py-0.5 text-[16px] font-diary outline-none focus:border-[#8B7CF8] text-[#3D3833] font-bold"
                />
              ) : (
                <span className="text-[16px] font-diary font-bold text-[#3D3833] flex items-center gap-2">
                  {group.name} 
                  <span className="text-[#A0AABF] font-normal font-sans text-xs">({checkedItems}/{totalItems})</span>
                </span>
              )}
            </div>

            {isEditMode && !isRenaming && (
              <div className="flex items-center opacity-0 group-hover/header:opacity-100 transition-opacity">
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
                    onDeleteGroup()
                  }}
                  className="p-1.5 text-[#A0AABF] hover:text-[#EF6A7B] hover:bg-red-50 rounded-md transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )}
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
                      isEditMode={isEditMode}
                      checked={routineStates[item.id]?.checked || false}
                      memo={routineStates[item.id]?.memo}
                      onToggle={() => onToggleItem(item.id, !(routineStates[item.id]?.checked || false))}
                      onDelete={() => onDeleteItem(item.id)}
                      onUpdateMemo={(memo) => onUpdateItemMemo(item.id, memo)}
                      onRename={(newName) => onRenameItem(item.id, newName)}
                    />
                  ))}
                </SortableContext>
              </div>

              {/* Add Item Input */}
              {isEditMode && (
                isAddingItem ? (
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
                      className="flex-1 bg-white border border-[#E5E5EA] rounded px-2 py-1.5 text-[15px] font-diary outline-none focus:border-[#8B7CF8] text-[#3D3833]"
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
                )
              )}
            </div>
          )}
        </div>
      )}
    </SortableItem>
  )
}
