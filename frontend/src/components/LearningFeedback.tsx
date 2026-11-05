import { useEffect, useEffectEvent } from 'react'
import { CheckCircle2, RotateCcw, X, AlertCircle } from 'lucide-react'

export default function LearningFeedback({ message, tone, onDismiss }: { message: string; tone: 'success' | 'retry' | 'error'; onDismiss: () => void }) {
  const dismiss = useEffectEvent(onDismiss)
  useEffect(() => {
    const timer = window.setTimeout(() => dismiss(), 1000)
    return () => window.clearTimeout(timer)
  }, [])
  const Icon = tone === 'success' ? CheckCircle2 : tone === 'retry' ? RotateCcw : AlertCircle
  return <div className={`feedback-enter fixed bottom-24 md:bottom-6 left-4 right-4 z-50 mx-auto flex max-w-lg items-start gap-3 rounded-2xl border p-4 shadow-lg ${tone === 'success' ? 'border-teal-200 bg-teal-50 text-teal-900' : tone === 'retry' ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-red-200 bg-red-50 text-red-900'}`}>
    <Icon size={22} className="mt-0.5 shrink-0" aria-hidden="true" />
    <p role={tone === 'error' ? 'alert' : 'status'} className="min-w-0 flex-1 break-words text-sm leading-6">{message}</p>
    <button type="button" onClick={onDismiss} aria-label="关闭操作反馈" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"><X size={18} aria-hidden="true" /></button>
  </div>
}
