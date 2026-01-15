type AvatarProps = {
  src?: string | null
  fallback: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function Avatar({ src, fallback, size = 'md', className = '' }: AvatarProps) {
  const sizes = {
    sm: 'w-[24px] h-[24px] text-[10px]',
    md: 'w-[36px] h-[36px] text-[14px]',
    lg: 'w-[48px] h-[48px] text-[18px]',
  }

  return (
    <div className={`bg-accent border-2 border-black flex items-center justify-center text-black font-extrabold overflow-hidden shrink-0 rounded-none ${sizes[size]} ${className}`}>
      {src ? (
        <img src={src} alt={fallback} className="w-full h-full object-cover" />
      ) : (
        <span className="uppercase">{fallback.charAt(0).toUpperCase()}</span>
      )}
    </div>
  )
}
