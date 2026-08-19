import React, { useMemo, useState, useEffect } from 'react'
import { useAppStore } from '../../store/AppStore'
import { calculatePaydayCycle } from '../../utils/ledgerCycle'
import { getCategoryColor } from '../../utils/parser'
import MobileLedgerInputSheet from './MobileLedgerInputSheet'
import { EmptyState } from '../common/EmptyState'
import { MessageSquare } from 'lucide-react'
import type { LedgerEntry } from '../../types'
import { extractSearchText } from '../../utils/textUtils'
import { useConfirm } from '../common/ConfirmModal'

interface MobileCardTabProps {
  year: number
  month: number
  searchQuery?: string
}

export default function MobileCardTab({ year, month, searchQuery = '' }: MobileCardTabProps) {
  const { 
    ledger, 
    expenseCategories, 
    categoryOrder,
    payday,
    cardPaymentDay,
    cardBillingStartDay,
    cardBillingEndDay,
    deleteLedgerEntry,
    cardBills,
    updateCardBill
  } = useAppStore()
  const { confirm } = useConfirm()

  // Billed cycle for the viewed month
  const cycle = useMemo(() => {
    return calculatePaydayCycle(year, month + 1, payday, cardPaymentDay, cardBillingStartDay, cardBillingEndDay)
  }, [year, month, payday, cardPaymentDay, cardBillingStartDay, cardBillingEndDay])

  const today = useMemo(() => new Date(), [])
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth()
  
  // Unbilled cycles up to today
  const unbilledCycles = useMemo(() => {
    if (!isCurrentMonth) return []
    const cycles: { type: 'pending' | 'ongoing', cycle: ReturnType<typeof calculatePaydayCycle>, month: number, year: number }[] = []
    
    let C_ongoing = calculatePaydayCycle(today.getFullYear(), today.getMonth() + 1, payday, cardPaymentDay, cardBillingStartDay, cardBillingEndDay);
    let ongoingY = today.getFullYear();
    let ongoingM = today.getMonth();

    for (let o = -12; o <= 12; o++) {
      const testDate = new Date(today.getFullYear(), today.getMonth() + o, 1);
      const c = calculatePaydayCycle(testDate.getFullYear(), testDate.getMonth() + 1, payday, cardPaymentDay, cardBillingStartDay, cardBillingEndDay);
      if (today.getTime() >= c.cardBillingStart.getTime() && today.getTime() <= c.cardBillingEnd.getTime()) {
        C_ongoing = c;
        ongoingY = testDate.getFullYear();
        ongoingM = testDate.getMonth();
        break;
      }
    }

    const viewAbs = year * 12 + month;
    const ongoingAbs = ongoingY * 12 + ongoingM;

    if (viewAbs >= ongoingAbs) {
      cycles.push({ type: 'ongoing', cycle: C_ongoing, year: ongoingY, month: ongoingM });
    } else {
      for (let m = viewAbs + 1; m <= ongoingAbs; m++) {
        const y = Math.floor(m / 12);
        const mo = m % 12;
        const c = calculatePaydayCycle(y, mo + 1, payday, cardPaymentDay, cardBillingStartDay, cardBillingEndDay);
        cycles.push({ 
          type: m === ongoingAbs ? 'ongoing' : 'pending', 
          cycle: c,
          year: y,
          month: mo
        });
      }
    }
    return cycles;
  }, [year, month, today, payday, cardPaymentDay, cardBillingStartDay, cardBillingEndDay, isCurrentMonth])

  // Combine into tabs
  const tabs = useMemo(() => {
    if (!isCurrentMonth) {
      return [{ id: 'billed', title: `${month + 1}월 확정 내역`, cycle, type: 'billed', isBilled: true }]
    }
    const t = []
    t.push({ id: 'billed', title: '이번 달 청구', cycle, type: 'billed', isBilled: true })
    unbilledCycles.forEach((uc, i) => {
      if (uc.type === 'pending') {
        t.push({ id: `pending_${i}`, title: `${uc.cycle.targetCardPaymentDate.getMonth() + 1}월 청구 예정`, cycle: uc.cycle, type: 'pending', isBilled: false })
      } else {
        t.push({ id: 'ongoing', title: '현재 진행 중', cycle: uc.cycle, type: 'ongoing', isBilled: false })
      }
    })
    return t
  }, [cycle, unbilledCycles, isCurrentMonth, month])

  const [activeTabId, setActiveTabId] = useState<string>('ongoing')
  
  const activeTab = useMemo(() => {
    return tabs.find(t => t.id === activeTabId) || (isCurrentMonth ? tabs.find(t => t.id === 'ongoing') : tabs[0]) || tabs[tabs.length - 1]
  }, [tabs, activeTabId, isCurrentMonth])

  useEffect(() => {
    if (!tabs.find(t => t.id === activeTabId)) {
      setActiveTabId(isCurrentMonth ? 'ongoing' : tabs[0].id)
    }
  }, [tabs, activeTabId, isCurrentMonth])

  const activeEntries = useMemo(() => {
    return ledger.filter(e => {
      if (e.type !== 'expense' || e.paymentMethod !== '카드') return false
      const d = new Date(e.scheduledDate || e.createdAt)
      return d.getTime() >= activeTab.cycle.cardBillingStart.getTime() && d.getTime() <= activeTab.cycle.cardBillingEnd.getTime()
    })
  }, [ledger, activeTab])

  // Bill amounts
  const monthKey = `${activeTab.cycle.targetCardPaymentDate.getFullYear()}-${activeTab.cycle.targetCardPaymentDate.getMonth() + 1}`
  const billData = cardBills[monthKey] || {}
  const expectedBill = useMemo(() => activeEntries.reduce((s, e) => s + e.amount, 0), [activeEntries])
  const actualBill = billData.amount
  const hasActualBill = actualBill !== undefined && actualBill !== null

  const [actualBillInput, setActualBillInput] = useState('')
  const [memoInput, setMemoInput] = useState('')

  useEffect(() => {
    setActualBillInput(hasActualBill ? actualBill.toLocaleString('ko-KR') : '')
    setMemoInput(billData.memo || '')
  }, [hasActualBill, actualBill, billData.memo, activeTabId])

  const handleActualBillChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '')
    if (raw === '') {
      setActualBillInput('')
    } else {
      setActualBillInput(parseInt(raw, 10).toLocaleString('ko-KR'))
    }
  }

  const handleActualBillBlur = () => {
    const raw = actualBillInput.replace(/[^0-9]/g, '')
    if (raw === '') {
      updateCardBill(monthKey, { amount: undefined, memo: undefined })
    } else {
      const val = parseInt(raw, 10)
      if (val !== actualBill) {
        updateCardBill(monthKey, { amount: val })
      }
    }
  }

  const handleMemoBlur = () => {
    if (hasActualBill) {
      updateCardBill(monthKey, { memo: memoInput })
    }
  }

  // ── Category Filter & List Rendering ──
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const availableCategories = useMemo(() => {
    const present = new Set(activeEntries.map(e => e.category || '기타'))
    const defaultCats = expenseCategories.map(c => c.name)
    const ordered = [...defaultCats].sort((a, b) => {
      const idxA = categoryOrder.indexOf(a)
      const idxB = categoryOrder.indexOf(b)
      if (idxA === -1 && idxB === -1) return 0
      if (idxA === -1) return 1
      if (idxB === -1) return -1
      return idxA - idxB
    })
    
    const finalCats = ordered.filter(c => present.has(c))
    if (present.has('기타') && !finalCats.includes('기타')) finalCats.push('기타')
    return finalCats
  }, [activeEntries, expenseCategories, categoryOrder])

  const filteredEntries = useMemo(() => {
    let filtered = activeEntries
    if (activeCategory) {
      filtered = filtered.filter(e => (e.category || '기타') === activeCategory)
    }
    if (searchQuery.trim()) {
      const queries = searchQuery.trim().toLowerCase().split(/\s+/)
      filtered = filtered.filter(item => {
        const target = extractSearchText((item.label || '') + ' ' + (item.memo || '')).toLowerCase()
        return queries.every(q => target.includes(q))
      })
    }
    return filtered
  }, [activeEntries, activeCategory, searchQuery])

  const sortedListEntries = useMemo(() => {
    return [...filteredEntries].sort((a, b) => {
      const getStr = (val: any) => (typeof val === 'string' ? val : val ? new Date(val.seconds ? val.seconds * 1000 : val).toISOString() : '');
      const dateA = getStr(a.scheduledDate || a.createdAt);
      const dateB = getStr(b.scheduledDate || b.createdAt);
      
      if (dateA !== dateB) {
        return dateB.localeCompare(dateA);
      }
      
      const ca = getStr(a.createdAt);
      const cb = getStr(b.createdAt);
      return cb.localeCompare(ca);
    })
  }, [filteredEntries])
  
  const listTotal = useMemo(() => filteredEntries.reduce((s, e) => s + e.amount, 0), [filteredEntries])

  // Sheet State
  const [editingEntry, setEditingEntry] = useState<LedgerEntry | null>(null)
  
  const highlightText = (text: string) => {
    if (!searchQuery.trim() || !text) return text
    const queries = searchQuery.trim().split(/\s+/).filter(Boolean)
    if (queries.length === 0) return text
    
    const regex = new RegExp(`(${queries.join('|')})`, 'gi')
    const parts = text.split(regex)
    
    return parts.map((part, i) => 
      regex.test(part) ? <mark key={i} className="bg-yellow-200 text-yuri-900 rounded px-0.5">{part}</mark> : part
    )
  }

  return (
    <div className="flex flex-col h-full bg-yuri-50 pb-safe">
      
      {/* Segments (Scrollable Horizontal) */}
      <div className="px-4 py-3 bg-white shadow-sm z-10 shrink-0">
        <div className="flex overflow-x-auto hide-scrollbar gap-3 snap-x pb-1">
          {tabs.map(tab => {
            const isSelected = activeTabId === tab.id
            const tabEntries = ledger.filter(e => {
              if (e.type !== 'expense' || e.paymentMethod !== '카드') return false
              const d = new Date(e.scheduledDate || e.createdAt)
              return d.getTime() >= tab.cycle.cardBillingStart.getTime() && d.getTime() <= tab.cycle.cardBillingEnd.getTime()
            })
            const total = tabEntries.reduce((s, e) => s + e.amount, 0)
            
            return (
              <div 
                key={tab.id}
                onClick={() => setActiveTabId(tab.id)}
                className={`cursor-pointer shrink-0 snap-center rounded-2xl p-3 transition-all border-2 min-w-[140px] flex flex-col gap-1 ${
                  isSelected 
                    ? 'bg-white border-yuri-900 shadow-md scale-100' 
                    : 'bg-yuri-50 border-transparent opacity-70'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-extrabold ${isSelected ? 'text-yuri-900' : 'text-yuri-500'}`}>
                    {tab.title}
                  </span>
                </div>
                <div className={`text-lg font-black ${isSelected ? 'text-yuri-900' : 'text-yuri-600'}`}>
                  {total.toLocaleString()}원
                </div>
                <div className="text-[9px] text-yuri-400 font-medium mt-1 leading-tight">
                  {tab.cycle.cardBillingStart.getMonth() + 1}/{tab.cycle.cardBillingStart.getDate()} ~ {tab.cycle.cardBillingEnd.getMonth() + 1}/{tab.cycle.cardBillingEnd.getDate()}
                  <span className="mx-1">·</span>결제 {tab.cycle.targetCardPaymentDate.getMonth() + 1}/{tab.cycle.targetCardPaymentDate.getDate()}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-none px-4 pt-4 pb-[80px]">
        {/* Bill input for billed or pending */}
        {(activeTab.type === 'billed' || activeTab.type === 'pending') && !searchQuery && (
          <div className="bg-white rounded-2xl p-5 mb-5 shadow-sm border border-yuri-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold text-yuri-500">예상 결제액</span>
              <span className="text-sm font-bold text-yuri-400 line-through">{expectedBill.toLocaleString('ko-KR')}원</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-black text-yuri-900">실제 확정액</span>
              <div className="flex items-center gap-1 justify-end">
                <input spellCheck={false}
                  type="text"
                  placeholder="미입력"
                  value={actualBillInput}
                  onChange={handleActualBillChange}
                  onBlur={handleActualBillBlur}
                  className="w-24 text-right text-lg font-black text-yuri-900 outline-none border-b border-yuri-200 focus:border-accent bg-transparent transition-colors placeholder:text-yuri-300"
                />
                <span className="text-lg font-black text-yuri-900">원</span>
              </div>
            </div>
            {hasActualBill && (
              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-yuri-50">
                <MessageSquare size={14} className="text-yuri-400" />
                <input spellCheck={false}
                  type="text"
                  placeholder="메모를 입력하세요 (예: 할부 포함)"
                  value={memoInput}
                  onChange={e => setMemoInput(e.target.value)}
                  onBlur={handleMemoBlur}
                  className="flex-1 text-sm bg-transparent outline-none text-yuri-700 placeholder:text-yuri-300 font-medium"
                />
              </div>
            )}
          </div>
        )}

        {/* Categories (Horizontal) */}
        {!searchQuery && availableCategories.length > 0 && (
          <div className="flex overflow-x-auto hide-scrollbar gap-2 mb-4 pb-1">
            <button
              onClick={() => setActiveCategory(null)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${!activeCategory ? 'bg-yuri-900 text-white shadow-sm' : 'bg-white text-yuri-500 shadow-sm'}`}
            >
              전체
            </button>
            {availableCategories.map(c => (
              <button
                key={c}
                onClick={() => setActiveCategory(c === activeCategory ? null : c)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm`}
                style={{
                  backgroundColor: activeCategory === c ? getCategoryColor(c, expenseCategories) : '#fff',
                  color: activeCategory === c ? '#1c1c1e' : getCategoryColor(c, expenseCategories)
                }}
              >
                {c}
              </button>
            ))}
          </div>
        )}

        {/* List */}
        <div className="bg-white rounded-2xl shadow-sm border border-yuri-100 overflow-hidden divide-y divide-yuri-50 mb-6">
          {sortedListEntries.length === 0 ? (
            <EmptyState message="내역이 없습니다." />
          ) : (
            sortedListEntries.map(item => {
              const d = new Date(item.scheduledDate || item.createdAt)
              const dStr = `${d.getMonth() + 1}/${d.getDate()}`
              
              return (
                <div 
                  key={item.id} 
                  onClick={() => setEditingEntry(item)}
                  className="flex flex-col px-4 py-4 active:bg-yuri-50 transition-colors cursor-pointer"
                >
                  <div className="flex justify-between items-center w-full">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <span className="text-xs font-bold text-yuri-400 w-8 shrink-0">{dStr}</span>
                      <span 
                        className="text-[10px] font-extrabold text-[#333] px-2 py-1 rounded shrink-0 shadow-sm"
                        style={{ backgroundColor: getCategoryColor(item.category || '기타', expenseCategories) }}
                      >
                        {item.category || '기타'}
                      </span>
                      <span className="text-sm font-semibold text-yuri-900 truncate">
                        {highlightText(item.label)}
                      </span>
                      {item.memo && <MessageSquare size={12} className="text-yuri-300 shrink-0" />}
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-2">
                      <span className="text-base font-black text-yuri-900">
                        {item.amount.toLocaleString()}원
                      </span>
                      <button 
                        onClick={async (e) => {
                          e.stopPropagation()
                          if (await confirm({ message: '삭제하시겠습니까?', variant: 'danger', confirmText: '삭제' })) deleteLedgerEntry(item.id)
                        }}
                        className="p-1 -mr-2 text-yuri-300 hover:text-red-500"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Bottom Total */}
      <div className="bg-white px-5 py-4 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-10 shrink-0 border-t border-yuri-100 flex items-center justify-between">
        <span className="text-sm font-bold text-yuri-500">합계</span>
        <span className="text-xl font-black text-yuri-900">{listTotal.toLocaleString()}원</span>
      </div>

      <MobileLedgerInputSheet 
        isOpen={!!editingEntry}
        onClose={() => setEditingEntry(null)}
        initialEntry={editingEntry}
      />
    </div>
  )
}
