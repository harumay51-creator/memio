import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import type { Task, LedgerEntry, ScheduleEvent, Note, FixedExpense, CategoryConfig, AgendaItem, Anniversary, MonthlyEvent } from '../types'
import { DEFAULT_EXPENSE_CATS } from '../utils/parser'
import { collection, getDocs, setDoc, updateDoc, deleteDoc, doc, writeBatch, getDoc, deleteField } from 'firebase/firestore'
import { db } from '../config/firebase'
import { extractFirebaseImageUrls, deleteFirestoreImages, cleanupRemovedImages } from '../utils/imageUtils'

// ── Helpers ───────────────────────────────────────────────────────────────────
function genId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

// ─── Store shape ───────────────────────────────────────────────────────────────
export interface HolidayConfig {
  hiddenRules: string[];
  hiddenDates: string[];
  customHolidays: {
    id: string;
    date: string;
    name: string;
    isRedDay: boolean;
  }[];
}

export interface TrashedItem {
  id: string
  type: 'note' | 'task' | 'ledger' | 'fixedExpense'
  label: string
  deletedAt: number
}
interface StoreValue {
  isLoading: boolean
  loadError: string | null
  tasks:  Task[]
  ledger: LedgerEntry[]
  events: ScheduleEvent[]
  notes:  Note[]
  fixedExpenses: FixedExpense[]
  expenseCategories: CategoryConfig[]
  trashedItems: TrashedItem[]
  agendas: AgendaItem[]
  anniversaries: Anniversary[]
  monthlyEvents: MonthlyEvent[]
  holidayConfig: HolidayConfig
  updateHolidayConfig: (updater: (prev: HolidayConfig) => HolidayConfig) => void
  addTask:        (text: string) => void
  toggleTask:     (id: string)  => void
  updateTaskText: (id: string, text: string) => void
  updateTaskNote: (id: string, note: string) => void
  deleteTask:     (id: string)  => void
  addLedgerEntry: (text: string, amount: number, type: 'income' | 'expense', category: string, date?: string, paymentMethod?: '카드' | '계좌이체', memo?: string) => void
  updateLedgerEntry: (id: string, updates: Partial<LedgerEntry>) => void
  deleteLedgerEntry: (id: string) => void
  addEvent:       (text: string, scheduledDate?: string, color?: string) => Promise<void>
  updateEvent:    (id: string, updates: Partial<ScheduleEvent>) => void
  deleteEvent:    (id: string)  => void
  addNote:        (text: string) => string
  updateNote:     (id: string, text: string) => void
  deleteNote:     (id: string) => void
  navDate:        Date | null
  setNavDate:     (d: Date | null) => void
  addFixedExpense: (label: string, amount: number, day: number, category: string, paymentMethod?: '카드' | '계좌이체') => void
  updateFixedExpense: (id: string, updates: Partial<FixedExpense>) => void
  deleteFixedExpense: (id: string) => void
  restoreItem: (type: 'note' | 'task' | 'ledger' | 'fixedExpense', id: string) => void
  hardDeleteItem: (type: 'note' | 'task' | 'ledger' | 'fixedExpense', id: string) => void
  addCategory: (name: string) => void
  deleteCategory: (name: string) => void
  addCategoryKeyword: (categoryName: string, keyword: string) => void
  removeCategoryKeyword: (categoryName: string, keyword: string) => void
  categoryOrder: string[]
  setCategoryOrder: (order: string[]) => void
  addAgenda: (text: string, monthKey: string) => void
  toggleAgenda: (id: string) => void
  deleteAgenda: (id: string) => void
  updateItemOrders: (updates: { id: string, type: 'task' | 'event', order: number }[]) => void
  addAnniversary: (name: string, month: number, day: number) => void
  deleteAnniversary: (id: string) => void
  addMonthlyEvent: (name: string, day: number) => void
  deleteMonthlyEvent: (id: string) => void

  cardPaymentDay: number
  setCardPaymentDay: (day: number) => void
  cardBillingStartDay: number
  cardBillingEndDay: number
  setCardBillingDays: (start: number, end: number) => void
  payday: number
  setPayday: (day: number) => void
  salaryRecords: Record<string, { amount: number }>
  updateSalaryRecord: (monthKey: string, amount: number) => void
  resetLedgerData: () => Promise<void>
  cardBills: Record<string, { amount: number, memo?: string }>
  updateCardBill: (monthKey: string, updates: { amount?: number, memo?: string }) => void
  
  hasPin: boolean
  isPrivateUnlocked: boolean
  unlockPrivate: (pin: string) => Promise<boolean>
  setPrivatePin: (newPin: string) => Promise<void>
  lockPrivate: () => void
  resetPrivatePin: () => Promise<void>
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
  const [trashedItems, setTrashedItems] = useState<TrashedItem[]>([])
  const [agendas, setAgendas] = useState<AgendaItem[]>([])
  const [anniversaries, setAnniversaries] = useState<Anniversary[]>([])
  const [monthlyEvents, setMonthlyEvents] = useState<MonthlyEvent[]>([])
  
  const [holidayConfig, setHolidayConfig] = useState<HolidayConfig>({
    hiddenRules: [], hiddenDates: [], customHolidays: []
  })
  
  const [cardPaymentDay, setCardPaymentDayState] = useState<number>(14)
  const [cardBillingStartDay, setCardBillingStartDay] = useState<number>(28)
  const [cardBillingEndDay, setCardBillingEndDay] = useState<number>(27)
  const [payday, setPaydayState] = useState<number>(25)
  const [salaryRecords, setSalaryRecords] = useState<Record<string, { amount: number }>>({})
  const [cardBills, setCardBills] = useState<Record<string, { amount: number, memo?: string }>>({})
  const [categoryOrder, setCategoryOrderState] = useState<string[]>([])
  
  const [isPrivateUnlocked, setIsPrivateUnlocked] = useState(() => {
    return sessionStorage.getItem('yuri-private-unlocked') === 'true'
  })
  const [pinHash, setPinHash] = useState<string | null>(null)
  const hasPin = pinHash !== null

  const [navDate, setNavDate] = useState<Date | null>(null)

  useEffect(() => {
    async function loadData() {
      try {
        // Fetch from Firestore
        const fetchCol = async (colName: string) => {
          const snap = await getDocs(collection(db, 'users', uid, colName))
          return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any))
        }
        
        // Load PIN settings
        const settingsDocRef = doc(db, `users/${uid}/journal_settings/config`)
        const settingsSnap = await getDoc(settingsDocRef)
        if (settingsSnap.exists()) {
          setPinHash(settingsSnap.data().pinHash || null)
        } else {
          setPinHash(null)
        }
        
        // Load general settings
        const settingsDoc = await getDoc(doc(db, `users/${uid}/settings/config`))
        if (settingsDoc.exists()) {
          const data = settingsDoc.data()
          setCardPaymentDayState(data.cardPaymentDay || 14)
          setCardBillingStartDay(data.cardBillingStartDay || 28)
          setCardBillingEndDay(data.cardBillingEndDay || 27)
          setPaydayState(data.payday || 25)

          setCategoryOrderState(data.categoryOrder || [])
          if (data.holidayConfig) {
            setHolidayConfig(data.holidayConfig)
          }
        }
        
        const [
          fetchedTasks,
          fetchedLedger,
          fetchedEvents,
          fetchedNotes,
          fetchedFixedExpenses,
          fetchedExpenseCats,
          fetchedAgendas,
          fetchedAnnivs,
          fetchedMonthly,
          fetchedCardBills,
          fetchedSalaryRecords
        ] = await Promise.all([
          fetchCol('tasks'),
          fetchCol('ledger'),
          fetchCol('events'),
          fetchCol('notes'),
          fetchCol('fixedExpenses'),
          fetchCol('expenseCategories'),
          fetchCol('agendas'),
          fetchCol('anniversaries'),
          fetchCol('monthlyEvents'),
          fetchCol('cardBills'),
          fetchCol('salaryRecords')
        ])

        const mergedCats = DEFAULT_EXPENSE_CATS.map(defCat => {
          const fetched = fetchedExpenseCats.find((c: any) => c.name === defCat.name) as any
          return fetched ? { ...defCat, keywords: fetched.keywords || [] } : defCat
        })
        const customCats = fetchedExpenseCats.filter((c: any) => !DEFAULT_EXPENSE_CATS.some(defCat => defCat.name === c.name)) as CategoryConfig[]
        const finalCats = [...mergedCats, ...customCats]

        const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
        const nowMs = Date.now();
        const batch = writeBatch(db);
        let hasHardDeletes = false;

        const processItems = (items: any[], type: 'note' | 'task' | 'ledger' | 'fixedExpense', labelExtractor: (item: any) => string) => {
          const active: any[] = [];
          const trashed: TrashedItem[] = [];
          items.forEach(item => {
            if (item.isDeleted) {
              if (item.deletedAt && (nowMs - item.deletedAt > THIRTY_DAYS_MS)) {
                let colName = '';
                if (type === 'note') colName = 'notes';
                if (type === 'task') colName = 'tasks';
                if (type === 'ledger') colName = 'ledger';
                if (type === 'fixedExpense') colName = 'fixedExpenses';
                if (type === 'note' && item.text) {
                  const urls = extractFirebaseImageUrls(item.text);
                  if (urls.length > 0) {
                    deleteFirestoreImages(urls).catch(console.error);
                  }
                }
                batch.delete(doc(db, 'users', uid, colName, item.id));
                hasHardDeletes = true;
              } else {
                trashed.push({ id: item.id, type, label: labelExtractor(item), deletedAt: item.deletedAt || 0 });
              }
            } else {
              active.push(item);
            }
          });
          return { active, trashed };
        };

        const notesData = processItems(fetchedNotes, 'note', n => n.text.trim().split('\n')[0].slice(0, 30) || '새로운 메모');
        const tasksData = processItems(fetchedTasks, 'task', t => t.text);
        const ledgerData = processItems(fetchedLedger, 'ledger', l => {
          const dateStr = l.scheduledDate ? new Date(l.scheduledDate).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' }) : '';
          return `${dateStr} ${l.label} ${l.amount.toLocaleString()}원`.trim();
        });
        const fixedExpData = processItems(fetchedFixedExpenses, 'fixedExpense', f => `${f.label} ${f.amount.toLocaleString()}원`);

        if (hasHardDeletes) {
          batch.commit().catch(console.error);
        }

        const allTrashed = [...notesData.trashed, ...tasksData.trashed, ...ledgerData.trashed, ...fixedExpData.trashed];
        setTrashedItems(allTrashed.sort((a, b) => b.deletedAt - a.deletedAt));

        setTasks((tasksData.active as Task[]).sort((a, b) => (a.order || 0) - (b.order || 0)))
        setLedger(ledgerData.active as LedgerEntry[])
        setEvents((fetchedEvents as ScheduleEvent[]).sort((a, b) => (a.order || 0) - (b.order || 0)))
        setNotes(notesData.active as Note[])
        setFixedExpenses(fixedExpData.active as FixedExpense[])
        setExpenseCategories(finalCats)
        setAgendas(fetchedAgendas as AgendaItem[])
        setAnniversaries(fetchedAnnivs as Anniversary[])
        setMonthlyEvents(fetchedMonthly as MonthlyEvent[])
        
        const billsMap: Record<string, { amount: number, memo?: string }> = {}
        console.log('[AppStore] fetchedCardBills raw:', fetchedCardBills)
        ;(fetchedCardBills as any[]).forEach((b: any) => {
          if (b.id) {
            let amt = 0
            if (b.amount !== undefined) amt = Number(b.amount)
            else if (b.actualAmount !== undefined) amt = Number(b.actualAmount)
            
            if (!isNaN(amt)) {
              billsMap[b.id] = { amount: amt, memo: b.memo || '' }
            } else if (b.memo) {
              billsMap[b.id] = { amount: 0, memo: b.memo }
            }
          }
        })
        console.log('[AppStore] resulting billsMap:', billsMap)
        setCardBills(billsMap)

        const salaryMap: Record<string, { amount: number }> = {}
        ;(fetchedSalaryRecords as any[]).forEach((s: any) => {
          if (s.id && s.amount !== undefined) {
            salaryMap[s.id] = { amount: Number(s.amount) }
          }
        })
        setSalaryRecords(salaryMap)
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
      const lastDayOfMonth = new Date(currentYear, currentMonth, 0).getDate()
      const targetDay = fe.day === 99 ? lastDayOfMonth : fe.day

      if (currentDay >= targetDay) {
        // Check if this fixed expense was created/updated after the target date of THIS month.
        const feDateStr = fe.updatedAt || fe.createdAt
        const feDate = new Date(feDateStr)
        const targetDateForThisMonth = new Date(currentYear, currentMonth - 1, targetDay, 23, 59, 59)

        if (feDate.getTime() > targetDateForThisMonth.getTime()) {
          return // Skip injection if it was registered/updated AFTER this month's target date
        }

        const hasInjectedThisMonth = ledger.some(l => {
          if (l.fixedExpenseId !== fe.id) return false
          const lDate = new Date(l.scheduledDate || l.createdAt)
          return lDate.getFullYear() === currentYear && (lDate.getMonth() + 1) === currentMonth
        })

        if (!hasInjectedThisMonth) {
          const scheduledDate = new Date(currentYear, currentMonth - 1, targetDay, 12, 0).toISOString()
          injections.push({
            id: genId(),
            label: fe.label,
            amount: fe.amount,
            type: 'expense',
            category: fe.category,
            paymentMethod: fe.paymentMethod || '카드',
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
    const now = new Date().toISOString()
    const newItem: Task = { id: genId(), text, done: false, createdAt: now, updatedAt: now, order: tasks.length }
    setTasks(prev => [newItem, ...prev])
    setDoc(doc(db, 'users', uid, 'tasks', newItem.id), newItem).catch(console.error)
  }, [tasks.length, uid])

  const toggleTask = useCallback((id: string) => {
    const updatedAt = new Date().toISOString()
    setTasks(prev => {
      const next = prev.map(t => t.id === id ? { ...t, done: !t.done, updatedAt } : t)
      const updated = next.find(t => t.id === id)
      if (updated) updateDoc(doc(db, 'users', uid, 'tasks', id), { done: updated.done, updatedAt }).catch(console.error)
      return next
    })
  }, [uid])

  const updateTaskNote = useCallback((id: string, note: string) => {
    const updatedAt = new Date().toISOString()
    setTasks(prev => {
      const next = prev.map(t => t.id === id ? { ...t, note, updatedAt } : t)
      updateDoc(doc(db, 'users', uid, 'tasks', id), { note, updatedAt }).catch(console.error)
      return next
    })
  }, [uid])

  const updateTaskText = useCallback((id: string, text: string) => {
    const updatedAt = new Date().toISOString()
    setTasks(prev => {
      const next = prev.map(t => t.id === id ? { ...t, text, updatedAt } : t)
      updateDoc(doc(db, 'users', uid, 'tasks', id), { text, updatedAt }).catch(console.error)
      return next
    })
  }, [uid])

  const deleteTask = useCallback((id: string) => {
    setTasks(prev => {
      const item = prev.find(t => t.id === id)
      if (item) {
        setTrashedItems(curr => [{ id, type: 'task' as const, label: item.text, deletedAt: Date.now() }, ...curr].sort((a,b)=>b.deletedAt-a.deletedAt))
      }
      return prev.filter(t => t.id !== id)
    })
    updateDoc(doc(db, 'users', uid, 'tasks', id), { isDeleted: true, deletedAt: Date.now() }).catch(console.error)
  }, [uid])

  const addLedgerEntry = useCallback((text: string, amount: number, type: 'income' | 'expense', category: string, date?: string, paymentMethod?: '카드' | '계좌이체', memo?: string) => {
    if (!uid) return
    const id = genId()
    const scheduledDate = date || new Date().toISOString()
    const newEntry: any = {
      id,
      type,
      label: text,
      amount,
      category,
      scheduledDate,
      createdAt: new Date().toISOString(),
      isDeleted: false,
    }
    if (paymentMethod !== undefined) newEntry.paymentMethod = paymentMethod
    if (memo !== undefined) newEntry.memo = memo

    console.log('[AppStore] addLedgerEntry executing. id:', id, 'newEntry:', newEntry)
    setLedger(prev => [...prev, newEntry as LedgerEntry])
    setDoc(doc(db, 'users', uid, 'ledger', id), newEntry)
      .then(() => console.log('[AppStore] addLedgerEntry Firestore save success!'))
      .catch(err => console.error('[AppStore] addLedgerEntry Firestore error:', err))
  }, [uid])

  const updateLedgerEntry = useCallback((id: string, updates: Partial<LedgerEntry>) => {
    setLedger(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l))
    
    const sanitizedUpdates: any = { ...updates }
    Object.keys(sanitizedUpdates).forEach(k => {
      if (sanitizedUpdates[k] === undefined) {
        delete sanitizedUpdates[k]
      }
    })
    
    updateDoc(doc(db, 'users', uid, 'ledger', id), sanitizedUpdates).catch(console.error)
  }, [uid])

  const deleteLedgerEntry = useCallback((id: string) => {
    setLedger(prev => {
      const item = prev.find(l => l.id === id)
      if (item) {
        const dateStr = item.scheduledDate ? new Date(item.scheduledDate).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' }) : ''
        const label = `${dateStr} ${item.label} ${item.amount.toLocaleString()}원`.trim()
        setTrashedItems(curr => [{ id, type: 'ledger' as const, label, deletedAt: Date.now() }, ...curr].sort((a,b)=>b.deletedAt-a.deletedAt))
      }
      return prev.filter(l => l.id !== id)
    })
    updateDoc(doc(db, 'users', uid, 'ledger', id), { isDeleted: true, deletedAt: Date.now() }).catch(console.error)
  }, [uid])

  const setCardPaymentDay = useCallback((day: number) => {
    setCardPaymentDayState(day)
    setDoc(doc(db, `users/${uid}/settings/config`), { cardPaymentDay: day }, { merge: true }).catch(console.error)
  }, [uid])

  const updateCardBill = useCallback((monthKey: string, updates: { amount?: number, memo?: string }) => {
    setCardBills(prev => {
      const existing = prev[monthKey] || { amount: 0 }
      const newBill: any = { ...existing, ...updates }
      
      Object.keys(newBill).forEach(k => {
        if (newBill[k] === undefined) delete newBill[k]
      })

      console.log('[AppStore] updateCardBill executing. monthKey:', monthKey, 'newBill:', newBill)
      setDoc(doc(db, `users/${uid}/cardBills/${monthKey}`), newBill, { merge: true })
        .then(() => console.log('[AppStore] updateCardBill Firestore save success!'))
        .catch(err => console.error('[AppStore] updateCardBill Firestore error:', err))
      return { ...prev, [monthKey]: newBill }
    })
  }, [uid])

  const addEvent = useCallback(async (text: string, scheduledDate?: string, color?: string) => {
    console.log('addEvent called with:', text, scheduledDate, color)
    const newItem: any = { id: genId(), text, createdAt: new Date().toISOString(), order: events.length }
    if (scheduledDate) newItem.scheduledDate = scheduledDate
    if (color) newItem.color = color
    setEvents(prev => [newItem as ScheduleEvent, ...prev])
    try {
      await setDoc(doc(db, 'users', uid, 'events', newItem.id), newItem)
      console.log('addEvent success!')
    } catch (err) {
      console.error('addEvent error:', err)
      throw err
    }
  }, [events.length, uid])

  const updateEvent = useCallback((id: string, updates: Partial<ScheduleEvent>) => {
    setEvents(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e))
    updateDoc(doc(db, 'users', uid, 'events', id), updates).catch(console.error)
  }, [uid])

  const deleteEvent = useCallback((id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id))
    deleteDoc(doc(db, 'users', uid, 'events', id)).catch(console.error)
  }, [uid])

  const addNote = useCallback((text: string) => {
    const now = new Date().toISOString()
    const newItem: Note = { id: genId(), text, createdAt: now, updatedAt: now }
    setNotes(prev => [newItem, ...prev])
    setDoc(doc(db, 'users', uid, 'notes', newItem.id), newItem).catch(console.error)
    return newItem.id
  }, [uid])

  const deleteNote = useCallback((id: string) => {
    setNotes(prev => {
      const item = prev.find(n => n.id === id)
      if (item) {
        const label = item.text.trim().split('\n')[0].slice(0, 30) || '새로운 메모'
        setTrashedItems(curr => [{ id, type: 'note' as const, label, deletedAt: Date.now() }, ...curr].sort((a,b)=>b.deletedAt-a.deletedAt))
      }
      return prev.filter(n => n.id !== id)
    })
    updateDoc(doc(db, 'users', uid, 'notes', id), { isDeleted: true, deletedAt: Date.now() }).catch(console.error)
  }, [uid])

  const updateNote = useCallback((id: string, text: string) => {
    const updatedAt = new Date().toISOString()
    
    setNotes(prev => {
      const oldNote = prev.find(n => n.id === id)
      if (oldNote) {
        cleanupRemovedImages(oldNote.text, text).catch(console.error)
      }
      return prev.map(n => n.id === id ? { ...n, text, updatedAt } : n)
    })
    updateDoc(doc(db, 'users', uid, 'notes', id), { text, updatedAt }).catch(console.error)
  }, [uid])

  const addFixedExpense = useCallback((label: string, amount: number, day: number, category: string, paymentMethod: '카드' | '계좌이체' = '카드') => {
    const newItem: FixedExpense = { id: genId(), label, amount, day, category, paymentMethod, createdAt: new Date().toISOString() }
    setFixedExpenses(prev => [newItem, ...prev])
    setDoc(doc(db, 'users', uid, 'fixedExpenses', newItem.id), newItem).catch(console.error)
  }, [uid])

  const updateFixedExpense = useCallback((id: string, updates: Partial<FixedExpense>) => {
    const finalUpdates = { ...updates, updatedAt: new Date().toISOString() }
    setFixedExpenses(prev => prev.map(f => f.id === id ? { ...f, ...finalUpdates } : f))
    updateDoc(doc(db, 'users', uid, 'fixedExpenses', id), finalUpdates).catch(console.error)
  }, [uid])

  const deleteFixedExpense = useCallback((id: string) => {
    setFixedExpenses(prev => {
      const item = prev.find(f => f.id === id)
      if (item) {
        const label = `${item.label} ${item.amount.toLocaleString()}원`
        setTrashedItems(curr => [{ id, type: 'fixedExpense' as const, label, deletedAt: Date.now() }, ...curr].sort((a,b)=>b.deletedAt-a.deletedAt))
      }
      return prev.filter(f => f.id !== id)
    })
    updateDoc(doc(db, 'users', uid, 'fixedExpenses', id), { isDeleted: true, deletedAt: Date.now() }).catch(console.error)
  }, [uid])

  const addCategoryKeyword = useCallback((categoryName: string, keyword: string) => {
    setExpenseCategories(prev => {
      const next = prev.map(c => {
        if (c.name === categoryName && !c.keywords.includes(keyword)) {
          const updated = { ...c, keywords: [...c.keywords, keyword] }
          setDoc(doc(db, 'users', uid, 'expenseCategories', c.name), { keywords: updated.keywords }, { merge: true }).catch(console.error)
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
          setDoc(doc(db, 'users', uid, 'expenseCategories', c.name), { keywords: updated.keywords }, { merge: true }).catch(console.error)
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

  const deleteCategory = useCallback((name: string) => {
    setExpenseCategories(prev => {
      const next = prev.filter(c => c.name !== name)
      deleteDoc(doc(db, 'users', uid, 'expenseCategories', name)).catch(console.error)
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

  const addAnniversary = useCallback((name: string, month: number, day: number) => {
    const newItem: Anniversary = { id: genId(), name, month, day, createdAt: new Date().toISOString() }
    setAnniversaries(prev => [...prev, newItem])
    setDoc(doc(db, 'users', uid, 'anniversaries', newItem.id), newItem).catch(console.error)
  }, [uid])

  const deleteAnniversary = useCallback((id: string) => {
    setAnniversaries(prev => prev.filter(a => a.id !== id))
    deleteDoc(doc(db, 'users', uid, 'anniversaries', id)).catch(console.error)
  }, [uid])

  const addMonthlyEvent = useCallback((name: string, day: number) => {
    const newItem: MonthlyEvent = { id: genId(), name, day, createdAt: new Date().toISOString() }
    setMonthlyEvents(prev => [...prev, newItem])
    setDoc(doc(db, 'users', uid, 'monthlyEvents', newItem.id), newItem).catch(console.error)
  }, [uid])

  const deleteMonthlyEvent = useCallback((id: string) => {
    setMonthlyEvents(prev => prev.filter(m => m.id !== id))
    deleteDoc(doc(db, 'users', uid, 'monthlyEvents', id)).catch(console.error)
  }, [uid])

  const unlockPrivate = async (pin: string) => {
    if (!pinHash) return false
    const inputHash = await hashPin(pin)
    if (inputHash === pinHash) {
      setIsPrivateUnlocked(true)
      sessionStorage.setItem('yuri-private-unlocked', 'true')
      return true
    }
    return false
  }

  const setPrivatePin = async (newPin: string) => {
    const hash = await hashPin(newPin)
    const settingsDocRef = doc(db, `users/${uid}/journal_settings/config`)
    await setDoc(settingsDocRef, { pinHash: hash }, { merge: true })
    setPinHash(hash)
    setIsPrivateUnlocked(true)
    sessionStorage.setItem('yuri-private-unlocked', 'true')
  }

  const lockPrivate = () => {
    setIsPrivateUnlocked(false)
    sessionStorage.removeItem('yuri-private-unlocked')
  }

  const resetPrivatePin = useCallback(async () => {
    setPinHash(null)
    setIsPrivateUnlocked(false)
    sessionStorage.removeItem('yuri-private-unlocked')
    await setDoc(doc(db, `users/${uid}/journal_settings/config`), { pinHash: null }, { merge: true })
  }, [uid])

  const updateHolidayConfig = useCallback((updater: (prev: HolidayConfig) => HolidayConfig) => {
    setHolidayConfig(prev => {
      const next = updater(prev)
      if (!uid) return next
      setDoc(doc(db, `users/${uid}/settings/config`), { holidayConfig: next }, { merge: true }).catch(console.error)
      return next
    })
  }, [uid])

  const restoreItem = useCallback(async (type: 'note'|'task'|'ledger'|'fixedExpense', id: string) => {
    let collectionName = ''
    if (type === 'note') collectionName = 'notes'
    if (type === 'task') collectionName = 'tasks'
    if (type === 'ledger') collectionName = 'ledger'
    if (type === 'fixedExpense') collectionName = 'fixedExpenses'

    setTrashedItems(prev => prev.filter(t => t.id !== id))
    
    try {
      const docRef = doc(db, 'users', uid, collectionName, id)
      const snap = await getDoc(docRef)
      if (snap.exists()) {
        const data = snap.data()
        delete data.isDeleted
        delete data.deletedAt
        
        await updateDoc(docRef, { isDeleted: deleteField(), deletedAt: deleteField() })
        
        if (type === 'note') setNotes(prev => [data as Note, ...prev])
        if (type === 'task') setTasks(prev => [...prev, data as Task].sort((a, b) => (a.order || 0) - (b.order || 0)))
        if (type === 'ledger') setLedger(prev => [data as LedgerEntry, ...prev])
        if (type === 'fixedExpense') setFixedExpenses(prev => [data as FixedExpense, ...prev])
      }
    } catch (err) {
      console.error(err)
    }
  }, [uid])

  const hardDeleteItem = useCallback(async (type: 'note'|'task'|'ledger'|'fixedExpense', id: string) => {
    let collectionName = ''
    if (type === 'note') collectionName = 'notes'
    if (type === 'task') collectionName = 'tasks'
    if (type === 'ledger') collectionName = 'ledger'
    if (type === 'fixedExpense') collectionName = 'fixedExpenses'

    if (type === 'note') {
      try {
        const docRef = doc(db, 'users', uid, 'notes', id)
        const snap = await getDoc(docRef)
        if (snap.exists()) {
          const data = snap.data()
          const urls = extractFirebaseImageUrls(data.text || '')
          if (urls.length > 0) {
            await deleteFirestoreImages(urls)
          }
        }
      } catch (err) {
        console.error(err)
      }
    }

    setTrashedItems(prev => prev.filter(t => t.id !== id))
    deleteDoc(doc(db, 'users', uid, collectionName, id)).catch(console.error)
  }, [uid])

  const setCardBillingDays = useCallback((start: number, end: number) => {
    setCardBillingStartDay(start)
    setCardBillingEndDay(end)
    setDoc(doc(db, `users/${uid}/settings/config`), { cardBillingStartDay: start, cardBillingEndDay: end }, { merge: true }).catch(console.error)
  }, [uid])

  const setPayday = useCallback((day: number) => {
    setPaydayState(day)
    setDoc(doc(db, `users/${uid}/settings/config`), { payday: day }, { merge: true }).catch(console.error)
  }, [uid])

  const updateSalaryRecord = useCallback((monthKey: string, amount: number) => {
    setSalaryRecords(prev => {
      const newRecord = { amount }
      setDoc(doc(db, `users/${uid}/salaryRecords/${monthKey}`), newRecord, { merge: true }).catch(console.error)
      return { ...prev, [monthKey]: newRecord }
    })
  }, [uid])

  const setCategoryOrder = useCallback((order: string[]) => {
    setCategoryOrderState(order)
    setDoc(doc(db, `users/${uid}/settings/config`), { categoryOrder: order }, { merge: true }).catch(console.error)
  }, [uid])

  const resetLedgerData = useCallback(async () => {
    if (!uid) return;
    try {
      const batch = writeBatch(db);
      
      const cols = ['ledger', 'cardBills', 'fixedExpenses'];
      for (const c of cols) {
        const snap = await getDocs(collection(db, 'users', uid, c));
        snap.forEach(docSnap => batch.delete(docSnap.ref));
      }
      
      batch.set(doc(db, `users/${uid}/settings/config`), {
        cardPaymentDay: 14,
        cardBillingStartDay: 28,
        cardBillingEndDay: 27,
        payday: 25
      }, { merge: true });
      
      await batch.commit();
      
      setLedger([]);
      setCardBills({});
      setFixedExpenses([]);
      setCardPaymentDayState(14);
      setCardBillingStartDay(28);
      setCardBillingEndDay(27);
      setPaydayState(25);
      
      alert('가계부 데이터가 성공적으로 초기화되었습니다.');
    } catch (e) {
      console.error(e);
      alert('데이터 초기화 실패: ' + e);
    }
  }, [uid]);

  return (
    <StoreCtx.Provider value={{
      isLoading, loadError,
      tasks, ledger, events, notes, fixedExpenses, expenseCategories, agendas, anniversaries, monthlyEvents, trashedItems,
      holidayConfig, updateHolidayConfig,
      addTask, toggleTask, updateTaskText, updateTaskNote, deleteTask,
      addLedgerEntry,
      updateLedgerEntry,
      deleteLedgerEntry,
      addEvent,
      updateEvent,
      deleteEvent,
      addNote, updateNote, deleteNote,
      navDate, setNavDate,
      addFixedExpense, updateFixedExpense, deleteFixedExpense,
      restoreItem, hardDeleteItem,
      addCategory, deleteCategory, addCategoryKeyword, removeCategoryKeyword,
      categoryOrder, setCategoryOrder,
      addAgenda, toggleAgenda, deleteAgenda,
      updateItemOrders,
      addAnniversary, deleteAnniversary,
      addMonthlyEvent, deleteMonthlyEvent,
      hasPin, isPrivateUnlocked, unlockPrivate, setPrivatePin, lockPrivate, resetPrivatePin,
      cardPaymentDay, setCardPaymentDay,
      cardBillingStartDay, cardBillingEndDay, setCardBillingDays,
      payday, setPayday, 
      salaryRecords, updateSalaryRecord,
      resetLedgerData,
      cardBills, updateCardBill,
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
