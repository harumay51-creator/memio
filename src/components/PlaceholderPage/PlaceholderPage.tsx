import React from 'react'
import type { PageId } from '../../types'

interface PlaceholderPageProps {
  pageId: PageId
  label: string
  icon: string
}

const PlaceholderPage: React.FC<PlaceholderPageProps> = ({ label, icon }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      <div className="
        w-16 h-16 rounded-2xl bg-yuri-100
        flex items-center justify-center text-3xl mb-5
        shadow-inner
      ">
        {icon}
      </div>
      <h2 className="text-xl font-bold text-yuri-800 mb-2">{label}</h2>
      <p className="text-sm text-yuri-400 max-w-xs leading-relaxed">
        이 기능은 다음 단계에서 추가될 예정입니다.<br />
        기대해 주세요! 🚀
      </p>
      <div className="
        mt-6 px-4 py-2 rounded-lg
        bg-accent/10 text-accent text-xs font-semibold
      ">
        Coming Soon
      </div>
    </div>
  )
}

export default PlaceholderPage
