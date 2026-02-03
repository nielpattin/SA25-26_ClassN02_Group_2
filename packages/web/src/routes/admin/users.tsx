import { createFileRoute, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { useAdminUsers, usePromoteUser, useDemoteUser } from '../../hooks/useAdmin'
import { Button } from '../../components/ui/Button'
import { ConfirmModal } from '../../components/ui/ConfirmModal'
import { Select } from '../../components/ui/Select'
import { authClient } from '../../api/auth'
import { ShieldCheck, UserMinus, UserPlus, RefreshCw, AlertCircle } from 'lucide-react'

export const Route = createFileRoute('/admin/users')({
  beforeLoad: async () => {
    const { data: session } = await authClient.getSession()
    if (session?.user?.adminRole !== 'super_admin') {
      throw redirect({
        to: '/admin',
      })
    }
  },
  component: AdminUsersComponent,
})

function AdminUsersComponent() {
  const { data: users, isLoading, error, refetch } = useAdminUsers()
  const promoteMutation = usePromoteUser()
  const demoteMutation = useDemoteUser()

  const [demoteUserId, setDemoteUserId] = useState<string | null>(null)
  const [promoteUserId, setPromoteUserId] = useState<string | null>(null)
  const [selectedRole, setSelectedRole] = useState<string>('moderator')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleDemote = async () => {
    if (!demoteUserId) return
    try {
      setErrorMessage(null)
      await demoteMutation.mutateAsync(demoteUserId)
      setDemoteUserId(null)
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to demote user')
    }
  }

  const handlePromote = async () => {
    if (!promoteUserId) return
    try {
      setErrorMessage(null)
      await promoteMutation.mutateAsync({ id: promoteUserId, role: selectedRole as any })
      setPromoteUserId(null)
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to promote user')
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="animate-spin text-black" size={32} />
          <span className="text-xs font-bold uppercase tracking-widest">Loading Admin Users...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-12">
        <div className="border border-black bg-error p-8 shadow-brutal-lg">
          <div className="flex items-center gap-4 text-white">
            <AlertCircle size={32} />
            <div>
              <h2 className="text-xl font-black uppercase">Error Loading Users</h2>
              <p className="font-bold">{(error as any).message || 'An unexpected error occurred'}</p>
            </div>
          </div>
          <Button variant="secondary" className="mt-6" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-12">
      <header className="mb-12 flex items-end justify-between">
        <div>
          <h1 className="font-heading mb-2 text-4xl font-black uppercase tracking-tighter">
            Admin Users
          </h1>
          <p className="text-sm font-bold text-gray-500 uppercase tracking-wide">
            Manage platform administrators and their roles
          </p>
        </div>
        <div className="flex gap-4">
           {/* Future: Add Invite Admin button */}
        </div>
      </header>

      {errorMessage && (
        <div className="mb-8 border-2 border-black bg-error p-4 font-bold text-white shadow-brutal-sm">
          <div className="flex items-center gap-2">
            <AlertCircle size={18} />
            <span>{errorMessage}</span>
          </div>
        </div>
      )}

      <div className="overflow-hidden border border-black bg-white shadow-brutal-lg">
        <table className="w-full border-collapse text-left">
          <thead className="border-b border-black bg-black text-white">
            <tr>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">User</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Role</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Email</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Last Active</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users?.map((user: any) => (
              <tr key={user.id} className="border-b border-black last:border-0 hover:bg-hover transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 shrink-0 border border-black bg-gray-100">
                      {user.image ? (
                        <img src={user.image} alt={user.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center font-black text-black">
                          {user.name?.[0]?.toUpperCase() || 'U'}
                        </div>
                      )}
                    </div>
                    <span className="text-xs font-black uppercase">{user.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-block border border-black px-2 py-1 text-[10px] font-black uppercase shadow-brutal-xs ${
                    user.adminRole === 'super_admin' ? 'bg-black text-white' : 
                    user.adminRole === 'moderator' ? 'bg-accent text-black' : 'bg-white text-black'
                  }`}>
                    {user.adminRole?.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-[11px] font-bold text-gray-600">{user.email}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-[11px] font-bold text-gray-600">
                    {user.updatedAt ? new Date(user.updatedAt).toLocaleDateString() : 'Never'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <Button 
                      variant="secondary" 
                      size="sm"
                      onClick={() => {
                        setPromoteUserId(user.id)
                        setSelectedRole(user.adminRole || 'moderator')
                      }}
                    >
                      <ShieldCheck size={14} className="mr-1" />
                      Role
                    </Button>
                    <Button 
                      variant="danger" 
                      size="sm"
                      onClick={() => setDemoteUserId(user.id)}
                    >
                      <UserMinus size={14} className="mr-1" />
                      Demote
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Demote Confirmation Modal */}
      {demoteUserId && (
        <ConfirmModal
          title="Demote Administrator"
          message="Are you sure you want to remove this user's administrative privileges? They will lose access to all admin features."
          confirmText="Yes, Demote User"
          variant="danger"
          onConfirm={handleDemote}
          onCancel={() => setDemoteUserId(null)}
        />
      )}

      {/* Role Selection Modal */}
      {promoteUserId && (
        <ConfirmModal
          title="Change Administrator Role"
          message="Select the new administrative role for this user."
          confirmText="Update Role"
          onConfirm={handlePromote}
          onCancel={() => setPromoteUserId(null)}
        >
          <div className="my-4">
            <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-gray-500">
              Select Role
            </label>
            <Select
              value={selectedRole}
              onChange={setSelectedRole}
              options={[
                { id: 'super_admin', name: 'Super Admin' },
                { id: 'moderator', name: 'Moderator' },
                { id: 'support', name: 'Support' },
              ]}
            />
          </div>
        </ConfirmModal>
      )}
    </div>
  )
}
