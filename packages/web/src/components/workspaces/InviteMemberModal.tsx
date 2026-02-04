import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { X, Mail, Shield } from 'lucide-react'
import { api } from '../../api/client'
import { useWorkspace } from '../../context/WorkspaceContext'

interface InviteMemberModalProps {
  isOpen: boolean
  onClose: () => void
}

export function InviteMemberModal({ isOpen, onClose }: InviteMemberModalProps) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'admin' | 'member' | 'viewer'>('member')
  const queryClient = useQueryClient()
  const { currentWorkspace } = useWorkspace()

  const invite = useMutation({
    mutationFn: async () => {
      if (!currentWorkspace) throw new Error('No workspace selected')
      
      const { data, error } = await api.v1.workspaces({ id: currentWorkspace.id }).members.post({
        email,
        role
      })
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members', currentWorkspace?.id] })
      onClose()
      setEmail('')
      setRole('member')
    },
  })

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md border border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-black bg-black px-6 py-4 text-white">
          <h2 className="font-heading text-lg font-bold tracking-wider uppercase">Invite to Workspace</h2>
          <button onClick={onClose} className="transition-colors hover:text-accent">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <div className="mb-6">
            <label className="mb-2 block text-xs font-bold tracking-wider text-black uppercase">
              User Email
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-black/40">
                <Mail size={16} />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colleague@example.com"
                className="w-full border border-black bg-white py-3 pr-4 pl-10 font-heading text-sm font-bold transition-all outline-none placeholder:font-medium placeholder:text-gray-400 focus:-translate-y-0.5 focus:shadow-brutal-sm"
                autoFocus
              />
            </div>
          </div>

          <div className="mb-8">
            <label className="mb-2 block text-xs font-bold tracking-wider text-black uppercase">
              Assigned Role
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['admin', 'member', 'viewer'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  className={`border border-black px-3 py-2 text-[10px] font-bold uppercase transition-all ${
                    role === r 
                      ? 'bg-black text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' 
                      : 'bg-white text-black hover:bg-gray-100'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <p className="mt-3 flex items-center gap-2 text-[10px] font-medium text-gray-500 uppercase">
              <Shield size={12} />
              {role === 'admin' && 'Can manage members and settings.'}
              {role === 'member' && 'Can create and edit boards/tasks.'}
              {role === 'viewer' && 'Read-only access to the workspace.'}
            </p>
          </div>

          <div className="flex justify-end gap-4">
            <button
              onClick={onClose}
              className="px-6 py-3 text-xs font-bold tracking-wider text-black uppercase transition-colors hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              onClick={() => email && invite.mutate()}
              disabled={invite.isPending || !email}
              className="border border-black bg-black px-6 py-3 text-xs font-bold tracking-wider text-white uppercase transition-all hover:-translate-y-0.5 hover:bg-accent hover:text-black hover:shadow-brutal-sm disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none"
            >
              {invite.isPending ? 'Inviting...' : 'Send Invite'}
            </button>
          </div>
          
          {invite.error && (
             <div className="mt-4 border border-red-500 bg-red-50 p-3 text-xs font-bold text-red-600 uppercase">
                {/* @ts-expect-error - error message access */}
                {invite.error.value?.error?.message || invite.error.message}
             </div>
          )}
        </div>
      </div>
    </div>
  )
}
