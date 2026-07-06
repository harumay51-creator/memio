import React, { useState, useMemo } from 'react'
import type { LedgerEntry, FixedExpense } from '../../types'
import { useAppStore } from '../../store/AppStore'
import { parseCapture, classifyLedgerCategory } from '../../utils/parser'
import PinScreen from '../JournalPage/PinScreen'
import { Lock, X } from 'lucide-react'

// ── Constants ─────────────────────────────────────────────────────────────────
const MONTH_KO = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'] as const
const WDAY_KO  = ['일','월','화','수','목','금','토'] as const

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

// ── Formatters ────────────────────────────────────────────────────────────────
function fmtAmt(n: number): string {
  return n.toLocaleString('ko-KR') + '원'
}

function fmtDateHeader(d: Date): string {
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${WDAY_KO[d.getDay()]}요일`
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function fmtCreatedAt(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// ── Component ─────────────────────────────────────────────────────────────────
const LedgerPage: React.FC = () => {
  const { 
    ledger, updateLedgerEntry, deleteLedgerEntry, 
    fixedExpenses, addFixedExpense, updateFixedExpense, deleteFixedExpense,
    expenseCategories, isPrivateUnlocked, lockPrivate
  } = useAppStore()

  const today = useMemo(() => new Date(), [])
  const [view, setView] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))

  const year  = view.getFullYear()
  const month = view.getMonth()

  const prevMonth = () => setView(new Date(year, month - 1, 1))
  const nextMonth = () => setView(new Date(year, month + 1, 1))
  const goToday   = () => setView(new Date(today.getFullYear(), today.getMonth(), 1))

  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth()

  // ── Month Picker ─────────────────────────────────────────────────────────────
  const [showPicker, setShowPicker] = useState(false)
  const [pickerYear, setPickerYear] = useState(year)

  const handleMonthSelect = (m: number) => {
    setView(new Date(pickerYear, m, 1))
    setShowPicker(false)
  }

  // ── Filters & Sort ────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest')

  // ── Filter to selected month ────────────────────────────────────────────────
  const monthEntries = useMemo(() => {
    return ledger.filter(e => {
      const d = new Date(e.scheduledDate ?? e.createdAt)
      return d.getFullYear() === year && d.getMonth() === month
    })
  }, [ledger, year, month])

  // ── Computed Totals ─────────────────────────────────────────────────────────
  const totalIncome  = monthEntries.filter(e => e.type === 'income' ).reduce((s, e) => s + e.amount, 0)
  const totalExpense = monthEntries.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0)
  const net          = totalIncome - totalExpense

  // ── Filtered & Sorted Entries ───────────────────────────────────────────────
  const displayEntries = useMemo(() => {
    let result = monthEntries

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(e => e.label.toLowerCase().includes(q))
    }

    if (filterType !== 'all') {
      result = result.filter(e => e.type === filterType)
    }

    if (filterCategory !== 'all') {
      result = result.filter(e => e.category === filterCategory)
    }

    result = [...result].sort((a, b) => {
      const tA = new Date(a.scheduledDate ?? a.createdAt).getTime()
      const tB = new Date(b.scheduledDate ?? b.createdAt).getTime()
      if (sortOrder === 'newest') return tB - tA
      if (sortOrder === 'oldest') return tA - tB
      if (sortOrder === 'highest') return b.amount - a.amount
      if (sortOrder === 'lowest') return a.amount - b.amount
      return 0
    })

    return result
  }, [monthEntries, searchQuery, filterType, filterCategory, sortOrder])

  // ── Group by date ────────────────────────────────────────────────────────────
  const groups = useMemo(() => {
    const map = new Map<string, { date: Date; entries: LedgerEntry[] }>()
    for (const e of displayEntries) {
      const d = new Date(e.scheduledDate ?? e.createdAt)
      const k = dayKey(d)
      if (!map.has(k)) map.set(k, { date: d, entries: [] })
      map.get(k)!.entries.push(e)
    }
    return [...map.values()]
  }, [displayEntries])



  // ── Transaction Editing ─────────────────────────────────────────────────────
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null)
  const [editInput, setEditInput] = useState('')
  const [editMemo, setEditMemo] = useState('')

  const startEdit = (entry: LedgerEntry) => {
    setEditingEntryId(entry.id)
    setEditInput(`${entry.label} ${entry.type === 'income' ? '+' : ''}${entry.amount}원`)
    setEditMemo(entry.memo || '')
  }

  const saveEdit = (entry: LedgerEntry) => {
    if (editInput.trim()) {
      const res = parseCapture(editInput, expenseCategories)
      updateLedgerEntry(entry.id, {
        label: res.text,
        amount: res.amount || 0,
        type: res.type,
        category: res.category || '기타',
        scheduledDate: res.scheduledDate,
        memo: editMemo.trim() || undefined
      })
    }
    setEditingEntryId(null)
  }

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, entry: LedgerEntry) => {
    if (e.key === 'Enter') saveEdit(entry)
    if (e.key === 'Escape') setEditingEntryId(null)
  }

  // ── Fixed Expenses Modal ────────────────────────────────────────────────────
  const [showFeModal, setShowFeModal] = useState(false)
  const [feLabel, setFeLabel] = useState('')
  const [feAmount, setFeAmount] = useState('')
  const [feDay, setFeDay] = useState('')
  const [editingFeId, setEditingFeId] = useState<string | null>(null)

  const startEditFe = (f: FixedExpense) => {
    setEditingFeId(f.id)
    setFeLabel(f.label)
    setFeAmount(f.amount.toString())
    setFeDay(f.day === 99 ? '말일' : f.day.toString())
  }

  const handleSaveFe = (e: React.FormEvent) => {
    e.preventDefault()
    const amt = parseInt(feAmount.replace(/,/g, ''), 10)
    const day = feDay === '말일' ? 99 : parseInt(feDay, 10)
    if (!feLabel.trim() || isNaN(amt) || isNaN(day) || (day !== 99 && (day < 1 || day > 31))) return
    
    if (editingFeId) {
      updateFixedExpense(editingFeId, { label: feLabel.trim(), amount: amt, day, category: classifyLedgerCategory(feLabel.trim(), 'expense', expenseCategories) })
      setEditingFeId(null)
    } else {
      addFixedExpense(feLabel.trim(), amt, day, classifyLedgerCategory(feLabel.trim(), 'expense', expenseCategories))
    }
    setFeLabel('')
    setFeAmount('')
    setFeDay('')
  }

  const uniqueCategories = useMemo(() => {
    const cats = new Set<string>()
    monthEntries.forEach(e => cats.add(e.category))
    return Array.from(cats).sort()
  }, [monthEntries])

  if (!isPrivateUnlocked) {
    return <PinScreen />
  }

  return (
    <div className="flex h-full w-full bg-white overflow-hidden relative">
      {/* ── Left Panel (~30%) ────────────────────────────────────────────── */}
      <aside className="w-[30%] min-w-[320px] max-w-[400px] border-r border-yuri-100 bg-yuri-50/30 flex flex-col shrink-0 h-full">
        <header className="shrink-0 flex flex-col border-b border-yuri-100 bg-white px-6 py-4 gap-3">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-bold text-yuri-900 tracking-tight">가계부</h1>
            <button
              onClick={lockPrivate}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-yuri-500 hover:bg-yuri-100 rounded-lg transition-colors cursor-pointer"
            >
              <Lock size={14} />
              잠금
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto relative z-0 flex flex-col">
          {/* Month Navigator */}
          <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-yuri-100">
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
          </div>
          
          {showPicker && (
            <div className="absolute top-[72px] left-0 w-full bg-white border-b border-yuri-200 shadow-lg p-4 z-50 animate-fade-in">
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

          {/* Totals Summary */}
          <div className="p-6 bg-white border-b border-yuri-100 flex flex-col gap-4 shrink-0">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-yuri-500">총 수입</span>
              <span className="text-sm font-bold text-teal-500">{totalIncome > 0 ? `+${fmtAmt(totalIncome)}` : '0원'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-yuri-500">총 지출</span>
              <span className="text-sm font-bold text-rose-400">{totalExpense > 0 ? `-${fmtAmt(totalExpense)}` : '0원'}</span>
            </div>
            <div className="pt-3 border-t border-yuri-100 flex justify-between items-center">
              <span className="text-sm font-bold text-yuri-800">잔액</span>
              <span 
                className="text-[15px] font-extrabold" 
                style={{ color: '#3A3550' }}
              >
                {net >= 0 ? `+${fmtAmt(net)}` : `-${fmtAmt(Math.abs(net))}`}
              </span>
            </div>
          </div>

          <div className="flex-1" />

          {/* Fixed Expense Button */}
          <div className="p-6 border-t border-yuri-100 bg-white shrink-0">
            <button 
              onClick={() => setShowFeModal(true)}
              className="w-full py-2 bg-yuri-100 hover:bg-yuri-200 text-yuri-700 font-bold text-sm rounded-lg transition-colors border border-yuri-200"
            >
              고정지출 관리 ({fixedExpenses.length})
            </button>
          </div>
        </div>
      </aside>

      {/* ── Right Panel (~70%) ───────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col h-full bg-white relative min-w-0">
        
        {/* Filter Bar */}
        <header className="shrink-0 border-b border-yuri-100 flex flex-col gap-3 p-4 bg-white z-10 shadow-sm">
          <div className="flex items-center gap-4">
            <input
              type="text"
              placeholder="내역 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 max-w-[240px] bg-yuri-50 border border-yuri-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-accent transition-colors"
            />
            <div className="flex bg-yuri-100 p-0.5 rounded-lg shrink-0">
              {(['all', 'income', 'expense'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${filterType === t ? 'bg-white shadow-sm text-yuri-900' : 'text-yuri-500 hover:text-yuri-700'}`}
                >
                  {t === 'all' ? '전체' : t === 'income' ? '수입' : '지출'}
                </button>
              ))}
            </div>
            
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-yuri-50 border border-yuri-200 rounded-lg px-2 py-1.5 text-xs font-bold outline-none focus:border-accent text-yuri-700 cursor-pointer shrink-0"
            >
              <option value="all">카테고리 전체</option>
              {uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as any)}
              className="bg-yuri-50 border border-yuri-200 rounded-lg px-2 py-1.5 text-xs font-bold outline-none focus:border-accent text-yuri-700 cursor-pointer shrink-0 ml-auto"
            >
              <option value="newest">최신순</option>
              <option value="oldest">오래된순</option>
              <option value="highest">금액 높은순</option>
              <option value="lowest">금액 낮은순</option>
            </select>
          </div>
        </header>

        {/* Transaction List */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24">
          {displayEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-yuri-300">
              <span className="text-4xl opacity-50">💸</span>
              <p className="text-sm font-medium text-yuri-400">
                {ledger.length === 0 ? '기록된 내역이 없습니다.' : '조건에 맞는 내역이 없습니다.'}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-6 max-w-[760px]">
              {groups.map(g => (
                <section key={dayKey(g.date)} className="animate-fade-in">
                  <h3 className="text-xs font-bold text-yuri-500 mb-2 flex items-center gap-2">
                    {fmtDateHeader(g.date)}
                    <span className="text-[10px] font-medium text-yuri-400 bg-yuri-50 px-1.5 py-0.5 rounded-sm">
                      {g.entries.length}건
                    </span>
                  </h3>
                  
                  <div className="flex flex-col gap-1.5">
                    {g.entries.map(e => {
                      const isEditing = editingEntryId === e.id
                      return (
                        <div 
                          key={e.id} 
                          className={`
                            group flex flex-col p-3 rounded-xl border transition-all duration-150 relative cursor-pointer
                            ${isEditing ? 'bg-yuri-50 border-accent shadow-sm' : 'bg-transparent border-yuri-100 hover:border-yuri-300'}
                          `}
                        >
                          {isEditing ? (
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center gap-2">
                                <input
                                  autoFocus
                                  type="text"
                                  value={editInput}
                                  onChange={(ev) => setEditInput(ev.target.value)}
                                  onKeyDown={(ev) => handleEditKeyDown(ev, e)}
                                  className="flex-1 bg-white border border-yuri-200 rounded px-2 py-1.5 text-sm outline-none focus:border-accent"
                                />
                                <button onClick={(ev) => { ev.stopPropagation(); saveEdit(e); }} className="text-xs font-bold text-white bg-accent px-3 py-1.5 rounded hover:bg-accent/90">저장</button>
                                <button onClick={(ev) => { ev.stopPropagation(); setEditingEntryId(null); }} className="text-xs font-bold text-yuri-500 bg-yuri-100 px-3 py-1.5 rounded hover:bg-yuri-200">취소</button>
                              </div>
                              <input
                                type="text"
                                placeholder="메모 추가 (선택)"
                                value={editMemo}
                                onChange={(ev) => setEditMemo(ev.target.value)}
                                onKeyDown={(ev) => handleEditKeyDown(ev, e)}
                                className="w-full bg-white border border-yuri-200 rounded px-2 py-1.5 text-xs outline-none focus:border-accent"
                              />
                            </div>
                          ) : (
                            <div className="flex items-start justify-between gap-4" onClick={() => startEdit(e)}>
                              <div className="flex-1 min-w-0 flex flex-col gap-1">
                                <h4 className="text-sm font-bold text-yuri-900 truncate flex items-center gap-1.5">
                                  {e.label}
                                  {e.fixedExpenseId && <span className="text-[9px] bg-yuri-200 text-yuri-600 px-1 py-0.5 rounded font-bold uppercase shrink-0">고정</span>}
                                </h4>
                                {e.memo && (
                                  <p className="text-[12px] text-[#9CA3AF] mb-0.5 whitespace-pre-wrap leading-snug">{e.memo}</p>
                                )}
                                <div className="flex items-center gap-2">
                                  <div className="relative flex items-center justify-center shrink-0">
                                    <select
                                      value={e.category}
                                      onChange={(ev) => updateLedgerEntry(e.id, { category: ev.target.value })}
                                      onClick={(ev) => ev.stopPropagation()}
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
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-sm pointer-events-none ${getCatClasses(e.category).bg} ${getCatClasses(e.category).text}`}>
                                      {e.category}
                                    </span>
                                  </div>
                                  <button 
                                    onClick={(ev) => { ev.stopPropagation(); updateLedgerEntry(e.id, { paymentMethod: (e.paymentMethod || '카드') === '카드' ? '계좌이체' : '카드' }); }}
                                    className="shrink-0 w-14 text-[10px] font-bold py-0.5 rounded transition-colors text-center cursor-pointer bg-[#F1F0F5] text-[#6B7280] hover:bg-gray-200"
                                  >
                                    {e.paymentMethod || '카드'}
                                  </button>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-1 shrink-0" onClick={() => startEdit(e)}>
                                <span 
                                  className="text-sm font-black"
                                  style={{ color: e.type === 'income' ? '#3F9E7A' : '#D45D6E' }}
                                >
                                  {e.type === 'income' ? '+' : '-'}{fmtAmt(e.amount)}
                                </span>
                                <span className="text-[10px] text-yuri-400">
                                  {fmtCreatedAt(e.createdAt)}
                                </span>
                              </div>
                            </div>
                          )}

                          {!isEditing && (
                            <button
                              onClick={(ev) => { ev.stopPropagation(); deleteLedgerEntry(e.id); }}
                              aria-label="삭제"
                              className="absolute -top-2 -right-2 w-6 h-6 flex items-center justify-center rounded-full bg-white border border-yuri-200 text-yuri-400 opacity-0 group-hover:opacity-100 hover:text-red-500 hover:border-red-200 shadow-sm transition-all z-10"
                            >
                              <X size={12} strokeWidth={3} />
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* ── Fixed Expense Modal ────────────────────────────────────────────── */}
      {showFeModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-yuri-900/20 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col max-h-[80vh] overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-yuri-100 bg-yuri-50/50">
              <h2 className="text-base font-bold text-yuri-900">고정지출 관리</h2>
              <button onClick={() => setShowFeModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-yuri-200 text-yuri-500 transition-colors">
                <X size={18} />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto flex-1 bg-yuri-50/20">
              <form onSubmit={handleSaveFe} className="bg-white p-4 rounded-xl border border-yuri-200 mb-6 flex flex-col gap-3 shadow-sm">
                <h3 className="text-xs font-bold text-accent">{editingFeId ? '고정지출 수정' : '새 고정지출 추가'}</h3>
                <input
                  type="text" placeholder="항목명 (예: 넷플릭스)" value={feLabel} onChange={e => setFeLabel(e.target.value)}
                  className="w-full px-3 py-2 bg-yuri-50 border border-yuri-200 rounded-lg text-sm outline-none focus:border-accent"
                />
                <div className="flex gap-2">
                  <input
                    type="text" placeholder="매월 (일)" value={feDay} onChange={e => setFeDay(e.target.value)}
                    className="w-24 px-3 py-2 bg-yuri-50 border border-yuri-200 rounded-lg text-sm outline-none focus:border-accent"
                  />
                  <input
                    type="text" placeholder="금액" value={feAmount} onChange={e => {
                      const raw = e.target.value.replace(/[^0-9]/g, '')
                      setFeAmount(raw ? parseInt(raw, 10).toLocaleString('ko-KR') : '')
                    }}
                    className="flex-1 px-3 py-2 bg-yuri-50 border border-yuri-200 rounded-lg text-sm outline-none focus:border-accent"
                  />
                </div>
                <div className="flex gap-2 mt-1">
                  <button type="submit" disabled={!feLabel.trim() || !feAmount || !feDay} className="flex-1 py-2 bg-yuri-900 text-white text-sm font-bold rounded-lg hover:bg-yuri-800 transition-colors disabled:opacity-50">
                    {editingFeId ? '저장' : '추가'}
                  </button>
                  {editingFeId && (
                    <button type="button" onClick={() => { setEditingFeId(null); setFeLabel(''); setFeAmount(''); setFeDay(''); }} className="px-4 py-2 bg-white border border-yuri-200 text-yuri-600 text-sm font-bold rounded-lg hover:bg-yuri-50 transition-colors">
                      취소
                    </button>
                  )}
                </div>
              </form>

              <div className="flex flex-col gap-2">
                <h3 className="text-xs font-bold text-yuri-500 mb-1 ml-1">등록된 고정지출 목록</h3>
                {fixedExpenses.map(fe => (
                  <div key={fe.id} className={`group p-4 rounded-xl border ${editingFeId === fe.id ? 'border-accent bg-accent/5' : 'border-yuri-200 bg-white hover:border-yuri-300'} shadow-sm`}>
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: catColor(fe.category) }} />
                        <span className="text-sm font-bold text-yuri-900">{fe.label}</span>
                      </div>
                      <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => startEditFe(fe)} className="text-xs text-yuri-500 hover:text-accent font-bold">수정</button>
                        <button onClick={() => deleteFixedExpense(fe.id)} className="text-xs text-yuri-500 hover:text-red-500 font-bold">삭제</button>
                      </div>
                    </div>
                    <div className="flex justify-between items-center pl-4">
                      <span className="text-xs text-yuri-500 bg-yuri-100 px-2 py-0.5 rounded">매월 {fe.day === 99 ? '말일' : `${fe.day}일`}</span>
                      <span className="text-sm font-bold text-rose-400">-{fmtAmt(fe.amount)}</span>
                    </div>
                  </div>
                ))}
                {fixedExpenses.length === 0 && (
                  <p className="text-sm text-yuri-400 text-center py-8">등록된 고정 지출이 없습니다.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default LedgerPage
