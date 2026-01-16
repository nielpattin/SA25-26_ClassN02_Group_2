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
    <div className="fixed inset-0 z-1000 flex items-center justify-center bg-black/80" onClick={handleBackdropClick}>
      <div className="bg-surface shadow-brutal-xl animate-in fade-in zoom-in relative w-full max-w-100 rounded-none border border-black p-10 duration-200">
        <button
          className="hover:bg-text-danger hover:shadow-brutal-sm absolute top-4 right-4 flex size-8 cursor-pointer items-center justify-center border border-black bg-white text-black transition-all hover:-translate-0.5 hover:text-white active:translate-0 active:shadow-none"
          onClick={onClose}
        >
          <X size={16} />
        </button>
        <h2 className="m-0 mb-6 text-center text-2xl font-extrabold tracking-wider text-black uppercase">{isLogin ? 'LOGIN' : 'SIGN UP'}</h2>
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
          {error && <div className="bg-danger-bg rounded-none border border-black p-2 text-sm font-bold text-black">{error}</div>}
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
          className="mt-4 w-full cursor-pointer border-none bg-transparent p-2 text-[13px] font-bold text-black uppercase hover:underline"
        >
          {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Login'}
        </button>
      </div>
    </div>
  )
}
