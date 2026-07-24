import React, { createContext, useContext, useState, useEffect } from 'react'
import { collection, doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore'
import { db } from '../config/firebase'

export interface DiaryQuestionAnswer {
  questionId: string
  question: string
  answer: string
}

export interface DiaryMemo {
  id: string
  text: string
  createdAt: number
}

export interface DayDiary {
  dateKey: string // YYYY-MM-DD
  emojis: string[] // up to 3
  answers: DiaryQuestionAnswer[]
  memos: DiaryMemo[]
}

export interface MonthlyDiary {
  monthKey: string // YYYY-MM
  text: string
}

export interface DiarySettings {
  questions: { id: string, text: string }[]
  theme?: 'default' | 'aurora'
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
  updateTheme: (theme: 'default' | 'aurora') => Promise<void>
  saveDayDiaryEmojis: (dateKey: string, emojis: string[]) => Promise<void>
  saveDayDiaryAnswer: (dateKey: string, questionId: string, question: string, answer: string) => Promise<void>
  deleteDayDiaryAnswer: (dateKey: string, questionId: string) => Promise<void>
  addDayDiaryMemo: (dateKey: string, text: string) => Promise<void>
  deleteDayDiaryMemo: (dateKey: string, memoId: string) => Promise<void>
  saveMonthlyDiary: (monthKey: string, text: string) => Promise<void>
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

  useEffect(() => {
    if (!uid) return
    const unsubSettings = onSnapshot(doc(db, `users/${uid}/settings`, 'diary'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as Partial<DiarySettings>
        console.log('[DEBUG DiaryStore] settings onSnapshot exists. data:', data)
        setSettings({ questions: data.questions || [], theme: data.theme || 'default' })
      } else {
        console.log('[DEBUG DiaryStore] settings onSnapshot does NOT exist.')
        setSettings({ questions: [], theme: 'default' })
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

  const updateTheme = async (theme: 'default' | 'aurora') => {
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
    const snap = await getDoc(ref)
    if (snap.exists()) {
      await updateDoc(ref, { emojis })
    } else {
      await setDoc(ref, { dateKey, emojis, answers: [], memos: [] })
    }
  }

  const saveDayDiaryAnswer = async (dateKey: string, questionId: string, question: string, answer: string) => {
    if (!uid) return
    const ref = doc(db, `users/${uid}/diaries`, dateKey)
    const snap = await getDoc(ref)
    
    if (snap.exists()) {
      const data = snap.data() as DayDiary
      const answers = data.answers || []
      const existingIdx = answers.findIndex(a => a.questionId === questionId)
      if (existingIdx >= 0) {
        answers[existingIdx] = { questionId, question, answer }
      } else {
        answers.push({ questionId, question, answer })
      }
      await updateDoc(ref, { answers })
    } else {
      await setDoc(ref, { dateKey, emojis: [], answers: [{ questionId, question, answer }], memos: [] })
    }
  }

  const deleteDayDiaryAnswer = async (dateKey: string, questionId: string) => {
    if (!uid) return
    const ref = doc(db, `users/${uid}/diaries`, dateKey)
    const snap = await getDoc(ref)
    if (snap.exists()) {
      const data = snap.data() as DayDiary
      const answers = (data.answers || []).filter(a => a.questionId !== questionId)
      await updateDoc(ref, { answers })
    }
  }

  const addDayDiaryMemo = async (dateKey: string, text: string) => {
    if (!uid) return
    const ref = doc(db, `users/${uid}/diaries`, dateKey)
    const snap = await getDoc(ref)
    const newMemo: DiaryMemo = { id: Date.now().toString(), text, createdAt: Date.now() }
    
    if (snap.exists()) {
      const data = snap.data() as DayDiary
      const memos = data.memos || []
      await updateDoc(ref, { memos: [...memos, newMemo] })
    } else {
      await setDoc(ref, { dateKey, emojis: [], answers: [], memos: [newMemo] })
    }
  }

  const deleteDayDiaryMemo = async (dateKey: string, memoId: string) => {
    if (!uid) return
    const ref = doc(db, `users/${uid}/diaries`, dateKey)
    const snap = await getDoc(ref)
    if (snap.exists()) {
      const data = snap.data() as DayDiary
      const memos = (data.memos || []).filter(m => m.id !== memoId)
      await updateDoc(ref, { memos })
    }
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

  return (
    <DiaryContext.Provider value={{
      diaries, monthlyDiaries, settings, isLoading, isDiaryMode, setIsDiaryMode,
        initialize: () => {}, addQuestion, deleteQuestion, updateQuestion, updateTheme,
        saveDayDiaryEmojis, saveDayDiaryAnswer, deleteDayDiaryAnswer, addDayDiaryMemo, deleteDayDiaryMemo, saveMonthlyDiary
    }}>
      {children}
    </DiaryContext.Provider>
  )
}
