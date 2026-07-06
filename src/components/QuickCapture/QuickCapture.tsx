import React, { useState, useRef, useCallback } from 'react'
import { parseCapture } from '../../utils/parser'
import { useAppStore }  from '../../store/AppStore'
import type { CaptureType } from '../../utils/parser'

// ── Category metadata ──────────────────────────────────────────────────────────
const CAT = {
  expense:  { label: '지출',   color: 'text-red-500',   bg: 'bg-red-50',     icon: '₩' },
  income:   { label: '수입',   color: 'text-green-600', bg: 'bg-green-50',   icon: '↑' },
} satisfies Record<CaptureType, { label: string; color: string; bg: string; icon: string }>



// ── Toast state ───────────────────────────────────────────────────────────────
interface ToastState {
  type: CaptureType
  msg:  string
}

// ── Component ─────────────────────────────────────────────────────────────────
const QuickCapture: React.FC = () => {
  const [value,   setValue]   = useState('')
  const [focused, setFocused] = useState(false)
  const [toast,   setToast]   = useState<ToastState | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { addLedgerEntry, expenseCategories } = useAppStore()

  // Show temporary toast notification
  const flashToast = useCallback((type: CaptureType, msg: string) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setToast({ type, msg })
    timerRef.current = setTimeout(() => setToast(null), 2200)
  }, [])

  // Save & clear on Enter
  const handleSubmit = useCallback(() => {
    const trimmed = value.trim()
    if (!trimmed) return

    const result = parseCapture(trimmed, expenseCategories)

    switch (result.type) {
      case 'expense':
        addLedgerEntry(result.text, result.amount ?? 0, 'expense', result.category ?? '기타', result.scheduledDate)
        flashToast('expense', `저장되었습니다.`)
        break
      case 'income':
        addLedgerEntry(result.text, result.amount ?? 0, 'income', result.category ?? '기타수입', result.scheduledDate)
        flashToast('income', `저장되었습니다.`)
        break
    }

    setValue('')
  }, [value, addLedgerEntry, expenseCategories, flashToast])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter')  handleSubmit()
    if (e.key === 'Escape') { setValue(''); inputRef.current?.blur() }
  }

  // Live parse preview (update as user types)
  const preview    = value.trim() ? parseCapture(value.trim(), expenseCategories) : null
  const previewCat = preview ? CAT[preview.type as keyof typeof CAT] : null

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center relative">
      {/* ── Toast ─────────────────────────────────────────────────────────── */}
      {toast && (
        <div
          key={toast.msg}
          className={`
            absolute -top-[52px] left-1/2 -translate-x-1/2 z-50
            px-4 py-2 rounded-xl text-sm font-semibold
            shadow-float whitespace-nowrap
            flex items-center gap-2
            pointer-events-none
            ${CAT[toast.type].bg} ${CAT[toast.type].color}
          `}
          style={{ animation: 'captureToast 2.2s ease forwards' }}
        >
          <span className="text-base leading-none">{CAT[toast.type].icon}</span>
          {toast.msg}
        </div>
      )}

      {/* ── Input bar ─────────────────────────────────────────────────────── */}
      <div className="bg-white/80 backdrop-blur-xl w-full shadow-lg rounded-2xl p-2 border border-yuri-100/50">
        <div className={`quick-bar ${focused ? 'ring-2 ring-accent/30 border-accent/40' : ''}`}>
          {/* Live-updating category icon */}
          <div
            className={`
              w-7 h-7 rounded-lg flex items-center justify-center shrink-0
              text-sm font-bold transition-all duration-150
              ${previewCat
                ? `${previewCat.bg} ${previewCat.color}`
                : 'bg-accent text-white'}
            `}
          >
            {previewCat ? previewCat.icon : '+'}
          </div>

          {/* Text input */}
          <input
            id="quick-capture-input"
            ref={inputRef}
            type="text"
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder='무엇이든 입력하세요… "점심 12000원", "회의 내일 3시", "보고서 수정"'
            className="
              flex-1 bg-transparent outline-none
              text-sm text-yuri-900 placeholder:text-yuri-300
              font-medium min-w-0
            "
            aria-label="빠른 입력창"
          />

          {/* Live category badge */}
          {previewCat && (
            <span
              className={`
                text-[10px] px-2 py-0.5 rounded-md font-semibold shrink-0
                ${previewCat.bg} ${previewCat.color}
              `}
            >
              {previewCat.label}
            </span>
          )}

          {/* Enter hint */}
          <div className="shrink-0 text-[11px] text-yuri-300 border border-yuri-200 rounded-md px-1.5 py-0.5 font-mono leading-none">
            ↵
          </div>
        </div>
      </div>
    </div>
  )
}

export default QuickCapture
