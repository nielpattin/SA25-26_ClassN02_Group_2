type ProgressProps = {
  value: number
  max?: number
  className?: string
}

export function Progress({ value, max = 100, className = '' }: ProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)

  return (
    <div className={`h-[10px] bg-[#EEEEEE] border-2 border-black overflow-hidden rounded-none shadow-brutal-sm ${className}`}>
      <div 
        className="h-full bg-accent border-r-2 border-black transition-[width] duration-300 ease-in-out" 
        style={{ width: `${percentage}%` }} 
      />
    </div>
  )
}
