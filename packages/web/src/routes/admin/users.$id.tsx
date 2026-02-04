import { createFileRoute, redirect, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { useUserDetail, usePasswordReset, useRevokeSessions, useCancelDeletion, useExportUser } from '../../hooks/useAdmin'
import { Button } from '../../components/ui/Button'
import { authClient } from '../../api/auth'
import { 
  Loader2, 
  AlertCircle, 
  ArrowLeft, 
  User, 
  Mail, 
  Calendar, 
  ShieldCheck, 
  Trash2, 
  CheckCircle, 
  XCircle,
  LayoutGrid,
  Briefcase,
  Key,
  LogOut,
  Download,
  RotateCcw
} from 'lucide-react'

export const Route = createFileRoute('/admin/users/$id')({
  beforeLoad: async () => {
    const { data: session } = await authClient.getSession()
    const role = session?.user?.adminRole
    if (role !== 'super_admin' && role !== 'support') {
      throw redirect({
        to: '/admin',
      })
    }
  },
  component: UserDetailComponent,
})

function UserDetailComponent() {
  const { id: userId } = Route.useParams()
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  
  const { data: user, isLoading, error, refetch } = useUserDetail(userId)
  const passwordReset = usePasswordReset()
  const revokeSessions = useRevokeSessions()
  const cancelDeletion = useCancelDeletion()
  const exportUser = useExportUser()

  const handleAction = async (
    action: () => Promise<unknown>,
    successMessage: string
  ) => {
    setActionMessage(null)
    try {
      await action()
      setActionMessage({ type: 'success', text: successMessage })
      refetch()
    } catch (err) {
      setActionMessage({ type: 'error', text: err instanceof Error ? err.message : 'Action failed' })
    }
  }

  const handlePasswordReset = () => {
    handleAction(
      () => passwordReset.mutateAsync(userId),
      'Password reset successful. All sessions have been revoked.'
    )
  }

  const handleRevokeSessions = () => {
    handleAction(
      () => revokeSessions.mutateAsync(userId),
      'All sessions revoked successfully.'
    )
  }

  const handleCancelDeletion = () => {
    handleAction(
      () => cancelDeletion.mutateAsync(userId),
      'User deletion has been canceled.'
    )
  }

  const handleExport = () => {
    handleAction(
      () => exportUser.mutateAsync(userId),
      'User data export completed.'
    )
  }

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="p-12">
        <div className="border-2 border-black bg-error p-6 font-bold text-white shadow-brutal-sm">
          <div className="flex items-center gap-3">
            <AlertCircle size={24} />
            <span>{(error as Error)?.message || 'User not found'}</span>
          </div>
        </div>
        <div className="mt-6">
          <Link to="/admin/user-lookup">
            <Button variant="secondary">
              <ArrowLeft size={16} className="mr-2" />
              Back to User Lookup
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const isAdminUser = !!user.adminRole
  const isDeleted = !!user.deletedAt

  return (
    <div className="p-12">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <Link to="/admin/user-lookup" className="mb-4 inline-flex items-center text-xs font-bold text-gray-500 uppercase hover:text-black">
            <ArrowLeft size={14} className="mr-1" />
            Back to User Lookup
          </Link>
          <h1 className="font-heading text-4xl font-black tracking-tighter uppercase">
            User Detail
          </h1>
          <p className="mt-2 text-sm font-bold tracking-wide text-gray-500 uppercase">
            View account information and perform assistance actions
          </p>
        </div>
      </div>

      {/* Action Message */}
      {actionMessage && (
        <div className={`mb-8 border-2 border-black p-4 font-bold shadow-brutal-sm ${
          actionMessage.type === 'success' ? 'bg-success text-black' : 'bg-error text-white'
        }`}>
          <div className="flex items-center gap-2">
            {actionMessage.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            <span>{actionMessage.text}</span>
          </div>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Account Info Card */}
        <div className="lg:col-span-2">
          <div className="border-2 border-black bg-white p-6 shadow-brutal-lg">
            <h2 className="mb-6 flex items-center gap-2 text-lg font-black uppercase">
              <User size={20} />
              Account Information
            </h2>

            <div className="space-y-6">
              {/* Name */}
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center border-2 border-black bg-gray-100">
                  <span className="text-xl font-black">{user.name[0]?.toUpperCase() || 'U'}</span>
                </div>
                <div>
                  <p className="text-[10px] font-black tracking-widest text-gray-500 uppercase">Name</p>
                  <p className="text-lg font-black">{user.name}</p>
                </div>
              </div>

              {/* Email */}
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center border-2 border-black bg-gray-100">
                  <Mail size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black tracking-widest text-gray-500 uppercase">Email</p>
                  <p className="text-sm font-bold">{user.email}</p>
                  <div className="mt-1 flex items-center gap-2">
                    {user.emailVerified ? (
                      <span className="shadow-brutal-xs inline-flex items-center gap-1 border border-black bg-success px-2 py-0.5 text-[10px] font-black text-black uppercase">
                        <CheckCircle size={10} />
                        Verified
                      </span>
                    ) : (
                      <span className="shadow-brutal-xs inline-flex items-center gap-1 border border-black bg-warning px-2 py-0.5 text-[10px] font-black text-black uppercase">
                        <XCircle size={10} />
                        Unverified
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Created At */}
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center border-2 border-black bg-gray-100">
                  <Calendar size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black tracking-widest text-gray-500 uppercase">Created</p>
                  <p className="text-sm font-bold">{new Date(user.createdAt).toLocaleDateString()}</p>
                  <p className="text-xs text-gray-500">{new Date(user.createdAt).toLocaleTimeString()}</p>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center border-2 border-black bg-gray-100">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black tracking-widest text-gray-500 uppercase">Status</p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {user.adminRole ? (
                      <span className="shadow-brutal-xs inline-flex items-center gap-1 border border-black bg-black px-2 py-1 text-[10px] font-black text-white uppercase">
                        <ShieldCheck size={12} />
                        {user.adminRole.replace('_', ' ')}
                      </span>
                    ) : (
                      <span className="shadow-brutal-xs inline-block border border-black bg-white px-2 py-1 text-[10px] font-black text-black uppercase">
                        Regular User
                      </span>
                    )}
                    {isDeleted && (
                      <span className="shadow-brutal-xs inline-flex items-center gap-1 border border-black bg-error px-2 py-1 text-[10px] font-black text-white uppercase">
                        <Trash2 size={12} />
                        Scheduled for Deletion
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Usage Stats */}
          <div className="mt-6 border-2 border-black bg-white p-6 shadow-brutal-lg">
            <h2 className="mb-6 flex items-center gap-2 text-lg font-black uppercase">
              <LayoutGrid size={20} />
              Usage Summary
            </h2>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="border-2 border-black bg-gray-50 p-4 text-center shadow-brutal-sm">
                <Briefcase size={24} className="mx-auto mb-2 text-gray-400" />
                <p className="text-2xl font-black">{user.workspacesCount}</p>
                <p className="text-[10px] font-black tracking-widest text-gray-500 uppercase">Workspaces</p>
              </div>
              <div className="border-2 border-black bg-gray-50 p-4 text-center shadow-brutal-sm">
                <LayoutGrid size={24} className="mx-auto mb-2 text-gray-400" />
                <p className="text-2xl font-black">{user.boardsCount}</p>
                <p className="text-[10px] font-black tracking-widest text-gray-500 uppercase">Boards</p>
              </div>
              <div className="border-2 border-black bg-gray-50 p-4 text-center shadow-brutal-sm">
                <Calendar size={24} className="mx-auto mb-2 text-gray-400" />
                <p className="text-sm font-black">
                  {user.lastActive ? new Date(user.lastActive).toLocaleDateString() : 'Never'}
                </p>
                <p className="text-[10px] font-black tracking-widest text-gray-500 uppercase">Last Active</p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions Panel */}
        <div className="lg:col-span-1">
          <div className="border-2 border-black bg-white p-6 shadow-brutal-lg">
            <h2 className="mb-6 text-lg font-black uppercase">Account Assistance</h2>

            {/* Support Actions */}
            {!isAdminUser && (
              <div className="space-y-3">
                <h3 className="text-[10px] font-black tracking-widest text-gray-500 uppercase">Support Actions</h3>
                
                <Button
                  variant="secondary"
                  className="w-full justify-start"
                  onClick={handlePasswordReset}
                  disabled={passwordReset.isPending}
                >
                  {passwordReset.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Key className="mr-2 h-4 w-4" />
                  )}
                  Reset Password
                </Button>

                <Button
                  variant="secondary"
                  className="w-full justify-start"
                  onClick={handleRevokeSessions}
                  disabled={revokeSessions.isPending}
                >
                  {revokeSessions.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <LogOut className="mr-2 h-4 w-4" />
                  )}
                  Revoke All Sessions
                </Button>
              </div>
            )}

            {/* Super Admin Actions */}
            {!isAdminUser && (
              <div className="mt-6 space-y-3">
                <h3 className="text-[10px] font-black tracking-widest text-gray-500 uppercase">Super Admin Actions</h3>
                
                {isDeleted && (
                  <Button
                    variant="secondary"
                    className="w-full justify-start"
                    onClick={handleCancelDeletion}
                    disabled={cancelDeletion.isPending}
                  >
                    {cancelDeletion.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RotateCcw className="mr-2 h-4 w-4" />
                    )}
                    Cancel Deletion
                  </Button>
                )}

                <Button
                  variant="secondary"
                  className="w-full justify-start"
                  onClick={handleExport}
                  disabled={exportUser.isPending}
                >
                  {exportUser.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  Export User Data
                </Button>
              </div>
            )}

            {/* Admin User Notice */}
            {isAdminUser && (
              <div className="border-2 border-black bg-gray-100 p-4 text-center">
                <ShieldCheck size={32} className="mx-auto mb-2 text-gray-400" />
                <p className="text-sm font-bold">Admin User</p>
                <p className="text-xs text-gray-500">Assistance actions are not available for admin users</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
