import React, { useState, useEffect, useRef } from 'react'

interface LockScreenProps {
  onUnlock: () => void
}

const LockScreen: React.FC<LockScreenProps> = ({ onUnlock }) => {
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Hardcoded expected password
  const EXPECTED_PASSWORD = '%^&memio2026!@'

  useEffect(() => {
    // Focus the input when component mounts
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (password === EXPECTED_PASSWORD) {
      setError(false)
      onUnlock()
    } else {
      setError(true)
      setPassword('')
      if (inputRef.current) {
        inputRef.current.focus()
      }
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
              className={`w-full bg-yuri-50 border ${error ? 'border-red-400 focus:border-red-500 text-red-500' : 'border-yuri-200 focus:border-accent text-yuri-900'} rounded-lg px-4 py-3 text-base outline-none transition-colors tracking-widest`}
            />
          </div>
          {error && <p className="text-red-500 text-xs text-center -mt-2">비밀번호가 올바르지 않습니다.</p>}
          <button
            type="submit"
            className="w-full bg-accent hover:bg-accent/90 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            잠금 해제
          </button>
        </form>
      </div>
    </div>
  )
}

export default LockScreen
