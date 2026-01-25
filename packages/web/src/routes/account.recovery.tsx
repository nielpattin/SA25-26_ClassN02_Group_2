import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useSession, signOut } from '../api/auth'
import { api } from '../api/client'
import { Button } from '../components/ui/Button'

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

  const user = session.user as any
  const daysLeft = user.deletedAt
    ? Math.max(0, 30 - Math.floor((Date.now() - new Date(user.deletedAt).getTime()) / (1000 * 60 * 60 * 24)))
    : 0

  const handleRestore = async () => {
    setIsRestoring(true)
    try {
      const { error } = await api.v1.users({ id: user.id }).restore.patch()
      if (error) throw error
      
      // Force refresh session data
      window.location.href = '/boards'
    } catch (err) {
      console.error('Failed to restore account:', err)
      alert('Failed to restore account. Please try again.')
    } finally {
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
    <div className="bg-canvas flex min-h-screen flex-col items-center justify-center p-6">
      <div className="shadow-brutal-xl w-full max-w-180 border-2 border-black bg-white p-12 transition-all">
        <div className="mb-10 flex flex-col items-center text-center">
          <div className="font-heading shadow-brutal-md mb-8 border border-black bg-black px-6 py-2 text-[20px] font-extrabold text-white">
            RECOVERY HUB
          </div>
          <h1 className="font-heading m-0 mb-4 text-[48px] leading-tight font-black tracking-tight text-black uppercase">
            Account Scheduled for Deletion
          </h1>
          <p className="m-0 text-[18px] font-bold text-black/60 uppercase italic">
            {user.name} ({user.email})
          </p>
        </div>

        <div className="shadow-brutal-md mb-12 border-2 border-black bg-accent p-8 text-center">
          <div className="mb-2 text-[14px] font-black tracking-widest text-black uppercase">
            Time Remaining
          </div>
          <div className="text-[72px] font-black leading-none text-black">
            {daysLeft} DAYS
          </div>
          <div className="mt-4 text-[14px] font-bold text-black/80 uppercase">
            Until your data is permanently removed from our servers
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Button
            onClick={handleRestore}
            disabled={isRestoring}
            className="shadow-brutal-lg bg-black py-8 text-[18px] text-white hover:text-black"
          >
            {isRestoring ? 'RESTORING...' : 'KEEP MY ACCOUNT'}
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting}
            variant="secondary"
            className="shadow-brutal-lg py-8 text-[18px]"
          >
            {isExporting ? 'EXPORTING...' : 'DOWNLOAD MY DATA'}
          </Button>
        </div>

        <div className="mt-12 flex flex-col items-center border-t-2 border-black/10 pt-8">
          <button
            onClick={handleLogout}
            className="text-[14px] font-black tracking-widest text-black/40 uppercase underline-offset-4 hover:text-black hover:underline transition-colors"
          >
            LOGOUT AND EXIT
          </button>
        </div>
      </div>
    </div>
  )
}
