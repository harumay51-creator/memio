import React, { useState, useEffect } from 'react'

interface MobileAppPinScreenProps {
  mode: 'setup' | 'unlock'
  onComplete: (pin: string) => void
  onSkip?: () => void
  onForgot?: () => void
  errorMsg?: string
}

let transientUnlockPin = ''

const MobileAppPinScreen: React.FC<MobileAppPinScreenProps> = ({ mode, onComplete, onSkip, onForgot, errorMsg: externalErrorMsg }) => {
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState(mode === 'unlock' ? transientUnlockPin : '')
  const [step, setStep] = useState<'input' | 'confirm'>(mode === 'setup' ? 'input' : 'confirm')
  const [localError, setLocalError] = useState('')

  useEffect(() => {
    if (externalErrorMsg) {
      setLocalError(externalErrorMsg)
      setPin('')
      setConfirmPin('')
      if (mode === 'unlock') transientUnlockPin = ''
      setStep(mode === 'setup' ? 'input' : 'confirm')
    }
  }, [externalErrorMsg, mode])

  const handleNum = (n: string) => {
    if (localError) setLocalError('')
    if (step === 'input') {
      setPin(prev => {
        if (prev.length >= 4) return prev
        const next = prev + n
        if (next.length === 4) {
          setTimeout(() => setStep('confirm'), 200)
        }
        return next
      })
    } else {
      setConfirmPin(prev => {
        if (prev.length >= 4) return prev
        const next = prev + n
        if (mode === 'unlock') transientUnlockPin = next
        if (next.length === 4) {
          if (mode === 'setup') {
            if (pin === next) {
              onComplete(next)
            } else {
              setLocalError('PIN이 일치하지 않습니다. 처음부터 다시 입력해주세요.')
              setTimeout(() => {
                setPin('')
                setConfirmPin('')
                setStep('input')
                setLocalError('')
              }, 1000)
            }
          } else {
            // Unlock mode
            onComplete(next)
            transientUnlockPin = '' // Clear it after submission
          }
        }
        return next
      })
    }
  }

  const handleDelete = () => {
    if (localError) setLocalError('')
    if (step === 'input') {
      setPin(p => p.slice(0, -1))
    } else {
      setConfirmPin(p => {
        const next = p.slice(0, -1)
        if (mode === 'unlock') transientUnlockPin = next
        return next
      })
    }
  }

  const currentVal = step === 'input' ? pin : confirmPin
  const displayError = localError

  return (
    <div className="absolute inset-0 z-[100] bg-white flex flex-col items-center justify-between py-12 px-6">
      <div className="flex flex-col items-center w-full mt-10">
        <h1 className="text-2xl font-bold text-yuri-900 mb-2">
          {mode === 'setup' 
            ? (step === 'input' ? '앱 잠금 PIN 설정' : 'PIN 다시 입력')
            : '앱 잠금 해제'
          }
        </h1>
        <p className="text-sm text-yuri-500 mb-10 text-center h-10 flex items-center justify-center">
          {displayError ? (
            <span className="text-xs text-red-500 font-medium">{displayError}</span>
          ) : mode === 'setup' ? (
            step === 'input' 
              ? '빠른 잠금 해제를 위한 4자리 PIN을 설정하시겠습니까?' 
              : '확인을 위해 한 번 더 입력해주세요.'
          ) : (
            'PIN을 입력해주세요.'
          )}
        </p>
        <div className="flex gap-4">
          {[0,1,2,3].map(i => (
            <div key={i} className={`w-4 h-4 rounded-full transition-colors duration-200 ${i < currentVal.length ? 'bg-accent' : 'bg-yuri-200'}`} />
          ))}
        </div>
      </div>

      <div className="w-full max-w-[280px] mb-8">
        <div className="grid grid-cols-3 gap-y-6 gap-x-8">
          {['1','2','3','4','5','6','7','8','9'].map(num => (
            <button key={num} onClick={() => handleNum(num)} className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-light text-yuri-900 active:bg-yuri-100 mx-auto">
              {num}
            </button>
          ))}
          <div />
          <button onClick={() => handleNum('0')} className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-light text-yuri-900 active:bg-yuri-100 mx-auto">
            0
          </button>
          <button onClick={handleDelete} className="w-16 h-16 rounded-full flex items-center justify-center text-lg text-yuri-500 active:bg-yuri-100 mx-auto">
            지우기
          </button>
        </div>

        <div className="mt-12 flex justify-center h-12">
          {mode === 'setup' && onSkip && (
            <button onClick={onSkip} className="text-sm font-bold text-yuri-400 hover:text-yuri-600 px-4 py-2">
              건너뛰기
            </button>
          )}
          {mode === 'unlock' && onForgot && (
            <button onClick={onForgot} className="text-sm font-bold text-yuri-400 hover:text-yuri-600 px-4 py-2 underline underline-offset-4">
              PIN을 잊으셨나요?
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default MobileAppPinScreen
