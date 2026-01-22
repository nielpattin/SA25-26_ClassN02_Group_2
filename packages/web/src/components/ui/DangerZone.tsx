import { useState } from 'react'
import { AlertTriangle, Trash2 } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { api } from '../../api/client'
import { ConfirmModal } from './ConfirmModal'
import { Input } from './Input'
import { signOut } from '../../api/auth'

interface DangerZoneProps {
  userId: string
}

export function DangerZone({ userId }: DangerZoneProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const navigate = useNavigate()

  const handleDeleteAccount = async () => {
    if (!password) {
      setError('Password is required')
      return
    }

    setIsDeleting(true)
    setError('')

    try {
      const { error: deleteError } = await api.v1.users({ id: userId }).delete({
        password
      })

      if (deleteError) {
        setError(deleteError.value?.message || 'Failed to delete account')
        setIsDeleting(false)
        return
      }

      // Success - logout and redirect
      await signOut()
      navigate({ to: '/' })
    } catch {
      setError('An unexpected error occurred')
      setIsDeleting(false)
    }
  }

  return (
    <section className="border border-red-600 bg-red-50 p-8 shadow-[4px_4px_0px_0px_rgba(220,38,38,1)]">
      <div className="mb-6 flex items-center gap-3 border-b border-red-200 pb-4">
        <AlertTriangle className="text-red-600" size={20} />
        <h2 className="font-heading text-lg font-bold tracking-wider text-red-600 uppercase">Danger Zone</h2>
      </div>

      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-bold tracking-tight text-black uppercase">Delete Account</h3>
          <p className="text-[13px] leading-relaxed font-medium text-gray-600">
            Once you delete your account, there is no going back. Please be certain.
            Your account will be scheduled for permanent deletion in 30 days.
          </p>
        </div>

        <div className="flex justify-start">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 border border-red-600 bg-red-600 px-6 py-3 text-xs font-bold tracking-widest text-white uppercase transition-all hover:-translate-y-0.5 hover:bg-red-700 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0"
          >
            <Trash2 size={16} />
            Delete Your Account
          </button>
        </div>
      </div>

      {isModalOpen && (
        <ConfirmModal
          title="Delete Account"
          message="Are you absolutely sure? This action will schedule your account for permanent deletion in 30 days. You will be logged out immediately."
          confirmText={isDeleting ? 'Deleting...' : 'Delete Account'}
          onConfirm={handleDeleteAccount}
          onCancel={() => {
            setIsModalOpen(false)
            setPassword('')
            setError('')
          }}
          variant="danger"
        >
          <div className="flex flex-col gap-3">
            <label className="text-[10px] font-bold tracking-widest text-black uppercase">
              Confirm with Password
            </label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoFocus
            />
            {error && (
              <p className="text-[11px] font-bold text-red-600 uppercase italic">
                {error}
              </p>
            )}
          </div>
        </ConfirmModal>
      )}
    </section>
  )
}
