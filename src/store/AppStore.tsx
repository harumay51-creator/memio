import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import type { Task, LedgerEntry, ScheduleEvent, Note, FixedExpense, CategoryConfig, AgendaItem } from '../types'
import { DEFAULT_EXPENSE_CATS } from '../utils/parser'

// ── Helpers ───────────────────────────────────────────────────────────────────
function genId(): string {
  return crypto.randomUUID()
}

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function persist<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value))
}

// ── Store shape ───────────────────────────────────────────────────────────────
interface StoreValue {
  tasks:  Task[]
  ledger: LedgerEntry[]
  events: ScheduleEvent[]
  notes:  Note[]
  fixedExpenses: FixedExpense[]
  expenseCategories: CategoryConfig[]
  agendas: AgendaItem[]
  addTask:        (text: string) => void
  toggleTask:     (id: string)  => void
  updateTaskText: (id: string, text: string) => void
  updateTaskNote: (id: string, note: string) => void
  deleteTask:     (id: string)  => void
  addLedgerEntry: (text: string, amount: number, type: 'income' | 'expense', category: string, date?: string) => void
  updateLedgerEntry: (id: string, updates: Partial<LedgerEntry>) => void
  deleteLedgerEntry: (id: string) => void
  addEvent:       (text: string, scheduledDate?: string) => void
  deleteEvent:    (id: string)  => void
  addNote:        (text: string) => string
  updateNote:     (id: string, text: string) => void
  deleteNote:     (id: string) => void
  /** Ephemeral: set by SearchModal to tell CalendarPage which date to jump to. */
  navDate:        Date | null
  setNavDate:     (d: Date | null) => void
  addFixedExpense: (label: string, amount: number, day: number, category: string) => void
  updateFixedExpense: (id: string, updates: Partial<FixedExpense>) => void
  deleteFixedExpense: (id: string) => void
  addCategory: (name: string) => void
  addCategoryKeyword: (categoryName: string, keyword: string) => void
  removeCategoryKeyword: (categoryName: string, keyword: string) => void

  addAgenda: (text: string, monthKey: string) => void
  toggleAgenda: (id: string) => void
  deleteAgenda: (id: string) => void

  updateItemOrders: (updates: { id: string, type: 'task' | 'event', order: number }[]) => void
}

const StoreCtx = createContext<StoreValue | null>(null)

// ── Provider ──────────────────────────────────────────────────────────────────
export const AppStoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tasks,  setTasks]  = useState<Task[]>          (() => load<Task[]>          ('yuri-tasks',  []))
  const [ledger, setLedger] = useState<LedgerEntry[]>   (() => load<LedgerEntry[]>   ('yuri-ledger', []))
  const [events, setEvents] = useState<ScheduleEvent[]> (() => load<ScheduleEvent[]> ('yuri-events', []))
  const [notes,  setNotes]  = useState<Note[]>          (() => load<Note[]>          ('yuri-notes',  []))
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>(() => load<FixedExpense[]>('yuri-fixed-expenses', []))
  const [expenseCategories, setExpenseCategories] = useState<CategoryConfig[]>(() => load<CategoryConfig[]>('yuri-expense-cats', DEFAULT_EXPENSE_CATS))
  const [agendas, setAgendas] = useState<AgendaItem[]>(() => load<AgendaItem[]>('yuri-agendas', []))
  const [navDate, setNavDate] = useState<Date | null>(null)

  // ── Auto-inject fixed expenses ──────────────────────────────────────────────
  useEffect(() => {
    if (fixedExpenses.length === 0) return

    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1
    const currentDay = now.getDate()

    setLedger(prev => {
      let hasChanges = false
      const next = [...prev]

      fixedExpenses.forEach(fe => {
        if (currentDay >= fe.day) {
          const hasInjectedThisMonth = next.some(l => {
            if (l.fixedExpenseId !== fe.id) return false
            const lDate = new Date(l.scheduledDate || l.createdAt)
            return lDate.getFullYear() === currentYear && (lDate.getMonth() + 1) === currentMonth
          })

          if (!hasInjectedThisMonth) {
            const scheduledDate = new Date(currentYear, currentMonth - 1, fe.day, 12, 0).toISOString()
            next.unshift({
              id: genId(),
              label: fe.label,
              amount: fe.amount,
              type: 'expense',
              category: fe.category,
              paymentMethod: '카드',
              scheduledDate,
              fixedExpenseId: fe.id,
              createdAt: new Date().toISOString()
            })
            hasChanges = true
          }
        }
      })

      if (hasChanges) {
        persist('yuri-ledger', next)
        return next
      }
      return prev
    })
  }, [fixedExpenses]) // Only check when fixed expenses change or mount

  const addTask = useCallback((text: string) => {
    setTasks(prev => {
      const next: Task[] = [
        { id: genId(), text, done: false, createdAt: new Date().toISOString() },
        ...prev,
      ]
      persist('yuri-tasks', next)
      return next
    })
  }, [])

  const toggleTask = useCallback((id: string) => {
    setTasks(prev => {
      const next = prev.map(t => t.id === id ? { ...t, done: !t.done } : t)
      persist('yuri-tasks', next)
      return next
    })
  }, [])

  const updateTaskNote = useCallback((id: string, note: string) => {
    setTasks(prev => {
      const next = prev.map(t => t.id === id ? { ...t, note } : t)
      persist('yuri-tasks', next)
      return next
    })
  }, [])

  const updateTaskText = useCallback((id: string, text: string) => {
    setTasks(prev => {
      const next = prev.map(t => t.id === id ? { ...t, text } : t)
      persist('yuri-tasks', next)
      return next
    })
  }, [])

  const deleteTask = useCallback((id: string) => {
    setTasks(prev => {
      const next = prev.filter(t => t.id !== id)
      persist('yuri-tasks', next)
      return next
    })
  }, [])

  const addLedgerEntry = useCallback((text: string, amount: number, type: 'income' | 'expense', category: string, date?: string) => {
    setLedger(prev => {
      const next: LedgerEntry[] = [
        { id: genId(), type, amount, category, label: text, scheduledDate: date, paymentMethod: '카드', createdAt: new Date().toISOString() },
        ...prev,
      ]
      persist('yuri-ledger', next)
      return next
    })
  }, [])

  const updateLedgerEntry = useCallback((id: string, updates: Partial<LedgerEntry>) => {
    setLedger(prev => {
      const next = prev.map(l => l.id === id ? { ...l, ...updates } : l)
      persist('yuri-ledger', next)
      return next
    })
  }, [])

  const deleteLedgerEntry = useCallback((id: string) => {
    setLedger(prev => {
      const next = prev.filter(l => l.id !== id)
      persist('yuri-ledger', next)
      return next
    })
  }, [])

  const addEvent = useCallback((text: string, scheduledDate?: string) => {
    setEvents(prev => {
      const next: ScheduleEvent[] = [
        { id: genId(), text, scheduledDate, createdAt: new Date().toISOString() },
        ...prev,
      ]
      persist('yuri-events', next)
      return next
    })
  }, [])

  const deleteEvent = useCallback((id: string) => {
    setEvents(prev => {
      const next = prev.filter(e => e.id !== id)
      persist('yuri-events', next)
      return next
    })
  }, [])

  const addNote = useCallback((text: string) => {
    const id = genId()
    setNotes(prev => {
      const next: Note[] = [
        { id, text, createdAt: new Date().toISOString() },
        ...prev,
      ]
      persist('yuri-notes', next)
      return next
    })
    return id
  }, [])

  const deleteNote = useCallback((id: string) => {
    setNotes(prev => {
      const next = prev.filter(n => n.id !== id)
      persist('yuri-notes', next)
      return next
    })
  }, [])

  const updateNote = useCallback((id: string, text: string) => {
    setNotes(prev => {
      const next = prev.map(n => n.id === id ? { ...n, text } : n)
      persist('yuri-notes', next)
      return next
    })
  }, [])

  const addFixedExpense = useCallback((label: string, amount: number, day: number, category: string) => {
    setFixedExpenses(prev => {
      const next: FixedExpense[] = [
        { id: genId(), label, amount, day, category, createdAt: new Date().toISOString() },
        ...prev,
      ]
      persist('yuri-fixed-expenses', next)
      return next
    })
  }, [])

  const updateFixedExpense = useCallback((id: string, updates: Partial<FixedExpense>) => {
    setFixedExpenses(prev => {
      const next = prev.map(f => f.id === id ? { ...f, ...updates } : f)
      persist('yuri-fixed-expenses', next)
      return next
    })
  }, [])

  const deleteFixedExpense = useCallback((id: string) => {
    setFixedExpenses(prev => {
      const next = prev.filter(f => f.id !== id)
      persist('yuri-fixed-expenses', next)
      return next
    })
  }, [])

  const addCategoryKeyword = useCallback((categoryName: string, keyword: string) => {
    setExpenseCategories(prev => {
      const next = prev.map(c => {
        if (c.name === categoryName && !c.keywords.includes(keyword)) {
          return { ...c, keywords: [...c.keywords, keyword] }
        }
        return c
      })
      persist('yuri-expense-cats', next)
      return next
    })
  }, [])

  const removeCategoryKeyword = useCallback((categoryName: string, keyword: string) => {
    setExpenseCategories(prev => {
      const next = prev.map(c => {
        if (c.name === categoryName) {
          return { ...c, keywords: c.keywords.filter(k => k !== keyword) }
        }
        return c
      })
      persist('yuri-expense-cats', next)
      return next
    })
  }, [])

  const addCategory = useCallback((name: string) => {
    setExpenseCategories(prev => {
      if (prev.some(c => c.name === name)) return prev
      const next = [...prev, { name, keywords: [] }]
      persist('yuri-expense-cats', next)
      return next
    })
  }, [])

  const addAgenda = useCallback((text: string, monthKey: string) => {
    setAgendas(prev => {
      const next = [...prev, { id: genId(), monthKey, text, done: false, createdAt: new Date().toISOString() }]
      persist('yuri-agendas', next)
      return next
    })
  }, [])

  const toggleAgenda = useCallback((id: string) => {
    setAgendas(prev => {
      const next = prev.map(a => a.id === id ? { ...a, done: !a.done } : a)
      persist('yuri-agendas', next)
      return next
    })
  }, [])

  const deleteAgenda = useCallback((id: string) => {
    setAgendas(prev => {
      const next = prev.filter(a => a.id !== id)
      persist('yuri-agendas', next)
      return next
    })
  }, [])

  const updateItemOrders = useCallback((updates: { id: string, type: 'task' | 'event', order: number }[]) => {
    const taskUpdates = updates.filter(u => u.type === 'task')
    const eventUpdates = updates.filter(u => u.type === 'event')

    if (taskUpdates.length > 0) {
      setTasks(prev => {
        const next = prev.map(t => {
          const u = taskUpdates.find(x => x.id === t.id)
          return u ? { ...t, order: u.order } : t
        })
        persist('yuri-tasks', next)
        return next
      })
    }

    if (eventUpdates.length > 0) {
      setEvents(prev => {
        const next = prev.map(e => {
          const u = eventUpdates.find(x => x.id === e.id)
          return u ? { ...e, order: u.order } : e
        })
        persist('yuri-events', next)
        return next
      })
    }
  }, [])

  return (
    <StoreCtx.Provider value={{
      tasks, ledger, events, notes, fixedExpenses, expenseCategories, agendas,
      addTask, toggleTask, updateTaskText, updateTaskNote, deleteTask,
      addLedgerEntry, updateLedgerEntry, deleteLedgerEntry,
      addEvent, deleteEvent,
      addNote, updateNote, deleteNote,
      navDate, setNavDate,
      addFixedExpense, updateFixedExpense, deleteFixedExpense,
      addCategory, addCategoryKeyword, removeCategoryKeyword,
      addAgenda, toggleAgenda, deleteAgenda,
      updateItemOrders
    }}>
      {children}
    </StoreCtx.Provider>
  )
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useAppStore(): StoreValue {
  const ctx = useContext(StoreCtx)
  if (!ctx) throw new Error('useAppStore must be used inside <AppStoreProvider>')
  return ctx
}
