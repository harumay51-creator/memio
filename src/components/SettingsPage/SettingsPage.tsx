import React, { useState } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../../config/firebase'
import { useAppStore } from '../../store/AppStore'

const SettingsPage: React.FC = () => {
  const { expenseCategories, addCategoryKeyword, removeCategoryKeyword, addCategory } = useAppStore()
  
  // State for new category
  const [newCatName, setNewCatName] = useState('')
  
  // State for the new keyword input
  const [newKeywords, setNewKeywords] = useState<Record<string, string>>({})
  
  // State for accordion: track which categories are expanded
  // State for accordion: track which categories are expanded
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  // Navigation tab state
  const [activeTab, setActiveTab] = useState<'categories' | 'security'>('categories')

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordMsg, setPasswordMsg] = useState({ type: '', text: '' })

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
    // Optionally expand the newly created category
    setExpanded(prev => ({ ...prev, [name]: true }))
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
            className={`w-full text-left px-4 py-3 rounded-lg font-bold text-sm transition-colors ${activeTab === 'categories' ? 'bg-yuri-100 text-yuri-900' : 'text-yuri-500 hover:bg-yuri-50'}`}
          >
            가계부 카테고리 관리
          </button>
          <button 
            onClick={() => setActiveTab('security')}
            className={`w-full text-left px-4 py-3 rounded-lg font-bold text-sm transition-colors ${activeTab === 'security' ? 'bg-yuri-100 text-yuri-900' : 'text-yuri-500 hover:bg-yuri-50'}`}
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
                        {/* Keyword Chips */}
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

                        {/* Add Keyword Form */}
                        <form onSubmit={(e) => handleAddKeyword(e, cat.name)} className="flex gap-2 pt-2 border-t border-yuri-50">
                          <input
                            type="text"
                            placeholder={`${cat.name} 키워드 추가 (예: ${cat.keywords[0] || '단어'})`}
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

                  {/* Add New Category Card */}
                  <div className="bg-yuri-50/50 border border-dashed border-yuri-300 rounded-xl overflow-hidden shadow-sm p-5 mt-4">
                    <h3 className="text-sm font-bold text-yuri-900 mb-3">새 카테고리 만들기</h3>
                    <form onSubmit={handleCreateCategory} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="카테고리 이름 (예: 육아, 여행)"
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
              <div className="bg-white border border-yuri-200 rounded-xl shadow-sm p-8">
                <h3 className="text-base font-bold text-yuri-900 mb-2">비밀번호 변경</h3>
                <p className="text-sm text-yuri-500 mb-6">앱 진입 시 사용하는 보안 비밀번호를 변경합니다.</p>

                <form onSubmit={async (e) => {
                  e.preventDefault()
                  if (!currentPassword || !newPassword || !confirmPassword) {
                    setPasswordMsg({ type: 'error', text: '모든 항목을 입력해 주세요.' })
                    return
                  }
                  if (newPassword !== confirmPassword) {
                    setPasswordMsg({ type: 'error', text: '새 비밀번호가 서로 일치하지 않습니다.' })
                    return
                  }

                  try {
                    const encoder = new TextEncoder()
                    const currData = encoder.encode(currentPassword)
                    const currHashBuffer = await crypto.subtle.digest('SHA-256', currData)
                    const currHashHex = Array.from(new Uint8Array(currHashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')

                    const docRef = doc(db, 'settings', 'auth')
                    const snap = await getDoc(docRef)
                    
                    if (snap.exists() && snap.data().hash !== currHashHex) {
                      setPasswordMsg({ type: 'error', text: '현재 비밀번호가 틀렸습니다.' })
                      return
                    }

                    const newData = encoder.encode(newPassword)
                    const newHashBuffer = await crypto.subtle.digest('SHA-256', newData)
                    const newHashHex = Array.from(new Uint8Array(newHashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')

                    await setDoc(docRef, { hash: newHashHex })
                    setPasswordMsg({ type: 'success', text: '비밀번호가 성공적으로 변경되었습니다.' })
                    setCurrentPassword('')
                    setNewPassword('')
                    setConfirmPassword('')
                  } catch (err) {
                    console.error(err)
                    setPasswordMsg({ type: 'error', text: '변경 중 오류가 발생했습니다.' })
                  }
                }} className="flex flex-col gap-4">
                  
                  <div>
                    <label className="block text-xs font-bold text-yuri-500 mb-1.5">현재 비밀번호</label>
                    <input 
                      type="password" 
                      value={currentPassword}
                      onChange={e => setCurrentPassword(e.target.value)}
                      className="w-full px-4 py-2.5 bg-yuri-50 border border-yuri-200 rounded-lg text-sm outline-none focus:border-accent focus:bg-white transition-colors"
                    />
                  </div>

                  <div className="border-t border-yuri-100 my-2" />

                  <div>
                    <label className="block text-xs font-bold text-yuri-500 mb-1.5">새 비밀번호</label>
                    <input 
                      type="password" 
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      className="w-full px-4 py-2.5 bg-yuri-50 border border-yuri-200 rounded-lg text-sm outline-none focus:border-accent focus:bg-white transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-yuri-500 mb-1.5">새 비밀번호 확인</label>
                    <input 
                      type="password" 
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className="w-full px-4 py-2.5 bg-yuri-50 border border-yuri-200 rounded-lg text-sm outline-none focus:border-accent focus:bg-white transition-colors"
                    />
                  </div>

                  {passwordMsg.text && (
                    <div className={`mt-2 p-3 rounded-lg text-sm font-medium ${passwordMsg.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
                      {passwordMsg.text}
                    </div>
                  )}

                  <div className="mt-4 flex justify-end">
                    <button 
                      type="submit"
                      disabled={!currentPassword || !newPassword || !confirmPassword}
                      className="px-6 py-2.5 bg-accent text-white font-bold rounded-lg hover:bg-accent/90 disabled:opacity-50 transition-colors"
                    >
                      비밀번호 변경
                    </button>
                  </div>
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
