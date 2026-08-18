import { useMemo, useState } from 'react'
import { useAppStore } from '../../store/AppStore'
import { calculatePaydayCycle } from '../../utils/ledgerCycle'
import { getCategoryColor } from '../../utils/parser'
import MobileLedgerInputSheet from './MobileLedgerInputSheet'
import { MessageSquare } from 'lucide-react'
import type { LedgerEntry } from '../../types'
import { extractSearchText } from '../../utils/textUtils'

interface MobileCashTabProps {
  year: number
  month: number
  searchQuery?: string
}

function fmtAmt(n: number) {
  return n.toLocaleString('ko-KR')
}

export default function MobileCashTab({ year, month, searchQuery = '' }: MobileCashTabProps) {
  const { 
    ledger, 
    expenseCategories, 
    payday,
    cardPaymentDay,
    cardBillingStartDay,
    cardBillingEndDay,
    salaryRecords,
    updateSalaryRecord,
    deleteLedgerEntry,
    cardBills
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

    const result = Object.entries(sums)
      .filter(([_, data]) => data.total > 0)
      .sort((a, b) => b[1].total - a[1].total)
    return result
  }, [expenseCategories, consumedCardEntries, cashEntries])

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
  const BAR_COLORS = ['bg-[#CFE7F4]', 'bg-[#DCCFF3]', 'bg-[#CFE8DC]', 'bg-[#D4DFEC]', 'bg-[#E2D8EF]']

  // Combined timeline list with search filter
  const displayList = useMemo(() => {
    let all = [...cashEntries]
    if (activeCategory) {
      all = all.filter(e => (e.category || '기타') === activeCategory)
    }
    if (searchQuery.trim()) {
      const queries = searchQuery.trim().toLowerCase().split(/\s+/)
      all = all.filter(item => {
        const target = extractSearchText((item.label || '') + ' ' + (item.memo || '')).toLowerCase()
        return queries.every(q => target.includes(q))
      })
    }
    all.sort((a, b) => {
      const safeGetTime = (val?: string) => {
        if (!val) return 0;
        const t = new Date(val).getTime();
        return isNaN(t) ? 0 : t;
      };

      const ta = safeGetTime(a.scheduledDate || a.createdAt);
      const tb = safeGetTime(b.scheduledDate || b.createdAt);
      if (ta !== tb) {
        return tb - ta; // tb(최신)가 크면 양수 반환 -> b가 위로(내림차순)
      }
      
      const ca = safeGetTime(a.createdAt);
      const cb = safeGetTime(b.createdAt);
      return cb - ca; // cb(최신)가 크면 양수 반환 -> b가 위로(내림차순)
    })
    return all
  }, [cashEntries, activeCategory, searchQuery])

  const highlightText = (text: string) => {
    if (!searchQuery.trim() || !text) return text
    const parts = text.split(new RegExp(`(${searchQuery.trim()})`, 'gi'))
    return (
      <>
        {parts.map((part, i) => 
          part.toLowerCase() === searchQuery.trim().toLowerCase() ? 
            <span key={i} className="bg-yellow-200 text-yuri-900">{part}</span> : part
        )}
      </>
    )
  }

  const editingEntry = editingRowId ? ledger.find(e => e.id === editingRowId) : null

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto overflow-x-hidden bg-yuri-50 pb-20">
      
      {/* 1. 월급 현황 카드 */}
      <div className="p-4 shrink-0 bg-white border-b border-yuri-100">
        <h3 className="text-sm font-bold text-yuri-800 mb-3">월급 현황</h3>
        <div className="bg-white rounded-2xl shadow-sm border border-yuri-100 p-4 md:p-5 flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-yuri-500">이번 달 월급</span>
            <div className="flex items-center gap-1">
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
                className="w-24 bg-transparent text-right text-sm font-bold text-[#1F1F1F] outline-none border-b border-dashed border-yuri-300 focus:border-yuri-500 transition-colors placeholder:text-yuri-300"
              />
              <span className="text-xs font-bold text-yuri-900">원</span>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-yuri-500">
              {hasActualBill ? '카드 결제액 (확정)' : '카드 결제 예정액 (예상)'}
            </span>
            <span className="text-sm font-bold text-[#1F1F1F]">-{fmtAmt(cardBillAmount)}원</span>
          </div>

          <div className="h-px w-full bg-yuri-100 my-1" />

          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-yuri-900">현재 남은 금액</span>
            <span className="text-base font-black text-[#8B7CF8]">{fmtAmt(salaryBalance)}원</span>
          </div>
        </div>
      </div>

      {/* 2. 지출 내역 */}
      <div className="flex flex-col bg-white mt-2 border-t border-yuri-100 shrink-0">
        <div className="p-4 pb-2 shrink-0 border-b border-yuri-100 flex flex-col gap-3">
          <h3 className="text-sm font-bold text-yuri-800">현금 / 계좌 지출 내역</h3>
          
          <div className="flex gap-2 items-center overflow-x-auto pb-1 scrollbar-hide w-full" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            <style>{`.scrollbar-hide::-webkit-scrollbar { display: none; }`}</style>
            <button
              onClick={() => setActiveCategory(null)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                activeCategory === null
                  ? 'bg-yuri-800 text-white shadow-sm'
                  : 'bg-yuri-50 text-yuri-500'
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
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-colors shadow-sm`}
                  style={isActive ? { backgroundColor: getCategoryColor(cat, expenseCategories), color: '#333' } : { backgroundColor: '#F9FAFB', color: '#6B7280' }}
                >
                  {cat}
                </button>
              )
            })}
          </div>
        </div>

        <div>
          {displayList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-yuri-300">
              <span className="text-4xl opacity-50">📝</span>
              <p className="text-sm font-bold text-yuri-400">지출 내역이 없습니다.</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {displayList.map(item => {
                const catColor = getCategoryColor(item.category || '기타', expenseCategories)
                const d = new Date(item.scheduledDate || item.createdAt)
                const dStr = `${d.getMonth() + 1}/${d.getDate()}`
                const isFixed = (item as any).isFixed || !!(item as any).fixedExpenseId

                return (
                  <div 
                    key={item.id}
                    onClick={() => setEditingRowId(item.id)}
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
                        {isFixed && <span className="text-[9px] bg-yuri-200 text-yuri-600 px-1 py-0.5 rounded font-bold uppercase shrink-0">고정</span>}
                      </span>
                      {item.memo && <MessageSquare size={12} className="text-yuri-300 shrink-0" />}
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-2">
                      <span className="text-base font-black text-yuri-900">
                        {fmtAmt(item.amount)}원
                      </span>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation()
                          if (confirm('삭제하시겠습니까?')) deleteLedgerEntry(item.id)
                        }}
                        className="p-1 -mr-2 text-yuri-300 hover:text-red-500"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
        
        {/* List Bottom Total */}
        <div className="shrink-0 flex justify-between items-center px-4 py-4 bg-yuri-50 border-t border-yuri-200">
          <span className="text-xs font-bold text-yuri-500">합계</span>
          <span className="text-base font-black text-yuri-900">
            {fmtAmt(displayList.reduce((sum, item) => sum + item.amount, 0))}원
          </span>
        </div>
      </div>

      {/* 3. 이번 월급 활동 대시보드 */}
      <div className="p-4 bg-white mt-2 border-y border-yuri-100 flex flex-col gap-5 pb-8 shrink-0">
        {/* 소비 카테고리 */}
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-bold text-yuri-500">이번 월급 활동</h3>
              <span className="text-[10px] font-medium text-yuri-400">월급 사이클 기준</span>
            </div>
            <span className="text-sm font-extrabold text-yuri-800">{fmtAmt(totalConsumption)}원</span>
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
                      <span className="font-bold text-yuri-700">{cat}</span>
                    </div>
                    <span className="font-extrabold text-yuri-800">{fmtAmt(data.total)}원</span>
                  </div>
                  <div className="w-full h-1.5 bg-yuri-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${ratio}%` }} />
                  </div>
                </div>
              )
            })}
            {consumptionCats.length === 0 && (
              <span className="text-[11px] font-bold text-yuri-400">소비 내역이 없습니다.</span>
            )}
          </div>
        </div>

        {/* 자금이동 (저축/보험) */}
        {savingCats.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-yuri-100 pt-5">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-yuri-500">자금이동</h3>
              <span className="text-sm font-extrabold text-yuri-800">{fmtAmt(totalSavings)}원</span>
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
                        <span className="font-bold text-yuri-700">{cat}</span>
                      </div>
                      <span className="font-extrabold text-yuri-800">{fmtAmt(data.total)}원</span>
                    </div>
                    <div className="w-full h-1.5 bg-yuri-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${ratio}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <MobileLedgerInputSheet 
        isOpen={!!editingRowId} 
        initialEntry={editingEntry} 
        onClose={() => setEditingRowId(null)} 
      />
    </div>
  )
}
