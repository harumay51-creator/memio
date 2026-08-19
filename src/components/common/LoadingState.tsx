
import { Loader2 } from 'lucide-react'

export interface LoadingStateProps {
  type: 'full' | 'content'
}

export function LoadingState({ type }: LoadingStateProps) {
  if (type === 'full') {
    return (
      <div className="flex flex-col h-screen w-screen items-center justify-center bg-yuri-50 gap-3">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
        <div className="text-accent font-medium text-lg">불러오는 중...</div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex w-full h-full min-h-[4rem] items-center justify-center text-yuri-400">
      <Loader2 className="w-6 h-6 animate-spin" />
    </div>
  )
}
