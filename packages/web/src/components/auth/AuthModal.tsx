import { useState } from 'react'
import { X } from 'lucide-react'
import { useSession } from '../../api/auth'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { refetch } = useSession()

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isLogin) {
        const { signIn } = await import('../../api/auth')
        const result = await signIn.email({ email, password })
        if (result.error) {
          setError(result.error.message || 'Login failed')
        } else {
          refetch()
          onClose()
        }
      } else {
        const { signUp } = await import('../../api/auth')
        const result = await signUp.email({ email, password, name })
        if (result.error) {
          setError(result.error.message || 'Signup failed')
        } else {
          refetch()
          onClose()
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
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
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-1000" onClick={handleBackdropClick}>
      <div className="bg-surface border border-black rounded-none shadow-brutal-xl p-10 w-full max-w-100 relative animate-in fade-in zoom-in duration-200">
        <button
          className="absolute top-4 right-4 bg-white border border-black text-black cursor-pointer w-8 h-8 flex items-center justify-center transition-all hover:bg-text-danger hover:text-white hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal-sm active:translate-x-0 active:translate-y-0 active:shadow-none"
          onClick={onClose}
        >
          <X size={16} />
        </button>
        <h2 className="m-0 mb-6 text-2xl font-extrabold text-black text-center tracking-wider uppercase">{isLogin ? 'LOGIN' : 'SIGN UP'}</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {!isLogin && (
            <Input
              type="text"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          )}
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
          {error && <div className="text-black text-sm font-bold p-2 bg-danger-bg border border-black rounded-none">{error}</div>}
          <Button
            type="submit"
            fullWidth
            disabled={loading}
          >
            {loading ? 'Loading...' : isLogin ? 'Login' : 'Sign Up'}
          </Button>
        </form>
        <button
          onClick={() => setIsLogin(!isLogin)}
          className="w-full mt-4 p-2 bg-transparent border-none text-black text-[13px] font-bold uppercase cursor-pointer hover:underline"
        >
          {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Login'}
        </button>
      </div>
    </div>
  )
}
