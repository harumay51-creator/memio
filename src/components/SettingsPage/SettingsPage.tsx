import React, { useState } from 'react'
import { useAppStore } from '../../store/AppStore'
import { auth } from '../../config/firebase'
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth'
import TrashSection from './TrashSection'

type TabType = 'ledger' | 'security' | 'anniversaries' | 'monthly' | 'trash'

const SettingsPage: React.FC = () => {
  const { 
    expenseCategories, addCategoryKeyword, removeCategoryKeyword, addCategory,
    anniversaries, addAnniversary, deleteAnniversary,
    monthlyEvents, addMonthlyEvent, deleteMonthlyEvent,
    cardPaymentDay, setCardPaymentDay,
    cardBillingStartDay, cardBillingEndDay, setCardBillingDays,
    payday, setPayday, monthlySalary, setMonthlySalary, resetLedgerData
  } = useAppStore()
  
  const [activeTab, setActiveTab] = useState<TabType>('ledger')

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

  // ── Anniversary States ─────
  const [annivName, setAnnivName] = useState('')
  const [annivMonth, setAnnivMonth] = useState('')
  const [annivDay, setAnnivDay] = useState('')

  // ── Monthly Event States ───
  const [monthlyName, setMonthlyName] = useState('')
  const [monthlyDay, setMonthlyDay] = useState('')

  // ── Ledger Handlers ────────
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
      const credential = EmailAuthProvider.credential(user.email, currentPassword)
      await reauthenticateWithCredential(user, credential)
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

  // ── Anniversary Handlers ───
  const handleAddAnniv = (e: React.FormEvent) => {
    e.preventDefault()
    const m = parseInt(annivMonth, 10)
    const d = parseInt(annivDay, 10)
    if (!annivName.trim() || isNaN(m) || isNaN(d)) return
    addAnniversary(annivName.trim(), m, d)
    setAnnivName('')
    setAnnivMonth('')
    setAnnivDay('')
  }

  // ── Monthly Event Handlers ──
  const handleAddMonthly = (e: React.FormEvent) => {
    e.preventDefault()
    const d = parseInt(monthlyDay, 10)
    if (!monthlyName.trim() || isNaN(d)) return
    addMonthlyEvent(monthlyName.trim(), d)
    setMonthlyName('')
    setMonthlyDay('')
  }

  const getTabTitle = (tab: TabType) => {
    switch (tab) {
      case 'ledger': return '가계부 설정'
      case 'security': return '보안 및 비밀번호'
      case 'anniversaries': return '기념일 관리'
      case 'monthly': return '매월 반복 일정'
      case 'trash': return '휴지통'
    }
  }

  return (
    <div className="flex h-full w-full bg-white overflow-hidden">
      <aside className="w-[30%] min-w-[320px] max-w-[400px] border-r border-yuri-100 bg-yuri-50/30 flex flex-col shrink-0 h-full">
        <header className="shrink-0 h-16 border-b border-yuri-100 flex items-center px-8 bg-white">
          <h2 className="text-lg font-bold text-yuri-900 tracking-tight">설정</h2>
        </header>
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
          <button 
            onClick={() => setActiveTab('ledger')}
            className={`w-full text-left px-4 py-3 rounded-lg font-bold text-sm transition-colors ${
              activeTab === 'ledger' ? 'bg-yuri-100 text-yuri-900' : 'text-yuri-600 hover:bg-yuri-50'
            }`}
          >
            가계부 설정
          </button>
          <button 
            onClick={() => setActiveTab('anniversaries')}
            className={`w-full text-left px-4 py-3 rounded-lg font-bold text-sm transition-colors ${
              activeTab === 'anniversaries' ? 'bg-yuri-100 text-yuri-900' : 'text-yuri-600 hover:bg-yuri-50'
            }`}
          >
            기념일 관리 (매년)
          </button>
          <button 
            onClick={() => setActiveTab('monthly')}
            className={`w-full text-left px-4 py-3 rounded-lg font-bold text-sm transition-colors ${
              activeTab === 'monthly' ? 'bg-yuri-100 text-yuri-900' : 'text-yuri-600 hover:bg-yuri-50'
            }`}
          >
            매월 반복 일정
          </button>
          <button 
            onClick={() => setActiveTab('security')}
            className={`w-full text-left px-4 py-3 rounded-lg font-bold text-sm transition-colors ${
              activeTab === 'security' ? 'bg-yuri-100 text-yuri-900' : 'text-yuri-600 hover:bg-yuri-50'
            }`}
          >
            보안 및 비밀번호
          </button>
          <button 
            onClick={() => setActiveTab('trash')}
            className={`w-full text-left px-4 py-3 rounded-lg font-bold text-sm transition-colors ${
              activeTab === 'trash' ? 'bg-yuri-100 text-yuri-900' : 'text-yuri-600 hover:bg-yuri-50'
            }`}
          >
            휴지통
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full bg-white relative min-w-0">
        <header className="shrink-0 h-16 border-b border-yuri-100 flex items-center px-8 bg-white">
          <h2 className="text-lg font-bold text-yuri-900 tracking-tight">
            {getTabTitle(activeTab)}
          </h2>
        </header>

        <div className="flex-1 overflow-y-auto p-8 pb-32">
          <div className="max-w-2xl">
            {activeTab === 'ledger' && (
              <>
                <div className="bg-white border border-yuri-200 rounded-xl p-8 shadow-sm mb-8">
                  <h3 className="text-lg font-bold text-yuri-900 mb-2">신용카드 청구 설정</h3>
                  <p className="text-sm text-yuri-500 mb-6 leading-relaxed">
                    가계부에서 카드값 청구 예정액을 정확히 계산하기 위해 <strong>사용기간 시작일과 종료일</strong>을 설정해주세요.<br />
                    (결제일은 단순 참고용으로 화면에 표시되며 실제 계산은 사용기간 설정값을 기준으로 이루어집니다.)
                  </p>
                  
                  <div className="flex flex-col gap-5">
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-bold text-yuri-700 w-24">카드 결제일</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1" max="31"
                          value={cardPaymentDay}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            if (!isNaN(val) && val >= 1 && val <= 31) {
                              setCardPaymentDay(val);
                            }
                          }}
                          className="w-20 px-3 py-2 bg-yuri-50 border border-yuri-200 rounded-lg text-sm outline-none focus:border-accent focus:bg-white transition-colors"
                        />
                        <span className="text-sm font-bold text-yuri-700">일</span>
                      </div>
                    </div>

                    <div className="h-px bg-yuri-100 my-1"></div>

                    <div className="flex items-center gap-4">
                      <span className="text-sm font-bold text-yuri-700 w-24">월급일</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1" max="31"
                          value={payday}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            if (!isNaN(val) && val >= 1 && val <= 31) {
                              setPayday(val);
                            }
                          }}
                          className="w-20 px-3 py-2 bg-yuri-50 border border-yuri-200 rounded-lg text-sm outline-none focus:border-accent focus:bg-white transition-colors"
                        />
                        <span className="text-sm font-bold text-yuri-700">일</span>
                      </div>
                    </div>

                    <div className="h-px bg-yuri-100 my-1"></div>

                    <div className="flex items-center gap-4">
                      <span className="text-sm font-bold text-yuri-700 w-24">월급액</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={monthlySalary.toLocaleString('ko-KR')}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/[^0-9]/g, '');
                            const val = parseInt(raw, 10);
                            if (!isNaN(val)) {
                              setMonthlySalary(val);
                            } else if (raw === '') {
                              setMonthlySalary(0);
                            }
                          }}
                          className="w-32 px-3 py-2 bg-yuri-50 border border-yuri-200 rounded-lg text-sm text-right outline-none focus:border-accent focus:bg-white transition-colors"
                        />
                        <span className="text-sm font-bold text-yuri-700">원</span>
                      </div>
                    </div>

                    <div className="h-px bg-yuri-100 my-1"></div>

                    <div className="flex items-center gap-4">
                      <span className="text-sm font-bold text-yuri-700 w-24">사용기간 시작</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-yuri-500">전전월</span>
                        <input
                          type="number"
                          min="1" max="31"
                          value={cardBillingStartDay}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            if (!isNaN(val) && val >= 1 && val <= 31) {
                              setCardBillingDays(val, cardBillingEndDay);
                            }
                          }}
                          className="w-20 px-3 py-2 bg-yuri-50 border border-yuri-200 rounded-lg text-sm outline-none focus:border-accent focus:bg-white transition-colors"
                        />
                        <span className="text-sm font-bold text-yuri-700">일</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="text-sm font-bold text-yuri-700 w-24">사용기간 종료</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-yuri-500">전월</span>
                        <input
                          type="number"
                          min="1" max="31"
                          value={cardBillingEndDay}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            if (!isNaN(val) && val >= 1 && val <= 31) {
                              setCardBillingDays(cardBillingStartDay, val);
                            }
                          }}
                          className="w-20 px-3 py-2 bg-yuri-50 border border-yuri-200 rounded-lg text-sm outline-none focus:border-accent focus:bg-white transition-colors"
                        />
                        <span className="text-sm font-bold text-yuri-700">일</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-5 text-xs text-yuri-400 bg-yuri-50 p-3 rounded-lg border border-yuri-100">
                    ※ 입력 시 자동 저장됩니다. 예: 시작 28일, 종료 27일 설정 시 7월 가계부의 청구 예정액은 '5월 28일 ~ 6월 27일' 사용분으로 계산됩니다.
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="text-lg font-bold text-yuri-900 mb-2">가계부 카테고리 키워드</h3>
                  <p className="text-sm text-yuri-500 leading-relaxed">
                    하단 입력창(Quick Capture)에 등록된 단어가 포함된 문장을 입력하면, 설정된 카테고리로 <strong>자동 분류</strong>됩니다.<br/>
                    <span className="text-xs text-yuri-400 mt-1 inline-block">예: 카페 카테고리에 "메가커피" 추가 → "메가커피 3000원" 입력 시 카페 지출로 저장</span>
                  </p>
                </div>

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

                <div className="bg-red-50 border border-red-200 rounded-xl p-8 shadow-sm mb-8 mt-12">
                  <h3 className="text-lg font-bold text-red-700 mb-2">가계부 초기화 (위험)</h3>
                  <p className="text-sm text-red-600 mb-6 leading-relaxed">
                    가계부 내역, 카드 결제 대금, 고정 지출 등 모든 가계부 데이터가 영구적으로 삭제됩니다.<br />
                    (메모, 할 일, 일정, 개인 기록은 유지됩니다.)
                  </p>
                  <button
                    onClick={() => {
                      if (window.confirm('정말로 가계부 데이터를 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
                        resetLedgerData();
                      }
                    }}
                    className="px-4 py-2 bg-red-600 text-white text-sm font-bold rounded-lg shadow-sm hover:bg-red-700 transition-colors"
                  >
                    데이터 초기화
                  </button>
                </div>
              </>
            )}

            {activeTab === 'anniversaries' && (
              <div className="bg-white border border-yuri-200 rounded-xl p-8 shadow-sm">
                <h3 className="text-lg font-bold text-yuri-900 mb-2">기념일 관리</h3>
                <p className="text-sm text-yuri-500 mb-6">매년 반복되는 기념일을 추가하면 달력에 자동으로 표시됩니다.</p>

                <form onSubmit={handleAddAnniv} className="flex gap-3 mb-8">
                  <input
                    type="text"
                    placeholder="이름 (예: 엄마 생일)"
                    value={annivName}
                    onChange={e => setAnnivName(e.target.value)}
                    className="flex-1 px-4 py-3 bg-yuri-50 border border-yuri-200 rounded-lg text-sm outline-none focus:border-accent focus:bg-white transition-colors"
                    required
                  />
                  <input
                    type="number"
                    min="1" max="12"
                    placeholder="월 (1-12)"
                    value={annivMonth}
                    onChange={e => setAnnivMonth(e.target.value)}
                    className="w-24 px-4 py-3 bg-yuri-50 border border-yuri-200 rounded-lg text-sm outline-none focus:border-accent focus:bg-white transition-colors"
                    required
                  />
                  <input
                    type="number"
                    min="1" max="31"
                    placeholder="일 (1-31)"
                    value={annivDay}
                    onChange={e => setAnnivDay(e.target.value)}
                    className="w-24 px-4 py-3 bg-yuri-50 border border-yuri-200 rounded-lg text-sm outline-none focus:border-accent focus:bg-white transition-colors"
                    required
                  />
                  <button type="submit" className="px-6 py-3 bg-yuri-900 text-white font-bold rounded-lg hover:bg-yuri-800 transition-colors">
                    추가
                  </button>
                </form>

                <div className="flex flex-col gap-3">
                  {anniversaries.length === 0 ? (
                    <div className="text-center py-8 text-yuri-400 text-sm">등록된 기념일이 없습니다.</div>
                  ) : (
                    anniversaries.map(a => (
                      <div key={a.id} className="flex items-center justify-between px-5 py-4 bg-yuri-50 border border-yuri-200 rounded-xl">
                        <div className="flex items-center gap-4">
                          <span className="text-yuri-900 font-bold">{a.name}</span>
                          <span className="text-yuri-500 text-sm">{a.month}월 {a.day}일</span>
                        </div>
                        <button onClick={() => deleteAnniversary(a.id)} className="text-red-500 hover:text-red-600 text-sm font-bold px-3 py-1 bg-white border border-red-100 rounded hover:bg-red-50">
                          삭제
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'monthly' && (
              <div className="bg-white border border-yuri-200 rounded-xl p-8 shadow-sm">
                <h3 className="text-lg font-bold text-yuri-900 mb-2">매월 반복 일정</h3>
                <p className="text-sm text-yuri-500 mb-6">매달 고정적으로 있는 일정을 추가하면 달력에 자동으로 표시됩니다.</p>

                <form onSubmit={handleAddMonthly} className="flex gap-3 mb-8">
                  <input
                    type="text"
                    placeholder="일정 이름 (예: VC레포트 제출)"
                    value={monthlyName}
                    onChange={e => setMonthlyName(e.target.value)}
                    className="flex-1 px-4 py-3 bg-yuri-50 border border-yuri-200 rounded-lg text-sm outline-none focus:border-accent focus:bg-white transition-colors"
                    required
                  />
                  <input
                    type="number"
                    min="1" max="31"
                    placeholder="며칠 (1-31)"
                    value={monthlyDay}
                    onChange={e => setMonthlyDay(e.target.value)}
                    className="w-32 px-4 py-3 bg-yuri-50 border border-yuri-200 rounded-lg text-sm outline-none focus:border-accent focus:bg-white transition-colors"
                    required
                  />
                  <button type="submit" className="px-6 py-3 bg-yuri-900 text-white font-bold rounded-lg hover:bg-yuri-800 transition-colors">
                    추가
                  </button>
                </form>

                <div className="flex flex-col gap-3">
                  {monthlyEvents.length === 0 ? (
                    <div className="text-center py-8 text-yuri-400 text-sm">등록된 반복 일정이 없습니다.</div>
                  ) : (
                    monthlyEvents.map(m => (
                      <div key={m.id} className="flex items-center justify-between px-5 py-4 bg-yuri-50 border border-yuri-200 rounded-xl">
                        <div className="flex items-center gap-4">
                          <span className="text-yuri-900 font-bold">{m.name}</span>
                          <span className="text-yuri-500 text-sm">매월 {m.day}일</span>
                        </div>
                        <button onClick={() => deleteMonthlyEvent(m.id)} className="text-red-500 hover:text-red-600 text-sm font-bold px-3 py-1 bg-white border border-red-100 rounded hover:bg-red-50">
                          삭제
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
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

            {activeTab === 'trash' && (
              <TrashSection />
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default SettingsPage
