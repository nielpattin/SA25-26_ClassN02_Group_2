import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useCallback, useEffect, useState } from 'react'
import { verifyEmail } from '../api/auth'
import { Button } from '../components/ui/Button'

export const Route = createFileRoute('/verify-email')({
  component: VerifyEmail,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      token: (search.token as string) || '',
    }
  },
})

function VerifyEmail() {
  const { token } = Route.useSearch()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [verifying, setVerifying] = useState(!!token)
  const [success, setSuccess] = useState(false)

  const handleVerify = useCallback(async (token: string) => {
    setError('')
    setVerifying(true)
    try {
      const result = await verifyEmail({
        query: {
          token,
        },
      })

      if (result.error) {
        setError(result.error.message || 'Verification failed. The link may be expired.')
      } else {
        setSuccess(true)
        setTimeout(() => {
          navigate({ to: '/' })
        }, 3000)
      }
    } catch {
      setError('An error occurred. Please try again.')
    } finally {
      setVerifying(false)
    }
  }, [navigate])

  useEffect(() => {
    if (token) {
      handleVerify(token)
    }
  }, [token, handleVerify])

  if (!token) {
    return (
      <div className="bg-canvas flex min-h-screen flex-col items-center justify-center p-4">
        <div className="bg-surface shadow-brutal-xl relative w-full max-w-100 border border-black p-10 text-center">
          <h2 className="m-0 mb-6 text-2xl font-extrabold text-black uppercase">Check your email</h2>
          <p className="mb-8 font-bold text-black uppercase opacity-70">
            We've sent a verification link to your email address. Please click the link to verify your account.
          </p>
          <Button onClick={() => navigate({ to: '/' })} fullWidth>
            Back to Home
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-canvas flex min-h-screen flex-col items-center justify-center p-4">
      <div className="bg-surface shadow-brutal-xl relative w-full max-w-100 border border-black p-10 text-center">
        <h2 className="m-0 mb-6 text-2xl font-extrabold text-black uppercase">
          {verifying ? 'Verifying...' : success ? 'Verified!' : 'Verification Failed'}
        </h2>

        {verifying && (
          <div className="flex flex-col items-center gap-4">
            <p className="font-bold text-black uppercase opacity-70">Please wait while we verify your email...</p>
            <div className="h-1 w-full overflow-hidden border border-black bg-white">
              <div className="bg-accent h-full animate-pulse" style={{ width: '100%' }}></div>
            </div>
          </div>
        )}

        {success && (
          <div className="flex flex-col items-center gap-4">
            <p className="text-success-border font-bold uppercase">
              Your email has been verified successfully. Redirecting you...
            </p>
            <div className="h-1 w-full overflow-hidden border border-black bg-white">
              <div className="bg-accent h-full animate-pulse" style={{ width: '100%' }}></div>
            </div>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center gap-4">
            <div className="bg-danger-bg w-full border border-black p-4 text-sm font-bold text-black uppercase">
              {error}
            </div>
            <p className="font-bold text-black uppercase opacity-70">
              The link may be invalid or expired. Please request a new verification link.
            </p>
            <Button onClick={() => navigate({ to: '/' })} fullWidth>
              Back to Home
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
