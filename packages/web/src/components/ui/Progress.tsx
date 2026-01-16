type ProgressProps = {
  value: number
  max?: number
  className?: string
}

export function Progress({ value, max = 100, className = '' }: ProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)

  return (
    <div className={`shadow-brutal-sm h-[10px] overflow-hidden rounded-none border border-black bg-[#EEEEEE] ${className}`}>
      <div 
        className="bg-accent h-full border-r border-black transition-[width] duration-300 ease-in-out" 
        style={{ width: `${percentage}%` }} 
      />
    </div>
  )
}
