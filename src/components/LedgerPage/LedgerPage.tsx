import React, { useState, useMemo, useEffect, useRef } from 'react'
import type { FixedExpense } from '../../types'
import { useAppStore } from '../../store/AppStore'
import { classifyLedgerCategory } from '../../utils/parser'
import PinScreen from '../JournalPage/PinScreen'
import { Lock, X } from 'lucide-react'
import CardTab from './CardTab'
import CashTab from './CashTab'

// ── Constants ─────────────────────────────────────────────────────────────────
const MONTH_KO = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'] as const

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

// ── Component ─────────────────────────────────────────────────────────────────
const LedgerPage: React.FC = () => {
  const { 
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

  // ── Tabs ──────────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'cash' | 'card'>('cash')

  // ── Month Picker ─────────────────────────────────────────────────────────────
  const [showPicker, setShowPicker] = useState(false)
  const [pickerYear, setPickerYear] = useState(year)

  const handleMonthSelect = (m: number) => {
    setView(new Date(pickerYear, m, 1))
    setShowPicker(false)
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


  if (!isPrivateUnlocked) {
    return <PinScreen />
  }

  return (
    <div className="flex flex-col h-full w-full bg-white overflow-hidden relative">
      {/* ── Top Header ────────────────────────────────────────────── */}
      <header className="shrink-0 flex flex-col border-b border-yuri-100 bg-white relative z-10">
        <div className="flex justify-between items-center px-6 pt-4 pb-0">
          <div className="flex items-center gap-8">
            <h1 className="text-xl font-bold text-yuri-900 tracking-tight">가계부</h1>
            
            <div className="flex gap-4">
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
          </div>

          <div className="flex items-center gap-6 pb-2">
            {/* Month Navigator */}
            <div className="flex items-center gap-4">
              <button onClick={prevMonth} className="text-yuri-400 hover:text-yuri-800 transition-colors flex items-center justify-center">←</button>
              <div className="flex flex-col items-center relative">
                <button 
                  onClick={() => { setPickerYear(year); setShowPicker(!showPicker); }}
                  className="text-base font-bold text-yuri-900 hover:text-accent transition-colors flex items-center gap-1"
                >
                  {year}년 {MONTH_KO[month]}
                  <span className="text-[10px] text-yuri-400">{showPicker ? '▲' : '▼'}</span>
                </button>
                {!isCurrentMonth && <button onClick={goToday} className="absolute top-full mt-1 text-[10px] text-accent font-semibold hover:underline whitespace-nowrap">이번 달로 이동</button>}
              </div>
              <button onClick={nextMonth} className="text-yuri-400 hover:text-yuri-800 transition-colors flex items-center justify-center">→</button>
            </div>

            <button
              onClick={lockPrivate}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-yuri-500 hover:bg-yuri-100 rounded-lg transition-colors cursor-pointer"
            >
              <Lock size={14} />
              잠금
            </button>
          </div>
        </div>

        {showPicker && (
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-[320px] bg-white border border-yuri-200 shadow-xl p-4 rounded-xl z-50 animate-fade-in">
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

      {/* ── Main Content Area ─────────────────────────────────────────────── */}
      {activeTab === 'cash' ? (
        <CashTab year={year} month={month} onOpenFixedExpense={() => setShowFeModal(true)} />
      ) : (
        <CardTab year={year} month={month} />
      )}

      {/* ── Fixed Expense Modal ────────────────────────────────────────────── */}
      {showFeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-[400px] max-h-[85vh] flex flex-col animate-slide-up relative">
            <header className="px-6 py-4 border-b border-yuri-100 flex justify-between items-center bg-yuri-50 rounded-t-2xl shrink-0 z-20">
              <h3 className="font-bold text-yuri-900">{editingFeId ? '고정지출 수정' : '고정지출 등록'}</h3>
              <button onClick={() => { setShowFeModal(false); setEditingFeId(null); }} className="text-yuri-400 hover:text-yuri-900 transition-colors">
                <X size={20} />
              </button>
            </header>
            
            <div className="p-4 border-b border-yuri-100 bg-yuri-50/20 shrink-0 z-10">
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

            <div className="p-4 overflow-y-auto flex-1 bg-yuri-50/20 rounded-b-2xl">
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
