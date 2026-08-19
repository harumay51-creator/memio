import { useMemo, useState } from 'react'
import { useAppStore } from '../../store/AppStore'
import { getCategoryColor } from '../../utils/parser'
import MobileLedgerInputSheet from './MobileLedgerInputSheet'
import { EmptyState } from '../common/EmptyState'
import { MessageSquare } from 'lucide-react'
import type { LedgerEntry, FixedExpense } from '../../types'
import { extractSearchText } from '../../utils/textUtils'

interface MobileLedgerSearchTabProps {
  searchQuery: string
}

type SearchItem =
  | { type: 'ledger'; item: LedgerEntry }
  | { type: 'fixed'; item: FixedExpense }

function fmtAmt(n: number) {
  return n.toLocaleString('ko-KR')
}

export default function MobileLedgerSearchTab({ searchQuery }: MobileLedgerSearchTabProps) {
  const { ledger, fixedExpenses, expenseCategories } = useAppStore()
  const [editingRowId, setEditingRowId] = useState<string | null>(null)

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return []

    const queries = searchQuery.trim().toLowerCase().split(/\s+/)
    const results: SearchItem[] = []

    ledger.forEach(entry => {
      const target = extractSearchText((entry.label || '') + ' ' + (entry.memo || '')).toLowerCase()
      if (queries.every(q => target.includes(q))) {
        results.push({ type: 'ledger', item: entry })
      }
    })

    fixedExpenses.forEach(fe => {
      const target = extractSearchText(fe.label || '').toLowerCase()
      if (queries.every(q => target.includes(q))) {
        results.push({ type: 'fixed', item: fe })
      }
    })

    results.sort((a, b) => {
      const getStr = (val: any) => (typeof val === 'string' ? val : val ? new Date(val.seconds ? val.seconds * 1000 : val).toISOString() : '');
      const dateA = a.type === 'ledger' ? getStr(a.item.scheduledDate || a.item.createdAt) : '';
      const dateB = b.type === 'ledger' ? getStr(b.item.scheduledDate || b.item.createdAt) : '';
      
      if (dateA !== dateB) {
        return dateB.localeCompare(dateA);
      }
      
      const ca = a.type === 'ledger' ? getStr(a.item.createdAt) : '';
      const cb = b.type === 'ledger' ? getStr(b.item.createdAt) : '';
      return cb.localeCompare(ca);
    })

    return results
  }, [searchQuery, ledger, fixedExpenses])

  const highlightText = (text: string) => {
    if (!searchQuery.trim() || !text) return text
    const queries = searchQuery.trim().toLowerCase().split(/\s+/)
    let highlighted = <>{text}</>
    
    // Very simple highlight logic for the first matching word for performance
    const q = queries[0]
    if (q) {
      const parts = text.split(new RegExp(`(${q})`, 'gi'))
      highlighted = (
        <>
          {parts.map((part, i) => 
            part.toLowerCase() === q ? 
              <span key={i} className="bg-yellow-200 text-yuri-900">{part}</span> : part
          )}
        </>
      )
    }
    return highlighted
  }

  const editingEntry = editingRowId && editingRowId.startsWith('ledger-') 
    ? ledger.find(e => e.id === editingRowId.replace('ledger-', '')) 
    : null

  if (searchResults.length === 0) {
    return (
      <div className="flex-1 p-8 h-full">
        <EmptyState message={`"${searchQuery}" 검색 결과가 없습니다.`} />
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto bg-yuri-50 h-full pb-20">
      <div className="p-4 shrink-0">
        <h2 className="text-sm font-bold text-yuri-800">
          검색 결과 <span className="text-accent ml-1">{searchResults.length}건</span>
        </h2>
      </div>

      <div className="bg-white border-y border-yuri-100 flex flex-col">
        {searchResults.map((result) => {
          if (result.type === 'ledger') {
            const item = result.item
            const catColor = getCategoryColor(item.category || '기타', expenseCategories)
            const d = new Date(item.scheduledDate || item.createdAt)
            const dStr = `${d.getMonth() + 1}/${d.getDate()}`
            const isCard = item.paymentMethod === '카드'

            return (
              <div 
                key={`ledger-${item.id}`}
                onClick={() => setEditingRowId(`ledger-${item.id}`)}
                className="flex justify-between items-center px-4 py-3 hover:bg-yuri-50 bg-white border-b border-yuri-100 last:border-b-0 cursor-pointer transition-colors active:bg-yuri-100"
              >
                <div className="flex items-center gap-2 overflow-hidden flex-1">
                  <span className="text-[10px] font-semibold text-yuri-400 w-8 shrink-0">{dStr}</span>
                  <span 
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 text-[#333]"
                    style={{ backgroundColor: catColor }}
                  >
                    {item.category || '기타'}
                  </span>
                  <span className="text-sm font-semibold text-yuri-900 truncate flex items-center gap-1.5">
                    {highlightText(item.label)}
                    <span className="text-[9px] bg-yuri-100 text-yuri-500 px-1 py-0.5 rounded font-bold shrink-0">{isCard ? '카드' : '현금'}</span>
                  </span>
                  {item.memo && <MessageSquare size={12} className="text-yuri-300 shrink-0" />}
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-2">
                  <span className="text-base font-black text-yuri-900">
                    {fmtAmt(item.amount)}원
                  </span>
                </div>
              </div>
            )
          } else {
            const item = result.item
            const catColor = getCategoryColor(item.category || '기타', expenseCategories)

            return (
              <div 
                key={`fixed-${item.id}`}
                className="flex justify-between items-center px-4 py-3 bg-gray-50 border-b border-yuri-100 last:border-b-0 opacity-70"
              >
                <div className="flex items-center gap-2 overflow-hidden flex-1">
                  <span className="text-[10px] font-semibold text-yuri-400 w-8 shrink-0">매월 {item.day}일</span>
                  <span 
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 text-[#333]"
                    style={{ backgroundColor: catColor }}
                  >
                    {item.category || '기타'}
                  </span>
                  <span className="text-sm font-semibold text-yuri-900 truncate flex items-center gap-1.5">
                    {highlightText(item.label)}
                    <span className="text-[9px] bg-yuri-200 text-yuri-600 px-1 py-0.5 rounded font-bold uppercase shrink-0">고정지출</span>
                  </span>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-2">
                  <span className="text-base font-black text-yuri-900">
                    {fmtAmt(item.amount)}원
                  </span>
                </div>
              </div>
            )
          }
        })}
      </div>

      <MobileLedgerInputSheet 
        isOpen={!!editingEntry} 
        initialEntry={editingEntry || undefined} 
        onClose={() => setEditingRowId(null)} 
      />
    </div>
  )
}
