interface ProgressBarProps {
  current: number
  total: number
  label?: string
}

export default function ProgressBar({ current, total, label }: ProgressBarProps) {
  const percent = total > 0 ? Math.round((current / total) * 100) : 0

  return (
    <div className="w-full">
      {label && (
        <div className="mb-1.5 flex justify-between text-xs font-medium text-[var(--text-secondary)]">
          <span>{label}</span>
          <span>
            {current}/{total} ({percent}%)
          </span>
        </div>
      )}
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--bg-muted)]">
        <div
          className="h-2.5 rounded-full bg-[var(--accent)] transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}
