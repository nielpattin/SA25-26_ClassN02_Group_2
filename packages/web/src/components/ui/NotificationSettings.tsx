import { useState, useEffect } from 'react'
import { Mail, Monitor, Loader2 } from 'lucide-react'
import { Checkbox } from './Checkbox'
import { useUpdateNotificationPreferences } from '../../hooks/useNotificationPreferences'
import type { NotificationPreferencesSchema } from '@kyte/server/src/modules/users/users.model'

type NotificationPreferences = typeof NotificationPreferencesSchema.static

interface NotificationSettingsProps {
  userId: string
  initialPreferences: NotificationPreferences
}

const NOTIFICATION_TYPES = [
  { id: 'mention', label: 'Mentions' },
  { id: 'assignment', label: 'Assignments' },
  { id: 'due_soon', label: 'Due Soon' },
  { id: 'due_urgent', label: 'Due Urgent' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'comment', label: 'Comments' },
  { id: 'board_invite', label: 'Board Invites' },
] as const

export function NotificationSettings({ userId, initialPreferences }: NotificationSettingsProps) {
  const [preferences, setPreferences] = useState<NotificationPreferences>(initialPreferences)
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<NotificationPreferences>(initialPreferences)
  
  const updateMutation = useUpdateNotificationPreferences(userId)

  const handleToggle = (type: keyof NotificationPreferences, channel: 'inApp' | 'email') => {
    setPreferences(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [channel]: !prev[type][channel]
      }
    }))
  }

  const handleMuteAll = () => {
    const allMuted = Object.keys(preferences).reduce((acc, key) => {
      acc[key as keyof NotificationPreferences] = { inApp: false, email: false }
      return acc
    }, {} as NotificationPreferences)
    setPreferences(allMuted)
  }

  const isAllMuted = Object.values(preferences).every(p => !p.inApp && !p.email)

  useEffect(() => {
    if (JSON.stringify(preferences) === JSON.stringify(lastSaved)) return

    const timer = setTimeout(async () => {
      setIsSaving(true)
      try {
        await updateMutation.mutateAsync(preferences)
        setLastSaved(preferences)
      } catch (error) {
        console.error('Failed to save notification preferences:', error)
      } finally {
        setIsSaving(false)
      }
    }, 1000)

    return () => clearTimeout(timer)
  }, [preferences, lastSaved, updateMutation])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between border-b border-black/10 pb-4">
        <div className="flex items-center gap-2 text-black/50">
          {isSaving ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              <span className="text-[10px] font-bold tracking-widest uppercase">Saving...</span>
            </>
          ) : (
            <span className="text-[10px] font-bold tracking-widest uppercase">Auto-saving enabled</span>
          )}
        </div>
        <button
          onClick={handleMuteAll}
          disabled={isAllMuted}
          className="text-[10px] font-bold tracking-widest text-black uppercase hover:underline disabled:opacity-30"
        >
          {isAllMuted ? 'All Muted' : 'Mute All'}
        </button>
      </div>

      <div className="overflow-hidden border border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-black bg-black/5">
              <th className="p-4 text-[10px] font-bold tracking-widest text-black uppercase">Notification Type</th>
              <th className="w-24 p-4 text-center">
                <div className="flex flex-col items-center gap-1">
                  <Monitor size={14} />
                  <span className="text-[9px] font-bold tracking-widest text-black uppercase">In-App</span>
                </div>
              </th>
              <th className="w-24 p-4 text-center">
                <div className="flex flex-col items-center gap-1">
                  <Mail size={14} />
                  <span className="text-[9px] font-bold tracking-widest text-black uppercase">Email</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5 bg-white">
            {NOTIFICATION_TYPES.map((type) => (
              <tr key={type.id} className="hover:bg-black/2">
                <td className="p-4 py-3">
                  <span className="text-sm font-semibold text-black">{type.label}</span>
                </td>
                <td className="p-4 text-center">
                  <div className="flex justify-center">
                    <Checkbox
                      checked={preferences[type.id as keyof NotificationPreferences].inApp}
                      onChange={() => handleToggle(type.id as keyof NotificationPreferences, 'inApp')}
                    />
                  </div>
                </td>
                <td className="p-4 text-center">
                  <div className="flex justify-center">
                    <Checkbox
                      checked={preferences[type.id as keyof NotificationPreferences].email}
                      onChange={() => handleToggle(type.id as keyof NotificationPreferences, 'email')}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
