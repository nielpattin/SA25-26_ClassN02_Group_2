import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { resetPassword } from '../api/auth'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

export const Route = createFileRoute('/reset-password')({
  component: ResetPassword,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      token: (search.token as string) || '',
    }
  },
})

function ResetPassword() {
  const { token } = Route.useSearch()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  if (!token) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-canvas p-4">
        <div className="relative w-full max-w-100 border border-black bg-surface p-10 text-center shadow-brutal-xl">
          <h2 className="m-0 mb-6 text-2xl font-extrabold text-black uppercase">Invalid Link</h2>
          <p className="mb-8 font-bold text-black uppercase opacity-70">
            This password reset link is invalid or has expired.
          </p>
          <Button onClick={() => navigate({ to: '/' })} fullWidth>
            Back to Home
          </Button>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      const result = await resetPassword({
        newPassword: password,
        token,
      })

      if (result.error) {
        setError(result.error.message || 'Failed to reset password. The link may be expired.')
      } else {
        setSuccess(true)
        setTimeout(() => {
          navigate({ to: '/' })
        }, 3000)
      }
    } catch {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-canvas p-4">
        <div className="relative w-full max-w-100 border border-black bg-surface p-10 text-center shadow-brutal-xl">
          <h2 className="m-0 mb-6 text-2xl font-extrabold text-black uppercase">Success!</h2>
          <p className="mb-8 font-bold text-success-border uppercase">
            Your password has been reset successfully. Redirecting you to login...
          </p>
          <div className="h-1 overflow-hidden bg-black">
             <div className="h-full animate-pulse bg-accent" style={{ width: '100%' }}></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas p-4">
      <div className="relative w-full max-w-100 border border-black bg-surface p-10 shadow-brutal-xl">
        <h2 className="m-0 mb-6 text-center text-2xl font-extrabold tracking-widest text-black uppercase">Reset Password</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            type="password"
            placeholder="New Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
          <Input
            type="password"
            placeholder="Confirm New Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
          />
          
          {error && <div className="rounded-none border border-black bg-danger-bg p-2 text-sm font-bold text-black uppercase">{error}</div>}
          
          <Button
            type="submit"
            fullWidth
            disabled={loading}
          >
            {loading ? 'Updating...' : 'Reset Password'}
          </Button>
        </form>
      </div>
    </div>
  )
}
