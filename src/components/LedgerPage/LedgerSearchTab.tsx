import React, { useState, useMemo } from 'react'
import type { LedgerEntry, FixedExpense, CategoryConfig } from '../../types'
import { isSearchMatch } from '../../utils/textUtils'
import { HighlightText } from '../common/HighlightText'
import { EditRow } from './EditRow'
import { getCategoryColor } from '../../utils/parser'
import { SearchX, CalendarClock, CreditCard, Banknote } from 'lucide-react'

type SearchItem =
  | { type: 'ledger'; item: LedgerEntry }
  | { type: 'fixed'; item: FixedExpense }

interface LedgerSearchTabProps {
  searchQuery: string
  ledger: LedgerEntry[]
  fixedExpenses: FixedExpense[]
  expenseCategories: CategoryConfig[]
  updateLedgerEntry: (id: string, updates: Partial<LedgerEntry>) => void
  deleteLedgerEntry: (id: string) => void
  onEditFixedExpense: (item: FixedExpense) => void
}

export const LedgerSearchTab: React.FC<LedgerSearchTabProps> = ({
  searchQuery,
  ledger,
  fixedExpenses,
  expenseCategories,
  updateLedgerEntry,
  deleteLedgerEntry,
  onEditFixedExpense
}) => {
  const [editingRowId, setEditingRowId] = useState<string | null>(null)

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return []

    const results: SearchItem[] = []

    // Search ledger entries (Cash & Card)
    ledger.forEach(entry => {
      const searchTarget = [
        entry.label,
        entry.memo
      ].filter(Boolean).join(' ')
      
      if (isSearchMatch(searchTarget, searchQuery)) {
        results.push({ type: 'ledger', item: entry })
      }
    })

    // Search fixed expenses
    fixedExpenses.forEach(fe => {
      const searchTarget = [
        fe.label
      ].filter(Boolean).join(' ')
      
      if (isSearchMatch(searchTarget, searchQuery)) {
        results.push({ type: 'fixed', item: fe })
      }
    })

    // Sort by date (descending) if possible
    results.sort((a, b) => {
      const dateA = a.type === 'ledger' ? new Date(a.item.scheduledDate || 0).getTime() : 0
      const dateB = b.type === 'ledger' ? new Date(b.item.scheduledDate || 0).getTime() : 0
      return dateB - dateA // fixed expenses will stay at the bottom, which is fine
    })

    return results
  }, [searchQuery, ledger, fixedExpenses])

  if (searchResults.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#FBFBFC]">
        <SearchX size={48} className="text-yuri-200 mb-4" />
        <p className="text-sm font-bold text-yuri-400">"{searchQuery}" 검색 결과가 없습니다.</p>
        <p className="text-xs text-yuri-300 mt-1">다른 검색어로 다시 시도해보세요.</p>
      </div>
    )
  }

  return (
    <div className="flex-1 bg-[#FBFBFC] overflow-y-auto">
      <div className="p-5 md:p-8 flex flex-col gap-6 max-w-4xl mx-auto w-full">
        <h2 className="text-sm font-bold text-yuri-900 mb-2">
          검색 결과 <span className="text-yuri-400 font-normal ml-1">{searchResults.length}건</span>
        </h2>
        
        <div className="flex flex-col bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          {searchResults.map((result, idx) => {
            const isEditing = editingRowId === (result.type === 'ledger' ? result.item.id : `fixed-${result.item.id}`)
            
            if (result.type === 'ledger') {
              const entry = result.item
              const isCard = entry.paymentMethod === '카드'
              const dateObj = new Date(entry.scheduledDate || 0)
              const dateStr = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`

              if (isEditing) {
                return (
                  <EditRow 
                    key={`edit-${entry.id}`}
                    item={entry}
                    expenseCategories={expenseCategories}
                    onUpdate={updateLedgerEntry}
                    onDelete={deleteLedgerEntry}
                    onCancel={() => setEditingRowId(null)}
                  />
                )
              }

              return (
                <div 
                  key={entry.id}
                  onClick={() => setEditingRowId(entry.id)}
                  className={`flex items-center px-4 md:px-5 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                    idx !== searchResults.length - 1 ? 'border-b border-gray-100' : ''
                  }`}
                >
                  <div className="w-[38px] shrink-0 text-center text-[11px] font-bold text-gray-400">
                    {dateStr}
                  </div>
                  <div className="w-16 shrink-0 flex justify-center">
                    <span 
                      className="text-[10px] font-bold px-2 py-0.5 rounded"
                      style={{ backgroundColor: getCategoryColor(entry.category, expenseCategories), color: '#374151' }}
                    >
                      <HighlightText text={entry.category} highlight={searchQuery} />
                    </span>
                  </div>
                  <div className="flex-1 min-w-0 ml-3 flex flex-col justify-center">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-900 truncate">
                        <HighlightText text={entry.label} highlight={searchQuery} />
                      </span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-sm flex items-center gap-1 shrink-0 ${
                        isCard ? 'bg-indigo-50 text-indigo-500' : 'bg-emerald-50 text-emerald-500'
                      }`}>
                        {isCard ? <CreditCard size={10} /> : <Banknote size={10} />}
                        {isCard ? '카드' : '현금'}
                      </span>
                    </div>
                    {entry.memo && (
                      <span className="text-xs text-gray-400 truncate mt-0.5 max-w-[80%]">
                        <HighlightText text={entry.memo} highlight={searchQuery} />
                      </span>
                    )}
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <span className="text-sm font-bold text-gray-900">
                      {entry.amount.toLocaleString('ko-KR')}원
                    </span>
                  </div>
                </div>
              )
            } else {
              const fe = result.item
              return (
                <div 
                  key={`fe-${fe.id}`}
                  onClick={() => onEditFixedExpense(fe)}
                  className={`flex items-center px-4 md:px-5 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                    idx !== searchResults.length - 1 ? 'border-b border-gray-100' : ''
                  }`}
                >
                  <div className="w-[38px] shrink-0 text-center text-[11px] font-bold text-gray-400">
                    {fe.day === 99 ? '말일' : `${fe.day}일`}
                  </div>
                  <div className="w-16 shrink-0 flex justify-center">
                    <span 
                      className="text-[10px] font-bold px-2 py-0.5 rounded"
                      style={{ backgroundColor: getCategoryColor(fe.category, expenseCategories), color: '#374151' }}
                    >
                      <HighlightText text={fe.category} highlight={searchQuery} />
                    </span>
                  </div>
                  <div className="flex-1 min-w-0 ml-3 flex flex-col justify-center">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-900 truncate">
                        <HighlightText text={fe.label} highlight={searchQuery} />
                      </span>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-sm flex items-center gap-1 shrink-0 bg-amber-50 text-amber-600">
                        <CalendarClock size={10} /> 고정지출
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <span className="text-sm font-bold text-gray-900">
                      {fe.amount.toLocaleString('ko-KR')}원
                    </span>
                  </div>
                </div>
              )
            }
          })}
        </div>
      </div>
    </div>
  )
}
