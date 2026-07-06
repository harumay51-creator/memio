import React, { useState } from 'react'
import { useAppStore } from '../../store/AppStore'
import { auth } from '../../config/firebase'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { Lock, KeyRound, RefreshCcw, LogOut } from 'lucide-react'

const PinScreen: React.FC = () => {
  const { hasPin, unlockPrivate, setPrivatePin, resetPrivatePin } = useAppStore()
  
  const [mode, setMode] = useState<'UNLOCK' | 'SETUP' | 'CHANGE' | 'RESET'>(
    hasPin ? 'UNLOCK' : 'SETUP'
  )
  const [pin, setPinInput] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [step, setStep] = useState(1) // for SETUP and CHANGE
  const [error, setError] = useState('')

  // Reset password state
  const [password, setPassword] = useState('')

  const handleNumClick = async (num: string) => {
    if (pin.length < 4) {
      const newPin = pin + num
      setPinInput(newPin)
      setError('')
      
      if (newPin.length === 4) {
        if (mode === 'UNLOCK') {
          const success = await unlockPrivate(newPin)
          if (!success) {
            setError('PIN 번호가 일치하지 않습니다.')
            setPinInput('')
          }
        } else if (mode === 'SETUP' || mode === 'CHANGE') {
          if (step === 1) {
            if (mode === 'CHANGE' && hasPin) {
              // verify current pin first
              const success = await unlockPrivate(newPin)
              if (success) {
                setStep(2)
                setPinInput('')
              } else {
                setError('기존 PIN 번호가 일치하지 않습니다.')
                setPinInput('')
              }
            } else if (mode === 'SETUP') {
              // Skip confirm step for SETUP, just save it directly
              await setPrivatePin(newPin)
            } else {
              setConfirmPin(newPin)
              setPinInput('')
              setStep(2)
            }
          } else if (step === 2 && mode === 'CHANGE' && hasPin) {
             setConfirmPin(newPin)
             setPinInput('')
             setStep(3)
          } else {
            // step 2 for SETUP, step 3 for CHANGE
            if (newPin === confirmPin) {
              await setPrivatePin(newPin)
              // success!
            } else {
              setError('PIN 번호가 일치하지 않습니다.')
              setPinInput('')
            }
          }
        }
      }
    }
  }

  const handleDelete = () => {
    setPinInput(pin.slice(0, -1))
    setError('')
  }

  const handleResetAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!auth.currentUser?.email) return
    try {
      await signInWithEmailAndPassword(auth, auth.currentUser.email, password)
      await resetPrivatePin()
      setMode('SETUP')
      setStep(1)
      setPinInput('')
      setConfirmPin('')
    } catch (err) {
      setError('비밀번호가 올바르지 않습니다.')
    }
  }

  let title = ''
  let subtitle = ''
  if (mode === 'UNLOCK') {
    title = '개인 기록 잠금 해제'
    subtitle = 'PIN 번호를 입력해주세요.'
  } else if (mode === 'SETUP') {
    title = '새 PIN 번호 설정'
    subtitle = '사용할 4자리 PIN 번호를 입력해주세요.'
  } else if (mode === 'CHANGE') {
    title = 'PIN 번호 변경'
    if (step === 1) subtitle = '현재 PIN 번호를 입력해주세요.'
    else if (step === 2) subtitle = '새로운 4자리 PIN을 입력해주세요.'
    else subtitle = '확인을 위해 다시 한번 입력해주세요.'
  } else if (mode === 'RESET') {
    title = 'PIN 초기화'
    subtitle = '본인 확인을 위해 계정 비밀번호를 입력해주세요.'
  }

  return (
    <div className="flex h-full w-full bg-yuri-50 items-center justify-center relative">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-yuri-200 flex flex-col items-center w-80">
        
        {mode === 'UNLOCK' && <Lock className="text-accent mb-4" size={32} />}
        {mode === 'SETUP' && <KeyRound className="text-accent mb-4" size={32} />}
        {mode === 'CHANGE' && <RefreshCcw className="text-accent mb-4" size={32} />}
        {mode === 'RESET' && <LogOut className="text-accent mb-4" size={32} />}

        <h2 className="text-xl font-bold text-yuri-900 mb-2 text-center">{title}</h2>
        <p className="text-sm text-yuri-500 mb-6 text-center">{subtitle}</p>

        {mode !== 'RESET' ? (
          <>
            <div className="flex gap-4 mb-8">
              {[0, 1, 2, 3].map(i => (
                <div 
                  key={i} 
                  className={`w-4 h-4 rounded-full transition-colors ${i < pin.length ? 'bg-accent' : 'bg-yuri-200'}`} 
                />
              ))}
            </div>

            <div className="grid grid-cols-3 gap-3 w-full">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                <button
                  key={num}
                  onClick={() => handleNumClick(num.toString())}
                  className="h-14 rounded-xl text-xl font-semibold text-yuri-800 bg-yuri-50 hover:bg-yuri-100 active:bg-yuri-200 transition-colors cursor-pointer"
                >
                  {num}
                </button>
              ))}
              <div />
              <button
                onClick={() => handleNumClick('0')}
                className="h-14 rounded-xl text-xl font-semibold text-yuri-800 bg-yuri-50 hover:bg-yuri-100 active:bg-yuri-200 transition-colors cursor-pointer"
              >
                0
              </button>
              <button
                onClick={handleDelete}
                className="h-14 rounded-xl text-base font-semibold text-yuri-500 bg-yuri-50 hover:bg-yuri-100 active:bg-yuri-200 transition-colors flex items-center justify-center cursor-pointer"
              >
                지우기
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={handleResetAuth} className="w-full flex flex-col gap-4">
            <input
              type="password"
              placeholder="계정 비밀번호"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-yuri-50 border border-yuri-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-accent"
              autoFocus
            />
            <button
              type="submit"
              className="w-full bg-accent text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-accent/90 transition-colors cursor-pointer"
            >
              인증 및 PIN 초기화
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('UNLOCK')
                setError('')
              }}
              className="text-xs text-yuri-500 hover:text-yuri-900 mt-2 cursor-pointer"
            >
              돌아가기
            </button>
          </form>
        )}

        <div className="h-4 mt-4 text-center">
          {error && <span className="text-xs text-red-500">{error}</span>}
        </div>
      </div>

      {mode === 'UNLOCK' && hasPin && (
        <button
          onClick={() => {
            setMode('RESET')
            setError('')
          }}
          className="absolute bottom-8 text-xs text-yuri-400 hover:text-yuri-900 transition-colors cursor-pointer"
        >
          PIN 번호를 잊으셨나요?
        </button>
      )}
    </div>
  )
}

export default PinScreen
