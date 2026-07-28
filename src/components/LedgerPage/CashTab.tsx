import { useMemo, useState, useRef } from 'react'
import { useAppStore } from '../../store/AppStore'
import { calculatePaydayCycle } from '../../utils/ledgerCycle'
import type { LedgerEntry } from '../../types'
import { EditRow } from './EditRow'
import { Settings, MessageSquare } from 'lucide-react'

const CAT_TW_CLASSES: Record<string, { bg: string, text: string }> = {
  '식비':     { bg: 'bg-orange-50', text: 'text-orange-600' },
  '카페':     { bg: 'bg-yellow-50', text: 'text-yellow-600' },
  '교통':     { bg: 'bg-blue-50',   text: 'text-blue-600' },
  '쇼핑':     { bg: 'bg-fuchsia-50',text: 'text-fuchsia-600' },
  '문화':     { bg: 'bg-purple-50', text: 'text-purple-600' },
  '의료':     { bg: 'bg-rose-50',   text: 'text-rose-600' },
  '통신':     { bg: 'bg-cyan-50',   text: 'text-cyan-600' },
  '급여':     { bg: 'bg-emerald-50',text: 'text-emerald-600' },
  '용돈':     { bg: 'bg-lime-50',   text: 'text-lime-600' },
  '이자/배당': { bg: 'bg-teal-50',   text: 'text-teal-600' },
  '환급':     { bg: 'bg-sky-50',    text: 'text-sky-600' },
  '기타':     { bg: 'bg-slate-100', text: 'text-slate-600' },
  '기타수입':  { bg: 'bg-slate-100', text: 'text-slate-600' },
}

function getCatClasses(name: string) {
  return CAT_TW_CLASSES[name] ?? { bg: 'bg-slate-100', text: 'text-slate-600' }
}



function fmtAmt(n: number) {
  return n.toLocaleString('ko-KR') + '원'
}

export default function CashTab({ year, month, onOpenFixedExpense }: { year: number, month: number, onOpenFixedExpense: () => void }) {
  const { 
    ledger, 
    expenseCategories, 
    payday,
    cardPaymentDay,
    cardBillingStartDay,
    cardBillingEndDay,
    salaryRecords,
    updateSalaryRecord,
    cardBills,
    updateLedgerEntry,
    deleteLedgerEntry,
    fixedExpenses
  } = useAppStore()
  const [editingRowId, setEditingRowId] = useState<string | null>(null)
  const [expandedCat, setExpandedCat] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  // Drag to scroll for categories
  const catScrollRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)

  const handleCatMouseDown = (e: React.MouseEvent) => {
    if (!catScrollRef.current) return
    setIsDragging(true)
    setStartX(e.pageX - catScrollRef.current.offsetLeft)
    setScrollLeft(catScrollRef.current.scrollLeft)
  }
  const handleCatMouseLeave = () => setIsDragging(false)
  const handleCatMouseUp = () => setIsDragging(false)
  const handleCatMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !catScrollRef.current) return
    e.preventDefault()
    const x = e.pageX - catScrollRef.current.offsetLeft
    const walk = (x - startX) * 2
    catScrollRef.current.scrollLeft = scrollLeft - walk
  }

  const cycle = useMemo(() => {
    return calculatePaydayCycle(year, month + 1, payday, cardPaymentDay, cardBillingStartDay, cardBillingEndDay)
  }, [year, month, payday, cardPaymentDay, cardBillingStartDay, cardBillingEndDay])

  // 1. Calculate Expected / Actual Card Bill
  const cardEntries = useMemo(() => {
    return ledger.filter(e => {
      if (e.paymentMethod !== '카드' || e.type !== 'expense') return false
      const d = new Date(e.scheduledDate || e.createdAt)
      return d.getTime() >= cycle.cardBillingStart.getTime() && d.getTime() <= cycle.cardBillingEnd.getTime()
    })
  }, [ledger, cycle])

  const expectedCardBill = cardEntries.reduce((s, e) => s + e.amount, 0)
  const salaryMonthKey = `${year}-${String(month + 1).padStart(2, '0')}`
  const cardMonthKey = `${cycle.targetCardPaymentDate.getFullYear()}-${String(cycle.targetCardPaymentDate.getMonth() + 1).padStart(2, '0')}`
  const actualCardBill = cardBills[cardMonthKey]
  const hasActualBill = typeof actualCardBill?.amount === 'number' && actualCardBill.amount > 0
  const cardBillAmount = hasActualBill ? actualCardBill.amount : expectedCardBill

  // 2. Fetch Cash / Transfer entries in cash cycle
  const cashEntries = useMemo(() => {
    return ledger.filter(e => {
      if (e.paymentMethod === '카드' || e.type !== 'expense') return false
      const d = new Date(e.scheduledDate || e.createdAt)
      return d.getTime() >= cycle.cashStart.getTime() && d.getTime() <= cycle.cashEnd.getTime()
    })
  }, [ledger, cycle])

  // Card entries consumed during this cash cycle (for category sums)
  const consumedCardEntries = useMemo(() => {
    return ledger.filter(e => {
      if (e.paymentMethod !== '카드' || e.type !== 'expense') return false
      const d = new Date(e.scheduledDate || e.createdAt)
      return d.getTime() >= cycle.cashStart.getTime() && d.getTime() <= cycle.cashEnd.getTime()
    })
  }, [ledger, cycle])


  // Compute Total Deductions
  const currentSalary = salaryRecords[salaryMonthKey]?.amount || 0
  const totalCashExpense = cashEntries.reduce((s, e) => s + e.amount, 0)
  const totalConsumedCard = consumedCardEntries.reduce((s, e) => s + e.amount, 0)
  const totalDeductions = totalCashExpense + cardBillAmount
  const salaryBalance = currentSalary - totalDeductions

  // Category Sums (Cash + Card in this cycle)
  const categorySums = useMemo(() => {
    const sums: Record<string, { total: number, card: number, cash: number }> = {}
    expenseCategories.forEach(c => sums[c.name] = { total: 0, card: 0, cash: 0 })
    sums['기타'] = { total: 0, card: 0, cash: 0 }

    const addSum = (e: LedgerEntry | { category: string, amount: number }, isCard: boolean) => {
      const cat = e.category || '기타'
      if (!sums[cat]) {
        sums[cat] = { total: 0, card: 0, cash: 0 }
      }
      sums[cat].total += e.amount
      if (isCard) {
        sums[cat].card += e.amount
      } else {
        sums[cat].cash += e.amount
      }
    }

    consumedCardEntries.forEach(e => addSum(e, true))
    cashEntries.forEach(e => addSum(e, false))

    // Filter out 0 sums and sort by amount descending
    const result = Object.entries(sums)
      .filter(([_, data]) => data.total > 0)
      .sort((a, b) => b[1].total - a[1].total)
    return result
  }, [expenseCategories, consumedCardEntries, cashEntries, fixedExpenses])

  const availableCategories = useMemo(() => {
    const cats = new Set<string>()
    cashEntries.forEach(e => cats.add(e.category || '기타'))
    return Array.from(cats).sort()
  }, [cashEntries])

  // Combined timeline list
  const displayList = useMemo(() => {
    let all = [...cashEntries]
    if (activeCategory) {
      all = all.filter(e => (e.category || '기타') === activeCategory)
    }
    all.sort((a, b) => {
      const ta = new Date(a.scheduledDate || a.createdAt).getTime()
      const tb = new Date(b.scheduledDate || b.createdAt).getTime()
      return tb - ta // Newest first
    })
    return all
  }, [cashEntries, activeCategory])

  return (
    <div className="flex-1 overflow-y-auto flex flex-col items-center bg-gray-50/50">
      <div className="w-full max-w-[840px] flex flex-col flex-1 min-h-full bg-white shadow-sm border-x border-gray-100 relative">
        {/* ── Summary Section ── */}
        <div className="p-5 md:p-8 bg-yuri-50 shrink-0 border-b border-yuri-100 flex flex-col gap-6">
          <div className="bg-white rounded-2xl shadow-sm border border-yuri-100 p-5 md:p-6 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-bold text-yuri-500">이번 달 월급</span>
            <div className="flex items-center gap-2">
              <input spellCheck={false}
                type="text"
                placeholder="미입력 (0원)"
                value={salaryRecords[salaryMonthKey]?.amount ? salaryRecords[salaryMonthKey].amount.toLocaleString('ko-KR') : ''}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9]/g, '')
                  const val = parseInt(raw, 10)
                  if (!isNaN(val)) {
                    updateSalaryRecord(salaryMonthKey, val)
                  } else if (raw === '') {
                    updateSalaryRecord(salaryMonthKey, 0)
                  }
                }}
                className="w-28 bg-transparent text-right text-[15px] font-bold text-[#1F1F1F] outline-none border-b border-dashed border-yuri-300 focus:border-yuri-500 transition-colors placeholder:text-yuri-300 placeholder:text-base"
              />
              <span className="text-sm font-bold text-yuri-900">원</span>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm font-bold text-yuri-500">
              {hasActualBill ? '카드 결제액 (확정)' : '카드 결제 예정액 (예상)'}
            </span>
            <span className="text-[15px] font-bold text-[#1F1F1F]">-{fmtAmt(cardBillAmount)}</span>
          </div>

          <div className="h-px w-full bg-yuri-100" />

          <div className="flex justify-between items-center">
            <span className="text-sm font-bold text-yuri-900">현재 남은 금액</span>
            <span className="text-[15px] font-bold text-[#1F1F1F]">{fmtAmt(salaryBalance)}</span>
          </div>
        </div>
      </div>

      {/* ── Timeline Section ── */}
      <div className="flex-1 p-5 md:p-8 bg-white flex flex-col gap-6">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-sm font-bold text-yuri-900">현금 / 계좌 지출 내역</h2>
          <button 
            onClick={onOpenFixedExpense}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-yuri-900 text-white rounded-lg text-[11px] font-bold shadow-sm hover:bg-yuri-800 transition-colors"
          >
            <Settings size={12} />
            고정지출 관리
          </button>
        </div>

        {/* Category Filter Badges */}
        <div className="flex gap-2 items-center overflow-x-auto pb-1 scrollbar-hide w-full" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <style>{`.scrollbar-hide::-webkit-scrollbar { display: none; }`}</style>
          <button
            onClick={() => setActiveCategory(null)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-[13px] font-bold transition-colors ${
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
              className={`shrink-0 px-3 py-1.5 rounded-full text-[13px] font-bold transition-colors ${
                activeCategory === cat
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {displayList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-yuri-300">
            <span className="text-4xl opacity-50">📝</span>
            <p className="text-sm font-bold text-yuri-400">이번 사이클 현금 지출이 없습니다.</p>
          </div>
        ) : (
          <div className="flex flex-col bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            {displayList.map(e => {
              const isEditing = editingRowId === e.id
              const isFixed = (e as any).isFixed || !!(e as any).fixedExpenseId
              
              if (isEditing) {
                return (
                  <EditRow 
                    key={e.id}
                    item={e}
                    expenseCategories={expenseCategories}
                    onUpdate={updateLedgerEntry}
                    onDelete={deleteLedgerEntry}
                    onCancel={() => setEditingRowId(null)}
                  />
                )
              }

              const catClasses = getCatClasses(e.category || '기타')
              const d = new Date(e.scheduledDate || e.createdAt)
              const dStr = `${d.getMonth() + 1}/${d.getDate()}`

              return (
                <div 
                  key={e.id} 
                  onClick={() => setEditingRowId(e.id)}
                  className="flex justify-between items-center px-4 py-3 hover:bg-gray-50 bg-white border-b border-gray-100 last:border-b-0 cursor-pointer group transition-colors"
                >
                  <div className="flex items-center gap-3 overflow-hidden flex-1">
                    <span className="text-xs font-semibold text-gray-400 w-10 shrink-0">{dStr}</span>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded shrink-0 ${catClasses.bg} ${catClasses.text}`}>
                      {e.category || '기타'}
                    </span>
                    <span className="text-sm font-medium text-gray-800 truncate flex items-center gap-1.5">
                      {e.label}
                      {isFixed && <span className="text-[9px] bg-yuri-200 text-yuri-600 px-1 py-0.5 rounded font-bold uppercase shrink-0">고정</span>}
                    </span>
                    {e.memo && <MessageSquare size={12} className="text-gray-400 shrink-0" />}
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    <span className="text-[10px] text-gray-400 font-medium bg-gray-50 px-1.5 py-0.5 rounded">{e.paymentMethod || '계좌이체'}</span>
                    <span className="text-[15px] font-bold text-gray-900 group-hover:text-black transition-colors">
                      {fmtAmt(e.amount)}
                    </span>
                  </div>
                </div>
              )
            })}
            
            {/* List Bottom Total */}
            <div className="flex justify-between items-center px-4 py-4 bg-gray-50 border-t border-gray-200">
              <span className="text-sm font-bold text-gray-500">합계</span>
              <span className="text-[15px] font-black text-gray-900">
                {fmtAmt(displayList.reduce((sum, item) => sum + item.amount, 0))}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── 이번 월급 활동 (Reference Section) ── */}
      <div className="p-4 md:p-5 pb-[200px] bg-gray-50 border-t border-gray-200 flex flex-col gap-3 shrink-0 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)] w-full relative z-10">
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-bold text-gray-400">참고</span>
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-gray-800">이번 월급 활동</span>
            <span className="text-sm font-extrabold text-gray-800">{fmtAmt(totalConsumedCard + totalCashExpense)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-medium text-gray-400">구성</span>
            <div className="flex items-center gap-2 text-[11px] font-medium text-gray-500">
              <span>카드 {fmtAmt(totalConsumedCard)}</span>
              <span className="text-gray-300">·</span>
              <span>현금 {fmtAmt(totalCashExpense)}</span>
            </div>
          </div>
        </div>

        <div className="h-px w-full bg-gray-200 my-0.5" />

        <div className="flex flex-col gap-2 w-full overflow-hidden">
          <h3 className="text-[11px] font-bold text-gray-500 shrink-0">월급 사이클 카테고리 분석</h3>
          <div 
            ref={catScrollRef}
            onMouseDown={handleCatMouseDown}
            onMouseLeave={handleCatMouseLeave}
            onMouseUp={handleCatMouseUp}
            onMouseMove={handleCatMouseMove}
            className="flex gap-2 items-center overflow-x-auto pb-1 scrollbar-hide cursor-grab active:cursor-grabbing w-full max-w-full" 
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <style>{`.scrollbar-hide::-webkit-scrollbar { display: none; }`}</style>
            {categorySums.map(([cat, data]) => {
              const classes = getCatClasses(cat)
              const isExpanded = expandedCat === cat
              return (
                <div key={cat} className="flex flex-col items-start gap-1 shrink-0">
                  <div 
                    onClick={() => setExpandedCat(isExpanded ? null : cat)}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-md border cursor-pointer select-none transition-all ${
                      isExpanded ? 'border-yuri-400 bg-yuri-50' : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <span className={`text-[9px] font-black ${classes.text} bg-gray-50 px-1 py-0.5 rounded`}>{cat}</span>
                    <span className={`text-[11px] font-bold text-gray-800`}>{fmtAmt(data.total)}</span>
                  </div>
                  {isExpanded && (
                    <div className="flex gap-1.5 px-1.5 py-1 bg-white border border-gray-200 rounded text-[9px] w-full justify-center shadow-sm">
                      {data.card > 0 && <span className="text-[#FF5D5D] font-bold">카드 {fmtAmt(data.card)}</span>}
                      {data.card > 0 && data.cash > 0 && <span className="text-gray-200">|</span>}
                      {data.cash > 0 && <span className="text-[#4FA596] font-bold">현금 {fmtAmt(data.cash)}</span>}
                    </div>
                  )}
                </div>
              )
            })}
            {categorySums.length === 0 && (
              <span className="text-[11px] font-bold text-gray-400">지출 내역이 없습니다.</span>
            )}
          </div>
        </div>
      </div>
    </div>
    </div>
  )
}
