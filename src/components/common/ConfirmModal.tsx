import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react'

export interface ConfirmOptions {
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'default' | 'danger'
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions | string) => Promise<boolean>
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null)

export const useConfirm = () => {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider')
  return ctx
}

export const ConfirmProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [modalState, setModalState] = useState<{
    isOpen: boolean
    options: ConfirmOptions
    resolve: (value: boolean) => void
  } | null>(null)
  const [isClosing, setIsClosing] = useState(false)

  const confirm = useCallback((options: ConfirmOptions | string) => {
    return new Promise<boolean>((resolve) => {
      const opts = typeof options === 'string' ? { message: options } : options
      setModalState({
        isOpen: true,
        options: {
          title: '확인',
          confirmText: '확인',
          cancelText: '취소',
          variant: 'default',
          ...opts
        },
        resolve
      })
      setIsClosing(false)
    })
  }, [])

  const handleClose = useCallback((result: boolean) => {
    setIsClosing(true)
    setTimeout(() => {
      if (modalState?.resolve) {
        modalState.resolve(result)
      }
      setModalState(null)
      setIsClosing(false)
    }, 150)
  }, [modalState])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && modalState?.isOpen) {
        handleClose(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [modalState?.isOpen, handleClose])

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {modalState?.isOpen && (
        <div 
          className={`fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/40 transition-opacity duration-150 ${isClosing ? 'opacity-0' : 'opacity-100'}`}
          onClick={() => handleClose(false)}
        >
          <div 
            className={`bg-white rounded-2xl w-full max-w-[320px] shadow-2xl overflow-hidden flex flex-col transition-all duration-150 ${isClosing ? 'opacity-0 scale-[0.98]' : 'opacity-100 scale-100'}`}
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6 pb-5">
              {modalState.options.title && (
                <h3 className="text-lg font-bold text-yuri-900 mb-2">
                  {modalState.options.title}
                </h3>
              )}
              <p className="text-base text-yuri-600 whitespace-pre-wrap leading-relaxed">
                {modalState.options.message}
              </p>
            </div>
            
            <div className="flex border-t border-yuri-100">
              <button 
                onClick={() => handleClose(false)}
                className="flex-1 py-4 text-yuri-500 font-medium active:bg-yuri-50 transition-colors"
              >
                {modalState.options.cancelText}
              </button>
              <div className="w-[1px] bg-yuri-100" />
              <button 
                onClick={() => handleClose(true)}
                className={`flex-1 py-4 font-bold active:bg-yuri-50 transition-colors ${
                  modalState.options.variant === 'danger' ? 'text-red-500' : 'text-[#8B7CF8]'
                }`}
              >
                {modalState.options.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}
