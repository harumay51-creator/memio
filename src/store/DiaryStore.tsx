import React, { createContext, useContext, useState, useEffect } from 'react'
import { collection, doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore'
import { db } from '../config/firebase'
import { useToast } from '../components/common/Toast'

export interface DiaryQuestionAnswer {
  questionId: string
  question: string
  answer: string
}

export interface DiaryMemo {
  id: string
  text: string
  tags?: string[]
  createdAt: number
}

export interface DayDiary {
  dateKey: string // YYYY-MM-DD
  emojis: string[] // up to 3
  answers: DiaryQuestionAnswer[]
  memos: DiaryMemo[]
  routineStates?: Record<string, { checked: boolean, memo?: string, updatedAt?: string }>
}

export interface MonthlyDiary {
  monthKey: string // YYYY-MM
  text: string
}

export interface RoutineItem {
  id: string
  text: string
}

export interface RoutineGroup {
  id: string
  name: string
  items: RoutineItem[]
}

export interface DiarySettings {
  questions: { id: string, text: string }[]
  theme?: 'default' | 'aurora' | 'y2k'
  routineGroups?: RoutineGroup[]
}

interface DiaryStoreValue {
  diaries: Record<string, DayDiary>
  monthlyDiaries: Record<string, MonthlyDiary>
  settings: DiarySettings
  isLoading: boolean
  isDiaryMode: boolean
  setIsDiaryMode: (val: boolean) => void
  
  initialize: () => void
  addQuestion: (text: string) => Promise<void>
  deleteQuestion: (id: string) => Promise<void>
  updateQuestion: (id: string, text: string) => Promise<void>
  updateTheme: (theme: 'default' | 'aurora' | 'y2k') => Promise<void>
  saveDayDiaryEmojis: (dateKey: string, emojis: string[]) => Promise<void>
  saveDayDiaryAnswer: (dateKey: string, questionId: string, question: string, answer: string) => Promise<void>
  deleteDayDiaryAnswer: (dateKey: string, questionId: string) => Promise<void>
  addDayDiaryMemo: (dateKey: string, text: string, tags?: string[]) => Promise<void>
  updateDayDiaryMemo: (dateKey: string, memoId: string, text: string, tags?: string[]) => Promise<void>
  deleteDayDiaryMemo: (dateKey: string, memoId: string) => Promise<void>
  saveMonthlyDiary: (monthKey: string, text: string) => Promise<void>
  saveRoutineGroups: (groups: RoutineGroup[]) => Promise<void>
  saveRoutineItemState: (dateKey: string, itemId: string, checked: boolean, memo?: string) => Promise<void>
}

const DiaryContext = createContext<DiaryStoreValue | null>(null)

export const useDiaryStore = () => {
  const ctx = useContext(DiaryContext)
  if (!ctx) throw new Error('useDiaryStore must be used within DiaryStoreProvider')
  return ctx
}

export const DiaryStoreProvider: React.FC<{ children: React.ReactNode, uid: string }> = ({ children, uid }) => {
  const [diaries, setDiaries] = useState<Record<string, DayDiary>>({})
  const [monthlyDiaries, setMonthlyDiaries] = useState<Record<string, MonthlyDiary>>({})
  const [settings, setSettings] = useState<DiarySettings>({ questions: [], theme: 'default' })
  const [isLoading, setIsLoading] = useState(true)
  const [isDiaryMode, setIsDiaryMode] = useState(false)
  const { showToast } = useToast()

  useEffect(() => {
    if (!uid) return
    const unsubSettings = onSnapshot(doc(db, `users/${uid}/settings`, 'diary'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as Partial<DiarySettings>
        console.log('[DEBUG DiaryStore] settings onSnapshot exists. data:', data)
        setSettings({ questions: data.questions || [], theme: data.theme || 'default', routineGroups: data.routineGroups || [] })
      } else {
        console.log('[DEBUG DiaryStore] settings onSnapshot does NOT exist.')
        setSettings({ questions: [], theme: 'default', routineGroups: [] })
      }
    })

    const unsubDiaries = onSnapshot(collection(db, `users/${uid}/diaries`), (snapshot) => {
      const newDiaries: Record<string, DayDiary> = {}
      snapshot.forEach(d => {
        newDiaries[d.id] = d.data() as DayDiary
      })
      setDiaries(newDiaries)
      setIsLoading(false)
    })

    const unsubMonthly = onSnapshot(collection(db, `users/${uid}/monthlyDiaries`), (snapshot) => {
      const newMonthly: Record<string, MonthlyDiary> = {}
      snapshot.forEach(d => {
        newMonthly[d.id] = d.data() as MonthlyDiary
      })
      setMonthlyDiaries(newMonthly)
    })

    return () => {
      unsubSettings()
      unsubDiaries()
      unsubMonthly()
    }
  }, [uid])

  const addQuestion = async (text: string) => {
    if (!uid) return
    const newQuestions = [...settings.questions, { id: Date.now().toString(), text }]
    await setDoc(doc(db, `users/${uid}/settings`, 'diary'), { questions: newQuestions }, { merge: true })
  }

  const deleteQuestion = async (id: string) => {
    if (!uid) return
    const newQuestions = settings.questions.filter(q => q.id !== id)
    await setDoc(doc(db, `users/${uid}/settings`, 'diary'), { questions: newQuestions }, { merge: true })
  }

  const updateQuestion = async (id: string, text: string) => {
    if (!uid) return
    const newQuestions = settings.questions.map(q => q.id === id ? { ...q, text } : q)
    await setDoc(doc(db, `users/${uid}/settings`, 'diary'), { questions: newQuestions }, { merge: true })
  }

  const updateTheme = async (theme: 'default' | 'aurora' | 'y2k') => {
    if (!uid) return
    console.log('[DEBUG DiaryStore] updateTheme called with:', theme)
    try {
      await setDoc(doc(db, `users/${uid}/settings`, 'diary'), { theme }, { merge: true })
      console.log('[DEBUG DiaryStore] updateTheme setDoc successful')
    } catch (err) {
      console.error('[DEBUG DiaryStore] updateTheme Error:', err)
    }
  }

  const saveDayDiaryEmojis = async (dateKey: string, emojis: string[]) => {
    if (!uid) return
    const ref = doc(db, `users/${uid}/diaries`, dateKey)
    await setDoc(ref, { emojis }, { merge: true })
  }

  const saveDayDiaryAnswer = async (dateKey: string, questionId: string, question: string, answer: string) => {
    if (!uid) return
    const ref = doc(db, `users/${uid}/diaries`, dateKey)
    
    // Import runTransaction from firebase/firestore at the top if needed (assuming it's available)
    // Actually, I should use runTransaction, let me make sure it's imported. I will use the simpler way if it's not imported:
    // Wait, let's just use runTransaction!
    const { runTransaction } = await import('firebase/firestore');
    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(ref);
      if (!snap.exists()) {
        transaction.set(ref, { dateKey, emojis: [], answers: [{ questionId, question, answer }], memos: [] })
      } else {
        const data = snap.data() as DayDiary
        const answers = data.answers || []
        const existingIdx = answers.findIndex(a => a.questionId === questionId)
        if (existingIdx >= 0) {
          answers[existingIdx] = { questionId, question, answer }
        } else {
          answers.push({ questionId, question, answer })
        }
        transaction.update(ref, { answers })
      }
    });
  }

  const deleteDayDiaryAnswer = async (dateKey: string, questionId: string) => {
    if (!uid) return
    const ref = doc(db, `users/${uid}/diaries`, dateKey)
    const { runTransaction } = await import('firebase/firestore');
    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(ref);
      if (snap.exists()) {
        const data = snap.data() as DayDiary
        const answers = (data.answers || []).filter(a => a.questionId !== questionId)
        transaction.update(ref, { answers })
      }
    });
  }

  const addDayDiaryMemo = async (dateKey: string, text: string, tags?: string[]) => {
    if (!uid) return
    const ref = doc(db, `users/${uid}/diaries`, dateKey)
    const newMemo: DiaryMemo = { id: Date.now().toString(), text, tags, createdAt: Date.now() }
    
    // Optimistic Update
    setDiaries(prev => {
      const currentDay = prev[dateKey] || { dateKey, emojis: [], answers: [], memos: [] }
      return {
        ...prev,
        [dateKey]: {
          ...currentDay,
          memos: [...(currentDay.memos || []), newMemo]
        }
      }
    })

    const { runTransaction } = await import('firebase/firestore');
    
    try {
      await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(ref);
        if (snap.exists()) {
          const data = snap.data() as DayDiary
          const memos = data.memos || []
          if (!memos.some(m => m.id === newMemo.id)) {
            transaction.update(ref, { memos: [...memos, newMemo] })
          }
        } else {
          transaction.set(ref, { dateKey, emojis: [], answers: [], memos: [newMemo] })
        }
      });
    } catch (error) {
      console.error("Failed to add memo:", error)
      setDiaries(prev => {
        const currentDay = prev[dateKey]
        if (!currentDay) return prev
        return {
          ...prev,
          [dateKey]: {
            ...currentDay,
            memos: (currentDay.memos || []).filter(m => m.id !== newMemo.id)
          }
        }
      })
      showToast("메모 저장에 실패했습니다.", "error")
    }
  }

  const updateDayDiaryMemo = async (dateKey: string, memoId: string, text: string, tags?: string[]) => {
    if (!uid) return
    const ref = doc(db, `users/${uid}/diaries`, dateKey)
    const { runTransaction } = await import('firebase/firestore');
    
    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(ref);
      if (snap.exists()) {
        const data = snap.data() as DayDiary
        const memos = data.memos || []
        const memoIdx = memos.findIndex(m => m.id === memoId)
        if (memoIdx >= 0) {
          memos[memoIdx] = { ...memos[memoIdx], text, tags }
          transaction.update(ref, { memos })
        }
      }
    });
  }

  const deleteDayDiaryMemo = async (dateKey: string, memoId: string) => {
    if (!uid) return
    const ref = doc(db, `users/${uid}/diaries`, dateKey)
    const { runTransaction } = await import('firebase/firestore');
    
    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(ref);
      if (snap.exists()) {
        const data = snap.data() as DayDiary
        const memos = (data.memos || []).filter(m => m.id !== memoId)
        transaction.update(ref, { memos })
      }
    });
  }

  const saveMonthlyDiary = async (monthKey: string, text: string) => {
    if (!uid) return
    const ref = doc(db, `users/${uid}/monthlyDiaries`, monthKey)
    const snap = await getDoc(ref)
    if (snap.exists()) {
      await updateDoc(ref, { text })
    } else {
      await setDoc(ref, { monthKey, text })
    }
  }

  const saveRoutineGroups = async (groups: RoutineGroup[]) => {
    if (!uid) return
    const ref = doc(db, `users/${uid}/settings`, 'diary')
    const snap = await getDoc(ref)
    if (snap.exists()) {
      await updateDoc(ref, { routineGroups: groups })
    } else {
      await setDoc(ref, { questions: [], theme: 'default', routineGroups: groups })
    }
  }

  const saveRoutineItemState = async (dateKey: string, itemId: string, checked: boolean, memo?: string) => {
    if (!uid) return
    const ref = doc(db, `users/${uid}/diaries`, dateKey)
    const nowStr = new Date().toISOString()
    const stateObj: any = { checked, updatedAt: nowStr }
    if (memo !== undefined) {
      stateObj.memo = memo
    }
    
    // Use setDoc with merge: true for atomic update and auto-creation if not exists
    await setDoc(ref, {
      dateKey,
      routineStates: {
        [itemId]: stateObj
      }
    }, { merge: true })
  }

  return (
    <DiaryContext.Provider value={{
      diaries, monthlyDiaries, settings, isLoading, isDiaryMode, setIsDiaryMode,
        initialize: () => {}, addQuestion, deleteQuestion, updateQuestion, updateTheme,
        saveDayDiaryEmojis, saveDayDiaryAnswer, deleteDayDiaryAnswer, addDayDiaryMemo, updateDayDiaryMemo, deleteDayDiaryMemo, saveMonthlyDiary,
        saveRoutineGroups, saveRoutineItemState
    }}>
      {children}
    </DiaryContext.Provider>
  )
}
