// ─── Navigation ──────────────────────────────────────────────────────────────
export type PageId =
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
  | 'journal'

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
  note?: string
  searchText?: string // Pure text for searching
  done: boolean
  createdAt: string
  updatedAt?: string
  order?: number     // sorting order
  isDeleted?: boolean
  deletedAt?: number
  _isRollback?: boolean // Transient local state for rollback visual cue
}

// ─── Notes (Memos) ────────────────────────────────────────────────────────────
export interface Note {
  id: string
  text: string          // HTML or legacy text
  textPreview?: string  // Clean text preview for list view
  searchText?: string   // Pure text for searching
  hasContentDoc?: boolean // If true, full text is stored in separate contents collection
  isFullyLoaded?: boolean // Local flag: if true, 'text' is full and fully loaded locally
  createdAt: string
  updatedAt?: string
  isDeleted?: boolean
  deletedAt?: number
  _isRollback?: boolean // Transient local state for rollback visual cue
}

// ─── Ledger ───────────────────────────────────────────────────────────────────
export interface LedgerEntry {
  id: string
  label: string
  memo?: string
  amount: number            // always positive integer (in 원)
  type: 'income' | 'expense'
  category: string          // auto-classified from label; defaults to '기타'
  scheduledDate?: string    // UTC ISO — when the transaction happened
  fixedExpenseId?: string   // ID of the fixed expense if generated automatically
  paymentMethod?: '카드' | '계좌이체'
  createdAt: string
  isDeleted?: boolean
  deletedAt?: number
  _isRollback?: boolean // Transient local state for rollback visual cue
}

export interface FixedExpense {
  id: string
  label: string
  amount: number
  day: number               // 1-31
  category: string          // auto-classified
  paymentMethod?: '카드' | '계좌이체'
  createdAt: string
  updatedAt?: string
  isDeleted?: boolean
  deletedAt?: number
}

// ─── Settings ─────────────────────────────────────────────────────────────────
export interface CategoryConfig {
  name: string
  keywords: string[]
  color?: string
}

// ─── Calendar ─────────────────────────────────────────────────────────────────
export interface ScheduleEvent {
  id:             string
  text:           string
  scheduledDate?: string   // UTC ISO — the date/time the event is FOR (parsed from text)
  createdAt:      string   // UTC ISO — when the entry was saved
  order?:         number   // sorting order
  color?:         string
  _isRollback?: boolean // Transient local state for rollback visual cue
}

export interface AgendaItem {
  id:        string
  monthKey:  string // YYYY-MM
  text:      string
  done:      boolean
  createdAt: string
}

export interface Anniversary {
  id: string
  name: string
  month: number // 1-12
  day: number   // 1-31
  isLunar?: boolean
  isLeapMonth?: boolean
  createdAt: string
}

export interface MonthlyEvent {
  id: string
  name: string
  day: number   // 1-31
  createdAt: string
}

export interface RecurringInstance {
  id: string
  sourceRuleId: string
  sourceType: 'monthly' | 'yearly'
  name: string
  date: string // YYYY-MM-DD
  status: 'materialized' | 'excluded'
}
