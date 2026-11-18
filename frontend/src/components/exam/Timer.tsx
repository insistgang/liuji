import { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'

interface TimerProps {
  startTime: string
  onTimeUpdate?: (seconds: number) => void
}

export default function Timer({ startTime, onTimeUpdate }: TimerProps) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const start = new Date(startTime).getTime()
    const interval = setInterval(() => {
      const now = Date.now()
      const secs = Math.floor((now - start) / 1000)
      setElapsed(secs)
      onTimeUpdate?.(secs)
    }, 1000)

    return () => clearInterval(interval)
  }, [startTime, onTimeUpdate])

  const hours = Math.floor(elapsed / 3600)
  const minutes = Math.floor((elapsed % 3600) / 60)
  const seconds = elapsed % 60

  const format = (n: number) => n.toString().padStart(2, '0')

  return (
    <div className="app-card inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium text-[var(--text-secondary)]">
      <Clock size={15} className="text-[var(--accent-text)]" />
      <span className="font-mono text-sm font-semibold text-[var(--text-primary)]">
        {hours > 0 ? `${format(hours)}:` : ''}
        {format(minutes)}:{format(seconds)}
      </span>
    </div>
  )
}
