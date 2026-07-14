import React, { useState } from 'react'
import type { LedgerEntry } from '../../types'
import { Trash2, MessageSquare, CreditCard, Banknote } from 'lucide-react'

export const EditRow = ({ 
  item, 
  expenseCategories, 
  onUpdate, 
  onDelete, 
  onCancel 
}: { 
  item: LedgerEntry, 
  expenseCategories: {name: string}[], 
  onUpdate: (id: string, updates: Partial<LedgerEntry>) => void, 
  onDelete: (id: string) => void, 
  onCancel: () => void 
}) => {
  const d = new Date(item.scheduledDate || item.createdAt)
  const [date, setDate] = useState(`${d.getMonth() + 1}/${d.getDate()}`)
  const [label, setLabel] = useState(item.label)
  const [amount, setAmount] = useState(item.amount.toLocaleString('ko-KR'))
  const [memo, setMemo] = useState(item.memo || '')
  const [category, setCategory] = useState(item.category || '기타')
  const [paymentMethod, setPaymentMethod] = useState<'카드' | '계좌이체'>(
    item.paymentMethod === '계좌이체' ? '계좌이체' : '카드'
  )

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
      memo: memo.trim(),
      category: category,
      paymentMethod: paymentMethod
    })
    onCancel()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    }
    if (e.key === 'Escape') onCancel()
  }

  const handleBlur = (e: React.FocusEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      handleSave()
    }
  }

  return (
    <div 
      className="flex flex-col gap-2 p-3 bg-white rounded-lg shadow-[0_2px_10px_rgba(0,0,0,0.06)] border border-accent/20 z-10 my-1 animate-fade-in"
      onBlur={handleBlur}
    >
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2 overflow-hidden flex-1">
          <input spellCheck={false} 
            className="text-[11px] font-semibold text-accent w-8 shrink-0 bg-transparent outline-none border-b border-accent/30 focus:border-accent"
            value={date} onChange={e => setDate(e.target.value)} onKeyDown={handleKeyDown} autoFocus
          />
          <input spellCheck={false}
            className="text-[13px] font-bold text-gray-900 flex-1 bg-transparent outline-none border-b border-gray-300 focus:border-gray-500"
            value={label} onChange={e => setLabel(e.target.value)} onKeyDown={handleKeyDown}
          />
        </div>
        <div className="flex items-center gap-2 ml-2">
          <input spellCheck={false}
            className="text-[13px] font-bold text-gray-900 w-16 text-right bg-transparent outline-none border-b border-gray-300 focus:border-gray-500"
            value={amount} onChange={e => {
              const raw = e.target.value.replace(/[^0-9]/g, '')
              setAmount(raw ? parseInt(raw, 10).toLocaleString('ko-KR') : '')
            }} onKeyDown={handleKeyDown}
          />
        </div>
      </div>
      <div className="flex items-center gap-2 mt-1">
        <select 
          className="text-[11px] font-bold text-gray-500 bg-gray-50 border border-gray-200 rounded px-1 py-0.5 outline-none focus:border-accent"
          value={category}
          onChange={e => setCategory(e.target.value)}
          onKeyDown={handleKeyDown}
        >
          {expenseCategories.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
          <option value="기타">기타</option>
        </select>
        
        <button 
          onClick={() => setPaymentMethod(p => p === '카드' ? '계좌이체' : '카드')}
          className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors border ${
            paymentMethod === '카드' 
              ? 'bg-blue-50 text-blue-600 border-blue-200' 
              : 'bg-emerald-50 text-emerald-600 border-emerald-200'
          }`}
          title="클릭하여 결제수단 변경"
        >
          {paymentMethod === '카드' ? <CreditCard size={10} /> : <Banknote size={10} />}
          {paymentMethod === '카드' ? '카드' : '현금'}
        </button>

        <MessageSquare size={12} className="text-gray-400 shrink-0 ml-1" />
        <input spellCheck={false}
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
