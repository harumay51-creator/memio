import { useMemo, useState } from 'react'
import { useAppStore } from '../../store/AppStore'
import { calculatePaydayCycle } from '../../utils/ledgerCycle'
import type { LedgerEntry } from '../../types'
import { EditRow } from './EditRow'
import { Settings } from 'lucide-react'

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

const WDAY_KO = ['일','월','화','수','목','금','토']

function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function fmtDateHeader(d: Date) {
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WDAY_KO[d.getDay()]})`
}
function fmtAmt(n: number) {
  return n.toLocaleString('ko-KR') + '원'
}

export default function CashTab({ year, month, onOpenFixedExpense }: { year: number, month: number, onOpenFixedExpense: () => void }) {
  const { 
    ledger, 
    expenseCategories, 
    fixedExpenses,
    payday,
    cardPaymentDay,
    cardBillingStartDay,
    cardBillingEndDay,
    salaryRecords,
    updateSalaryRecord,
    cardBills,
    updateLedgerEntry,
    deleteLedgerEntry
  } = useAppStore()

  const [editingRowId, setEditingRowId] = useState<string | null>(null)

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

  // 3. Generate Simulated Fixed Expenses
  const simulatedFixedExpenses = useMemo(() => {
    return fixedExpenses.map(fe => {
      // 0. Only show cash/transfer fixed expenses in CashTab
      if (fe.paymentMethod === '카드') return null

      // 1. Use the exact selected calendar month for fixed expenses
      const feYear = year
      const feMonth = month
      let feDate = fe.day
      
      const maxDays = new Date(feYear, feMonth + 1, 0).getDate()
      if (feDate > maxDays) feDate = maxDays

      const finalDate = new Date(feYear, feMonth, feDate, 9, 0, 0)
      
      // 2. Prevent retroactive injection for past months (before creation)
      const createdDate = new Date(fe.createdAt)
      if (
        feYear < createdDate.getFullYear() || 
        (feYear === createdDate.getFullYear() && feMonth < createdDate.getMonth())
      ) {
        return null
      }

      // 3. Prevent duplicate if AppStore already auto-injected this into the ledger
      const alreadyInjected = ledger.some(l => {
        if (l.fixedExpenseId !== fe.id) return false
        const lDate = new Date(l.scheduledDate || l.createdAt)
        return lDate.getFullYear() === feYear && lDate.getMonth() === feMonth
      })

      if (alreadyInjected) return null

      return {
        id: `fe-${fe.id}`, // pseudo id
        type: 'expense' as const,
        label: fe.label,
        amount: fe.amount,
        category: fe.category,
        paymentMethod: fe.paymentMethod || '계좌이체',
        createdAt: finalDate.toISOString(),
        scheduledDate: finalDate.toISOString(),
        isFixed: true,
        originalFeId: fe.id
      } as LedgerEntry & { isFixed: true, originalFeId: string }
    }).filter(e => e !== null) as (LedgerEntry & { isFixed: true, originalFeId: string })[]
  }, [fixedExpenses, cycle, ledger, year, month])

  // Compute Total Deductions
  const currentSalary = salaryRecords[salaryMonthKey]?.amount || 0
  const totalCashExpense = cashEntries.reduce((s, e) => s + e.amount, 0)
  const totalFixedExpense = simulatedFixedExpenses.reduce((s, e) => s + e.amount, 0)
  const totalDeductions = totalCashExpense + totalFixedExpense + cardBillAmount
  const salaryBalance = currentSalary - totalDeductions

  // Category Sums (Cash + Card in this cycle)
  const categorySums = useMemo(() => {
    const sums: Record<string, number> = {}
    expenseCategories.forEach(c => sums[c.name] = 0)
    sums['기타'] = 0

    const addSum = (e: LedgerEntry | { category: string, amount: number }) => {
      const cat = e.category || '기타'
      if (sums[cat] !== undefined) {
        sums[cat] += e.amount
      } else {
        sums['기타'] += e.amount
      }
    }

    cardEntries.forEach(addSum)
    cashEntries.forEach(addSum)
    simulatedFixedExpenses.forEach(addSum)

    // Filter out 0 sums and sort by amount descending
    const result = Object.entries(sums)
      .filter(([_, amt]) => amt > 0)
      .sort((a, b) => b[1] - a[1])
    return result
  }, [expenseCategories, cardEntries, cashEntries, simulatedFixedExpenses])

  // Combined timeline list
  const displayList = useMemo(() => {
    const all = [...cashEntries, ...simulatedFixedExpenses]
    all.sort((a, b) => {
      const ta = new Date(a.scheduledDate || a.createdAt).getTime()
      const tb = new Date(b.scheduledDate || b.createdAt).getTime()
      return tb - ta // Newest first
    })

    const map = new Map<string, { date: Date; entries: (LedgerEntry & { isFixed?: boolean, originalFeId?: string })[] }>()
    for (const e of all) {
      const d = new Date(e.scheduledDate || e.createdAt)
      const k = dayKey(d)
      if (!map.has(k)) map.set(k, { date: d, entries: [] })
      map.get(k)!.entries.push(e)
    }
    return [...map.values()]
  }, [cashEntries, simulatedFixedExpenses])

  return (
    <div className="flex-1 overflow-y-auto flex flex-col">
      {/* ── Summary Section ── */}
      <div className="p-5 md:p-8 bg-yuri-50 shrink-0 border-b border-yuri-100 flex flex-col gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-yuri-100 p-5 md:p-6 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-bold text-yuri-500">이번 달 월급</span>
            <div className="flex items-center gap-2">
              <input
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
                className="w-28 bg-transparent text-right text-lg font-bold text-yuri-900 outline-none border-b border-dashed border-yuri-300 focus:border-yuri-500 transition-colors placeholder:text-yuri-300 placeholder:text-base"
              />
              <span className="text-sm font-bold text-yuri-900">원</span>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm font-bold text-yuri-500">
              {hasActualBill ? '카드 결제액 (확정)' : '카드 결제 예정액 (예상)'}
            </span>
            <span className="text-base font-bold text-rose-500">-{fmtAmt(cardBillAmount)}</span>
          </div>

          <div className="h-px w-full bg-yuri-100" />

          <div className="flex justify-between items-center">
            <span className="text-sm font-bold text-yuri-900">월급 잔액</span>
            <span className="text-xl font-extrabold text-teal-600">{fmtAmt(salaryBalance)}</span>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-bold text-yuri-400">카테고리별 합산 (카드+현금+고정지출)</h3>
          <div className="flex flex-wrap gap-2">
            {categorySums.map(([cat, amt]) => {
              const classes = getCatClasses(cat)
              return (
                <div key={cat} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border border-yuri-200 bg-white`}>
                  <span className={`text-[10px] font-black ${classes.text} bg-gray-50 px-1.5 py-0.5 rounded`}>{cat}</span>
                  <span className={`text-xs font-bold text-yuri-900`}>{fmtAmt(amt)}</span>
                </div>
              )
            })}
            {categorySums.length === 0 && (
              <span className="text-xs font-bold text-yuri-400">지출 내역이 없습니다.</span>
            )}
          </div>
        </div>
      </div>

      {/* ── Timeline Section ── */}
      <div className="flex-1 p-5 md:p-8 bg-white flex flex-col gap-6 relative">
        <div className="flex justify-between items-center">
          <h2 className="text-sm font-bold text-yuri-900">현금 / 계좌 지출 내역</h2>
          <button 
            onClick={onOpenFixedExpense}
            className="flex items-center gap-1.5 text-xs font-bold text-yuri-500 hover:text-accent transition-colors"
          >
            <Settings size={12} />
            고정지출 관리
          </button>
        </div>

        {displayList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-yuri-300">
            <span className="text-4xl opacity-50">📝</span>
            <p className="text-sm font-bold text-yuri-400">이번 사이클 현금 지출이 없습니다.</p>
          </div>
        ) : (
          displayList.map(g => (
            <div key={dayKey(g.date)} className="flex flex-col gap-2">
              <h3 className="text-xs font-bold text-yuri-500 flex items-center gap-2">
                {fmtDateHeader(g.date)}
              </h3>
              
              <div className="flex flex-col gap-1.5">
                {g.entries.map(e => {
                  const isEditing = editingRowId === e.id

                  const isFixed = e.isFixed || !!e.fixedExpenseId
                  if (isEditing && !isFixed) {
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

                  return (
                    <div 
                      key={e.id} 
                      onClick={() => {
                        if (isFixed) {
                          onOpenFixedExpense()
                        } else {
                          setEditingRowId(e.id)
                        }
                      }}
                      className="group flex flex-col p-3 rounded-xl border border-transparent hover:border-yuri-200 transition-colors cursor-pointer bg-white"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 overflow-hidden flex-1">
                          <span className={`shrink-0 text-[10px] font-black px-1.5 py-0.5 rounded ${catClasses.bg} ${catClasses.text}`}>
                            {e.category || '기타'}
                          </span>
                          <span className="text-[13px] font-bold text-gray-900 truncate flex items-center gap-1.5">
                            {e.label}
                            {isFixed && <span className="text-[9px] bg-yuri-200 text-yuri-600 px-1 py-0.5 rounded font-bold uppercase shrink-0">고정</span>}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">
                            {e.paymentMethod || '계좌이체'}
                          </span>
                          <span className="text-[13px] font-bold text-gray-900 text-right">
                            {e.amount.toLocaleString('ko-KR')}
                          </span>
                        </div>
                      </div>
                      
                      {e.memo && (
                        <p className="text-[11px] text-gray-400 mt-1.5 leading-snug truncate pl-[46px]">
                          {e.memo}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
