import React, { useMemo, useState } from 'react'
import { useAppStore } from '../../store/AppStore'
import { calculatePaydayCycle } from '../../utils/ledgerCycle'
import { MessageSquare } from 'lucide-react'
import { EditRow } from './EditRow'


export default function CardTab({ year, month }: { year: number, month: number }) {
  const { 
    ledger, 
    expenseCategories, 
    categoryOrder, 
    setCategoryOrder,
    payday,
    cardPaymentDay,
    cardBillingStartDay,
    cardBillingEndDay,
    updateLedgerEntry,
    deleteLedgerEntry,
    cardBills,
    updateCardBill
  } = useAppStore()

  // Calculate the cycle dates based on the currently viewed year and month
  // We use `month + 1` because `month` is 0-indexed in JS Dates but our cycle calculator expects 1-12
  const cycle = useMemo(() => {
    return calculatePaydayCycle(
      year, 
      month + 1, 
      payday, 
      cardPaymentDay, 
      cardBillingStartDay, 
      cardBillingEndDay
    )
  }, [year, month, payday, cardPaymentDay, cardBillingStartDay, cardBillingEndDay])

  const today = useMemo(() => new Date(), [])
  
  const ongoingCycle = useMemo(() => {
    for (let offset = -2; offset <= 2; offset++) {
      const testDate = new Date(today.getFullYear(), today.getMonth() + offset, 1);
      const c = calculatePaydayCycle(
        testDate.getFullYear(),
        testDate.getMonth() + 1,
        payday,
        cardPaymentDay,
        cardBillingStartDay,
        cardBillingEndDay
      );
      if (today.getTime() >= c.cardBillingStart.getTime() && today.getTime() <= c.cardBillingEnd.getTime()) {
        return c;
      }
    }
    return calculatePaydayCycle(today.getFullYear(), today.getMonth() + 1, payday, cardPaymentDay, cardBillingStartDay, cardBillingEndDay)
  }, [today, payday, cardPaymentDay, cardBillingStartDay, cardBillingEndDay])

  const [tabMode, setTabMode] = useState<'billed' | 'ongoing'>('billed')
  const activeCycle = tabMode === 'billed' ? cycle : ongoingCycle

  // Get only the card expenses for this billing cycle
  const cardEntries = useMemo(() => {
    return ledger.filter(e => {
      if (e.type !== 'expense' || e.paymentMethod !== '카드') return false
      const d = new Date(e.scheduledDate || e.createdAt)
      return d.getTime() >= activeCycle.cardBillingStart.getTime() && d.getTime() <= activeCycle.cardBillingEnd.getTime()
    })
  }, [ledger, activeCycle])

  // For the expected bill calculation of the "billed" tab specifically
  const billedCardEntries = useMemo(() => {
    return ledger.filter(e => {
      if (e.type !== 'expense' || e.paymentMethod !== '카드') return false
      const d = new Date(e.scheduledDate || e.createdAt)
      return d.getTime() >= cycle.cardBillingStart.getTime() && d.getTime() <= cycle.cardBillingEnd.getTime()
    })
  }, [ledger, cycle])

  // Group entries by category
  const groupedEntries = useMemo(() => {
    const groups: Record<string, typeof cardEntries> = {}
    expenseCategories.forEach(c => {
      groups[c.name] = []
    })
    groups['기타'] = []

    cardEntries.forEach(e => {
      const cat = e.category || '기타'
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(e)
    })
    
    // Sort items within each group by date ascending
    for (const key in groups) {
      groups[key].sort((a, b) => {
        const da = new Date(a.scheduledDate || a.createdAt).getTime()
        const db = new Date(b.scheduledDate || b.createdAt).getTime()
        return da - db
      })
    }
    return groups
  }, [cardEntries, expenseCategories])

  // Order categories based on `categoryOrder`
  const sortedCategories = useMemo(() => {
    const defaultCats = expenseCategories.map(c => c.name)
    Object.keys(groupedEntries).forEach(cat => {
      if (!defaultCats.includes(cat) && cat !== '기타') {
        defaultCats.push(cat)
      }
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
    
    return ordered
  }, [expenseCategories, categoryOrder])

  // ── Drag and Drop Handlers ──
  const [draggedCat, setDraggedCat] = useState<string | null>(null)

  const handleDragStart = (e: React.DragEvent, catName: string) => {
    setDraggedCat(catName)
    e.dataTransfer.effectAllowed = 'move'
    // For visual clarity, we don't hide the dragged item completely, but we can set ghost image
  }

  const handleDragOver = (e: React.DragEvent, targetCat: string) => {
    e.preventDefault() // Necessary to allow dropping
    if (!draggedCat || draggedCat === targetCat) return

    const newOrder = [...sortedCategories]
    const dragIdx = newOrder.indexOf(draggedCat)
    const targetIdx = newOrder.indexOf(targetCat)

    newOrder.splice(dragIdx, 1)
    newOrder.splice(targetIdx, 0, draggedCat)

    setCategoryOrder(newOrder)
  }

  const handleDragEnd = () => {
    setDraggedCat(null)
  }

  // ── Estimated vs Actual Bill ──
  const expectedBill = useMemo(() => billedCardEntries.reduce((s, e) => s + e.amount, 0), [billedCardEntries])
  
  const monthKey = `${cycle.targetCardPaymentDate.getFullYear()}-${String(cycle.targetCardPaymentDate.getMonth() + 1).padStart(2, '0')}`
  const actualCardBill = cardBills[monthKey]
  const hasActualBill = typeof actualCardBill?.amount === 'number' && actualCardBill.amount > 0

  const [actualBillInput, setActualBillInput] = useState<string>('')
  const [memoInput, setMemoInput] = useState<string>('')

  React.useEffect(() => {
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
    console.log('[CardTab] handleMemoBlur:', { monthKey, hasActualBill, memoInput })
    if (hasActualBill) {
      console.log('[CardTab] calling updateCardBill with memo:', memoInput)
      updateCardBill(monthKey, { memo: memoInput })
    }
  }

  // ── Inline Edit State ──
  const [editingRowId, setEditingRowId] = useState<string | null>(null)

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-gray-50/50">
      <div className="max-w-[1200px] mx-auto">
        
        {/* Header section */}
        <div className="flex flex-col gap-6 mb-8">
          
          <div className="flex bg-gray-100/80 p-1 rounded-xl w-fit">
            <button 
              onClick={() => setTabMode('billed')}
              className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${
                tabMode === 'billed' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              이번 달 청구
            </button>
            <button 
              onClick={() => setTabMode('ongoing')}
              className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${
                tabMode === 'ongoing' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              진행 중 사용
            </button>
          </div>

          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold text-gray-900 tracking-tight">카드 지출</h2>
              <p className="text-sm text-gray-500 mt-1">
                {activeCycle.cardBillingStart.getMonth() + 1}월 {activeCycle.cardBillingStart.getDate()}일 ~ {activeCycle.cardBillingEnd.getMonth() + 1}월 {activeCycle.cardBillingEnd.getDate()}일 사용분
                <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md text-xs font-semibold">
                  결제일: {activeCycle.targetCardPaymentDate.getMonth() + 1}월 {activeCycle.targetCardPaymentDate.getDate()}일
                </span>
              </p>
            </div>
          </div>

          {tabMode === 'billed' ? (
            <div className="flex flex-col gap-2 p-4 bg-white rounded-xl border border-gray-200 shadow-sm max-w-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-gray-700">예상 결제액</span>
                <span className="text-base font-bold text-gray-500 line-through decoration-1">{expectedBill.toLocaleString('ko-KR')}원</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm font-bold text-gray-900 whitespace-nowrap">실제 확정액</span>
                <div className="flex items-center gap-2 flex-1 max-w-[200px]">
                  <input spellCheck={false}
                    type="text"
                    placeholder="미입력"
                    value={actualBillInput}
                    onChange={handleActualBillChange}
                    onBlur={handleActualBillBlur}
                    className="w-full bg-transparent text-right text-base font-bold text-gray-900 outline-none border-b border-dashed border-gray-300 focus:border-gray-500 transition-colors placeholder:text-gray-300"
                  />
                  <span className="text-base font-bold text-gray-900">원</span>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2">
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
          ) : (
            <div className="flex flex-col gap-1 max-w-lg mb-2">
              <span className="text-sm font-bold text-gray-900">
                진행 중 총 사용액: {cardEntries.reduce((s, e) => s + e.amount, 0).toLocaleString('ko-KR')}원
              </span>
              <span className="text-[11px] text-gray-500 font-medium">※ 아직 청구되지 않은, 현재 사용 중인 내역입니다. (잔액 계산 미포함)</span>
            </div>
          )}
        </div>

        {/* Masonry Grid */}
        <div className="columns-1 md:columns-2 lg:columns-3 gap-6">
          {sortedCategories.filter(cat => (groupedEntries[cat] || []).length > 0).map(cat => {
            const items = groupedEntries[cat] || []
            const total = items.reduce((sum, e) => sum + e.amount, 0)
            const isDragging = draggedCat === cat

            return (
              <div 
                key={cat}
                draggable
                onDragStart={(e) => handleDragStart(e, cat)}
                onDragOver={(e) => handleDragOver(e, cat)}
                onDragEnd={handleDragEnd}
                className={`break-inside-avoid mb-6 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col transition-all duration-200 ${
                  isDragging ? 'opacity-40 scale-95' : 'opacity-100 hover:shadow-md hover:border-gray-300'
                } cursor-grab active:cursor-grabbing`}
              >
                {/* Card Header */}
                <div className="px-5 py-4 border-b border-gray-100 bg-white flex justify-between items-center shrink-0">
                  <h3 className="text-[15px] font-bold text-gray-800">{cat}</h3>
                  <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-1 rounded-md">{items.length}건</span>
                </div>

                {/* Card Body (Scrollable if too tall) */}
                <div className="p-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                  <div className="flex flex-col">
                    {items.map(item => {
                      if (editingRowId === item.id) {
                        return <EditRow key={item.id} item={item} expenseCategories={expenseCategories} onUpdate={updateLedgerEntry} onDelete={deleteLedgerEntry} onCancel={() => setEditingRowId(null)} />
                      }

                      const d = new Date(item.scheduledDate || item.createdAt)
                      const dStr = `${d.getMonth() + 1}/${d.getDate()}`
                      return (
                        <div 
                          key={item.id} 
                          onClick={() => setEditingRowId(item.id)}
                          className="flex justify-between items-center px-3 py-2.5 hover:bg-gray-50 rounded-lg transition-colors group cursor-pointer"
                        >
                          <div className="flex items-center gap-2 overflow-hidden">
                            <span className="text-[11px] font-semibold text-gray-400 w-8 shrink-0">{dStr}</span>
                            <span className="text-[13px] font-medium text-gray-700 truncate">{item.label}</span>
                            {item.memo && <MessageSquare size={10} className="text-gray-400 shrink-0" />}
                          </div>
                          <span className="text-[13px] font-bold text-gray-900 shrink-0 ml-4 group-hover:text-black transition-colors">
                            {item.amount.toLocaleString()}원
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Card Footer (Total) */}
                <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex justify-between items-center shrink-0 mt-auto">
                  <span className="text-xs font-bold text-gray-500">합계</span>
                  <span className="text-[15px] font-extrabold text-gray-900">{total.toLocaleString()}원</span>
                </div>
              </div>
            )
          })}
        </div>

      </div>
    </div>
  )
}
