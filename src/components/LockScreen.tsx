import React, { useState, useEffect, useRef } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../config/firebase'

interface LockScreenProps {
  onUnlock: () => void
}

const LockScreen: React.FC<LockScreenProps> = ({ onUnlock }) => {
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const [expectedHash, setExpectedHash] = useState<string | null>(null)

  useEffect(() => {
    async function fetchAuth() {
      try {
        const docRef = doc(db, 'settings', 'auth')
        const snap = await getDoc(docRef)
        if (snap.exists()) {
          setExpectedHash(snap.data().hash)
        } else {
          // Default hash for '%^&memio2026!@'
          const defaultHash = '4d112400c287b23117b72a349436c7de6b0ec74b033d241676d0ac09c489ad60'
          await setDoc(docRef, { hash: defaultHash })
          setExpectedHash(defaultHash)
        }
      } catch (err) {
        console.error('Failed to fetch auth', err)
      }
    }
    fetchAuth()
    
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const encoder = new TextEncoder()
      const data = encoder.encode(password)
      const hashBuffer = await crypto.subtle.digest('SHA-256', data)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

      if (expectedHash && hashHex === expectedHash) {
        setError(false)
        onUnlock()
      } else {
        setError(true)
        setPassword('')
        if (inputRef.current) {
          inputRef.current.focus()
        }
      }
    } catch (err) {
      console.error('Crypto error:', err)
    }
  }

  return (
    <div className="flex h-screen w-screen bg-yuri-50 items-center justify-center font-sans">
      <div className="bg-white p-10 rounded-2xl shadow-sm border border-yuri-100 flex flex-col items-center max-w-sm w-full mx-4">
        <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center text-white font-bold text-xl shadow-sm mb-6">
          M
        </div>
        <h1 className="text-2xl font-bold text-yuri-900 tracking-tight mb-2">Memio</h1>
        <p className="text-sm text-yuri-500 mb-8 text-center">개인 보호를 위해 비밀번호를 입력해 주세요.</p>
        
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
          <div className="relative w-full">
            <input
              ref={inputRef}
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                if (error) setError(false)
              }}
              placeholder="비밀번호"
              disabled={!expectedHash}
              className={`w-full bg-yuri-50 border ${error ? 'border-red-400 focus:border-red-500 text-red-500' : 'border-yuri-200 focus:border-accent text-yuri-900'} rounded-lg px-4 py-3 text-base outline-none transition-colors tracking-widest disabled:opacity-50`}
            />
          </div>
          {error && <p className="text-red-500 text-xs text-center -mt-2">비밀번호가 올바르지 않습니다.</p>}
          <button
            type="submit"
            disabled={!expectedHash}
            className="w-full bg-accent hover:bg-accent/90 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {expectedHash ? '잠금 해제' : '인증 정보 로딩 중...'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default LockScreen
