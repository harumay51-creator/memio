import React, { useState } from 'react'
import { auth } from '../config/firebase'
import { signInWithEmailAndPassword, setPersistence, browserSessionPersistence } from 'firebase/auth'

const AuthScreen: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      await setPersistence(auth, browserSessionPersistence)
      await signInWithEmailAndPassword(auth, email, password)
    } catch (err: any) {
      console.error(err)
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        setError('이메일 또는 비밀번호가 올바르지 않습니다.')
      } else if (err.code === 'auth/email-already-in-use') {
        setError('이미 사용 중인 이메일입니다.')
      } else if (err.code === 'auth/weak-password') {
        setError('비밀번호는 6자리 이상이어야 합니다.')
      } else if (err.code === 'auth/invalid-email') {
        setError('유효하지 않은 이메일 형식입니다.')
      } else {
        setError(err.message || '인증 중 오류가 발생했습니다.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-yuri-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-[360px]">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-accent rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-sm">
            <span className="text-white text-3xl font-bold">M</span>
          </div>
          <h1 className="text-3xl font-bold text-yuri-900 tracking-tight mb-2">Memio</h1>
          <p className="text-yuri-500 font-medium">나만의 완벽한 데이터 허브</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 shadow-sm border border-yuri-100">
          <h2 className="text-xl font-bold text-yuri-900 mb-6 text-center">
            로그인
          </h2>

          <div className="flex flex-col gap-4 mb-6">
            <div>
              <label className="block text-xs font-bold text-yuri-500 mb-1.5 ml-1">이메일</label>
              <input spellCheck={false}
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full bg-yuri-50 border border-yuri-200 focus:border-accent text-yuri-900 rounded-xl px-4 py-3 text-sm outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-yuri-500 mb-1.5 ml-1">비밀번호</label>
              <input spellCheck={false}
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full bg-yuri-50 border border-yuri-200 focus:border-accent text-yuri-900 rounded-xl px-4 py-3 text-sm outline-none transition-colors"
                placeholder="비밀번호 (6자리 이상)"
              />
            </div>
          </div>

          {error && <p className="text-red-500 text-xs text-center mb-4 font-medium">{error}</p>}

          <button
            type="submit"
            disabled={loading || !email || !password}
            className="w-full bg-accent hover:bg-accent/90 text-white font-bold py-3.5 rounded-xl transition-colors disabled:opacity-50"
          >
            {loading ? '처리 중...' : '로그인'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default AuthScreen
