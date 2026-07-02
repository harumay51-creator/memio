// ─── Navigation ──────────────────────────────────────────────────────────────
export type PageId =
  | 'dashboard'
  | 'search'
  | 'tasks'
  | 'history'
  | 'notes'
  | 'calendar'
  | 'projects'
  | 'ledger'
  | 'bookmarks'
  | 'stats'
  | 'settings'

export interface NavItem {
  id: PageId
  label: string
  icon: string
  group?: 'home' | 'input' | 'explore' | 'utility'
}

// ─── Tasks ────────────────────────────────────────────────────────────────────
export interface Task {
  id: string
  text: string
  done: boolean
  note?: string      // detailed note content
  createdAt: string  // ISO string
  order?: number     // sorting order
}

// ─── Notes (Memos) ────────────────────────────────────────────────────────────
export interface Note {
  id: string
  text: string
  createdAt: string
}

// ─── Ledger ───────────────────────────────────────────────────────────────────
export interface LedgerEntry {
  id: string
  label: string
  amount: number            // always positive integer (in 원)
  type: 'income' | 'expense'
  category: string          // auto-classified from label; defaults to '기타'
  scheduledDate?: string    // UTC ISO — when the transaction happened
  fixedExpenseId?: string   // ID of the fixed expense if generated automatically
  paymentMethod?: '카드' | '계좌이체'
  createdAt: string
}

export interface FixedExpense {
  id: string
  label: string
  amount: number
  day: number               // 1-31
  category: string          // auto-classified
  createdAt: string
}

// ─── Settings ─────────────────────────────────────────────────────────────────
export interface CategoryConfig {
  name: string
  keywords: string[]
}

// ─── Calendar ─────────────────────────────────────────────────────────────────
export interface ScheduleEvent {
  id:             string
  text:           string
  scheduledDate?: string   // UTC ISO — the date/time the event is FOR (parsed from text)
  createdAt:      string   // UTC ISO — when the entry was saved
  order?:         number   // sorting order
}

export interface AgendaItem {
  id:        string
  monthKey:  string // YYYY-MM
  text:      string
  done:      boolean
  createdAt: string
}
