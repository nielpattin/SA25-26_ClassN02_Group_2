type ProgressProps = {
  value: number
  max?: number
  className?: string
}

export function Progress({ value, max = 100, className = '' }: ProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)

  return (
    <div className={`h-[10px] overflow-hidden rounded-none border border-black bg-active shadow-brutal-sm ${className}`}>
      <div 
        className="h-full border-r border-black bg-accent transition-[width] duration-300 ease-in-out" 
        style={{ width: `${percentage}%` }} 
      />
    </div>
  )
}
