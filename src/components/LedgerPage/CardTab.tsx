import React, { useMemo, useState, useEffect } from 'react'
import { useAppStore } from '../../store/AppStore'
import { calculatePaydayCycle } from '../../utils/ledgerCycle'
import { MessageSquare, ChevronDown } from 'lucide-react'
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
  
  // Unbilled cycles up to today
  const unbilledCycles = useMemo(() => {
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
  }, [year, month, today, payday, cardPaymentDay, cardBillingStartDay, cardBillingEndDay])

  // Combine into tabs
  const tabs = useMemo(() => {
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
  }, [cycle, unbilledCycles])

  const [activeTabId, setActiveTabId] = useState<string>('ongoing')
  
  // Ensure active tab is valid, fallback to ongoing if missing
  const activeTab = useMemo(() => {
    return tabs.find(t => t.id === activeTabId) || tabs.find(t => t.id === 'ongoing') || tabs[tabs.length - 1]
  }, [tabs, activeTabId])

  // Update tab if month changes and ongoing is not available (though ongoing is always there)
  useEffect(() => {
    if (!tabs.find(t => t.id === activeTabId)) {
      setActiveTabId('ongoing')
    }
  }, [tabs, activeTabId])

  // Get entries for the ACTIVE tab
  const activeEntries = useMemo(() => {
    return ledger.filter(e => {
      if (e.type !== 'expense' || e.paymentMethod !== '카드') return false
      const d = new Date(e.scheduledDate || e.createdAt)
      return d.getTime() >= activeTab.cycle.cardBillingStart.getTime() && d.getTime() <= activeTab.cycle.cardBillingEnd.getTime()
    })
  }, [ledger, activeTab])



  // For the expected bill calculation of the "billed" tab specifically
  const billedCardEntries = useMemo(() => {
    return ledger.filter(e => {
      if (e.type !== 'expense' || e.paymentMethod !== '카드') return false
      const d = new Date(e.scheduledDate || e.createdAt)
      return d.getTime() >= cycle.cardBillingStart.getTime() && d.getTime() <= cycle.cardBillingEnd.getTime()
    })
  }, [ledger, cycle])

  // ── Estimated vs Actual Bill (Only shown when activeTab is billed) ──
  const expectedBill = useMemo(() => billedCardEntries.reduce((s, e) => s + e.amount, 0), [billedCardEntries])
  
  const monthKey = `${cycle.targetCardPaymentDate.getFullYear()}-${String(cycle.targetCardPaymentDate.getMonth() + 1).padStart(2, '0')}`
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

  // ── Sorting & List Rendering ──
  const [sortType, setSortType] = useState<'time' | 'category' | 'amount'>('time')
  const [editingRowId, setEditingRowId] = useState<string | null>(null)

  const sortedListEntries = useMemo(() => {
    if (sortType === 'time') {
      return [...activeEntries].sort((a, b) => new Date(b.scheduledDate || b.createdAt).getTime() - new Date(a.scheduledDate || a.createdAt).getTime())
    }
    if (sortType === 'amount') {
      return [...activeEntries].sort((a, b) => b.amount - a.amount)
    }
    return activeEntries // category is grouped
  }, [activeEntries, sortType])

  const categoryGrouped = useMemo(() => {
    if (sortType !== 'category') return []
    const groups: Record<string, typeof activeEntries> = {}
    expenseCategories.forEach(c => { groups[c.name] = [] })
    groups['기타'] = []
    
    activeEntries.forEach(e => {
      const cat = e.category || '기타'
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(e)
    })

    const defaultCats = expenseCategories.map(c => c.name)
    Object.keys(groups).forEach(cat => {
      if (!defaultCats.includes(cat) && cat !== '기타') defaultCats.push(cat)
    })
    if (!defaultCats.includes('기타')) defaultCats.push('기타')
    
    const ordered = [...defaultCats].sort((a, b) => {
      const idxA = categoryOrder.indexOf(a)
      const idxB = categoryOrder.indexOf(b)
      if (idxA === -1 && idxB === -1) return 0
      if (idxA === -1) return 1
      if (idxB === -1) return -1
      return idxA - idxB
    })

    return ordered.filter(cat => groups[cat].length > 0).map(cat => ({
      cat,
      items: groups[cat].sort((a, b) => new Date(b.scheduledDate || b.createdAt).getTime() - new Date(a.scheduledDate || a.createdAt).getTime()),
      total: groups[cat].reduce((s, e) => s + e.amount, 0)
    }))
  }, [activeEntries, sortType, expenseCategories, categoryOrder])

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
          {sortType !== 'category' && (
            <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded shrink-0">{item.category || '기타'}</span>
          )}
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
        
        {/* 1. 상단 - 3개의 선택 가능한 탭 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                  {tab.type === 'billed' && <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md text-[10px] font-bold">이번 달</span>}
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
          
          {/* Billed Tab specific inputs */}
          {activeTab.isBilled && (
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

          {/* List Toolbar */}
          <div className="flex items-center justify-between bg-white px-5 py-3 rounded-2xl border border-gray-200 shadow-sm">
            <div className="text-sm font-bold text-gray-700">
              총 {activeEntries.length}건
            </div>
            <div className="relative">
              <select
                value={sortType}
                onChange={(e) => setSortType(e.target.value as any)}
                className="appearance-none bg-gray-50 border border-gray-200 text-gray-700 text-sm font-bold rounded-lg px-4 py-2 pr-10 outline-none focus:border-gray-400 cursor-pointer"
              >
                <option value="time">정렬: 시간순</option>
                <option value="category">정렬: 카테고리순</option>
                <option value="amount">정렬: 금액순</option>
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            </div>
          </div>

          {/* Entries List */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col min-h-[300px]">
            {activeEntries.length === 0 ? (
              <div className="flex flex-col items-center justify-center flex-1 py-12">
                <p className="text-gray-400 font-bold">이 기간에 등록된 카드 지출이 없습니다.</p>
              </div>
            ) : (
              <>
                {sortType === 'category' ? (
                  <div className="flex flex-col">
                    {categoryGrouped.map(group => (
                      <div key={group.cat} className="flex flex-col border-b border-gray-200 last:border-b-0">
                        <div className="px-5 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between sticky top-0 z-10">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-800 text-sm">{group.cat}</span>
                            <span className="text-xs font-semibold text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded">{group.items.length}건</span>
                          </div>
                          <span className="font-bold text-gray-900 text-sm">{group.total.toLocaleString()}원</span>
                        </div>
                        <div className="flex flex-col">
                          {group.items.map(renderRow)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col">
                    {sortedListEntries.map(renderRow)}
                  </div>
                )}
              </>
            )}
          </div>
          
        </div>

      </div>
    </div>
  )
}
