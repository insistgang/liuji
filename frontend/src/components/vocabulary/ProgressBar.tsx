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
        <div className="flex justify-between text-sm text-gray-600 dark:text-slate-300 mb-1">
          <span>{label}</span>
          <span>{current}/{total}</span>
        </div>
      )}
      <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2.5">
        <div
          className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}
