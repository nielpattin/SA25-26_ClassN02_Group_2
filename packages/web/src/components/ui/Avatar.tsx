import './Avatar.css'

type AvatarProps = {
  src?: string | null
  fallback: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function Avatar({ src, fallback, size = 'md', className = '' }: AvatarProps) {
  return (
    <div className={`brutal-avatar size-${size} ${className}`}>
      {src ? (
        <img src={src} alt={fallback} />
      ) : (
        <span className="avatar-fallback">{fallback.charAt(0).toUpperCase()}</span>
      )}
    </div>
  )
}
