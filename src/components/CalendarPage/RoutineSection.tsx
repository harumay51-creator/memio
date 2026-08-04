import React, { useState } from 'react'
import { RoutineGroup as RoutineGroupType, useDiaryStore } from '../../store/DiaryStore'
import { RoutineGroupUI } from './RoutineGroupUI'
import { Plus } from 'lucide-react'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'

interface Props {
  dateKey: string
}

export const RoutineSection: React.FC<Props> = ({ dateKey }) => {
  const { settings, diaries, saveRoutineGroups, saveRoutineItemState } = useDiaryStore()
  
  const groups = settings.routineGroups || []
  const routineStates = diaries[dateKey]?.routineStates || {}

  const [isAddingGroup, setIsAddingGroup] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string
    if (activeId === overId) return

    // Find if we are dragging a group or an item
    const activeGroupIdx = groups.findIndex(g => g.id === activeId)
    const overGroupIdx = groups.findIndex(g => g.id === overId)

    if (activeGroupIdx !== -1 && overGroupIdx !== -1) {
      // Reordering groups
      const newGroups = arrayMove(groups, activeGroupIdx, overGroupIdx)
      saveRoutineGroups(newGroups)
      return
    }

    // Otherwise, we might be reordering items within the same group
    const groupWithActiveItem = groups.find(g => g.items.some(i => i.id === activeId))
    const groupWithOverItem = groups.find(g => g.items.some(i => i.id === overId))

    if (groupWithActiveItem && groupWithOverItem && groupWithActiveItem.id === groupWithOverItem.id) {
      const activeIdx = groupWithActiveItem.items.findIndex(i => i.id === activeId)
      const overIdx = groupWithActiveItem.items.findIndex(i => i.id === overId)
      
      const newItems = arrayMove(groupWithActiveItem.items, activeIdx, overIdx)
      const newGroups = groups.map(g => g.id === groupWithActiveItem.id ? { ...g, items: newItems } : g)
      saveRoutineGroups(newGroups)
    }
  }

  const handleToggleItem = (itemId: string, checked: boolean) => {
    const memo = routineStates[itemId]?.memo
    saveRoutineItemState(dateKey, itemId, checked, memo)
  }

  const handleUpdateItemMemo = (itemId: string, memo: string) => {
    const checked = routineStates[itemId]?.checked || false
    saveRoutineItemState(dateKey, itemId, checked, memo)
  }

  const handleDeleteItem = (groupId: string, itemId: string) => {
    const newGroups = groups.map(g => {
      if (g.id === groupId) {
        return { ...g, items: g.items.filter(i => i.id !== itemId) }
      }
      return g
    })
    saveRoutineGroups(newGroups)
  }

  const handleAddItem = (groupId: string, text: string) => {
    const newItem = { id: Date.now().toString(), text }
    const newGroups = groups.map(g => {
      if (g.id === groupId) {
        return { ...g, items: [...g.items, newItem] }
      }
      return g
    })
    saveRoutineGroups(newGroups)
  }

  const handleDeleteGroup = (groupId: string) => {
    if (window.confirm('그룹과 모든 항목이 삭제됩니다. 계속하시겠습니까?')) {
      const newGroups = groups.filter(g => g.id !== groupId)
      saveRoutineGroups(newGroups)
    }
  }

  const handleAddGroup = () => {
    if (newGroupName.trim()) {
      const newGroup: RoutineGroupType = {
        id: 'group_' + Date.now().toString(),
        name: newGroupName.trim(),
        items: []
      }
      saveRoutineGroups([...groups, newGroup])
    }
    setIsAddingGroup(false)
    setNewGroupName('')
  }

  return (
    <div className="flex flex-col h-full bg-white/30 rounded-2xl border border-white/20">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-[13px] font-bold text-[#717A8C] tracking-[0.2em] uppercase ml-2 mt-2">ROUTINE</h2>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="flex flex-col">
          <SortableContext items={groups.map(g => g.id)} strategy={verticalListSortingStrategy}>
            {groups.map(group => (
              <RoutineGroupUI
                key={group.id}
                group={group}
                routineStates={routineStates}
                onToggleItem={handleToggleItem}
                onUpdateItemMemo={handleUpdateItemMemo}
                onDeleteItem={(itemId) => handleDeleteItem(group.id, itemId)}
                onAddItem={(text) => handleAddItem(group.id, text)}
                onDeleteGroup={() => handleDeleteGroup(group.id)}
              />
            ))}
          </SortableContext>
        </div>
      </DndContext>

      {isAddingGroup ? (
        <div className="flex items-center gap-2 mt-2">
          <input
            autoFocus
            type="text"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newGroupName.trim()) {
                handleAddGroup()
              } else if (e.key === 'Escape') {
                setIsAddingGroup(false)
                setNewGroupName('')
              }
            }}
            onBlur={() => {
              if (newGroupName.trim()) handleAddGroup()
              setIsAddingGroup(false)
              setNewGroupName('')
            }}
            placeholder="새 그룹 이름..."
            className="flex-1 bg-white border border-[#E5E5EA] rounded px-3 py-2 text-[13px] outline-none focus:border-[#8B7CF8] text-[#3D3833]"
          />
        </div>
      ) : (
        <button
          onClick={() => setIsAddingGroup(true)}
          className="flex items-center justify-center gap-1 text-[12px] font-bold text-[#A0AABF] hover:text-[#717A8C] py-3 border-2 border-dashed border-[#E5E5EA] rounded-xl hover:bg-white/50 transition-colors mt-2"
        >
          <Plus size={16} strokeWidth={3} />
          그룹 추가
        </button>
      )}
    </div>
  )
}
