import React, { useState, useMemo } from 'react'
import type { LedgerEntry, FixedExpense } from '../../types'
import { useAppStore } from '../../store/AppStore'
import { classifyLedgerCategory } from '../../utils/parser'

// ── Constants ─────────────────────────────────────────────────────────────────
const MONTH_KO = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'] as const
const WDAY_KO  = ['일','월','화','수','목','금','토'] as const

/** Colour associated with each category (used for dots and bars). */
const CAT_COLOR: Record<string, string> = {
  '식비':     '#f97316',
  '카페':     '#f59e0b',
  '교통':     '#3b82f6',
  '쇼핑':     '#a855f7',
  '문화':     '#ec4899',
  '의료':     '#ef4444',
  '통신':     '#06b6d4',
  '기타':     '#94a3b8',
  '급여':     '#10b981',
  '용돈':     '#22c55e',
  '이자/배당': '#14b8a6',
  '환급':     '#34d399',
  '기타수입':  '#6b7280',
}

function catColor(name: string): string {
  return CAT_COLOR[name] ?? '#94a3b8'
}

// ── Formatters ────────────────────────────────────────────────────────────────
function fmtAmt(n: number): string {
  return n.toLocaleString('ko-KR') + '원'
}

function fmtDateHeader(d: Date): string {
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${WDAY_KO[d.getDay()]}요일`
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

// ── Category stat ─────────────────────────────────────────────────────────────
interface CatStat { name: string; total: number; count: number }

function buildCatStats(entries: LedgerEntry[], entryType: 'income' | 'expense'): CatStat[] {
  const map = new Map<string, CatStat>()
  for (const e of entries) {
    if (e.type !== entryType) continue
    const name = e.category ?? '기타'
    const s = map.get(name) ?? { name, total: 0, count: 0 }
    s.total += e.amount
    s.count++
    map.set(name, s)
  }
  return [...map.values()].sort((a, b) => b.total - a.total)
}

function barPct(value: number, max: number): string {
  if (max === 0) return '0%'
  return `${Math.round((value / max) * 100)}%`
}

// ── Component ─────────────────────────────────────────────────────────────────
const LedgerPage: React.FC = () => {
  const { 
    ledger, deleteLedgerEntry, updateLedgerEntry, 
    fixedExpenses, addFixedExpense, updateFixedExpense, deleteFixedExpense,
    expenseCategories
  } = useAppStore()

  const today = useMemo(() => new Date(), [])
  const [view, setView] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))

  const year  = view.getFullYear()
  const month = view.getMonth()

  const prevMonth = () => setView(new Date(year, month - 1, 1))
  const nextMonth = () => setView(new Date(year, month + 1, 1))
  const goToday   = () => setView(new Date(today.getFullYear(), today.getMonth(), 1))

  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth()

  // ── Filter to selected month ────────────────────────────────────────────────
  const monthEntries = useMemo(() =>
    ledger
      .filter(e => {
        const d = new Date(e.scheduledDate ?? e.createdAt)
        return d.getFullYear() === year && d.getMonth() === month
      })
      .sort((a, b) => new Date(b.scheduledDate ?? b.createdAt).getTime() - new Date(a.scheduledDate ?? a.createdAt).getTime()),
    [ledger, year, month],
  )

  // ── Totals ─────────────────────────────────────────────────────────────────
  const totalIncome  = monthEntries.filter(e => e.type === 'income' ).reduce((s, e) => s + e.amount, 0)
  const totalExpense = monthEntries.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0)
  const net          = totalIncome - totalExpense

  // ── Category stats ─────────────────────────────────────────────────────────
  const expenseCats = useMemo(() => buildCatStats(monthEntries, 'expense'), [monthEntries])
  const maxExpCat   = expenseCats[0]?.total ?? 0

  // ── Group transactions by date ─────────────────────────────────────────────
  const groups = useMemo(() => {
    const map = new Map<string, { date: Date; entries: LedgerEntry[] }>()
    for (const e of monthEntries) {
      const d = new Date(e.scheduledDate ?? e.createdAt)
      const k = dayKey(d)
      if (!map.has(k)) map.set(k, { date: d, entries: [] })
      map.get(k)!.entries.push(e)
    }
    return [...map.values()]
  }, [monthEntries])

  const hasData = monthEntries.length > 0

  // ── Ledger Entry Edit State ─────────────────────────────────────────────────
  const [editingLedgerId, setEditingLedgerId] = useState<string | null>(null)
  const [editLedgerLabel, setEditLedgerLabel] = useState('')
  const [editLedgerAmt, setEditLedgerAmt]   = useState('')

  const startEditLedger = (e: LedgerEntry) => {
    setEditingLedgerId(e.id)
    setEditLedgerLabel(e.label)
    setEditLedgerAmt(e.amount.toString())
  }

  const saveEditLedger = (e: LedgerEntry) => {
    const amt = parseInt(editLedgerAmt, 10)
    if (editLedgerLabel.trim() && !isNaN(amt)) {
      updateLedgerEntry(e.id, { 
        label: editLedgerLabel.trim(), 
        amount: amt, 
        category: classifyLedgerCategory(editLedgerLabel.trim(), e.type, expenseCategories) 
      })
    }
    setEditingLedgerId(null)
  }

  const togglePaymentMethod = (e: LedgerEntry) => {
    const current = e.paymentMethod || '카드'
    updateLedgerEntry(e.id, { paymentMethod: current === '카드' ? '계좌이체' : '카드' })
  }

  // ── Fixed Expense Edit State ────────────────────────────────────────────────
  const [editingFeId, setEditingFeId] = useState<string | null>(null)
  const [feLabel, setFeLabel] = useState('')
  const [feAmount, setFeAmount] = useState('')
  const [feDay, setFeDay] = useState('')

  const startEditFe = (f: FixedExpense) => {
    setEditingFeId(f.id)
    setFeLabel(f.label)
    setFeAmount(f.amount.toLocaleString('ko-KR'))
    setFeDay(f.day === 99 ? '말일' : f.day.toString())
  }

  const saveEditFe = () => {
    if (!editingFeId) return
    const amt = parseInt(feAmount.replace(/,/g, ''), 10)
    const day = feDay === '말일' ? 99 : parseInt(feDay, 10)
    if (feLabel.trim() && !isNaN(amt) && !isNaN(day) && (day === 99 || (day >= 1 && day <= 31))) {
      updateFixedExpense(editingFeId, {
        label: feLabel.trim(),
        amount: amt,
        day,
        category: classifyLedgerCategory(feLabel.trim(), 'expense', expenseCategories)
      })
    }
    setEditingFeId(null)
    setFeLabel('')
    setFeAmount('')
    setFeDay('')
  }

  const handleAddFe = (e: React.FormEvent) => {
    e.preventDefault()
    const amt = parseInt(feAmount.replace(/,/g, ''), 10)
    const day = feDay === '말일' ? 99 : parseInt(feDay, 10)
    if (!feLabel.trim() || isNaN(amt) || isNaN(day) || (day !== 99 && (day < 1 || day > 31))) return
    
    addFixedExpense(feLabel.trim(), amt, day, classifyLedgerCategory(feLabel.trim(), 'expense', expenseCategories))
    setFeLabel('')
    setFeAmount('')
    setFeDay('')
  }

  // ── Month Picker State ───────────────────────────────────────────────────────
  const [showPicker, setShowPicker] = useState(false)
  const [pickerYear, setPickerYear] = useState(year)

  const handleMonthSelect = (m: number) => {
    setView(new Date(pickerYear, m, 1))
    setShowPicker(false)
  }

  return (
    <div className="flex h-full w-full bg-white overflow-hidden">
      {/* ── Left Panel: Stats & Fixed Expenses (~30%) ────────────────────────────── */}
      <aside className="w-[30%] min-w-[320px] max-w-[400px] border-r border-yuri-100 bg-yuri-50/30 flex flex-col shrink-0 h-full">
        <header className="relative shrink-0 flex items-center justify-between px-6 py-4 border-b border-yuri-100 bg-white z-10">
          <button onClick={prevMonth} className="text-yuri-400 hover:text-yuri-800 transition-colors w-6 h-6 flex items-center justify-center">←</button>
          <div className="flex flex-col items-center">
            <button 
              onClick={() => { setPickerYear(year); setShowPicker(!showPicker); }}
              className="text-base font-bold text-yuri-900 hover:text-accent transition-colors flex items-center gap-1"
            >
              {year}년 {MONTH_KO[month]}
              <span className="text-[10px] text-yuri-400">{showPicker ? '▲' : '▼'}</span>
            </button>
            {!isCurrentMonth && <button onClick={goToday} className="text-[10px] text-accent font-semibold hover:underline mt-0.5">이번 달로 이동</button>}
          </div>
          <button onClick={nextMonth} className="text-yuri-400 hover:text-yuri-800 transition-colors w-6 h-6 flex items-center justify-center">→</button>
          
          {showPicker && (
            <div className="absolute top-full left-0 w-full bg-white border-b border-yuri-200 shadow-lg p-4 z-50 animate-fade-in">
              <div className="flex justify-between items-center mb-4 px-2">
                <button onClick={() => setPickerYear(y => y - 1)} className="text-yuri-400 hover:text-yuri-800 font-bold p-1">←</button>
                <span className="font-bold text-yuri-900">{pickerYear}년</span>
                <button onClick={() => setPickerYear(y => y + 1)} className="text-yuri-400 hover:text-yuri-800 font-bold p-1">→</button>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {MONTH_KO.map((mName, i) => (
                  <button
                    key={i}
                    onClick={() => handleMonthSelect(i)}
                    className={`py-2 rounded-lg text-sm font-bold transition-colors ${
                      pickerYear === year && i === month 
                        ? 'bg-yuri-900 text-white' 
                        : pickerYear === today.getFullYear() && i === today.getMonth()
                          ? 'bg-accent/10 text-accent hover:bg-accent/20'
                          : 'hover:bg-yuri-100 text-yuri-700'
                    }`}
                  >
                    {mName}
                  </button>
                ))}
              </div>
            </div>
          )}
        </header>

        <div className="flex-1 overflow-y-auto relative z-0">
          {/* Totals */}
          <div className="p-6 bg-white border-b border-yuri-100 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-yuri-500">총 수입</span>
              <span className="text-sm font-bold text-emerald-600">{totalIncome > 0 ? `+${fmtAmt(totalIncome)}` : '0원'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-yuri-500">총 지출</span>
              <span className="text-sm font-bold text-red-500">{totalExpense > 0 ? `-${fmtAmt(totalExpense)}` : '0원'}</span>
            </div>
            <div className="pt-3 border-t border-yuri-100 flex justify-between items-center">
              <span className="text-sm font-bold text-yuri-800">잔액</span>
              <span className={`text-lg font-black ${net >= 0 ? 'text-yuri-900' : 'text-red-500'}`}>
                {net >= 0 ? `+${fmtAmt(net)}` : `-${fmtAmt(Math.abs(net))}`}
              </span>
            </div>
          </div>

          {/* Categories */}
          {expenseCats.length > 0 && (
            <div className="p-6 border-b border-yuri-100">
              <h3 className="text-[11px] font-bold text-yuri-400 uppercase tracking-wider mb-4">지출 카테고리 (TOP)</h3>
              <div className="flex flex-col gap-3">
                {expenseCats.slice(0, 5).map(c => (
                  <div key={c.name} className="flex flex-col gap-1">
                    <div className="flex justify-between items-end">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: catColor(c.name) }} />
                        <span className="text-xs font-semibold text-yuri-800">{c.name}</span>
                      </div>
                      <span className="text-xs font-bold text-yuri-900">{fmtAmt(c.total)}</span>
                    </div>
                    <div className="h-1 w-full bg-yuri-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ backgroundColor: catColor(c.name), width: barPct(c.total, maxExpCat) }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fixed Expenses */}
          <div className="p-6 pb-24">
            <h3 className="text-[11px] font-bold text-yuri-400 uppercase tracking-wider mb-4">고정 지출 관리</h3>
            
            <form onSubmit={editingFeId ? (e) => { e.preventDefault(); saveEditFe(); } : handleAddFe} className="bg-yuri-100/50 p-3 rounded-xl border border-yuri-200 mb-4 flex flex-col gap-2">
              <input
                type="text" placeholder="항목명 (예: 넷플릭스)" value={feLabel} onChange={e => setFeLabel(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-yuri-200 rounded text-xs outline-none focus:border-accent"
              />
              <div className="flex gap-2">
                <input
                  type="text" placeholder="일(1~31, 말일)" value={feDay} onChange={e => setFeDay(e.target.value)}
                  className="w-24 px-2.5 py-1.5 bg-white border border-yuri-200 rounded text-xs outline-none focus:border-accent"
                />
                <input
                  type="text" placeholder="금액" value={feAmount} onChange={e => {
                    const raw = e.target.value.replace(/[^0-9]/g, '')
                    setFeAmount(raw ? parseInt(raw, 10).toLocaleString('ko-KR') : '')
                  }}
                  className="flex-1 px-2.5 py-1.5 bg-white border border-yuri-200 rounded text-xs outline-none focus:border-accent"
                />
              </div>
              <div className="flex gap-2 mt-1">
                <button type="submit" disabled={!feLabel.trim() || !feAmount || !feDay} className="flex-1 py-1.5 bg-yuri-900 text-white text-xs font-bold rounded hover:bg-yuri-800 disabled:opacity-50">
                  {editingFeId ? '저장' : '추가'}
                </button>
                {editingFeId && (
                  <button type="button" onClick={() => { setEditingFeId(null); setFeLabel(''); setFeAmount(''); setFeDay(''); }} className="px-3 py-1.5 bg-white border border-yuri-200 text-yuri-600 text-xs font-bold rounded hover:bg-yuri-50">
                    취소
                  </button>
                )}
              </div>
            </form>

            <div className="flex flex-col gap-2">
              {fixedExpenses.map(fe => (
                <div key={fe.id} className={`group p-3 rounded-lg border ${editingFeId === fe.id ? 'border-accent bg-accent/5' : 'border-yuri-100 bg-white hover:border-yuri-300'}`}>
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: catColor(fe.category) }} />
                      <span className="text-xs font-bold text-yuri-900">{fe.label}</span>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => startEditFe(fe)} className="text-[10px] text-yuri-400 hover:text-accent font-bold">수정</button>
                      <button onClick={() => deleteFixedExpense(fe.id)} className="text-[10px] text-yuri-400 hover:text-red-500 font-bold">삭제</button>
                    </div>
                  </div>
                  <div className="flex justify-between items-center pl-3">
                    <span className="text-[10px] text-yuri-500">매월 {fe.day === 99 ? '말일' : `${fe.day}일`}</span>
                    <span className="text-xs font-bold text-red-500">-{fmtAmt(fe.amount)}</span>
                  </div>
                </div>
              ))}
              {fixedExpenses.length === 0 && (
                <p className="text-xs text-yuri-400 text-center py-4">등록된 고정 지출이 없습니다.</p>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* ── Right Panel: Transactions (~70%) ───────────────────────────────────── */}
      <main className="flex-1 flex flex-col h-full bg-white relative min-w-0">
        <header className="shrink-0 h-16 border-b border-yuri-100 flex items-center px-8 bg-white">
          <h2 className="text-lg font-bold text-yuri-900 tracking-tight">거래 내역</h2>
        </header>

        <div className="flex-1 overflow-y-auto p-8 pb-32">
          {!hasData ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-yuri-300">
              <span className="text-5xl opacity-50">💸</span>
              <p className="text-sm font-medium text-yuri-400">이번 달 거래 내역이 없습니다.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-10">
              {groups.map(g => (
                <section key={dayKey(g.date)}>
                  <h3 className="text-xs font-bold text-yuri-500 mb-3 border-b border-yuri-100 pb-2 flex items-center gap-2">
                    {fmtDateHeader(g.date)}
                    <span className="text-[10px] font-medium text-yuri-400 bg-yuri-50 px-1.5 py-0.5 rounded-sm">
                      {g.entries.length}건
                    </span>
                  </h3>
                  
                  <div className="flex flex-col gap-1">
                    {g.entries.map(e => (
                      <div key={e.id} className="group flex items-center justify-between py-2.5 px-3 -mx-3 rounded-lg hover:bg-yuri-50 transition-colors">
                        
                        {/* Edit Mode */}
                        {editingLedgerId === e.id ? (
                          <div className="flex-1 flex gap-2 items-center pr-4">
                            <input
                              type="text" value={editLedgerLabel} onChange={ev => setEditLedgerLabel(ev.target.value)}
                              className="flex-1 px-2 py-1 text-sm bg-white border border-accent rounded outline-none"
                              placeholder="내용"
                            />
                            <input
                              type="number" value={editLedgerAmt} onChange={ev => setEditLedgerAmt(ev.target.value)}
                              className="w-24 px-2 py-1 text-sm bg-white border border-accent rounded outline-none"
                              placeholder="금액"
                            />
                            <button onClick={() => saveEditLedger(e)} className="text-xs font-bold text-white bg-accent px-3 py-1.5 rounded hover:bg-accent/90">저장</button>
                            <button onClick={() => setEditingLedgerId(null)} className="text-xs font-bold text-yuri-500 bg-yuri-100 px-3 py-1.5 rounded hover:bg-yuri-200">취소</button>
                          </div>
                        ) : (
                          /* View Mode */
                          <>
                            <div className="flex items-center gap-4 flex-1 min-w-0 pr-4">
                              <div className="relative shrink-0 w-16 h-6">
                                <select
                                  value={e.category}
                                  onChange={(ev) => updateLedgerEntry(e.id, { category: ev.target.value })}
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                >
                                  {e.type === 'expense' ? (
                                    <>
                                      {expenseCategories.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                                      {!expenseCategories.some(c => c.name === '기타') && <option value="기타">기타</option>}
                                      {!expenseCategories.some(c => c.name === e.category) && e.category !== '기타' && <option value={e.category}>{e.category}</option>}
                                    </>
                                  ) : (
                                    <>
                                      {['급여', '용돈', '이자/배당', '환급', '기타수입'].map(name => (
                                        <option key={name} value={name}>{name}</option>
                                      ))}
                                      {![ '급여', '용돈', '이자/배당', '환급', '기타수입'].includes(e.category) && <option value={e.category}>{e.category}</option>}
                                    </>
                                  )}
                                </select>
                                <div 
                                  className="pointer-events-none w-full h-full text-[10px] font-bold text-center bg-yuri-100 flex items-center justify-center rounded-sm truncate px-1" 
                                  style={{ color: catColor(e.category) }}
                                >
                                  {e.category}
                                </div>
                              </div>
                              
                              <span 
                                onClick={() => startEditLedger(e)}
                                className="text-sm font-semibold text-yuri-900 truncate flex-1 cursor-pointer hover:underline hover:text-accent transition-colors"
                              >
                                {e.label}
                                {e.fixedExpenseId && <span className="ml-2 text-[9px] bg-yuri-200 text-yuri-600 px-1 py-0.5 rounded font-bold uppercase">고정</span>}
                              </span>

                              <button 
                                onClick={() => togglePaymentMethod(e)}
                                className={`shrink-0 w-16 text-[10px] font-bold py-1 rounded transition-colors text-center cursor-pointer ${
                                  (e.paymentMethod || '카드') === '카드' 
                                    ? 'bg-blue-50 text-blue-600 hover:bg-blue-100' 
                                    : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                                }`}
                              >
                                {e.paymentMethod || '카드'}
                              </button>
                            </div>

                            <div className="flex items-center gap-4 shrink-0">
                              <span 
                                onClick={() => startEditLedger(e)}
                                className={`text-sm font-bold w-24 text-right cursor-pointer hover:underline hover:text-accent ${e.type === 'income' ? 'text-emerald-600' : 'text-yuri-900'}`}
                              >
                                {e.type === 'income' ? '+' : '-'}{fmtAmt(e.amount)}
                              </span>
                              <button
                                onClick={() => deleteLedgerEntry(e.id)}
                                className="w-6 h-6 flex items-center justify-center rounded-md text-yuri-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                                aria-label="삭제"
                              >
                                ✕
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default LedgerPage
