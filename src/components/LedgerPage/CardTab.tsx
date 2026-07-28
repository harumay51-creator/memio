import React, { useMemo, useState, useEffect } from 'react'
import { useAppStore } from '../../store/AppStore'
import { calculatePaydayCycle } from '../../utils/ledgerCycle'
import { MessageSquare } from 'lucide-react'
import { EditRow } from './EditRow'

export default function CardTab({ year, month }: { year: number, month: number }) {
  const { 
    ledger, 
    expenseCategories, 
    categoryOrder,
    payday,
    cardPaymentDay,
    cardBillingStartDay,
    cardBillingEndDay,
    updateLedgerEntry,
    deleteLedgerEntry,
    cardBills,
    updateCardBill
  } = useAppStore()

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
  
  // Ensure active tab is valid, fallback to ongoing if missing (or first if not current month)
  const activeTab = useMemo(() => {
    return tabs.find(t => t.id === activeTabId) || (isCurrentMonth ? tabs.find(t => t.id === 'ongoing') : tabs[0]) || tabs[tabs.length - 1]
  }, [tabs, activeTabId, isCurrentMonth])

  useEffect(() => {
    if (!tabs.find(t => t.id === activeTabId)) {
      setActiveTabId(isCurrentMonth ? 'ongoing' : tabs[0].id)
    }
  }, [tabs, activeTabId, isCurrentMonth])

  // Get entries for the ACTIVE tab
  const activeEntries = useMemo(() => {
    return ledger.filter(e => {
      if (e.type !== 'expense' || e.paymentMethod !== '카드') return false
      const d = new Date(e.scheduledDate || e.createdAt)
      return d.getTime() >= activeTab.cycle.cardBillingStart.getTime() && d.getTime() <= activeTab.cycle.cardBillingEnd.getTime()
    })
  }, [ledger, activeTab])

  // ── Estimated vs Actual Bill (Only shown when activeTab is billed or pending) ──
  const expectedBill = useMemo(() => activeEntries.reduce((s, e) => s + e.amount, 0), [activeEntries])
  
  const monthKey = `${activeTab.cycle.targetCardPaymentDate.getFullYear()}-${String(activeTab.cycle.targetCardPaymentDate.getMonth() + 1).padStart(2, '0')}`
  const actualCardBill = cardBills[monthKey]
  const hasActualBill = typeof actualCardBill?.amount === 'number' && actualCardBill.amount > 0

  const [actualBillInput, setActualBillInput] = useState<string>('')
  const [memoInput, setMemoInput] = useState<string>('')

  useEffect(() => {
    if (typeof actualCardBill?.amount === 'number') {
      setActualBillInput(actualCardBill.amount.toLocaleString('ko-KR'))
    } else {
      setActualBillInput('')
    }
    setMemoInput(actualCardBill?.memo || '')
  }, [monthKey, actualCardBill])

  const handleActualBillChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/,/g, '')
    if (!/^\d*$/.test(raw)) return
    if (raw === '') {
      setActualBillInput('')
      return
    }
    setActualBillInput(parseInt(raw, 10).toLocaleString('ko-KR'))
  }

  const handleActualBillBlur = () => {
    const raw = actualBillInput.replace(/,/g, '')
    if (raw === '') {
      updateCardBill(monthKey, { amount: undefined })
    } else {
      const val = parseInt(raw, 10)
      if (!isNaN(val)) {
        updateCardBill(monthKey, { amount: val, memo: memoInput })
        setActualBillInput(val.toLocaleString('ko-KR'))
      }
    }
  }

  const handleMemoBlur = () => {
    if (hasActualBill) {
      updateCardBill(monthKey, { memo: memoInput })
    }
  }

  // ── Category Filter & List Rendering ──
  const [editingRowId, setEditingRowId] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  // Get categories available in current entries based on categoryOrder
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
    if (!activeCategory) return activeEntries
    return activeEntries.filter(e => (e.category || '기타') === activeCategory)
  }, [activeEntries, activeCategory])

  const sortedListEntries = useMemo(() => {
    return [...filteredEntries].sort((a, b) => new Date(b.scheduledDate || b.createdAt).getTime() - new Date(a.scheduledDate || a.createdAt).getTime())
  }, [filteredEntries])
  
  const listTotal = useMemo(() => filteredEntries.reduce((s, e) => s + e.amount, 0), [filteredEntries])

  // Reusable row renderer
  const renderRow = (item: any) => {
    if (editingRowId === item.id) {
      return <EditRow key={item.id} item={item} expenseCategories={expenseCategories} onUpdate={updateLedgerEntry} onDelete={deleteLedgerEntry} onCancel={() => setEditingRowId(null)} />
    }
    const d = new Date(item.scheduledDate || item.createdAt)
    const dStr = `${d.getMonth() + 1}/${d.getDate()}`
    
    return (
      <div 
        key={item.id} 
        onClick={() => setEditingRowId(item.id)}
        className="flex justify-between items-center px-4 py-3 hover:bg-gray-50 bg-white border-b border-gray-100 last:border-b-0 cursor-pointer group transition-colors"
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <span className="text-xs font-semibold text-gray-400 w-10 shrink-0">{dStr}</span>
          <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded shrink-0">{item.category || '기타'}</span>
          <span className="text-sm font-medium text-gray-800 truncate">{item.label}</span>
          {item.memo && <MessageSquare size={12} className="text-gray-400 shrink-0" />}
        </div>
        <span className="text-[15px] font-bold text-gray-900 shrink-0 ml-4 group-hover:text-black transition-colors">
          {item.amount.toLocaleString()}원
        </span>
      </div>
    )
  }

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-gray-50/50">
      <div className="max-w-[1000px] mx-auto flex flex-col gap-8">
        
        {/* 1. 상단 - 선택 가능한 탭 */}
        <div className={`grid gap-4 ${isCurrentMonth ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 max-w-[400px]'}`}>
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
                className={`cursor-pointer rounded-2xl p-4 transition-all duration-200 border-2 flex flex-col gap-1 ${
                  isSelected 
                    ? 'bg-white border-gray-900 shadow-md scale-100' 
                    : 'bg-white/60 border-transparent hover:bg-white hover:border-gray-200 shadow-sm opacity-80 hover:opacity-100'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-sm font-extrabold ${isSelected ? 'text-gray-900' : 'text-gray-500'}`}>
                    {tab.title}
                  </span>
                  {tab.type === 'ongoing' && <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-md text-[10px] font-bold">진행 중</span>}
                  {tab.type === 'pending' && <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-md text-[10px] font-bold">확정 대기</span>}
                  {!isCurrentMonth && tab.type === 'billed' && <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md text-[10px] font-bold">확정 내역</span>}
                  {isCurrentMonth && tab.type === 'billed' && <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md text-[10px] font-bold">이번 달</span>}
                </div>
                <div className={`text-xl font-black ${isSelected ? 'text-gray-900' : 'text-gray-600'}`}>
                  {total.toLocaleString()}원
                </div>
                <div className="text-[11px] text-gray-500 font-medium mt-1">
                  {tab.cycle.cardBillingStart.getMonth() + 1}/{tab.cycle.cardBillingStart.getDate()} ~ {tab.cycle.cardBillingEnd.getMonth() + 1}/{tab.cycle.cardBillingEnd.getDate()}
                  <span className="mx-1">·</span>
                  결제 {tab.cycle.targetCardPaymentDate.getMonth() + 1}/{tab.cycle.targetCardPaymentDate.getDate()}
                </div>
              </div>
            )
          })}
        </div>

        {/* 2. 하단 - 거래 목록 및 (이번 달 청구인 경우) 확정액 입력 영역 */}
        <div className="flex flex-col gap-4">
          
          {/* Billed & Pending Tab specific inputs */}
          {(activeTab.type === 'billed' || activeTab.type === 'pending') && (
            <div className="flex flex-col gap-2 p-5 bg-white rounded-2xl border border-gray-200 shadow-sm mb-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-gray-700">예상 결제액</span>
                <span className="text-base font-bold text-gray-500 line-through decoration-1">{expectedBill.toLocaleString('ko-KR')}원</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm font-bold text-gray-900 whitespace-nowrap">실제 확정액</span>
                <div className="flex items-center gap-2 flex-1 max-w-[200px] justify-end">
                  <input spellCheck={false}
                    type="text"
                    placeholder="미입력"
                    value={actualBillInput}
                    onChange={handleActualBillChange}
                    onBlur={handleActualBillBlur}
                    className="w-full bg-transparent text-right text-lg font-bold text-gray-900 outline-none border-b border-dashed border-gray-300 focus:border-gray-500 transition-colors placeholder:text-gray-300"
                  />
                  <span className="text-lg font-bold text-gray-900">원</span>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100">
                <MessageSquare size={14} className="text-gray-400" />
                <input spellCheck={false}
                  type="text"
                  placeholder="메모를 입력하세요 (예: 할부 포함)"
                  value={memoInput}
                  onChange={e => setMemoInput(e.target.value)}
                  onBlur={handleMemoBlur}
                  className="flex-1 bg-transparent text-xs text-gray-600 outline-none placeholder:text-gray-400"
                />
              </div>
            </div>
          )}

          {/* Category Filter Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveCategory(null)}
              className={`px-3 py-1.5 rounded-full text-[13px] font-bold transition-colors ${
                activeCategory === null
                  ? 'bg-gray-800 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              전체
            </button>
            
            {availableCategories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-[13px] font-bold transition-colors ${
                  activeCategory === cat
                    ? 'bg-blue-100 text-blue-700 border-blue-200'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Entries List */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col min-h-[300px]">
            {sortedListEntries.length === 0 ? (
              <div className="flex flex-col items-center justify-center flex-1 py-12">
                <p className="text-gray-400 font-bold">이 기간에 등록된 카드 지출이 없습니다.</p>
              </div>
            ) : (
              <div className="flex flex-col">
                {sortedListEntries.map(renderRow)}
              </div>
            )}
            
            {/* List Footer Total */}
            {sortedListEntries.length > 0 && (
              <div className="mt-auto px-5 py-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
                <span className="text-sm font-bold text-gray-500">합계</span>
                <span className="text-lg font-black text-gray-900">{listTotal.toLocaleString()}원</span>
              </div>
            )}
          </div>
          
        </div>

      </div>
    </div>
  )
}
