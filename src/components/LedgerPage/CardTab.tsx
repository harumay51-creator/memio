import React, { useMemo, useState } from 'react'
import { useAppStore } from '../../store/AppStore'
import { calculatePaydayCycle } from '../../utils/ledgerCycle'
import type { LedgerEntry } from '../../types'
import { Trash2, MessageSquare } from 'lucide-react'

// ── Sub-components for Inline Editing ───────────────────────────────────────
const NewRow = ({ cycle, onAdd }: { cycle: any, onAdd: (d: string, l: string, a: number) => void }) => {
  const [date, setDate] = useState('')
  const [label, setLabel] = useState('')
  const [amount, setAmount] = useState('')

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (!label.trim() || !amount) return
      const val = parseInt(amount.replace(/,/g, ''), 10)
      if (isNaN(val)) return

      // Parse date (e.g. "8/14" or "14")
      let y = cycle.cardBillingStart.getFullYear()
      let m = cycle.cardBillingStart.getMonth()
      let d = cycle.cardBillingStart.getDate()
      
      const dMatch = date.match(/^(\d{1,2})\/(\d{1,2})$/)
      if (dMatch) {
        m = parseInt(dMatch[1], 10) - 1
        d = parseInt(dMatch[2], 10)
      } else if (/^\d{1,2}$/.test(date)) {
        d = parseInt(date, 10)
      } else {
        d = new Date().getDate()
      }

      const iso = new Date(y, m, d, 9, 0, 0).toISOString()
      onAdd(iso, label.trim(), val)
      
      setDate('')
      setLabel('')
      setAmount('')
    }
  }

  return (
    <div className="flex justify-between items-center px-2 py-1.5 mt-1 border border-transparent focus-within:border-gray-200 focus-within:bg-white rounded-lg transition-colors group">
      <div className="flex items-center gap-2 overflow-hidden flex-1">
        <input 
          className="text-[11px] font-semibold text-gray-500 w-8 shrink-0 bg-transparent outline-none placeholder-gray-300"
          placeholder="M/D"
          value={date} onChange={e => setDate(e.target.value)} onKeyDown={handleKeyDown}
        />
        <input
          className="text-[13px] font-medium text-gray-700 flex-1 bg-transparent outline-none placeholder-gray-300"
          placeholder="내역 입력 후 Enter..."
          value={label} onChange={e => setLabel(e.target.value)} onKeyDown={handleKeyDown}
        />
      </div>
      <div className="flex items-center">
        <input
          className="text-[13px] font-bold text-gray-900 w-16 text-right bg-transparent outline-none placeholder-gray-300"
          placeholder="0"
          value={amount} onChange={e => {
            const raw = e.target.value.replace(/[^0-9]/g, '')
            setAmount(raw ? parseInt(raw, 10).toLocaleString('ko-KR') : '')
          }} onKeyDown={handleKeyDown}
        />
      </div>
    </div>
  )
}

const EditRow = ({ item, onUpdate, onDelete, onCancel }: { item: LedgerEntry, onUpdate: (id: string, updates: Partial<LedgerEntry>) => void, onDelete: (id: string) => void, onCancel: () => void }) => {
  const d = new Date(item.scheduledDate || item.createdAt)
  const [date, setDate] = useState(`${d.getMonth() + 1}/${d.getDate()}`)
  const [label, setLabel] = useState(item.label)
  const [amount, setAmount] = useState(item.amount.toLocaleString('ko-KR'))
  const [memo, setMemo] = useState(item.memo || '')

  const handleSave = () => {
    const val = parseInt(amount.replace(/,/g, ''), 10)
    let y = d.getFullYear()
    let m = d.getMonth()
    let day = d.getDate()
    const dMatch = date.match(/^(\d{1,2})\/(\d{1,2})$/)
    if (dMatch) {
      m = parseInt(dMatch[1], 10) - 1
      day = parseInt(dMatch[2], 10)
    } else if (/^\d{1,2}$/.test(date)) {
      day = parseInt(date, 10)
    }
    const iso = new Date(y, m, day, 9, 0, 0).toISOString()

    onUpdate(item.id, { 
      label: label.trim(), 
      amount: isNaN(val) ? item.amount : val, 
      scheduledDate: iso,
      memo: memo.trim()
    })
    onCancel()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave()
    if (e.key === 'Escape') onCancel()
  }

  return (
    <div className="flex flex-col gap-2 p-3 bg-white rounded-lg shadow-[0_2px_10px_rgba(0,0,0,0.06)] border border-accent/20 z-10 my-1 animate-fade-in">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2 overflow-hidden flex-1">
          <input 
            className="text-[11px] font-semibold text-accent w-8 shrink-0 bg-transparent outline-none border-b border-accent/30 focus:border-accent"
            value={date} onChange={e => setDate(e.target.value)} onKeyDown={handleKeyDown} autoFocus
          />
          <input
            className="text-[13px] font-bold text-gray-900 flex-1 bg-transparent outline-none border-b border-gray-300 focus:border-gray-500"
            value={label} onChange={e => setLabel(e.target.value)} onKeyDown={handleKeyDown}
          />
        </div>
        <div className="flex items-center gap-2 ml-2">
          <input
            className="text-[13px] font-bold text-gray-900 w-16 text-right bg-transparent outline-none border-b border-gray-300 focus:border-gray-500"
            value={amount} onChange={e => {
              const raw = e.target.value.replace(/[^0-9]/g, '')
              setAmount(raw ? parseInt(raw, 10).toLocaleString('ko-KR') : '')
            }} onKeyDown={handleKeyDown}
          />
        </div>
      </div>
      <div className="flex items-center gap-2 mt-1">
        <MessageSquare size={12} className="text-gray-400 shrink-0" />
        <input
          className="text-[11px] font-medium text-gray-600 flex-1 bg-transparent outline-none border-b border-gray-200 focus:border-gray-400 placeholder-gray-300"
          placeholder="메모를 입력하세요..."
          value={memo} onChange={e => setMemo(e.target.value)} onKeyDown={handleKeyDown}
        />
        <button onClick={() => onDelete(item.id)} className="p-1 text-gray-300 hover:text-red-500 transition-colors ml-1" aria-label="삭제">
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  )
}


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
    addLedgerEntry,
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

  // Get only the card expenses for this billing cycle
  const cardEntries = useMemo(() => {
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

  // ── Dummy Data Generator ──
  const generateDummyData = () => {
    if (!window.confirm('현재 보고 있는 결제 주기에 맞춰 더미 데이터를 생성하시겠습니까?')) return

    const catsToUse = ['식비', '카페', '교통', '쇼핑', '기타'].filter(c => sortedCategories.includes(c))
    
    // Generate dates within the billing period
    const startMs = cycle.cardBillingStart.getTime()
    const endMs = cycle.cardBillingEnd.getTime()
    
    catsToUse.forEach(cat => {
      const numItems = Math.floor(Math.random() * 4) + 2 // 2~5 items
      for (let i = 0; i < numItems; i++) {
        const randomTime = startMs + Math.random() * (endMs - startMs)
        const dateStr = new Date(randomTime).toISOString()
        const amount = (Math.floor(Math.random() * 20) + 1) * 1000 // 1000 ~ 20000
        addLedgerEntry(`${cat} 테스트 내역 ${i+1}`, amount, 'expense', cat, dateStr, '카드')
      }
    })
  }

  // ── Estimated vs Actual Bill ──
  const expectedBill = useMemo(() => cardEntries.reduce((s, e) => s + e.amount, 0), [cardEntries])
  
  const monthKey = `${cycle.targetCardPaymentDate.getFullYear()}-${String(cycle.targetCardPaymentDate.getMonth() + 1).padStart(2, '0')}`
  const actualCardBill = cardBills[monthKey]
  const hasActualBill = typeof actualCardBill?.amount === 'number'

  const [actualBillInput, setActualBillInput] = useState<string>('')
  const [memoInput, setMemoInput] = useState<string>('')

  React.useEffect(() => {
    setActualBillInput(hasActualBill ? actualCardBill.amount.toLocaleString('ko-KR') : '')
    setMemoInput(actualCardBill?.memo || '')
  }, [monthKey, hasActualBill, actualCardBill])

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
    const val = parseInt(actualBillInput.replace(/,/g, ''), 10)
    if (!isNaN(val)) {
      updateCardBill(monthKey, { amount: val, memo: memoInput })
      setActualBillInput(val.toLocaleString('ko-KR'))
    } else if (actualBillInput.trim() === '') {
      // Clear it? The appStore doesn't natively support deleting, but we can set amount to NaN or just keep it 0.
      // For now, if empty, we do nothing.
    }
  }

  const handleMemoBlur = () => {
    if (hasActualBill) {
      updateCardBill(monthKey, { memo: memoInput })
    }
  }

  // ── Inline Edit State ──
  const [editingRowId, setEditingRowId] = useState<string | null>(null)

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-gray-50/50">
      <div className="max-w-[1200px] mx-auto">
        
        {/* Header section */}
        <div className="flex flex-col gap-4 mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold text-gray-900 tracking-tight">카드 지출</h2>
              <p className="text-sm text-gray-500 mt-1">
                {cycle.cardBillingStart.getMonth() + 1}월 {cycle.cardBillingStart.getDate()}일 ~ {cycle.cardBillingEnd.getMonth() + 1}월 {cycle.cardBillingEnd.getDate()}일 사용분
                <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md text-xs font-semibold">
                  결제일: {cycle.targetCardPaymentDate.getMonth() + 1}월 {cycle.targetCardPaymentDate.getDate()}일
                </span>
              </p>
            </div>
            <button 
              onClick={generateDummyData}
              className="px-4 py-2 bg-white border border-gray-200 text-gray-600 text-sm font-bold rounded-lg shadow-sm hover:bg-gray-50 transition-colors"
            >
              테스트 데이터 생성
            </button>
          </div>

          <div className="flex flex-col gap-2 p-4 bg-white rounded-xl border border-gray-200 shadow-sm max-w-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-gray-700">예상 결제액</span>
              <span className="text-base font-bold text-gray-500 line-through decoration-1">{expectedBill.toLocaleString('ko-KR')}원</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-bold text-gray-900 whitespace-nowrap">실제 확정액</span>
              <div className="flex items-center gap-2 flex-1 max-w-[200px]">
                <input
                  type="text"
                  value={actualBillInput}
                  onChange={handleActualBillChange}
                  onBlur={handleActualBillBlur}
                  onKeyDown={e => { if (e.key === 'Enter') handleActualBillBlur() }}
                  placeholder={expectedBill.toLocaleString('ko-KR')}
                  className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold outline-none focus:border-accent text-right transition-colors"
                />
                <span className="text-sm font-bold text-gray-700">원</span>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[11px] font-bold text-gray-500 whitespace-nowrap">메모</span>
              <input
                type="text"
                value={memoInput}
                onChange={e => setMemoInput(e.target.value)}
                onBlur={handleMemoBlur}
                onKeyDown={e => { if (e.key === 'Enter') handleMemoBlur() }}
                placeholder="결제 관련 메모 (예: 카드사 5천원 할인 적용)"
                className="flex-1 px-3 py-1.5 bg-transparent border-b border-gray-200 text-[11px] outline-none focus:border-accent transition-colors"
              />
            </div>
          </div>
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
                        return <EditRow key={item.id} item={item} onUpdate={updateLedgerEntry} onDelete={deleteLedgerEntry} onCancel={() => setEditingRowId(null)} />
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
                    
                    <NewRow 
                      cycle={cycle} 
                      onAdd={(d, l, a) => addLedgerEntry(l, a, 'expense', cat, d, '카드')}
                    />
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
