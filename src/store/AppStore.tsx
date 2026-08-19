import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import type { Task, LedgerEntry, ScheduleEvent, Note, FixedExpense, CategoryConfig, AgendaItem, Anniversary, MonthlyEvent, RecurringInstance } from '../types'
import { DEFAULT_EXPENSE_CATS } from '../utils/parser'
import { collection, getDocs, setDoc, updateDoc, deleteDoc, doc, writeBatch, getDoc, deleteField } from 'firebase/firestore'
import { db } from '../config/firebase'
import { extractFirebaseImageUrls, deleteFirestoreImages, cleanupRemovedImages } from '../utils/imageUtils'
import { calculateHolidays } from '../utils/holidays'
import { useToast } from '../components/common/Toast'

// ── Helpers ───────────────────────────────────────────────────────────────────
function genId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

export async function hashPin(pin: string): Promise<string> {
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
  metadata?: any
}
interface StoreValue {
  isSettingsLoading: boolean
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
  recurringInstances: RecurringInstance[]
  holidayConfig: HolidayConfig
  updateHolidayConfig: (updater: (prev: HolidayConfig) => HolidayConfig) => void
  deleteRecurringOccurrence: (ruleId: string, type: 'monthly' | 'yearly', name: string, date: string, instanceId?: string) => void
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
  addNote:        (text: string) => Promise<string | null>
  updateNote:     (id: string, text: string) => void
  deleteNote:     (id: string) => void
  loadNoteContent: (id: string) => Promise<string | null>
  navDate:        Date | null
  setNavDate:     (d: Date | null) => void
  addFixedExpense: (label: string, amount: number, day: number, category: string, paymentMethod?: '카드' | '계좌이체') => void
  updateFixedExpense: (id: string, updates: Partial<FixedExpense>) => void
  deleteFixedExpense: (id: string) => void
  restoreItem: (type: 'note' | 'task' | 'ledger' | 'fixedExpense', id: string) => void
  hardDeleteItem: (type: 'note' | 'task' | 'ledger' | 'fixedExpense', id: string) => void
  addCategory: (name: string, color?: string) => void
  updateCategory: (oldName: string, newName: string, color: string) => Promise<void>
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

  hasAppPin: boolean
  isAppUnlocked: boolean
  unlockApp: (pin: string) => Promise<boolean>
  setAppPin: (newPin: string) => Promise<void>
  removeAppPin: () => Promise<void>
}

const StoreCtx = createContext<StoreValue | null>(null)

// ── Provider ──────────────────────────────────────────────────────────────────
export const AppStoreProvider: React.FC<{ children: React.ReactNode, uid: string }> = ({ children, uid }) => {
  const { showToast } = useToast()
  const [isSettingsLoading, setIsSettingsLoading] = useState(true)
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
  const [recurringInstances, setRecurringInstances] = useState<RecurringInstance[]>([])
  
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

  const [appPinHash, setAppPinHash] = useState<string | null>(() => {
    return localStorage.getItem(`yuri-appPinHash-${uid}`)
  })
  const hasAppPin = appPinHash !== null
  const [isAppUnlocked, setIsAppUnlocked] = useState(() => {
    return sessionStorage.getItem('yuri-app-unlocked') === 'true'
  })

  useEffect(() => {
    const handleUnlock = () => setIsAppUnlocked(true);
    window.addEventListener('app-unlocked', handleUnlock);
    return () => window.removeEventListener('app-unlocked', handleUnlock);
  }, []);

  const [navDate, setNavDate] = useState<Date | null>(null)

  useEffect(() => {
    let isMounted = true
    async function loadData() {
      console.time('[AppStore] 1. Total Initial Load Time')
      try {
        const CACHE_KEY = `yuri-calendar-cache-${uid}`
        try {
          const cachedStr = localStorage.getItem(CACHE_KEY)
          if (cachedStr) {
            const cached = JSON.parse(cachedStr)
            
            // 1. Settings
            if (cached.journal_settings) {
              setPinHash(cached.journal_settings.pinHash || null)
            } else {
              setPinHash(null)
            }
            if (cached.settings) {
              const data = cached.settings
              setCardPaymentDayState(data.cardPaymentDay || 14)
              setCardBillingStartDay(data.cardBillingStartDay || 28)
              setCardBillingEndDay(data.cardBillingEndDay || 27)
              setPaydayState(data.payday || 25)
              setCategoryOrderState(data.categoryOrder || [])
              setAppPinHash(data.appPinHash || null)
              if (data.appPinHash) localStorage.setItem(`yuri-appPinHash-${uid}`, data.appPinHash)
              else localStorage.removeItem(`yuri-appPinHash-${uid}`)
              if (data.holidayConfig) setHolidayConfig(data.holidayConfig)
            }
            setIsSettingsLoading(false)

            // 2. Calendar Collections (assume cached tasks are already filtered)
            if (cached.tasks) setTasks(cached.tasks)
            if (cached.events) setEvents(cached.events)
            if (cached.anniversaries) setAnniversaries(cached.anniversaries)
            if (cached.monthlyEvents) setMonthlyEvents(cached.monthlyEvents)
            if (cached.agendas) setAgendas(cached.agendas)
            if (cached.recurringInstances) setRecurringInstances(cached.recurringInstances)
            
            setIsLoading(false)
            console.log('[AppStore] Loaded from LocalStorage cache')
          }
        } catch (e) {
          console.warn('Failed to parse cache', e)
        }

        // Fetch from Firestore (Background Update)
        const fetchCol = async (colName: string) => {
          console.time(`[Perf] Fetch ${colName}`)
          performance.mark(`fetch-${colName}-start`)
          const snap = await getDocs(collection(db, 'users', uid, colName))
          performance.mark(`fetch-${colName}-end`)
          performance.measure(`Fetch Collection: ${colName}`, `fetch-${colName}-start`, `fetch-${colName}-end`)
          console.timeEnd(`[Perf] Fetch ${colName}`)
          return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any))
        }

        const fetchDocWithLog = async (docPath: string, name: string) => {
          console.time(`[Perf] Fetch Doc ${name}`)
          performance.mark(`fetch-doc-${name}-start`)
          const snap = await getDoc(doc(db, docPath))
          performance.mark(`fetch-doc-${name}-end`)
          performance.measure(`Fetch Doc: ${name}`, `fetch-doc-${name}-start`, `fetch-doc-${name}-end`)
          console.timeEnd(`[Perf] Fetch Doc ${name}`)
          return snap
        }
        
        console.time('[Perf] Total Promise.all Load Time')
        performance.mark('promise-all-start')
        
        const [
          [settingsSnap, settingsDoc],
          [
            fetchedTasks,
            fetchedEvents,
            fetchedAnnivs,
            fetchedMonthly,
            fetchedAgendas,
            fetchedRecurringInstances
          ]
        ] = await Promise.all([
          Promise.all([
            fetchDocWithLog(`users/${uid}/journal_settings/config`, 'journal_settings'),
            fetchDocWithLog(`users/${uid}/settings/config`, 'settings')
          ]),
          Promise.all([
            fetchCol('tasks'),
            fetchCol('events'),
            fetchCol('anniversaries'),
            fetchCol('monthlyEvents'),
            fetchCol('agendas'),
            fetchCol('recurringInstances')
          ])
        ])

        performance.mark('promise-all-end')
        performance.measure('Total Promise.all Time', 'promise-all-start', 'promise-all-end')
        console.timeEnd('[Perf] Total Promise.all Load Time')

        if (settingsSnap.exists()) {
          setPinHash(settingsSnap.data().pinHash || null)
        } else {
          setPinHash(null)
        }
        
        if (settingsDoc.exists()) {
          const data = settingsDoc.data()
          setCardPaymentDayState(data.cardPaymentDay || 14)
          setCardBillingStartDay(data.cardBillingStartDay || 28)
          setCardBillingEndDay(data.cardBillingEndDay || 27)
          setPaydayState(data.payday || 25)
          setCategoryOrderState(data.categoryOrder || [])
          setAppPinHash(data.appPinHash || null)
          if (data.appPinHash) {
            localStorage.setItem(`yuri-appPinHash-${uid}`, data.appPinHash)
          } else {
            localStorage.removeItem(`yuri-appPinHash-${uid}`)
          }
          if (data.holidayConfig) setHolidayConfig(data.holidayConfig)
        }
        
        setIsSettingsLoading(false)

        const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
        const nowMs = Date.now();
        const batch = writeBatch(db);
        let hasHardDeletes = false;

        const processItems = (items: any[], type: 'note' | 'task' | 'ledger' | 'fixedExpense', labelExtractor: (item: any) => string, currentBatch: any) => {
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
                currentBatch.delete(doc(db, 'users', uid, colName, item.id));
                hasHardDeletes = true;
              } else {
                trashed.push({ id: item.id, type, label: labelExtractor(item), deletedAt: item.deletedAt || 0, metadata: item });
              }
            } else {
              active.push(item);
            }
          });
          return { active, trashed };
        };

        const tasksData = processItems(fetchedTasks, 'task', t => t.text, batch);
        
        if (hasHardDeletes) {
          batch.commit().catch(console.error);
        }

        if (isMounted) {
          const finalTasks = (tasksData.active as Task[]).sort((a, b) => (a.order || 0) - (b.order || 0))
          const finalEvents = (fetchedEvents as ScheduleEvent[]).sort((a, b) => (a.order || 0) - (b.order || 0))
          
          setTasks(finalTasks)
          setEvents(finalEvents)
          setAnniversaries(fetchedAnnivs as Anniversary[])
          setMonthlyEvents(fetchedMonthly as MonthlyEvent[])
          setAgendas(fetchedAgendas as AgendaItem[])
          setRecurringInstances(fetchedRecurringInstances as RecurringInstance[])
          
          try {
            const cacheData = {
              journal_settings: settingsSnap.exists() ? settingsSnap.data() : null,
              settings: settingsDoc.exists() ? settingsDoc.data() : null,
              tasks: finalTasks,
              events: finalEvents,
              anniversaries: fetchedAnnivs,
              monthlyEvents: fetchedMonthly,
              agendas: fetchedAgendas,
              recurringInstances: fetchedRecurringInstances
            }
            localStorage.setItem(`yuri-calendar-cache-${uid}`, JSON.stringify(cacheData))
            console.log('[AppStore] Saved to LocalStorage cache')
          } catch (e) {
            console.warn('Failed to save cache', e)
          }
          
          console.timeEnd('[AppStore] 3. Essential 6 Collections Load Time')
          console.timeEnd('[AppStore] 1. Total Initial Load Time')
          console.time('[MobileApp] Calendar UI Rendered')
          
          performance.mark('react-render-start')
          setIsLoading(false)
        }

        console.time('[AppStore] 4. Background 6 Collections Load Time')
        // Background load for non-essential tabs
        Promise.all([
          fetchCol('ledger'),
          fetchCol('notes'),
          fetchCol('fixedExpenses'),
          fetchCol('expenseCategories'),
          fetchCol('cardBills'),
          fetchCol('salaryRecords')
        ]).then(([
          fetchedLedger,
          fetchedNotes,
          fetchedFixedExpenses,
          fetchedExpenseCats,
          fetchedCardBills,
          fetchedSalaryRecords
        ]) => {
          if (!isMounted) return
          
          const mergedCats = DEFAULT_EXPENSE_CATS.map(defCat => {
            const fetched = fetchedExpenseCats.find((c: any) => c.name === defCat.name) as any
            return fetched ? { ...defCat, keywords: fetched.keywords || [] } : defCat
          })
          const customCats = fetchedExpenseCats.filter((c: any) => !DEFAULT_EXPENSE_CATS.some(defCat => defCat.name === c.name)) as CategoryConfig[]
          const finalCats = [...mergedCats, ...customCats]

          const bgBatch = writeBatch(db);
          let bgHasDeletesOrMigration = false;

          fetchedLedger.forEach((item: any) => {
            if (item.category === '저축' && (item.label.includes('보험') || item.label.includes('보험료'))) {
              bgBatch.update(doc(db, 'users', uid, 'ledger', item.id), { category: '보험' });
              item.category = '보험';
              bgHasDeletesOrMigration = true;
            }
          });
          fetchedFixedExpenses.forEach((item: any) => {
            if (item.category === '저축' && (item.label.includes('보험') || item.label.includes('보험료'))) {
              bgBatch.update(doc(db, 'users', uid, 'fixedExpenses', item.id), { category: '보험' });
              item.category = '보험';
              bgHasDeletesOrMigration = true;
            }
          });

          const notesData = processItems(fetchedNotes, 'note', n => {
            if (n.textPreview) return n.textPreview.slice(0, 30);
            return (n.text || '').trim().split('\n')[0].slice(0, 30) || '새로운 메모';
          }, bgBatch);
          
          const ledgerData = processItems(fetchedLedger, 'ledger', l => {
            const dateStr = l.scheduledDate ? new Date(l.scheduledDate).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' }) : '';
            return `${dateStr} ${l.label} ${l.amount.toLocaleString()}원`.trim();
          }, bgBatch);
          
          const fixedExpData = processItems(fetchedFixedExpenses, 'fixedExpense', f => `${f.label} ${f.amount.toLocaleString()}원`, bgBatch);

          if (hasHardDeletes || bgHasDeletesOrMigration) {
            bgBatch.commit().catch(console.error);
          }

          const allTrashed = [...notesData.trashed, ...tasksData.trashed, ...ledgerData.trashed, ...fixedExpData.trashed];
          setTrashedItems(allTrashed.sort((a, b) => b.deletedAt - a.deletedAt));

          setLedger(ledgerData.active as LedgerEntry[])
          setNotes(notesData.active as Note[])
          setFixedExpenses(fixedExpData.active as FixedExpense[])
          setExpenseCategories(finalCats)
          
          const billsMap: Record<string, { amount: number, memo?: string }> = {}
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
          setCardBills(billsMap)
          
          const salaryMap: Record<string, { amount: number }> = {}
          ;(fetchedSalaryRecords as any[]).forEach((s: any) => {
            if (s.id && s.amount !== undefined) {
              salaryMap[s.id] = { amount: Number(s.amount) }
            }
          })
          setSalaryRecords(salaryMap)

          console.timeEnd('[AppStore] 4. Background 6 Collections Load Time')

        }).catch(err => {
          console.error("Background load error:", err)
        })

      } catch (err: any) {
        console.error("Firebase load error:", err)
        if (isMounted) setLoadError(err.message || '데이터를 불러오는 중 알 수 없는 오류가 발생했습니다.')
      }
    }
    
    loadData()
    return () => { isMounted = false }
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
        }) || trashedItems.some(t => {
          if (t.type !== 'ledger' || !t.metadata) return false
          if (t.metadata.fixedExpenseId !== fe.id) return false
          const lDate = new Date(t.metadata.scheduledDate || t.metadata.createdAt)
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
  }, [fixedExpenses, ledger, trashedItems, isLoading, uid])

  // Backfill recurring instances (async)
  useEffect(() => {
    if (isLoading) return;
    
    // De-duplicate fast exit check
    const existingKeys = new Set(recurringInstances.map(i => `${i.sourceRuleId}_${i.date}`));
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // To handle holiday checks over many years, cache the loaded years
    const holidayCache: Record<number, Record<string, any>> = {};
    const getHolidayInfo = (y: number) => {
      if (!holidayCache[y]) {
        const autoH = calculateHolidays(y);
        const merged: Record<string, any> = {};
        for (const [date, info] of Object.entries(autoH)) {
          if (holidayConfig.hiddenRules.includes(info.name)) continue;
          if (holidayConfig.hiddenDates.includes(date)) continue;
          merged[date] = { ...info, isRedDay: true };
        }
        const yPrefix = `${y}-`;
        for (const custom of holidayConfig.customHolidays) {
          if (custom.date.startsWith(yPrefix)) {
            merged[custom.date] = custom;
          }
        }
        holidayCache[y] = merged;
      }
      return holidayCache[y];
    };
    
    const isWorkingDay = (dt: Date) => {
      const w = dt.getDay();
      if (w === 0 || w === 6) return false;
      const y = dt.getFullYear();
      const ds = `${y}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
      const hInfo = getHolidayInfo(y);
      if (hInfo[ds]?.isRedDay) return false;
      return true;
    };
    
    const calcAdjustedMonthly = (y: number, m: number, evDay: number) => {
      const lastDate = new Date(y, m + 1, 0).getDate();
      let target = Math.min(evDay, lastDate);
      let dt = new Date(y, m, target);
      let safety = 0;
      while (!isWorkingDay(dt) && safety < 30) {
        if (evDay === 1) dt.setDate(dt.getDate() + 1);
        else dt.setDate(dt.getDate() - 1);
        safety++;
      }
      return dt;
    };

    const missingInstances: RecurringInstance[] = [];

    // Monthly
    monthlyEvents.forEach(rule => {
      const startDt = new Date(rule.createdAt);
      let curY = startDt.getFullYear();
      let curM = startDt.getMonth();
      const endY = today.getFullYear();
      const endM = today.getMonth();
      
      while (curY < endY || (curY === endY && curM <= endM)) {
        const dt = calcAdjustedMonthly(curY, curM, rule.day);
        if (dt <= today) {
          const dtStr = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
          const key = `${rule.id}_${dtStr}`;
          if (!existingKeys.has(key)) {
            missingInstances.push({
              id: genId(),
              sourceRuleId: rule.id,
              sourceType: 'monthly',
              name: rule.name,
              date: dtStr,
              status: 'materialized'
            });
            existingKeys.add(key);
          }
        }
        curM++;
        if (curM > 11) { curM = 0; curY++; }
      }
    });

    // Yearly
    anniversaries.forEach(rule => {
      const startDt = new Date(rule.createdAt);
      let curY = startDt.getFullYear();
      const endY = today.getFullYear();
      
      while (curY <= endY) {
        const dt = new Date(curY, rule.month - 1, rule.day);
        if (dt <= today) {
          const dtStr = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
          const key = `${rule.id}_${dtStr}`;
          if (!existingKeys.has(key)) {
            missingInstances.push({
              id: genId(),
              sourceRuleId: rule.id,
              sourceType: 'yearly',
              name: rule.name,
              date: dtStr,
              status: 'materialized'
            });
            existingKeys.add(key);
          }
        }
        curY++;
      }
    });

    if (missingInstances.length > 0) {
      console.log('[AppStore] Backfilling missing instances:', missingInstances.length);
      const batch = writeBatch(db);
      missingInstances.forEach(inst => {
        batch.set(doc(db, 'users', uid, 'recurringInstances', inst.id), inst);
      });
      batch.commit().catch(console.error);
      setRecurringInstances(prev => [...prev, ...missingInstances]);
    }
  }, [isLoading]); // Intentionally run only once after loading

  const addTask = useCallback(async (text: string) => {
    const now = new Date().toISOString()
    const { extractSearchText } = await import('../utils/textUtils')
    const minOrder = tasks.length > 0 ? Math.min(...tasks.map(t => t.order ?? Date.now())) : Date.now()
    const newItem: Task = { id: genId(), text, searchText: extractSearchText(text), done: false, createdAt: now, updatedAt: now, order: minOrder - 1 }
    
    // Optimistic Update
    setTasks(prev => [newItem, ...prev])
    showToast('업무가 추가되었습니다.', 'success')

    try {
      await setDoc(doc(db, 'users', uid, 'tasks', newItem.id), newItem)
    } catch (err) {
      console.error(err)
      showToast('저장에 실패했습니다. 다시 시도해주세요.', 'error', 4000)
      setTasks(prev => prev.map(t => t.id === newItem.id ? { ...t, _isRollback: true } : t))
      setTimeout(() => {
        setTasks(prev => prev.filter(t => t.id !== newItem.id))
      }, 500)
    }
  }, [tasks, uid, showToast])

  const toggleTask = useCallback(async (id: string) => {
    const updatedAt = new Date().toISOString()
    let previousDone: boolean | null = null
    
    setTasks(prev => {
      const task = prev.find(t => t.id === id)
      if (task) previousDone = task.done
      return prev.map(t => t.id === id ? { ...t, done: !t.done, updatedAt } : t)
    })
    
    if (previousDone !== null) {
      try {
        await updateDoc(doc(db, 'users', uid, 'tasks', id), { done: !previousDone, updatedAt })
      } catch (err) {
        console.error(err)
        showToast('네트워크 오류로 변경사항이 취소되었습니다.', 'error')
        setTasks(prev => prev.map(t => t.id === id ? { ...t, done: previousDone!, updatedAt } : t))
      }
    }
  }, [uid, showToast])

  const updateTaskNote = useCallback(async (id: string, note: string) => {
    const updatedAt = new Date().toISOString()
    const { extractSearchText } = await import('../utils/textUtils')
    setTasks(prev => {
      const task = prev.find(t => t.id === id)
      if (!task) return prev
      const searchText = extractSearchText(task.text + ' ' + note)
      const next = prev.map(t => t.id === id ? { ...t, note, searchText, updatedAt } : t)
      updateDoc(doc(db, 'users', uid, 'tasks', id), { note, searchText, updatedAt }).catch(console.error)
      return next
    })
  }, [uid])

  const updateTaskText = useCallback(async (id: string, text: string) => {
    const updatedAt = new Date().toISOString()
    const { extractSearchText } = await import('../utils/textUtils')
    setTasks(prev => {
      const task = prev.find(t => t.id === id)
      if (!task) return prev
      const searchText = extractSearchText(text + ' ' + (task.note || ''))
      const next = prev.map(t => t.id === id ? { ...t, text, searchText, updatedAt } : t)
      updateDoc(doc(db, 'users', uid, 'tasks', id), { text, searchText, updatedAt }).catch(console.error)
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

  const addLedgerEntry = useCallback(async (text: string, amount: number, type: 'income' | 'expense', category: string, date?: string, paymentMethod?: '카드' | '계좌이체', memo?: string) => {
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

    // Optimistic Update
    setLedger(prev => [...prev, newEntry as LedgerEntry])
    showToast('가계부 내역이 추가되었습니다.', 'success')

    try {
      await setDoc(doc(db, 'users', uid, 'ledger', id), newEntry)
    } catch (err) {
      console.error(err)
      showToast('저장에 실패했습니다. 다시 시도해주세요.', 'error', 4000)
      // Rollback with visual cue
      setLedger(prev => prev.map(l => l.id === id ? { ...l, _isRollback: true } : l))
      setTimeout(() => {
        setLedger(prev => prev.filter(l => l.id !== id))
      }, 500)
    }
  }, [uid, showToast])

  const updateLedgerEntry = useCallback((id: string, updates: Partial<LedgerEntry>) => {
    let previousEntry: LedgerEntry | undefined
    setLedger(prev => {
      previousEntry = prev.find(l => l.id === id)
      return prev.map(l => l.id === id ? { ...l, ...updates } : l)
    })
    
    const sanitizedUpdates: any = { ...updates }
    Object.keys(sanitizedUpdates).forEach(k => {
      if (sanitizedUpdates[k] === undefined) {
        delete sanitizedUpdates[k]
      }
    })
    
    updateDoc(doc(db, 'users', uid, 'ledger', id), sanitizedUpdates).catch(err => {
      console.error(err)
      showToast('저장에 실패했습니다.', 'error')
      if (previousEntry) {
        setLedger(prev => prev.map(l => l.id === id ? previousEntry! : l))
      }
    })
  }, [uid, showToast])

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
    const newItem: any = { id: genId(), text, createdAt: new Date().toISOString(), order: events.length }
    if (scheduledDate) newItem.scheduledDate = scheduledDate
    if (color) newItem.color = color
    
    // Optimistic Update
    setEvents(prev => [newItem as ScheduleEvent, ...prev])
    showToast('일정이 추가되었습니다.', 'success')

    try {
      await setDoc(doc(db, 'users', uid, 'events', newItem.id), newItem)
    } catch (err) {
      console.error(err)
      showToast('저장에 실패했습니다. 다시 시도해주세요.', 'error', 4000)
      setEvents(prev => prev.map(e => e.id === newItem.id ? { ...e, _isRollback: true } : e))
      setTimeout(() => {
        setEvents(prev => prev.filter(e => e.id !== newItem.id))
      }, 500)
      throw err
    }
  }, [events.length, uid, showToast])

  const updateEvent = useCallback((id: string, updates: Partial<ScheduleEvent>) => {
    setEvents(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e))
    updateDoc(doc(db, 'users', uid, 'events', id), updates).catch(console.error)
  }, [uid])

  const deleteEvent = useCallback((id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id))
    deleteDoc(doc(db, 'users', uid, 'events', id)).catch(console.error)
  }, [uid])

  const addNote = useCallback(async (text: string) => {
    const now = new Date().toISOString()
    const { extractPreview, extractSearchText } = await import('../utils/textUtils')
    const textPreview = extractPreview(text)
    const searchText = extractSearchText(text)
    
    // Note list item (lightweight)
    const newItem: Note = { id: genId(), text: '', textPreview, searchText, hasContentDoc: true, createdAt: now, updatedAt: now }
    
    // Optimistic Update
    setNotes(prev => [{...newItem, text, isFullyLoaded: true}, ...prev])
    showToast('메모가 추가되었습니다.', 'success')

    try {
      await Promise.all([
        setDoc(doc(db, 'users', uid, 'notes', newItem.id), newItem),
        setDoc(doc(db, 'users', uid, 'note_contents', newItem.id), { text })
      ])
      return newItem.id
    } catch (err) {
      console.error(err)
      showToast('저장에 실패했습니다. 다시 시도해주세요.', 'error', 4000)
      setNotes(prev => prev.map(n => n.id === newItem.id ? { ...n, _isRollback: true } : n))
      setTimeout(() => {
        setNotes(prev => prev.filter(n => n.id !== newItem.id))
      }, 500)
      return null
    }
  }, [uid, showToast])

  const updateNote = useCallback(async (id: string, text: string) => {
    const updatedAt = new Date().toISOString()
    const { extractPreview, extractSearchText } = await import('../utils/textUtils')
    const textPreview = extractPreview(text)
    const searchText = extractSearchText(text)
    
    setNotes(prev => {
      const oldNote = prev.find(n => n.id === id)
      if (oldNote) {
        cleanupRemovedImages(oldNote.text, text).catch(console.error)
      }
      return prev.map(n => n.id === id ? { ...n, text, textPreview, searchText, hasContentDoc: true, updatedAt, isFullyLoaded: true } : n)
    })
    
    updateDoc(doc(db, 'users', uid, 'notes', id), { textPreview, searchText, hasContentDoc: true, updatedAt }).catch(console.error)
    setDoc(doc(db, 'users', uid, 'note_contents', id), { text }, { merge: true }).catch(console.error)
  }, [uid])

  const loadNoteContent = useCallback(async (id: string) => {
    if (!uid) return null
    try {
      const snap = await getDoc(doc(db, 'users', uid, 'note_contents', id))
      if (snap.exists() && snap.data().text !== undefined) {
        const text = snap.data().text as string
        const { repairCorruptedHtml } = await import('../utils/textUtils')
        return repairCorruptedHtml(text)
      }
      return null
    } catch (e) {
      console.error('Failed to load note content:', e)
      return null
    }
  }, [uid])

  const deleteNote = useCallback((id: string) => {
    setNotes(prev => {
      const item = prev.find(n => n.id === id)
      if (item) {
        const label = item.textPreview ? item.textPreview.slice(0, 30) : (item.text.trim().split('\n')[0].slice(0, 30) || '새로운 메모')
        setTrashedItems(curr => [{ id, type: 'note' as const, label, deletedAt: Date.now() }, ...curr].sort((a,b)=>b.deletedAt-a.deletedAt))
      }
      return prev.filter(n => n.id !== id)
    })
    updateDoc(doc(db, 'users', uid, 'notes', id), { isDeleted: true, deletedAt: Date.now() }).catch(console.error)
    updateDoc(doc(db, 'users', uid, 'note_contents', id), { isDeleted: true, deletedAt: Date.now() }).catch(console.error)
  }, [uid])


  const addFixedExpense = useCallback(async (label: string, amount: number, day: number, category: string, paymentMethod?: '카드' | '계좌이체') => {
    const newItem: FixedExpense = { id: genId(), label, amount, day, category, paymentMethod, createdAt: new Date().toISOString() }
    try {
      await setDoc(doc(db, 'users', uid, 'fixedExpenses', newItem.id), newItem)
      setFixedExpenses(prev => [...prev, newItem])
      showToast('고정지출이 추가되었습니다.', 'success')
    } catch (err) {
      console.error(err)
      showToast('저장에 실패했습니다.', 'error')
    }
  }, [uid, showToast])

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

  const addCategory = useCallback((name: string, color?: string) => {
    setExpenseCategories(prev => {
      if (prev.some(c => c.name === name)) return prev
      const newItem = { name, keywords: [], color }
      const next = [...prev, newItem]
      setDoc(doc(db, 'users', uid, 'expenseCategories', name), newItem).catch(console.error)
      return next
    })
  }, [uid])

  const updateCategory = useCallback(async (oldName: string, newName: string, color: string) => {
    let updatedKeywords: string[] = []
    setExpenseCategories(prev => {
      const existing = prev.find(c => c.name === oldName)
      updatedKeywords = existing ? existing.keywords : []
      if (oldName !== newName) {
        deleteDoc(doc(db, 'users', uid, 'expenseCategories', oldName)).catch(console.error)
      }
      const newItem = { name: newName, keywords: updatedKeywords, color }
      setDoc(doc(db, 'users', uid, 'expenseCategories', newName), newItem).catch(console.error)
      
      const next = prev.filter(c => c.name !== oldName)
      next.push(newItem)
      return next
    })

    if (oldName !== newName) {
      setLedger(prev => {
        const next = [...prev]
        next.forEach(e => {
          if (e.category === oldName) {
            e.category = newName
            setDoc(doc(db, 'users', uid, 'ledger', e.id), { category: newName }, { merge: true }).catch(console.error)
          }
        })
        return next
      })

      setFixedExpenses(prev => {
        const next = [...prev]
        next.forEach(fe => {
          if (fe.category === oldName) {
            fe.category = newName
            setDoc(doc(db, 'users', uid, 'fixedExpenses', fe.id), { category: newName }, { merge: true }).catch(console.error)
          }
        })
        return next
      })
      
      setCategoryOrderState(prev => {
        if (!prev.includes(oldName)) return prev
        const next = prev.map((c: string) => c === oldName ? newName : c)
        setDoc(doc(db, 'users', uid, 'settings', 'categoryOrder'), { order: next }).catch(console.error)
        return next
      })
    }
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

  const toggleAgenda = useCallback(async (id: string) => {
    let previousDone: boolean | null = null
    
    setAgendas(prev => {
      const agenda = prev.find(a => a.id === id)
      if (agenda) previousDone = agenda.done
      return prev.map(a => a.id === id ? { ...a, done: !a.done } : a)
    })
    
    if (previousDone !== null) {
      try {
        await updateDoc(doc(db, 'users', uid, 'agendas', id), { done: !previousDone })
      } catch (err) {
        console.error(err)
        showToast('네트워크 오류로 변경사항이 취소되었습니다.', 'error')
        setAgendas(prev => prev.map(a => a.id === id ? { ...a, done: previousDone! } : a))
      }
    }
  }, [uid, showToast])

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

    const now = new Date()
    if (now.getMonth() + 1 === month && now.getDate() === day) {
      const dtStr = `${now.getFullYear()}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const newInst: RecurringInstance = {
        id: genId(),
        sourceRuleId: newItem.id,
        sourceType: 'yearly',
        name,
        date: dtStr,
        status: 'materialized'
      }
      setRecurringInstances(prev => [...prev, newInst])
      setDoc(doc(db, 'users', uid, 'recurringInstances', newInst.id), newInst).catch(console.error)
    }
  }, [uid])

  const deleteAnniversary = useCallback((id: string) => {
    setAnniversaries(prev => prev.filter(a => a.id !== id))
    deleteDoc(doc(db, 'users', uid, 'anniversaries', id)).catch(console.error)
  }, [uid])

  const addMonthlyEvent = useCallback((name: string, day: number) => {
    const newItem: MonthlyEvent = { id: genId(), name, day, createdAt: new Date().toISOString() }
    setMonthlyEvents(prev => [...prev, newItem])
    setDoc(doc(db, 'users', uid, 'monthlyEvents', newItem.id), newItem).catch(console.error)

    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    
    const autoH = calculateHolidays(y);
    const merged: Record<string, any> = {};
    for (const [date, info] of Object.entries(autoH)) {
      if (holidayConfig.hiddenRules.includes(info.name)) continue;
      if (holidayConfig.hiddenDates.includes(date)) continue;
      merged[date] = { ...info, isRedDay: true };
    }
    const yPrefix = `${y}-`;
    for (const custom of holidayConfig.customHolidays) {
      if (custom.date.startsWith(yPrefix)) merged[custom.date] = custom;
    }
    
    const isW = (dt: Date) => {
      const w = dt.getDay();
      if (w === 0 || w === 6) return false;
      const ds = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
      if (merged[ds]?.isRedDay) return false;
      return true;
    };
    
    const lastDate = new Date(y, m + 1, 0).getDate();
    let target = Math.min(day, lastDate);
    let dt = new Date(y, m, target);
    let safety = 0;
    while (!isW(dt) && safety < 30) {
      if (day === 1) dt.setDate(dt.getDate() + 1);
      else dt.setDate(dt.getDate() - 1);
      safety++;
    }
    
    if (dt.getFullYear() === y && dt.getMonth() === m && dt.getDate() === now.getDate()) {
      const dtStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
      const newInst: RecurringInstance = {
        id: genId(),
        sourceRuleId: newItem.id,
        sourceType: 'monthly',
        name,
        date: dtStr,
        status: 'materialized'
      }
      setRecurringInstances(prev => [...prev, newInst])
      setDoc(doc(db, 'users', uid, 'recurringInstances', newInst.id), newInst).catch(console.error)
    }
  }, [uid, holidayConfig])

  const deleteMonthlyEvent = useCallback((id: string) => {
    setMonthlyEvents(prev => prev.filter(m => m.id !== id))
    deleteDoc(doc(db, 'users', uid, 'monthlyEvents', id)).catch(console.error)
  }, [uid])

  const deleteRecurringOccurrence = useCallback((ruleId: string, type: 'monthly' | 'yearly', name: string, date: string, instanceId?: string) => {
    if (instanceId) {
      setRecurringInstances(prev => prev.filter(i => i.id !== instanceId))
      deleteDoc(doc(db, 'users', uid, 'recurringInstances', instanceId)).catch(console.error)
    } else {
      const newInst: RecurringInstance = {
        id: genId(),
        sourceRuleId: ruleId,
        sourceType: type,
        name,
        date,
        status: 'excluded'
      }
      setRecurringInstances(prev => [...prev, newInst])
      setDoc(doc(db, 'users', uid, 'recurringInstances', newInst.id), newInst).catch(console.error)
    }
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

  const unlockApp = async (pin: string) => {
    if (!appPinHash) return false
    const inputHash = await hashPin(pin)
    if (inputHash === appPinHash) {
      setIsAppUnlocked(true)
      sessionStorage.setItem('yuri-app-unlocked', 'true')
      return true
    }
    return false
  }

  const setAppPin = async (newPin: string) => {
    const hash = await hashPin(newPin)
    await setDoc(doc(db, `users/${uid}/settings/config`), { appPinHash: hash }, { merge: true })
    setAppPinHash(hash)
    localStorage.setItem(`yuri-appPinHash-${uid}`, hash)
    setIsAppUnlocked(true)
    sessionStorage.setItem('yuri-app-unlocked', 'true')
  }

  const removeAppPin = useCallback(async () => {
    setAppPinHash(null)
    localStorage.removeItem(`yuri-appPinHash-${uid}`)
    setIsAppUnlocked(false)
    sessionStorage.removeItem('yuri-app-unlocked')
    await setDoc(doc(db, `users/${uid}/settings/config`), { appPinHash: null }, { merge: true })
  }, [uid])

  const updateHolidayConfig = useCallback(async (updater: (prev: HolidayConfig) => HolidayConfig) => {
    try {
      const nextConfig = updater(holidayConfig)
      await setDoc(doc(db, `users/${uid}/settings/config`), { holidayConfig: nextConfig }, { merge: true })
      setHolidayConfig(nextConfig)
      showToast('공휴일 설정이 저장되었습니다.', 'success')
    } catch (err) {
      console.error(err)
      showToast('저장에 실패했습니다.', 'error')
    }
  }, [uid, holidayConfig, showToast])

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
      
      showToast('가계부 데이터가 초기화되었습니다.', 'success');
    } catch (e: any) {
      console.error(e);
      showToast('데이터 초기화에 실패했습니다.', 'error');
    }
  }, [uid, showToast]);

  return (
    <StoreCtx.Provider value={{
      isSettingsLoading,
      isLoading, loadError,
      tasks, ledger, events, notes, fixedExpenses, expenseCategories, agendas, anniversaries, monthlyEvents, recurringInstances, trashedItems,
      holidayConfig, updateHolidayConfig,
      addTask, toggleTask, updateTaskText, updateTaskNote, deleteTask,
      addLedgerEntry,
      updateLedgerEntry,
      deleteLedgerEntry,
      addEvent,
      updateEvent,
      deleteEvent,
      addNote, updateNote, deleteNote, loadNoteContent,
      navDate, setNavDate,
      addFixedExpense, updateFixedExpense, deleteFixedExpense,
      restoreItem, hardDeleteItem,
      addCategory, updateCategory, deleteCategory, addCategoryKeyword, removeCategoryKeyword,
      categoryOrder, setCategoryOrder,
      addAgenda, toggleAgenda, deleteAgenda,
      updateItemOrders,
      addAnniversary, deleteAnniversary,
      addMonthlyEvent, deleteMonthlyEvent,
      deleteRecurringOccurrence,
      hasPin, isPrivateUnlocked, unlockPrivate, setPrivatePin, lockPrivate, resetPrivatePin,
      hasAppPin, isAppUnlocked, unlockApp, setAppPin, removeAppPin,
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
