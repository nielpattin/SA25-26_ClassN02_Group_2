import { useState } from 'react'
import { X } from 'lucide-react'
import { useSession } from '../../api/auth'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
}

type AuthMode = 'login' | 'signup' | 'forgot'

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [showResend, setShowResend] = useState(false)
  const { refetch } = useSession()

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccessMessage('')
    setShowResend(false)
    setLoading(true)

    try {
      if (mode === 'login') {
        const { signIn } = await import('../../api/auth')
        const result = await signIn.email({ email, password })
        if (result.error) {
          if (result.error.code === 'EMAIL_NOT_VERIFIED') {
            setError('Please verify your email first.')
            setShowResend(true)
          } else {
            setError(result.error.message || 'Login failed')
          }
        } else {
          refetch()
          onClose()
        }
      } else if (mode === 'signup') {
        const { signUp } = await import('../../api/auth')
        const result = await signUp.email({ email, password, name })
        if (result.error) {
          setError(result.error.message || 'Signup failed')
        } else {
          refetch()
          onClose()
        }
      } else if (mode === 'forgot') {
        const { forgetPassword } = await import('../../api/auth')
        const result = await forgetPassword({ email })
        if (result.error) {
          if (result.error.status === 429) {
            setError('Too many requests. Please try again in an hour.')
          } else {
            // Better Auth returns error if user not found, but we show success anyway for security
            // unless it's a critical error.
            setSuccessMessage('If an account exists for this email, you will receive a reset link shortly.')
          }
        } else {
          setSuccessMessage('If an account exists for this email, you will receive a reset link shortly.')
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

  const handleResend = async () => {
    setError('')
    setSuccessMessage('')
    setLoading(true)
    try {
      const { sendVerificationEmail } = await import('../../api/auth')
      const result = await sendVerificationEmail({ email, callbackURL: '/' })
      if (result.error) {
        if (result.error.status === 429) {
          setError('Too many requests. Please try again later.')
        } else {
          setError(result.error.message || 'Failed to send verification email')
        }
      } else {
        setSuccessMessage('Verification email sent!')
        setShowResend(false)
      }
    } catch {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
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
        <h2 className="m-0 mb-6 text-center text-2xl font-extrabold tracking-wider text-black uppercase">
          {mode === 'login' ? 'LOGIN' : mode === 'signup' ? 'SIGN UP' : 'RESET PASSWORD'}
        </h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === 'signup' && (
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
          {mode !== 'forgot' && (
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          )}
          
          {mode === 'login' && (
            <button
              type="button"
              onClick={() => setMode('forgot')}
              className="w-fit cursor-pointer self-end border-none bg-transparent p-0 text-[12px] font-bold text-black uppercase hover:underline"
            >
              Forgot password?
            </button>
          )}

          {error && <div className="bg-danger-bg rounded-none border border-black p-2 text-sm font-bold text-black">{error}</div>}
          {showResend && (
            <button
              type="button"
              onClick={handleResend}
              disabled={loading}
              className="w-full cursor-pointer border border-black bg-white p-2 text-[12px] font-bold text-black uppercase hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Resend verification email
            </button>
          )}
          {successMessage && <div className="bg-success-bg rounded-none border border-black p-2 text-sm font-bold text-black">{successMessage}</div>}
          
          <Button
            type="submit"
            fullWidth
            disabled={loading}
          >
            {loading ? 'Loading...' : mode === 'login' ? 'Login' : mode === 'signup' ? 'Sign Up' : 'Send Reset Link'}
          </Button>
        </form>
        
        <div className="mt-4 flex flex-col gap-2">
          <button
            onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
            className="w-full cursor-pointer border-none bg-transparent p-2 text-[13px] font-bold text-black uppercase hover:underline"
          >
            {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Login'}
          </button>
          
          {mode === 'forgot' && (
            <button
              onClick={() => setMode('login')}
              className="w-full cursor-pointer border-none bg-transparent p-2 text-[13px] font-bold text-black uppercase hover:underline"
            >
              Back to login
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
