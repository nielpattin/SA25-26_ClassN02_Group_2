import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useSession, signOut } from '../api/auth'
import { api } from '../api/client'
import { Clock, Download, LogOut, RefreshCw, Shield } from 'lucide-react'

export const Route = createFileRoute('/account/recovery')({
  component: RecoveryHub,
})

function RecoveryHub() {
  const { data: session } = useSession()
  const navigate = useNavigate()
  const [isRestoring, setIsRestoring] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  if (!session) {
    return null
  }

  const user = session.user
  const daysLeft = user.deletedAt
    ? Math.max(0, 30 - Math.floor((Date.now() - new Date(user.deletedAt).getTime()) / (1000 * 60 * 60 * 24)))
    : 0

  const handleRestore = async () => {
    setIsRestoring(true)
    try {
      const { error } = await api.v1.users({ id: user.id }).restore.patch()
      if (error) throw error
      
      await signOut()
      navigate({ to: '/' })
    } catch (err) {
      console.error('Failed to restore account:', err)
      alert('Failed to restore account. Please try again.')
      setIsRestoring(false)
    }
  }

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const { data, error } = await api.v1.users({ id: user.id }).export.get()
      if (error) throw error

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const date = new Date().toISOString().split('T')[0]
      a.href = url
      a.download = `kyte-export-${user.id}-${date}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Failed to export data:', err)
      alert('Failed to export data. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  const handleLogout = async () => {
    await signOut()
    navigate({ to: '/' })
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas p-6">
      <div className="w-full max-w-xl">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-6 flex items-center gap-3">
            <Shield className="text-black" size={32} />
            <span className="font-heading text-2xl font-bold tracking-tight text-black">KYTE</span>
          </div>
          <h1 className="mb-2 font-heading text-3xl font-bold tracking-tight text-black">
            Account Recovery
          </h1>
          <p className="text-sm font-medium text-gray-500">
            {user.name} • {user.email}
          </p>
        </div>

        <div className="border border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="border-b border-black/10 bg-amber-50 p-6">
            <div className="flex items-start gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center border border-amber-400 bg-amber-100">
                <Clock className="text-amber-600" size={24} />
              </div>
              <div className="flex-1">
                <h2 className="mb-1 text-sm font-bold tracking-wide text-black uppercase">
                  Deletion Scheduled
                </h2>
                <p className="text-[13px] leading-relaxed text-gray-600">
                  Your account is scheduled for permanent deletion. You have{' '}
                  <span className="font-bold text-black">{daysLeft} days</span> to recover your data or restore access.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 p-6">
            <button
              onClick={handleRestore}
              disabled={isRestoring}
              className="group flex items-center gap-4 border border-black bg-black p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-brutal-md disabled:cursor-not-allowed disabled:opacity-50"
            >
              <div className="flex size-10 shrink-0 items-center justify-center border border-white/20 bg-white/10">
                <RefreshCw className={`text-white ${isRestoring ? 'animate-spin' : ''}`} size={20} />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold tracking-wide text-white uppercase">
                  {isRestoring ? 'Restoring...' : 'Keep My Account'}
                </h3>
                <p className="text-xs text-white/70">
                  Cancel deletion and restore full access
                </p>
              </div>
            </button>

            <button
              onClick={handleExport}
              disabled={isExporting}
              className="group flex items-center gap-4 border border-black bg-white p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-brutal-md disabled:cursor-not-allowed disabled:opacity-50"
            >
              <div className="flex size-10 shrink-0 items-center justify-center border border-black/10 bg-gray-50">
                <Download className={`text-black ${isExporting ? 'animate-bounce' : ''}`} size={20} />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold tracking-wide text-black uppercase">
                  {isExporting ? 'Preparing...' : 'Download My Data'}
                </h3>
                <p className="text-xs text-gray-500">
                  Export all your boards, tasks, and settings as JSON
                </p>
              </div>
            </button>
          </div>
        </div>

        <div className="mt-6 flex justify-center">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold tracking-widest text-gray-400 uppercase transition-colors hover:text-black"
          >
            <LogOut size={14} />
            Sign Out
          </button>
        </div>

        <p className="mt-8 text-center text-[11px] leading-relaxed text-gray-400">
          If you do nothing, your account and all associated data will be permanently deleted after the grace period.
          This action cannot be undone.
        </p>
      </div>
    </div>
  )
}
