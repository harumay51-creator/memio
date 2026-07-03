import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import type { Task, LedgerEntry, ScheduleEvent, Note, FixedExpense, CategoryConfig, AgendaItem } from '../types'
import { DEFAULT_EXPENSE_CATS } from '../utils/parser'
import { collection, getDocs, setDoc, updateDoc, deleteDoc, doc, writeBatch } from 'firebase/firestore'
import { db } from '../config/firebase'

// ── Helpers ───────────────────────────────────────────────────────────────────
function genId(): string {
  return crypto.randomUUID()
}

// ── Store shape ───────────────────────────────────────────────────────────────
interface StoreValue {
  isLoading: boolean
  loadError: string | null
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
export const AppStoreProvider: React.FC<{ children: React.ReactNode, uid: string }> = ({ children, uid }) => {
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [tasks,  setTasks]  = useState<Task[]>([])
  const [ledger, setLedger] = useState<LedgerEntry[]>([])
  const [events, setEvents] = useState<ScheduleEvent[]>([])
  const [notes,  setNotes]  = useState<Note[]>([])
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([])
  const [expenseCategories, setExpenseCategories] = useState<CategoryConfig[]>([])
  const [agendas, setAgendas] = useState<AgendaItem[]>([])
  const [navDate, setNavDate] = useState<Date | null>(null)

  useEffect(() => {
    async function loadData() {
      try {
        const isMigrated = localStorage.getItem('yuri-migrated-to-firebase') === 'true'
        
        if (!isMigrated) {
        // Perform Migration
        const loadLocal = <T,>(key: string, fb: T): T => {
          try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fb } 
          catch { return fb }
        }
        
        const localTasks = loadLocal<Task[]>('yuri-tasks', [])
        const localLedger = loadLocal<LedgerEntry[]>('yuri-ledger', [])
        const localEvents = loadLocal<ScheduleEvent[]>('yuri-events', [])
        const localNotes = loadLocal<Note[]>('yuri-notes', [])
        const localFixedExpenses = loadLocal<FixedExpense[]>('yuri-fixed-expenses', [])
        const localExpenseCategories = loadLocal<CategoryConfig[]>('yuri-expense-cats', DEFAULT_EXPENSE_CATS)
        const localAgendas = loadLocal<AgendaItem[]>('yuri-agendas', [])

        const batch = writeBatch(db)
        
        localTasks.forEach(t => batch.set(doc(db, 'users', uid, 'tasks', t.id), t))
        localLedger.forEach(l => batch.set(doc(db, 'users', uid, 'ledger', l.id), l))
        localEvents.forEach(e => batch.set(doc(db, 'users', uid, 'events', e.id), e))
        localNotes.forEach(n => batch.set(doc(db, 'users', uid, 'notes', n.id), n))
        localFixedExpenses.forEach(f => batch.set(doc(db, 'users', uid, 'fixedExpenses', f.id), f))
        localExpenseCategories.forEach(c => batch.set(doc(db, 'users', uid, 'expenseCategories', c.name), c))
        localAgendas.forEach(a => batch.set(doc(db, 'users', uid, 'agendas', a.id), a))

        await batch.commit()
        localStorage.setItem('yuri-migrated-to-firebase', 'true')
        
        setTasks(localTasks.sort((a, b) => (a.order || 0) - (b.order || 0)))
        setLedger(localLedger)
        setEvents(localEvents.sort((a, b) => (a.order || 0) - (b.order || 0)))
        setNotes(localNotes)
        setFixedExpenses(localFixedExpenses)
        setExpenseCategories(localExpenseCategories)
        setAgendas(localAgendas)
      } else {
        // Fetch from Firestore
        const fetchCol = async (colName: string) => {
          const snap = await getDocs(collection(db, 'users', uid, colName))
          return snap.docs.map(doc => doc.data())
        }
        
        const [
          fetchedTasks,
          fetchedLedger,
          fetchedEvents,
          fetchedNotes,
          fetchedFixedExpenses,
          fetchedExpenseCats,
          fetchedAgendas
        ] = await Promise.all([
          fetchCol('tasks'),
          fetchCol('ledger'),
          fetchCol('events'),
          fetchCol('notes'),
          fetchCol('fixedExpenses'),
          fetchCol('expenseCategories'),
          fetchCol('agendas')
        ])

        const finalCats = fetchedExpenseCats.length > 0 ? fetchedExpenseCats : DEFAULT_EXPENSE_CATS

        setTasks((fetchedTasks as Task[]).sort((a, b) => (a.order || 0) - (b.order || 0)))
        setLedger(fetchedLedger as LedgerEntry[])
        setEvents((fetchedEvents as ScheduleEvent[]).sort((a, b) => (a.order || 0) - (b.order || 0)))
        setNotes(fetchedNotes as Note[])
        setFixedExpenses(fetchedFixedExpenses as FixedExpense[])
        setExpenseCategories(finalCats as CategoryConfig[])
        setAgendas(fetchedAgendas as AgendaItem[])
      }
      } catch (err: any) {
        console.error("Firebase load error:", err)
        setLoadError(err.message || '데이터를 불러오는 중 알 수 없는 오류가 발생했습니다.')
      } finally {
        setIsLoading(false)
      }
    }
    
    loadData()
  }, [uid])

  // Auto-inject logic (only when NOT loading)
  useEffect(() => {
    if (isLoading || fixedExpenses.length === 0) return
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1
    const currentDay = now.getDate()

    let hasChanges = false
    const injections: LedgerEntry[] = []

    fixedExpenses.forEach(fe => {
      if (currentDay >= fe.day) {
        const hasInjectedThisMonth = ledger.some(l => {
          if (l.fixedExpenseId !== fe.id) return false
          const lDate = new Date(l.scheduledDate || l.createdAt)
          return lDate.getFullYear() === currentYear && (lDate.getMonth() + 1) === currentMonth
        })

        if (!hasInjectedThisMonth) {
          const scheduledDate = new Date(currentYear, currentMonth - 1, fe.day, 12, 0).toISOString()
          injections.push({
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
      setLedger(prev => [...injections, ...prev])
      const batch = writeBatch(db)
      injections.forEach(inj => batch.set(doc(db, 'users', uid, 'ledger', inj.id), inj))
      batch.commit().catch(console.error)
    }
  }, [fixedExpenses, ledger, isLoading, uid])

  const addTask = useCallback((text: string) => {
    const newItem: Task = { id: genId(), text, done: false, createdAt: new Date().toISOString(), order: tasks.length }
    setTasks(prev => [newItem, ...prev])
    setDoc(doc(db, 'users', uid, 'tasks', newItem.id), newItem).catch(console.error)
  }, [tasks.length, uid])

  const toggleTask = useCallback((id: string) => {
    setTasks(prev => {
      const next = prev.map(t => t.id === id ? { ...t, done: !t.done } : t)
      const updated = next.find(t => t.id === id)
      if (updated) updateDoc(doc(db, 'users', uid, 'tasks', id), { done: updated.done }).catch(console.error)
      return next
    })
  }, [uid])

  const updateTaskNote = useCallback((id: string, note: string) => {
    setTasks(prev => {
      const next = prev.map(t => t.id === id ? { ...t, note } : t)
      updateDoc(doc(db, 'users', uid, 'tasks', id), { note }).catch(console.error)
      return next
    })
  }, [uid])

  const updateTaskText = useCallback((id: string, text: string) => {
    setTasks(prev => {
      const next = prev.map(t => t.id === id ? { ...t, text } : t)
      updateDoc(doc(db, 'users', uid, 'tasks', id), { text }).catch(console.error)
      return next
    })
  }, [uid])

  const deleteTask = useCallback((id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id))
    deleteDoc(doc(db, 'users', uid, 'tasks', id)).catch(console.error)
  }, [uid])

  const addLedgerEntry = useCallback((text: string, amount: number, type: 'income' | 'expense', category: string, date?: string) => {
    const newItem: LedgerEntry = { id: genId(), type, amount, category, label: text, scheduledDate: date, paymentMethod: '카드', createdAt: new Date().toISOString() }
    setLedger(prev => [newItem, ...prev])
    setDoc(doc(db, 'users', uid, 'ledger', newItem.id), newItem).catch(console.error)
  }, [uid])

  const updateLedgerEntry = useCallback((id: string, updates: Partial<LedgerEntry>) => {
    setLedger(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l))
    updateDoc(doc(db, 'users', uid, 'ledger', id), updates).catch(console.error)
  }, [uid])

  const deleteLedgerEntry = useCallback((id: string) => {
    setLedger(prev => prev.filter(l => l.id !== id))
    deleteDoc(doc(db, 'users', uid, 'ledger', id)).catch(console.error)
  }, [uid])

  const addEvent = useCallback((text: string, scheduledDate?: string) => {
    const newItem: ScheduleEvent = { id: genId(), text, scheduledDate, createdAt: new Date().toISOString(), order: events.length }
    setEvents(prev => [newItem, ...prev])
    setDoc(doc(db, 'users', uid, 'events', newItem.id), newItem).catch(console.error)
  }, [events.length, uid])

  const deleteEvent = useCallback((id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id))
    deleteDoc(doc(db, 'users', uid, 'events', id)).catch(console.error)
  }, [uid])

  const addNote = useCallback((text: string) => {
    const newItem: Note = { id: genId(), text, createdAt: new Date().toISOString() }
    setNotes(prev => [newItem, ...prev])
    setDoc(doc(db, 'users', uid, 'notes', newItem.id), newItem).catch(console.error)
    return newItem.id
  }, [uid])

  const deleteNote = useCallback((id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id))
    deleteDoc(doc(db, 'users', uid, 'notes', id)).catch(console.error)
  }, [uid])

  const updateNote = useCallback((id: string, text: string) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, text } : n))
    updateDoc(doc(db, 'users', uid, 'notes', id), { text }).catch(console.error)
  }, [uid])

  const addFixedExpense = useCallback((label: string, amount: number, day: number, category: string) => {
    const newItem: FixedExpense = { id: genId(), label, amount, day, category, createdAt: new Date().toISOString() }
    setFixedExpenses(prev => [newItem, ...prev])
    setDoc(doc(db, 'users', uid, 'fixedExpenses', newItem.id), newItem).catch(console.error)
  }, [uid])

  const updateFixedExpense = useCallback((id: string, updates: Partial<FixedExpense>) => {
    setFixedExpenses(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f))
    updateDoc(doc(db, 'users', uid, 'fixedExpenses', id), updates).catch(console.error)
  }, [uid])

  const deleteFixedExpense = useCallback((id: string) => {
    setFixedExpenses(prev => prev.filter(f => f.id !== id))
    deleteDoc(doc(db, 'users', uid, 'fixedExpenses', id)).catch(console.error)
  }, [uid])

  const addCategoryKeyword = useCallback((categoryName: string, keyword: string) => {
    setExpenseCategories(prev => {
      const next = prev.map(c => {
        if (c.name === categoryName && !c.keywords.includes(keyword)) {
          const updated = { ...c, keywords: [...c.keywords, keyword] }
          updateDoc(doc(db, 'users', uid, 'expenseCategories', c.name), { keywords: updated.keywords }).catch(console.error)
          return updated
        }
        return c
      })
      return next
    })
  }, [uid])

  const removeCategoryKeyword = useCallback((categoryName: string, keyword: string) => {
    setExpenseCategories(prev => {
      const next = prev.map(c => {
        if (c.name === categoryName) {
          const updated = { ...c, keywords: c.keywords.filter(k => k !== keyword) }
          updateDoc(doc(db, 'users', uid, 'expenseCategories', c.name), { keywords: updated.keywords }).catch(console.error)
          return updated
        }
        return c
      })
      return next
    })
  }, [uid])

  const addCategory = useCallback((name: string) => {
    setExpenseCategories(prev => {
      if (prev.some(c => c.name === name)) return prev
      const newItem = { name, keywords: [] }
      const next = [...prev, newItem]
      setDoc(doc(db, 'users', uid, 'expenseCategories', name), newItem).catch(console.error)
      return next
    })
  }, [uid])

  const addAgenda = useCallback((text: string, monthKey: string) => {
    const newItem: AgendaItem = { id: genId(), monthKey, text, done: false, createdAt: new Date().toISOString() }
    setAgendas(prev => [...prev, newItem])
    setDoc(doc(db, 'users', uid, 'agendas', newItem.id), newItem).catch(console.error)
  }, [uid])

  const toggleAgenda = useCallback((id: string) => {
    setAgendas(prev => {
      const next = prev.map(a => a.id === id ? { ...a, done: !a.done } : a)
      const updated = next.find(a => a.id === id)
      if (updated) updateDoc(doc(db, 'users', uid, 'agendas', id), { done: updated.done }).catch(console.error)
      return next
    })
  }, [uid])

  const deleteAgenda = useCallback((id: string) => {
    setAgendas(prev => prev.filter(a => a.id !== id))
    deleteDoc(doc(db, 'users', uid, 'agendas', id)).catch(console.error)
  }, [uid])

  const updateItemOrders = useCallback((updates: { id: string, type: 'task' | 'event', order: number }[]) => {
    const taskUpdates = updates.filter(u => u.type === 'task')
    const eventUpdates = updates.filter(u => u.type === 'event')

    if (taskUpdates.length > 0) {
      setTasks(prev => prev.map(t => {
        const u = taskUpdates.find(x => x.id === t.id)
        if (u) {
          updateDoc(doc(db, 'users', uid, 'tasks', t.id), { order: u.order }).catch(console.error)
          return { ...t, order: u.order }
        }
        return t
      }))
    }

    if (eventUpdates.length > 0) {
      setEvents(prev => prev.map(e => {
        const u = eventUpdates.find(x => x.id === e.id)
        if (u) {
          updateDoc(doc(db, 'users', uid, 'events', e.id), { order: u.order }).catch(console.error)
          return { ...e, order: u.order }
        }
        return e
      }))
    }
  }, [uid])

  return (
    <StoreCtx.Provider value={{
      isLoading, loadError,
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
