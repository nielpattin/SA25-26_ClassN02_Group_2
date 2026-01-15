import './Progress.css'

type ProgressProps = {
  value: number
  max?: number
  className?: string
}

export function Progress({ value, max = 100, className = '' }: ProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)

  return (
    <div className={`brutal-progress-bar ${className}`}>
      <div 
        className="brutal-progress-fill" 
        style={{ width: `${percentage}%` }} 
      />
    </div>
  )
}
