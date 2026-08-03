import React, { useState, useEffect } from 'react'
import { format } from 'date-fns'
import MiniCalendarPicker from './MiniCalendarPicker'
import { classifyLedgerCategory, getCategoryColor } from '../../utils/parser'
import { useAppStore } from '../../store/AppStore'
import type { LedgerEntry } from '../../types'

interface MobileLedgerInputSheetProps {
  isOpen: boolean
  onClose: () => void
  initialEntry?: LedgerEntry | null
}

const MobileLedgerInputSheet: React.FC<MobileLedgerInputSheetProps> = ({ isOpen, onClose, initialEntry }) => {
  const { addLedgerEntry, updateLedgerEntry, expenseCategories } = useAppStore()
  
  const [date, setDate] = useState<Date>(new Date())
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)
  const [amountStr, setAmountStr] = useState('')
  const [description, setDescription] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'카드' | '계좌이체'>('카드')
  const [category, setCategory] = useState<string>('기타')
  const [memo, setMemo] = useState('')
  const [isManualCategory, setIsManualCategory] = useState(false)
  const [isCategoryPickerOpen, setIsCategoryPickerOpen] = useState(false)

  // History API for back button
  useEffect(() => {
    if (isOpen) {
      window.history.pushState({ sheet: 'ledgerInput' }, '')
      
      const handlePopState = () => {
        onClose()
      }
      window.addEventListener('popstate', handlePopState)
      return () => window.removeEventListener('popstate', handlePopState)
    }
  }, [isOpen, onClose])

  const handleClose = () => {
    if (window.history.state?.sheet === 'ledgerInput') {
      window.history.back()
    }
    onClose()
  }

  // Pre-fill on open if initialEntry is provided
  useEffect(() => {
    if (isOpen && initialEntry) {
      setDate(initialEntry.scheduledDate ? new Date(initialEntry.scheduledDate) : new Date(initialEntry.createdAt))
      setAmountStr(initialEntry.amount.toString())
      setDescription(initialEntry.label)
      setCategory(initialEntry.category)
      setMemo(initialEntry.memo || '')
      setIsManualCategory(true)
      if (initialEntry.paymentMethod === '계좌이체') {
        setPaymentMethod('계좌이체')
      } else {
        setPaymentMethod('카드')
      }
    } else if (isOpen) {
      // Reset if no initial entry
      setDate(new Date())
      setAmountStr('')
      setDescription('')
      setMemo('')
      setCategory('기타')
      setIsManualCategory(false)
      setPaymentMethod('카드')
    }
  }, [isOpen, initialEntry])

  // Auto category assignment
  useEffect(() => {
    if (!isManualCategory && description.trim()) {
      const detected = classifyLedgerCategory(description.trim(), 'expense', expenseCategories)
      setCategory(detected)
    } else if (!isManualCategory && !description.trim()) {
      setCategory('기타')
    }
  }, [description, isManualCategory, expenseCategories])

  const handleNumClick = (num: string) => {
    setAmountStr(prev => {
      if (prev === '0' && num !== '00') return num
      if (prev === '0' && num === '00') return '0'
      const next = prev + num
      if (next.length > 12) return prev // Max 12 digits
      return next
    })
  }

  const handleDelete = () => {
    setAmountStr(prev => prev.slice(0, -1))
  }

  const handleSave = () => {
    if (!amountStr || parseInt(amountStr, 10) === 0) {
      alert('금액을 입력해주세요.')
      return
    }
    
    if (initialEntry) {
      updateLedgerEntry(initialEntry.id, {
        label: description.trim() || category,
        amount: parseInt(amountStr, 10),
        category: category,
        scheduledDate: date.toISOString(),
        paymentMethod: paymentMethod,
        memo: memo.trim() || undefined
      })
    } else {
      addLedgerEntry(
        description.trim() || category,
        parseInt(amountStr, 10),
        'expense',
        category,
        date.toISOString(),
        paymentMethod,
        memo.trim() || undefined
      )
    }
    
    handleClose()
  }

  if (!isOpen) return null

  const displayAmount = amountStr ? parseInt(amountStr, 10).toLocaleString('ko-KR') : '0'

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl flex flex-col max-h-[90dvh] animate-in slide-in-from-bottom-full duration-300">
        <div className="flex-1 overflow-y-auto overscroll-none pb-safe">
          <div className="p-6 pb-2">
            {/* Header / Date / Payment Toggle */}
            <div className="flex items-center justify-between mb-6">
              <button 
                type="button" 
                onClick={() => setIsDatePickerOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-yuri-50 rounded-xl text-yuri-600 font-bold hover:bg-yuri-100 transition-colors"
              >
                📅 {format(date, 'M월 d일')}
              </button>

              <div className="flex items-center bg-yuri-50 rounded-xl p-1">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('카드')}
                  className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-colors ${paymentMethod === '카드' ? 'bg-white text-accent shadow-sm' : 'text-yuri-400'}`}
                >
                  카드
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('계좌이체')}
                  className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-colors ${paymentMethod === '계좌이체' ? 'bg-white text-accent shadow-sm' : 'text-yuri-400'}`}
                >
                  계좌이체
                </button>
              </div>
            </div>

            {/* Display Amount */}
            <div className="text-right mb-6">
              <span className="text-sm font-bold text-yuri-400 block mb-1">지출 금액</span>
              <div className="text-4xl font-bold text-yuri-900 break-all">
                {displayAmount} <span className="text-2xl font-semibold text-yuri-500">원</span>
              </div>
            </div>

            {/* Description & Category */}
            <div className="flex items-center gap-3 mb-6">
              <button
                type="button"
                onClick={() => setIsCategoryPickerOpen(true)}
                className="shrink-0 px-3 py-2 rounded-xl text-sm font-bold shadow-sm transition-transform active:scale-95"
                style={{ backgroundColor: getCategoryColor(category, expenseCategories), color: '#333' }}
              >
                {category} {isManualCategory ? '🔒' : '✨'}
              </button>
              <input
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="어디에 쓰셨나요?"
                className="flex-1 bg-yuri-50 border-none rounded-xl px-4 py-3 text-base text-yuri-900 outline-none focus:ring-2 focus:ring-accent/20"
                autoComplete="off"
                spellCheck="false"
              />
            </div>
            
            {/* Memo */}
            <div className="flex items-center gap-3 mb-6">
              <span className="shrink-0 px-3 py-2 w-[54px] text-center text-sm">💬</span>
              <input
                type="text"
                value={memo}
                onChange={e => setMemo(e.target.value)}
                placeholder="메모를 입력하세요"
                className="flex-1 bg-yuri-50 border-none rounded-xl px-4 py-3 text-sm text-yuri-900 outline-none focus:ring-2 focus:ring-accent/20"
                autoComplete="off"
                spellCheck="false"
              />
            </div>

            {/* Custom Numpad */}
            <div className="grid grid-cols-3 gap-2 mt-4">
              {['1','2','3','4','5','6','7','8','9','00','0'].map(num => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleNumClick(num)}
                  className="bg-yuri-50 hover:bg-yuri-100 active:bg-yuri-200 py-4 rounded-2xl text-2xl font-medium text-yuri-900 transition-colors"
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onClick={handleDelete}
                className="bg-yuri-50 hover:bg-yuri-100 active:bg-yuri-200 py-4 rounded-2xl text-2xl font-medium text-yuri-900 transition-colors flex items-center justify-center"
              >
                ⌫
              </button>
            </div>
          </div>
        </div>

        {/* Save Button Fixed at Bottom */}
        <div className="p-4 border-t border-yuri-100 bg-white shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={handleSave}
            disabled={!amountStr || parseInt(amountStr, 10) === 0}
            className="w-full py-4 bg-accent text-white font-bold text-lg rounded-2xl shadow-md hover:bg-accent/90 active:bg-accent/80 disabled:opacity-50 disabled:shadow-none transition-all"
          >
            저장하기
          </button>
        </div>
      </div>

      <MiniCalendarPicker
        isOpen={isDatePickerOpen}
        onClose={() => setIsDatePickerOpen(false)}
        selectedDate={date}
        onSelectDate={setDate}
      />

      {/* Category Picker Overlay */}
      {isCategoryPickerOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm" onClick={() => setIsCategoryPickerOpen(false)}>
          <div className="bg-white rounded-3xl w-full max-w-xs shadow-xl p-6 animate-in fade-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-yuri-900 mb-4">카테고리 선택</h3>
            <div className="flex flex-wrap gap-2">
              {expenseCategories.map(cat => (
                <button
                  key={cat.name}
                  onClick={() => {
                    setCategory(cat.name)
                    setIsManualCategory(true)
                    setIsCategoryPickerOpen(false)
                  }}
                  className="px-3 py-2 rounded-xl text-sm font-bold text-yuri-900 shadow-sm"
                  style={{ backgroundColor: getCategoryColor(cat.name, expenseCategories) }}
                >
                  {cat.name}
                </button>
              ))}
              <button
                  onClick={() => {
                    setCategory('기타')
                    setIsManualCategory(true)
                    setIsCategoryPickerOpen(false)
                  }}
                  className="px-3 py-2 rounded-xl text-sm font-bold text-yuri-900 shadow-sm"
                  style={{ backgroundColor: getCategoryColor('기타', expenseCategories) }}
                >
                  기타
                </button>
            </div>
            <button
              onClick={() => {
                setIsManualCategory(false)
                setIsCategoryPickerOpen(false)
                // re-evaluate based on description
                if (description.trim()) {
                  setCategory(classifyLedgerCategory(description.trim(), 'expense', expenseCategories))
                } else {
                  setCategory('기타')
                }
              }}
              className="mt-6 w-full py-3 bg-yuri-50 text-yuri-600 font-bold rounded-xl hover:bg-yuri-100"
            >
              ✨ 자동 인식으로 복귀
            </button>
          </div>
        </div>
      )}
    </>
  )
}

export default MobileLedgerInputSheet
