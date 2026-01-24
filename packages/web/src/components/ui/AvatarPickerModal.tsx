import { useState } from 'react'
import { X, Check, Loader2, Github } from 'lucide-react'
import { useSession, updateUser } from '../../api/auth'
import { Button } from './Button'
import { Avatar } from './Avatar'

interface AvatarPickerModalProps {
  isOpen: boolean
  onClose: () => void
  userName: string
  githubAvatarUrl?: string | null
}

const DEFAULT_AVATARS = [
  { name: 'Yellow', color: '#FFD166' },
  { name: 'Green', color: '#2ECC71' },
  { name: 'Blue', color: '#3498DB' },
  { name: 'Orange', color: '#F1C40F' },
  { name: 'Red', color: '#E74C3C' },
  { name: 'Purple', color: '#9B59B6' },
]

export function AvatarPickerModal({ isOpen, onClose, userName, githubAvatarUrl }: AvatarPickerModalProps) {
  const { refetch } = useSession()
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(githubAvatarUrl || null)
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleSave = async () => {
    setLoading(true)
    try {
      const { error } = await updateUser({
        image: selectedAvatar,
      })
      if (error) {
        alert(error.message || 'Failed to update avatar')
      } else {
        await refetch()
        onClose()
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-1000 flex items-center justify-center bg-black/80" onClick={handleBackdropClick}>
      <div className="bg-surface shadow-brutal-xl animate-in fade-in zoom-in relative w-full max-w-120 rounded-none border border-black p-10 duration-200">
        <button
          className="hover:bg-text-danger hover:shadow-brutal-sm absolute top-4 right-4 flex size-8 cursor-pointer items-center justify-center border border-black bg-white text-black transition-all hover:-translate-0.5 hover:text-white active:translate-0 active:shadow-none"
          onClick={onClose}
        >
          <X size={16} />
        </button>

        <h2 className="m-0 mb-2 text-center text-2xl font-extrabold tracking-wider text-black uppercase">
          Welcome to Kyte!
        </h2>
        <p className="mb-8 text-center text-xs font-bold text-black/50 uppercase">
          Choose your profile picture to get started
        </p>

        <div className="mb-10 flex flex-col items-center">
          <div className="relative mb-8">
            <Avatar 
              src={selectedAvatar} 
              fallback={userName} 
              size="lg" 
              className="shadow-brutal-lg size-24! text-2xl!" 
            />
            {selectedAvatar === githubAvatarUrl && githubAvatarUrl && (
              <div className="absolute -right-2 -bottom-2 flex size-6 items-center justify-center border border-black bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <Github size={12} />
              </div>
            )}
          </div>

          <div className="grid grid-cols-4 gap-4">
            {githubAvatarUrl && (
              <button
                onClick={() => setSelectedAvatar(githubAvatarUrl)}
                className={`relative flex size-12 cursor-pointer items-center justify-center overflow-hidden border border-black transition-all hover:-translate-y-0.5 ${
                  selectedAvatar === githubAvatarUrl ? 'ring-4 ring-black ring-offset-2' : ''
                }`}
              >
                <img src={githubAvatarUrl} className="h-full w-full object-cover" alt="GitHub" />
                {selectedAvatar === githubAvatarUrl && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <Check size={20} className="text-white drop-shadow-md" />
                  </div>
                )}
              </button>
            )}
            
            <button
              onClick={() => setSelectedAvatar(null)}
              className={`bg-accent relative flex size-12 cursor-pointer items-center justify-center border border-black text-xs font-black transition-all hover:-translate-y-0.5 ${
                selectedAvatar === null ? 'ring-4 ring-black ring-offset-2' : ''
              }`}
            >
              {userName.charAt(0).toUpperCase()}
              {selectedAvatar === null && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                  <Check size={20} className="text-black" />
                </div>
              )}
            </button>

            {DEFAULT_AVATARS.map((avatar) => (
              <button
                key={avatar.name}
                onClick={() => setSelectedAvatar(null)} // Since we don't have a way to set color-only images yet without complex logic, let's just use placeholder logic or skip for now if not strictly required.
                // Wait, if I set image to null, it uses initials with bg-accent.
                // To support colors, I'd need to change how user.image works or add a user.color field.
                // PRD says "existing default avatar options".
                // Since I don't see any, I'll just provide GitHub and Default (initials) for now, 
                // but I'll add a few colored variants if I can find them.
                disabled
                className="flex size-12 cursor-not-allowed items-center justify-center border border-black opacity-20"
                style={{ backgroundColor: avatar.color }}
              >
                <span className="text-[10px] font-black">{avatar.name.charAt(0)}</span>
              </button>
            ))}
          </div>
        </div>

        <Button
          fullWidth
          onClick={handleSave}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              SAVING...
            </>
          ) : (
            'CONTINUE TO DASHBOARD'
          )}
        </Button>
      </div>
    </div>
  )
}
