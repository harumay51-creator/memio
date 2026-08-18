import { useMemo, useState } from 'react'
import { useAppStore } from '../../store/AppStore'
import { calculatePaydayCycle } from '../../utils/ledgerCycle'
import { getCategoryColor } from '../../utils/parser'
import type { LedgerEntry } from '../../types'
import { EditRow } from './EditRow'
import { Settings, MessageSquare } from 'lucide-react'

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
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

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

  // Split categorySums into savings and consumption
  const consumptionCats = categorySums.filter(([cat]) => cat !== '저축' && cat !== '보험')
  const savingCats = categorySums.filter(([cat]) => cat === '저축' || cat === '보험')
  const totalConsumption = consumptionCats.reduce((sum, [_, data]) => sum + data.total, 0)
  const totalSavings = savingCats.reduce((sum, [_, data]) => sum + data.total, 0)
  const totalCycleUsage = totalConsumedCard + totalCashExpense
  const executionRatio = currentSalary > 0 ? Math.min(100, Math.round((totalCycleUsage / currentSalary) * 100)) : 0
  const BAR_COLORS = ['bg-[#CFE7F4]', 'bg-[#DCCFF3]', 'bg-[#CFE8DC]', 'bg-[#D4DFEC]', 'bg-[#E2D8EF]']

  // Combined timeline list
  const displayList = useMemo(() => {
    let all = [...cashEntries]
    if (activeCategory) {
      all = all.filter(e => (e.category || '기타') === activeCategory)
    }
    all.sort((a, b) => {
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
    return all
  }, [cashEntries, activeCategory])

  return (
    <div className="flex-1 overflow-hidden flex flex-col md:flex-row bg-gray-50/50">
      {/* ── Left Column: Main ── */}
      <div className="flex-1 overflow-y-auto flex flex-col items-center">
        <div className="w-full max-w-[840px] flex flex-col flex-1 min-h-full bg-white shadow-sm border-x border-gray-100 relative pb-12">
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
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-yuri-900">현금 / 계좌 지출 내역</h2>
                <span className="text-[10px] font-medium text-gray-400">현금·계좌이체 거래만 표시</span>
              </div>
              <button 
                onClick={onOpenFixedExpense}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-yuri-900 text-white rounded-lg text-[11px] font-bold shadow-sm hover:bg-yuri-800 transition-colors"
              >
                <Settings size={12} />
                고정지출 관리
              </button>
            </div>

            {/* Category Filter Badges */}
            <div className="flex gap-2 items-center overflow-x-auto pb-1 scrollbar-hide w-full min-w-0" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
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
              
              {availableCategories.map(cat => {
                const isActive = activeCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-[13px] font-bold transition-colors border ${
                      isActive
                        ? 'border-transparent text-[#374151]'
                        : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}
                    style={isActive ? { backgroundColor: getCategoryColor(cat, expenseCategories) } : undefined}
                  >
                    {cat}
                  </button>
                )
              })}
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
                  const catColor = getCategoryColor(e.category || '기타', expenseCategories)
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
                        <span 
                          className="text-[11px] font-bold px-2 py-0.5 rounded shrink-0 text-[#374151]"
                          style={{ backgroundColor: catColor }}
                        >
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
        </div>
      </div>

      {/* ── Right Column: Panel ── */}
      <div className="w-full md:w-[320px] lg:w-[360px] shrink-0 bg-gray-50 border-l border-gray-200 flex flex-col overflow-y-auto">
        <div className="p-5 flex flex-col gap-8 w-full min-w-0 pb-12">
          
          {/* 1. 이번 월급 현황 대시보드 */}
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-bold text-gray-800">월급 현황</h3>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-col gap-3">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-gray-500">월급</span>
                <span className="font-extrabold text-gray-900">{fmtAmt(currentSalary)}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-gray-500">집행</span>
                <span className="font-extrabold text-gray-900">{fmtAmt(totalCycleUsage)}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-gray-500">잔액</span>
                <span className="font-extrabold text-[#8B7CF8]">{fmtAmt(salaryBalance)}</span>
              </div>
              
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#CFE7F4] rounded-full transition-all" style={{ width: `${executionRatio}%` }} />
                </div>
                <span className="text-[10px] font-bold text-gray-400 w-6 text-right">{executionRatio}%</span>
              </div>
            </div>

            <div className="flex justify-between items-center px-1 mt-1">
              <span className="text-[11px] font-bold text-gray-400">구성</span>
              <div className="flex items-center gap-2 text-[11px] font-bold text-gray-500">
                <span>카드 {fmtAmt(totalConsumedCard)}</span>
                <span className="text-gray-300">·</span>
                <span>현금 {fmtAmt(totalCashExpense)}</span>
              </div>
            </div>
          </div>

          {/* 2. 소비 카테고리 */}
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1.5">
                <h3 className="text-xs font-bold text-gray-500">소비 카테고리</h3>
                <span className="text-[10px] font-medium text-gray-400">월급 사이클 기준</span>
              </div>
              <span className="text-xs font-extrabold text-gray-800">{fmtAmt(totalConsumption)}</span>
            </div>
            
            <div className="flex flex-col gap-3">
              {consumptionCats.map(([cat, data], idx) => {
                const ratio = totalConsumption > 0 ? Math.max((data.total / totalConsumption) * 100, 1.5) : 0
                const color = BAR_COLORS[idx % BAR_COLORS.length]
                return (
                  <div key={cat} className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${color}`} />
                        <span className="font-bold text-gray-700">{cat}</span>
                      </div>
                      <span className="font-extrabold text-gray-800">{fmtAmt(data.total)}</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-200/60 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${ratio}%` }} />
                    </div>
                  </div>
                )
              })}
              {consumptionCats.length === 0 && (
                <span className="text-[11px] font-bold text-gray-400">소비 내역이 없습니다.</span>
              )}
            </div>
          </div>

          {/* 3. 자금이동 (저축) */}
          {savingCats.length > 0 && (
            <div className="flex flex-col gap-3 border-t border-gray-200 pt-5">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold text-gray-500">자금이동</h3>
                <span className="text-xs font-extrabold text-gray-800">{fmtAmt(totalSavings)}</span>
              </div>
              
              <div className="flex flex-col gap-3">
                {savingCats.map(([cat, data], idx) => {
                  const ratio = totalSavings > 0 ? Math.max((data.total / totalSavings) * 100, 1.5) : 0
                  const color = BAR_COLORS[idx % BAR_COLORS.length]
                  return (
                    <div key={cat} className="flex flex-col gap-1.5">
                      <div className="flex justify-between items-center text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <div className={`w-2 h-2 rounded-full ${color}`} />
                          <span className="font-bold text-gray-700">{cat}</span>
                        </div>
                        <span className="font-extrabold text-gray-800">{fmtAmt(data.total)}</span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-200/60 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${ratio}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          
        </div>
      </div>
    </div>
  )
}
