import React, { useState, useMemo, useEffect, useRef } from 'react'
import type { LedgerEntry, FixedExpense } from '../../types'
import { useAppStore } from '../../store/AppStore'
import { parseCapture, classifyLedgerCategory } from '../../utils/parser'
import PinScreen from '../JournalPage/PinScreen'
import { Lock, X } from 'lucide-react'
import CardTab from './CardTab'

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

function getCategoryOptions(type: 'income' | 'expense', currentCat: string, expenseCats: { name: string }[]) {
  if (type === 'expense') {
    const list = expenseCats.map(c => c.name);
    if (!list.includes('기타')) list.push('기타');
    if (currentCat && !list.includes(currentCat) && currentCat !== '기타') list.push(currentCat);
    return list;
  } else {
    const list = ['급여', '용돈', '이자/배당', '환급', '기타수입'];
    if (currentCat && !list.includes(currentCat)) list.push(currentCat);
    return list;
  }
}

function CategoryDropdown({ 
  value, 
  onChange, 
  options, 
  fallbackText 
}: { 
  value: string; 
  onChange: (val: string) => void; 
  options: string[]; 
  fallbackText?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const classes = value ? getCatClasses(value) : { bg: 'bg-yuri-100', text: 'text-yuri-500' };

  return (
    <div className="relative inline-block" ref={containerRef}>
      <div 
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-sm cursor-pointer select-none ${classes.bg} ${classes.text}`}
      >
        {value || fallbackText}
      </div>
      
      {isOpen && (
        <div 
          className="absolute left-0 top-full mt-1 min-w-[140px] bg-[#FAFBFF] rounded-[10px] shadow-lg border border-yuri-200 z-[9999] flex flex-col py-2"
          onClick={(e) => e.stopPropagation()}
        >
          {options.map(opt => {
            const optClasses = getCatClasses(opt);
            return (
              <div 
                key={opt}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(opt);
                  setIsOpen(false);
                }}
                className="px-4 py-2.5 hover:bg-yuri-100/50 cursor-pointer flex items-center transition-colors"
              >
                <span className={`text-[11px] font-bold px-2 py-1 rounded-sm ${optClasses.bg} ${optClasses.text}`}>
                  {opt}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
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
    expenseCategories, isPrivateUnlocked, lockPrivate,
    cardBills, updateCardBill,
    cardBillingStartDay, cardBillingEndDay
  } = useAppStore()

  const today = useMemo(() => new Date(), [])
  const [view, setView] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))

  const year  = view.getFullYear()
  const month = view.getMonth()

  const prevMonth = () => setView(new Date(year, month - 1, 1))
  const nextMonth = () => setView(new Date(year, month + 1, 1))
  const goToday   = () => setView(new Date(today.getFullYear(), today.getMonth(), 1))

  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth()

  // ── Tabs ──────────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'cash' | 'card'>('cash')

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

  // ── Card Billing Logic ──────────────────────────────────────────────────────
  const billingEnd = useMemo(() => new Date(year, month - 1, cardBillingEndDay, 23, 59, 59), [year, month, cardBillingEndDay]);
  const billingStart = useMemo(() => new Date(year, month - 2, cardBillingStartDay, 0, 0, 0), [year, month, cardBillingStartDay]);
  
  const cardBillEntries = useMemo(() => {
    return ledger.filter(e => {
      if (e.paymentMethod !== '카드' || e.type !== 'expense') return false;
      const d = new Date(e.scheduledDate || e.createdAt);
      return d.getTime() >= billingStart.getTime() && d.getTime() <= billingEnd.getTime();
    }).sort((a, b) => new Date(b.scheduledDate || b.createdAt).getTime() - new Date(a.scheduledDate || a.createdAt).getTime());
  }, [ledger, billingStart, billingEnd]);

  const expectedCardBill = cardBillEntries.reduce((sum, e) => sum + e.amount, 0);
  
  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
  const actualCardBill = cardBills[monthKey];
  const hasActualBill = typeof actualCardBill?.amount === 'number';
  const [showBillDetails, setShowBillDetails] = useState(false);

  const [actualBillInput, setActualBillInput] = useState<string>('');

  useEffect(() => {
    setActualBillInput(hasActualBill ? actualCardBill.amount.toLocaleString('ko-KR') : '');
    setShowBillDetails(false);
  }, [monthKey, hasActualBill, actualCardBill]);

  const handleActualBillChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/,/g, '');
    if (!/^\d*$/.test(raw)) return;
    if (raw === '') {
      setActualBillInput('');
      return;
    }
    setActualBillInput(parseInt(raw, 10).toLocaleString('ko-KR'));
  };

  const handleActualBillBlur = () => {
    if (actualBillInput.trim() === '') {
      return;
    }
    const val = parseInt(actualBillInput.replace(/,/g, ''), 10);
    if (!isNaN(val)) {
      updateCardBill(monthKey, { amount: val });
      setActualBillInput(val.toLocaleString('ko-KR'));
    }
  };

  // ── Computed Totals ─────────────────────────────────────────────────────────
  const totalIncome  = monthEntries.filter(e => e.type === 'income' ).reduce((s, e) => s + e.amount, 0)
  const totalExpense = monthEntries.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0)
  const transferExpense = monthEntries.filter(e => e.type === 'expense' && e.paymentMethod === '계좌이체').reduce((s, e) => s + e.amount, 0)
  
  const net = totalIncome - transferExpense - (hasActualBill ? actualCardBill.amount : expectedCardBill)

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
  const [editingDateId, setEditingDateId] = useState<string | null>(null)
  const [editInput, setEditInput] = useState('')
  const [editMemo, setEditMemo] = useState('')

  const startEdit = (entry: LedgerEntry) => {
    setEditingEntryId(entry.id)
    
    let input = entry.label;
    const cleanLabel = input.replace(/,/g, '');
    const amtStr = entry.amount.toString();
    
    if (!cleanLabel.includes(amtStr)) {
       input = `${input} ${entry.type === 'income' ? '+' : ''}${entry.amount}원`;
    } else if (entry.type === 'income' && !input.includes('+')) {
       input = input.replace(new RegExp(`(${entry.amount.toLocaleString('ko-KR')}|${entry.amount})`), '+$1');
    }
    
    setEditInput(input)
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
        memo: editMemo.trim()
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
  const [fePaymentMethod, setFePaymentMethod] = useState<'카드' | '계좌이체'>('카드')
  const [feCategory, setFeCategory] = useState<string>('')
  const [editingFeId, setEditingFeId] = useState<string | null>(null)

  const startEditFe = (f: FixedExpense) => {
    setEditingFeId(f.id)
    setFeLabel(f.label)
    setFeAmount(f.amount.toString())
    setFeDay(f.day === 99 ? '말일' : f.day.toString())
    setFePaymentMethod(f.paymentMethod || '카드')
    setFeCategory(f.category || '')
  }

  const handleSaveFe = (e: React.FormEvent) => {
    e.preventDefault()
    const amt = parseInt(feAmount.replace(/,/g, ''), 10)
    const day = feDay === '말일' ? 99 : parseInt(feDay, 10)
    if (!feLabel.trim() || isNaN(amt) || isNaN(day) || (day !== 99 && (day < 1 || day > 31))) return
    
    const finalCategory = feCategory || classifyLedgerCategory(feLabel.trim(), 'expense', expenseCategories)
    
    if (editingFeId) {
      updateFixedExpense(editingFeId, { label: feLabel.trim(), amount: amt, day, category: finalCategory, paymentMethod: fePaymentMethod })
      setEditingFeId(null)
    } else {
      addFixedExpense(feLabel.trim(), amt, day, finalCategory, fePaymentMethod)
    }
    setFeLabel('')
    setFeAmount('')
    setFeDay('')
    setFePaymentMethod('카드')
    setFeCategory('')
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
        <header className="shrink-0 flex flex-col border-b border-yuri-100 bg-white px-6 pt-4 gap-3">
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
          
          <div className="flex gap-4 border-b border-transparent">
            <button 
              onClick={() => setActiveTab('cash')}
              className={`pb-3 px-1 text-sm font-bold transition-colors border-b-2 ${
                activeTab === 'cash' ? 'text-yuri-900 border-yuri-900' : 'text-yuri-400 border-transparent hover:text-yuri-600'
              }`}
            >
              현금/계좌
            </button>
            <button 
              onClick={() => setActiveTab('card')}
              className={`pb-3 px-1 text-sm font-bold transition-colors border-b-2 ${
                activeTab === 'card' ? 'text-yuri-900 border-yuri-900' : 'text-yuri-400 border-transparent hover:text-yuri-600'
              }`}
            >
              카드
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
              <span className="text-xs font-bold text-yuri-500">총 지출 (카테고리 기준)</span>
              <span className="text-sm font-bold text-rose-400">{totalExpense > 0 ? `-${fmtAmt(totalExpense)}` : '0원'}</span>
            </div>
            
            <div className="bg-yuri-50 rounded-xl p-4 flex flex-col gap-3 mt-2 border border-yuri-100">
              <div 
                className="flex flex-col cursor-pointer group"
                onClick={() => setShowBillDetails(!showBillDetails)}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-yuri-600 flex items-center gap-1">
                    카드값 청구 예정액
                    <span className="text-[10px] text-yuri-400 group-hover:text-accent transition-colors">{showBillDetails ? '▲' : '▼'}</span>
                  </span>
                  <span className="text-sm font-bold text-yuri-900">{fmtAmt(expectedCardBill)}</span>
                </div>
                <span className="text-[10px] text-yuri-400">
                  {billingStart.getFullYear()}년 {billingStart.getMonth() + 1}월 {billingStart.getDate()}일 ~ {billingEnd.getFullYear()}년 {billingEnd.getMonth() + 1}월 {billingEnd.getDate()}일 사용분
                </span>
              </div>
              
              {showBillDetails && (
                <div className="flex flex-col gap-2 pt-2 border-t border-yuri-200 max-h-32 overflow-y-auto">
                  {cardBillEntries.length === 0 ? (
                    <div className="text-[11px] text-yuri-400 text-center py-2">청구 내역이 없습니다.</div>
                  ) : (
                    cardBillEntries.map(e => (
                      <div key={e.id} className="flex justify-between items-center text-[11px]">
                        <span className="text-yuri-500 truncate mr-2 flex-1">{new Date(e.scheduledDate || e.createdAt).getDate()}일 {e.label}</span>
                        <span className="text-yuri-700 font-bold">{fmtAmt(e.amount)}</span>
                      </div>
                    ))
                  )}
                </div>
              )}

              <div className="flex flex-col gap-1.5 pt-3 border-t border-yuri-200">
                <span className="text-xs font-bold text-yuri-600">실제 청구액 입력</span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={actualBillInput}
                    onChange={handleActualBillChange}
                    onBlur={handleActualBillBlur}
                    placeholder="실제 금액 (미입력시 예정액 적용)"
                    className="flex-1 px-3 py-1.5 bg-white border border-yuri-200 rounded text-xs outline-none focus:border-accent text-right"
                  />
                  <span className="text-xs font-bold text-yuri-700">원</span>
                </div>
                {hasActualBill && (
                  <span className="text-[10px] text-accent mt-0.5 text-right font-bold">
                    예정 {fmtAmt(expectedCardBill)} / 실제 {fmtAmt(actualCardBill.amount)}
                  </span>
                )}
              </div>
            </div>

            <div className="pt-3 flex flex-col gap-1 border-t border-yuri-100">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-yuri-800">잔액</span>
                <span 
                  className="text-[15px] font-extrabold" 
                  style={{ color: '#3A3550' }}
                >
                  {net >= 0 ? `+${fmtAmt(net)}` : `-${fmtAmt(Math.abs(net))}`}
                </span>
              </div>
              <span className="text-[10px] text-yuri-400 text-right mt-1">실제 카드 청구액 기준으로 계산돼요</span>
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

      {/* ── Main Content Area ─────────────────────────────────────────────── */}
      {activeTab === 'cash' ? (
        <main className="flex-1 flex flex-col h-full bg-white relative min-w-0">
          <header className="shrink-0 h-16 border-b border-yuri-100 flex items-center justify-between px-8 bg-white">
            {/* 필터 그룹 */}         
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
                        const isEditingDate = editingDateId === e.id
                        return (
                          <div 
                            key={e.id} 
                            className={`
                              group flex flex-col p-3 rounded-xl border transition-all duration-150 relative cursor-pointer
                              ${isEditing ? 'bg-yuri-50 border-accent shadow-sm' : isEditingDate ? 'bg-yuri-50/50 border-blue-400 ring-1 ring-blue-400 shadow-sm' : 'bg-transparent border-yuri-100 hover:border-yuri-300'}
                            `}
                          >
                            {isEditing ? (
                              <div 
                                className="flex flex-col gap-2"
                                onBlur={(ev) => {
                                  if (!ev.currentTarget.contains(ev.relatedTarget as Node)) {
                                    saveEdit(e);
                                  }
                                }}
                              >
                                <div className="flex items-center gap-2">
                                  <input
                                    autoFocus
                                    type="text"
                                    value={editInput}
                                    onChange={(ev) => setEditInput(ev.target.value)}
                                    onKeyDown={(ev) => handleEditKeyDown(ev, e)}
                                    className="flex-1 bg-white border border-yuri-200 rounded px-2 py-1.5 text-sm outline-none focus:border-accent"
                                  />
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
                                      <CategoryDropdown
                                        value={e.category}
                                        onChange={(val) => updateLedgerEntry(e.id, { category: val })}
                                        options={getCategoryOptions(e.type, e.category, expenseCategories)}
                                      />
                                    </div>
                                    <button 
                                      onClick={(ev) => { ev.stopPropagation(); updateLedgerEntry(e.id, { paymentMethod: (e.paymentMethod || '카드') === '카드' ? '계좌이체' : '카드' }); }}
                                      className="shrink-0 w-14 text-[10px] font-bold py-0.5 rounded transition-colors text-center cursor-pointer bg-[#F1F0F5] text-[#6B7280] hover:bg-gray-200"
                                    >
                                      {e.paymentMethod || '카드'}
                                    </button>
                                  </div>
                                </div>
                                <div className="flex flex-col items-end gap-1 shrink-0">
                                  <span 
                                    className="text-sm font-black cursor-pointer hover:opacity-80"
                                    onClick={(ev) => { ev.stopPropagation(); startEdit(e); }}
                                    style={{ color: e.type === 'income' ? '#3F9E7A' : '#D45D6E' }}
                                  >
                                    {e.type === 'income' ? '+' : '-'}{fmtAmt(e.amount)}
                                  </span>
                                  <div className="relative inline-block cursor-pointer" onClick={(ev) => ev.stopPropagation()}>
                                    <span className="text-[10px] text-yuri-400 hover:text-accent font-medium">
                                      {fmtCreatedAt(e.scheduledDate || e.createdAt)}
                                    </span>
                                    <input 
                                      type="date"
                                      value={dayKey(new Date(e.scheduledDate || e.createdAt))}
                                      onChange={(ev) => {
                                        const newD = new Date(ev.target.value);
                                        const oldD = new Date(e.scheduledDate || e.createdAt);
                                        newD.setHours(oldD.getHours(), oldD.getMinutes(), oldD.getSeconds());
                                        updateLedgerEntry(e.id, { scheduledDate: newD.toISOString() });
                                      }}
                                      onFocus={() => setEditingDateId(e.id)}
                                      onBlur={() => setEditingDateId(null)}
                                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                  </div>
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
      ) : (
        <CardTab year={year} month={month} />
      )}

      {/* ── Fixed Expense Modal ────────────────────────────────────────────── */}
      {showFeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-[400px] overflow-hidden flex flex-col animate-slide-up">
            <header className="px-6 py-4 border-b border-yuri-100 flex justify-between items-center bg-yuri-50">
              <h3 className="font-bold text-yuri-900">{editingFeId ? '고정지출 수정' : '고정지출 등록'}</h3>
              <button onClick={() => { setShowFeModal(false); setEditingFeId(null); }} className="text-yuri-400 hover:text-yuri-900 transition-colors">
                <X size={20} />
              </button>
            </header>
            
            <div className="p-4 border-b border-yuri-100 bg-yuri-50/20 shrink-0">
              <form onSubmit={handleSaveFe} className="bg-white p-4 rounded-xl border border-yuri-200 flex flex-col gap-3 shadow-sm">
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
                <div className="flex items-center gap-2">
                  <div className="relative flex items-center justify-center shrink-0">
                    <CategoryDropdown
                      value={feCategory}
                      onChange={setFeCategory}
                      options={getCategoryOptions('expense', feCategory, expenseCategories)}
                      fallbackText="카테고리 (자동)"
                    />
                  </div>
                  <button 
                    type="button"
                    onClick={() => setFePaymentMethod(fePaymentMethod === '카드' ? '계좌이체' : '카드')}
                    className="shrink-0 text-[10px] font-bold px-2 py-1 rounded transition-colors text-center cursor-pointer bg-[#F1F0F5] text-[#6B7280] hover:bg-gray-200"
                  >
                    {fePaymentMethod}
                  </button>
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
            </div>

            <div className="p-4 overflow-y-auto flex-1 bg-yuri-50/20">
              <div className="flex flex-col gap-2">
                <h3 className="text-xs font-bold text-yuri-500 mb-1 ml-1">등록된 고정지출 목록</h3>
                {fixedExpenses.map(fe => (
                  <div key={fe.id} className={`group p-4 rounded-xl border ${editingFeId === fe.id ? 'border-accent bg-accent/5' : 'border-yuri-200 bg-white hover:border-yuri-300'} shadow-sm`}>
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${getCatClasses(fe.category).text.replace('text-', 'bg-')}`} />
                        <span className="text-sm font-bold text-yuri-900">{fe.label}</span>
                      </div>
                      <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => startEditFe(fe)} className="text-xs text-yuri-500 hover:text-accent font-bold">수정</button>
                        <button onClick={() => deleteFixedExpense(fe.id)} className="text-xs text-yuri-500 hover:text-red-500 font-bold">삭제</button>
                      </div>
                    </div>
                    <div className="flex justify-between items-center pl-4 mt-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-yuri-500 bg-yuri-100 px-2 py-0.5 rounded">매월 {fe.day === 99 ? '말일' : `${fe.day}일`}</span>
                        <span className="text-[10px] font-bold bg-[#F1F0F5] text-[#6B7280] px-1.5 py-0.5 rounded">{fe.paymentMethod || '카드'}</span>
                      </div>
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
