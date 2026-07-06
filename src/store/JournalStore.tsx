import React, { createContext, useContext, useState, useEffect } from 'react'
import type { Note } from '../types'
import { collection, getDocs, setDoc, deleteDoc, doc, getDoc } from 'firebase/firestore'
import { db } from '../config/firebase'

async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

function genId(): string {
  return crypto.randomUUID()
}

interface JournalStoreValue {
  isLoading: boolean
  loadError: string | null
  journals: Note[]
  isUnlocked: boolean
  hasPin: boolean
  
  unlock: (pin: string) => Promise<boolean>
  setPin: (newPin: string) => Promise<void>
  lock: () => void
  resetPin: () => Promise<void>
  
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
  
  const [isUnlocked, setIsUnlocked] = useState(() => {
    return sessionStorage.getItem('yuri-journal-unlocked') === 'true'
  })
  
  const [pinHash, setPinHash] = useState<string | null>(null)
  const hasPin = pinHash !== null

  useEffect(() => {
    if (!uid) return
    let isMounted = true

    const loadData = async () => {
      try {
        setIsLoading(true)
        setLoadError(null)
        
        // Load PIN settings
        const settingsDocRef = doc(db, `users/${uid}/journal_settings/config`)
        const settingsSnap = await getDoc(settingsDocRef)
        if (settingsSnap.exists()) {
          setPinHash(settingsSnap.data().pinHash || null)
        } else {
          setPinHash(null)
        }

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

  const unlock = async (pin: string) => {
    if (!pinHash) return false
    const inputHash = await hashPin(pin)
    if (inputHash === pinHash) {
      setIsUnlocked(true)
      sessionStorage.setItem('yuri-journal-unlocked', 'true')
      return true
    }
    return false
  }

  const setPin = async (newPin: string) => {
    const hash = await hashPin(newPin)
    const settingsDocRef = doc(db, `users/${uid}/journal_settings/config`)
    await setDoc(settingsDocRef, { pinHash: hash }, { merge: true })
    setPinHash(hash)
    setIsUnlocked(true)
    sessionStorage.setItem('yuri-journal-unlocked', 'true')
  }

  const lock = () => {
    setIsUnlocked(false)
    sessionStorage.removeItem('yuri-journal-unlocked')
  }

  const resetPin = async () => {
    const settingsDocRef = doc(db, `users/${uid}/journal_settings/config`)
    await setDoc(settingsDocRef, { pinHash: null }, { merge: true })
    setPinHash(null)
    setIsUnlocked(false)
    sessionStorage.removeItem('yuri-journal-unlocked')
  }

  const addJournal = (text: string) => {
    const id = genId()
    const newEntry: Note = {
      id,
      text,
      createdAt: new Date().toISOString()
    }
    setJournals(prev => [...prev, newEntry])
    setDoc(doc(db, `users/${uid}/journal_entries/${id}`), newEntry).catch(e => console.error(e))
    return id
  }

  const updateJournal = (id: string, text: string) => {
    setJournals(prev => prev.map(j => j.id === id ? { ...j, text } : j))
    setDoc(doc(db, `users/${uid}/journal_entries/${id}`), { text }, { merge: true }).catch(e => console.error(e))
  }

  const deleteJournal = (id: string) => {
    setJournals(prev => prev.filter(j => j.id !== id))
    deleteDoc(doc(db, `users/${uid}/journal_entries/${id}`)).catch(e => console.error(e))
  }

  return (
    <JournalContext.Provider value={{
      isLoading, loadError, journals, isUnlocked, hasPin,
      unlock, setPin, lock, resetPin,
      addJournal, updateJournal, deleteJournal
    }}>
      {children}
    </JournalContext.Provider>
  )
}
