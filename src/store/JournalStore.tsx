import React, { createContext, useContext, useState, useEffect } from 'react'
import type { Note } from '../types'
import { collection, getDocs, getDoc, setDoc, deleteDoc, doc } from 'firebase/firestore'
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
  
  addJournal: (text: string) => Promise<string>
  updateJournal: (id: string, text: string) => Promise<void>
  deleteJournal: (id: string) => void
  loadJournalContent: (id: string) => Promise<string | null>
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

  const addJournal = async (text: string) => {
    const id = genId()
    const now = new Date().toISOString()
    const { extractPreview, extractSearchText } = await import('../utils/textUtils')
    const textPreview = extractPreview(text)
    const searchText = extractSearchText(text)
    
    const newEntry: Note = {
      id,
      text: '', // local store initially, but we can set to text for instant loading
      textPreview,
      searchText,
      hasContentDoc: true,
      createdAt: now,
      updatedAt: now
    }
    
    // Set text locally so it feels fast
    setJournals(prev => [...prev, { ...newEntry, text, isFullyLoaded: true }])
    
    // Async write
    Promise.all([
      setDoc(doc(db, `users/${uid}/journal_entries/${id}`), newEntry),
      setDoc(doc(db, `users/${uid}/journal_contents/${id}`), { text })
    ]).catch(e => console.error(e))

    return id
  }

  const updateJournal = async (id: string, text: string) => {
    const updatedAt = new Date().toISOString()
    const { extractPreview, extractSearchText } = await import('../utils/textUtils')
    const textPreview = extractPreview(text)
    const searchText = extractSearchText(text)

    setJournals(prev => prev.map(j => j.id === id ? { ...j, text, textPreview, searchText, hasContentDoc: true, updatedAt, isFullyLoaded: true } : j))
    
    // Async write
    Promise.all([
      setDoc(doc(db, `users/${uid}/journal_entries/${id}`), { textPreview, searchText, hasContentDoc: true, updatedAt }, { merge: true }),
      setDoc(doc(db, `users/${uid}/journal_contents/${id}`), { text }, { merge: true })
    ]).catch(e => console.error(e))
  }

  const deleteJournal = (id: string) => {
    setJournals(prev => prev.filter(j => j.id !== id))
    deleteDoc(doc(db, `users/${uid}/journal_entries/${id}`)).catch(e => console.error(e))
    deleteDoc(doc(db, `users/${uid}/journal_contents/${id}`)).catch(e => console.error(e))
  }

  const loadJournalContent = async (id: string) => {
    if (!uid) return null
    try {
      const snap = await getDoc(doc(db, `users/${uid}/journal_contents/${id}`))
      if (snap.exists() && snap.data().text !== undefined) {
        const text = snap.data().text as string
        const { repairCorruptedHtml } = await import('../utils/textUtils')
        return repairCorruptedHtml(text)
      }
      return null
    } catch (e) {
      console.error('Failed to load journal content:', e)
      return null
    }
  }

  return (
    <JournalContext.Provider value={{
      isLoading, loadError, journals,
      addJournal, updateJournal, deleteJournal, loadJournalContent
    }}>
      {children}
    </JournalContext.Provider>
  )
}
