import React, { useState } from 'react'
import { useAppStore } from '../../store/AppStore'
import { auth } from '../../config/firebase'
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth'

type TabType = 'categories' | 'security'

const SettingsPage: React.FC = () => {
  const { expenseCategories, addCategoryKeyword, removeCategoryKeyword, addCategory } = useAppStore()
  
  const [activeTab, setActiveTab] = useState<TabType>('categories')

  // ── Category States ────────
  const [newCatName, setNewCatName] = useState('')
  const [newKeywords, setNewKeywords] = useState<Record<string, string>>({})
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  // ── Security States ────────
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwdError, setPwdError] = useState('')
  const [pwdSuccess, setPwdSuccess] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)

  // ── Category Handlers ────────
  const toggleCategory = (catName: string) => {
    setExpanded(prev => ({ ...prev, [catName]: !prev[catName] }))
  }

  const handleAddKeyword = (e: React.FormEvent, categoryName: string) => {
    e.preventDefault()
    const kw = (newKeywords[categoryName] || '').trim()
    if (!kw) return
    addCategoryKeyword(categoryName, kw)
    setNewKeywords(prev => ({ ...prev, [categoryName]: '' }))
  }

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault()
    const name = newCatName.trim()
    if (!name) return
    addCategory(name)
    setNewCatName('')
    setExpanded(prev => ({ ...prev, [name]: true }))
  }

  // ── Security Handlers ────────
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwdError('')
    setPwdSuccess('')

    if (!currentPassword) {
      setPwdError('현재 비밀번호를 입력해주세요.')
      return
    }
    if (newPassword.length < 6) {
      setPwdError('새 비밀번호는 6자리 이상이어야 합니다.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPwdError('새 비밀번호와 확인 비밀번호가 일치하지 않습니다.')
      return
    }

    const user = auth.currentUser
    if (!user || !user.email) {
      setPwdError('로그인된 사용자 정보를 찾을 수 없습니다.')
      return
    }

    setIsUpdating(true)
    try {
      // 1. 재인증 (현재 비밀번호 확인)
      const credential = EmailAuthProvider.credential(user.email, currentPassword)
      await reauthenticateWithCredential(user, credential)

      // 2. 비밀번호 업데이트
      await updatePassword(user, newPassword)
      
      setPwdSuccess('비밀번호가 성공적으로 변경되었습니다.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error: any) {
      console.error(error)
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
        setPwdError('현재 비밀번호가 일치하지 않습니다.')
      } else {
        setPwdError('비밀번호 변경 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
      }
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="flex h-full w-full bg-white overflow-hidden">
      {/* ── Left Sidebar: Settings Navigation (~30%) ────────────────────────────── */}
      <aside className="w-[30%] min-w-[320px] max-w-[400px] border-r border-yuri-100 bg-yuri-50/30 flex flex-col shrink-0 h-full">
        <header className="shrink-0 h-16 border-b border-yuri-100 flex items-center px-8 bg-white">
          <h2 className="text-lg font-bold text-yuri-900 tracking-tight">설정</h2>
        </header>
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
          <button 
            onClick={() => setActiveTab('categories')}
            className={`w-full text-left px-4 py-3 rounded-lg font-bold text-sm transition-colors ${
              activeTab === 'categories' ? 'bg-yuri-100 text-yuri-900' : 'text-yuri-600 hover:bg-yuri-50'
            }`}
          >
            가계부 카테고리 관리
          </button>
          <button 
            onClick={() => setActiveTab('security')}
            className={`w-full text-left px-4 py-3 rounded-lg font-bold text-sm transition-colors ${
              activeTab === 'security' ? 'bg-yuri-100 text-yuri-900' : 'text-yuri-600 hover:bg-yuri-50'
            }`}
          >
            보안 및 비밀번호
          </button>
        </div>
      </aside>

      {/* ── Right Panel: Settings Content (~70%) ───────────────────────────────────── */}
      <main className="flex-1 flex flex-col h-full bg-white relative min-w-0">
        <header className="shrink-0 h-16 border-b border-yuri-100 flex items-center px-8 bg-white">
          <h2 className="text-lg font-bold text-yuri-900 tracking-tight">
            {activeTab === 'categories' ? '가계부 카테고리 관리' : '보안 및 비밀번호'}
          </h2>
        </header>

        <div className="flex-1 overflow-y-auto p-8 pb-32">
          <div className="max-w-2xl">
            {activeTab === 'categories' && (
              <>
                <p className="text-sm text-yuri-500 mb-8 leading-relaxed">
                  가계부에 자주 쓰는 단어를 등록해 두세요. 하단 입력창(Quick Capture)에 해당 단어가 포함된 문장을 입력하면, 설정된 카테고리로 <strong>자동 분류</strong>됩니다.<br/>
                  <span className="text-xs text-yuri-400 mt-1 inline-block">예: 카페 카테고리에 "메가커피" 추가 → "메가커피 3000원" 입력 시 카페 지출로 저장</span>
                </p>

                <div className="flex flex-col gap-6">
                  {expenseCategories.map(cat => (
                    <div key={cat.name} className="bg-white border border-yuri-200 rounded-xl overflow-hidden shadow-sm">
                      <button 
                        onClick={() => toggleCategory(cat.name)}
                        className="w-full bg-yuri-50 px-5 py-4 border-b border-yuri-200 flex justify-between items-center hover:bg-yuri-100 transition-colors cursor-pointer"
                      >
                        <h3 className="text-sm font-bold text-yuri-900 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-yuri-400" />
                          {cat.name}
                        </h3>
                        <span className="text-yuri-400 text-xs font-bold">
                          {expanded[cat.name] ? '접기 ▲' : '펼치기 ▼'}
                        </span>
                      </button>
                      
                      {expanded[cat.name] && (
                        <div className="p-5 flex flex-col gap-4">
                        <div className="flex flex-wrap gap-2">
                          {cat.keywords.length === 0 ? (
                            <span className="text-xs text-yuri-400 py-1">등록된 키워드가 없습니다.</span>
                          ) : (
                            cat.keywords.map(kw => (
                              <span 
                                key={kw} 
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-yuri-100 text-yuri-700 text-xs font-semibold rounded-full hover:bg-yuri-200 transition-colors"
                              >
                                {kw}
                                <button 
                                  onClick={() => removeCategoryKeyword(cat.name, kw)}
                                  className="w-4 h-4 rounded-full flex items-center justify-center text-yuri-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                  aria-label="삭제"
                                >
                                  ✕
                                </button>
                              </span>
                            ))
                          )}
                        </div>

                        <form onSubmit={(e) => handleAddKeyword(e, cat.name)} className="flex gap-2 pt-2 border-t border-yuri-50">
                          <input
                            type="text"
                            placeholder={`${cat.name} 키워드 추가`}
                            value={newKeywords[cat.name] || ''}
                            onChange={(e) => setNewKeywords(prev => ({ ...prev, [cat.name]: e.target.value }))}
                            className="flex-1 px-3 py-2 bg-yuri-50 border border-yuri-200 rounded-lg text-sm outline-none focus:border-accent focus:bg-white transition-colors"
                          />
                          <button 
                            type="submit"
                            disabled={!(newKeywords[cat.name] || '').trim()}
                            className="px-4 py-2 bg-yuri-900 text-white text-sm font-bold rounded-lg hover:bg-yuri-800 disabled:opacity-50 transition-colors"
                          >
                            추가
                          </button>
                        </form>
                      </div>
                      )}
                    </div>
                  ))}

                  <div className="bg-yuri-50/50 border border-dashed border-yuri-300 rounded-xl overflow-hidden shadow-sm p-5 mt-4">
                    <h3 className="text-sm font-bold text-yuri-900 mb-3">새 카테고리 만들기</h3>
                    <form onSubmit={handleCreateCategory} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="카테고리 이름"
                        value={newCatName}
                        onChange={(e) => setNewCatName(e.target.value)}
                        className="flex-1 px-3 py-2 bg-white border border-yuri-200 rounded-lg text-sm outline-none focus:border-accent transition-colors"
                      />
                      <button 
                        type="submit"
                        disabled={!newCatName.trim()}
                        className="px-5 py-2 bg-yuri-900 text-white text-sm font-bold rounded-lg hover:bg-yuri-800 disabled:opacity-50 transition-colors"
                      >
                        카테고리 추가
                      </button>
                    </form>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'security' && (
              <div className="bg-white border border-yuri-200 rounded-xl p-8 shadow-sm">
                <h3 className="text-lg font-bold text-yuri-900 mb-2">비밀번호 변경</h3>
                <p className="text-sm text-yuri-500 mb-6">보안을 위해 주기적으로 비밀번호를 변경해주세요.</p>

                <form onSubmit={handleChangePassword} className="flex flex-col gap-5">
                  <div>
                    <label className="block text-sm font-bold text-yuri-700 mb-2">현재 비밀번호</label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={e => setCurrentPassword(e.target.value)}
                      placeholder="현재 사용 중인 비밀번호 입력"
                      className="w-full px-4 py-3 bg-yuri-50 border border-yuri-200 rounded-lg text-sm outline-none focus:border-accent focus:bg-white transition-colors"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-yuri-700 mb-2">새 비밀번호</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="새 비밀번호 입력 (6자리 이상)"
                      className="w-full px-4 py-3 bg-yuri-50 border border-yuri-200 rounded-lg text-sm outline-none focus:border-accent focus:bg-white transition-colors"
                      minLength={6}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-yuri-700 mb-2">새 비밀번호 확인</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="새 비밀번호 재입력"
                      className="w-full px-4 py-3 bg-yuri-50 border border-yuri-200 rounded-lg text-sm outline-none focus:border-accent focus:bg-white transition-colors"
                      minLength={6}
                      required
                    />
                  </div>

                  {pwdError && (
                    <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm font-bold mt-2">
                      {pwdError}
                    </div>
                  )}

                  {pwdSuccess && (
                    <div className="p-3 bg-green-50 text-green-700 rounded-lg text-sm font-bold mt-2">
                      {pwdSuccess}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isUpdating || !currentPassword || !newPassword || !confirmPassword}
                    className="mt-4 px-6 py-3 bg-yuri-900 text-white font-bold rounded-lg hover:bg-yuri-800 disabled:opacity-50 transition-colors flex justify-center items-center"
                  >
                    {isUpdating ? '변경 중...' : '비밀번호 변경하기'}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default SettingsPage
