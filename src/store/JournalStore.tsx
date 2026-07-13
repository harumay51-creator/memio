import React, { createContext, useContext, useState, useEffect } from 'react'
import type { Note } from '../types'
import { collection, getDocs, setDoc, deleteDoc, doc } from 'firebase/firestore'
import { db } from '../config/firebase'

function genId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

interface JournalStoreValue {
  isLoading: boolean
  loadError: string | null
  journals: Note[]
  
  addJournal: (text: string) => string
  updateJournal: (id: string, text: string) => void
  deleteJournal: (id: string) => void
}

const JournalContext = createContext<JournalStoreValue | null>(null)

export const useJournalStore = () => {
  const ctx = useContext(JournalContext)
  if (!ctx) throw new Error('useJournalStore must be used within JournalStoreProvider')
  return ctx
}

export const JournalStoreProvider: React.FC<{ uid: string, children: React.ReactNode }> = ({ uid, children }) => {
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  
  const [journals, setJournals] = useState<Note[]>([])

  useEffect(() => {
    if (!uid) return
    let isMounted = true

    const loadData = async () => {
      try {
        setIsLoading(true)
        setLoadError(null)
        
        // Load journals
        const colRef = collection(db, `users/${uid}/journal_entries`)
        const snapshot = await getDocs(colRef)
        const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Note[]
        
        if (isMounted) {
          setJournals(fetched)
        }
      } catch (err: any) {
        console.error("Journal load error:", err)
        if (isMounted) setLoadError(err.message || 'Error loading personal journal data.')
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }
    
    loadData()
    return () => { isMounted = false }
  }, [uid])

  const addJournal = (text: string) => {
    const id = genId()
    const now = new Date().toISOString()
    const newEntry: Note = {
      id,
      text,
      createdAt: now,
      updatedAt: now
    }
    setJournals(prev => [...prev, newEntry])
    setDoc(doc(db, `users/${uid}/journal_entries/${id}`), newEntry).catch(e => console.error(e))
    return id
  }

  const updateJournal = (id: string, text: string) => {
    const updatedAt = new Date().toISOString()
    setJournals(prev => prev.map(j => j.id === id ? { ...j, text, updatedAt } : j))
    setDoc(doc(db, `users/${uid}/journal_entries/${id}`), { text, updatedAt }, { merge: true }).catch(e => console.error(e))
  }

  const deleteJournal = (id: string) => {
    setJournals(prev => prev.filter(j => j.id !== id))
    deleteDoc(doc(db, `users/${uid}/journal_entries/${id}`)).catch(e => console.error(e))
  }

  return (
    <JournalContext.Provider value={{
      isLoading, loadError, journals,
      addJournal, updateJournal, deleteJournal
    }}>
      {children}
    </JournalContext.Provider>
  )
}
