import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Laptop, Smartphone, Monitor, Tablet, LogOut, ShieldAlert } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useState } from 'react'
import { api } from '../../api/client'
import { Button } from './Button'
import { ConfirmModal } from './ConfirmModal'

interface ActiveSessionsProps {
  userId: string
}

export function ActiveSessions({ userId }: ActiveSessionsProps) {
  const queryClient = useQueryClient()
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const [showRevokeAll, setShowRevokeAll] = useState(false)

  const { data: sessions, isLoading } = useQuery({
    queryKey: ['user-sessions', userId],
    queryFn: async () => {
      const { data, error } = await api.v1.users({ id: userId }).sessions.get()
      if (error) throw error
      return data
    }
  })

  const revokeSession = useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await api.v1.users({ id: userId }).sessions({ sessionId }).delete()
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-sessions', userId] })
      setRevokingId(null)
    },
    onError: (error) => {
      alert(error.message || 'Failed to revoke session')
      setRevokingId(null)
    }
  })

  const revokeAllSessions = useMutation({
    mutationFn: async () => {
      const { error } = await api.v1.users({ id: userId }).sessions['revoke-all'].post()
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-sessions', userId] })
      setShowRevokeAll(false)
    },
    onError: (error) => {
      alert(error.message || 'Failed to revoke sessions')
      setShowRevokeAll(false)
    }
  })

  if (isLoading) {
    return <div className="animate-pulse text-[10px] font-bold text-gray-400 uppercase">Loading sessions...</div>
  }

  const getDeviceIcon = (device: string) => {
    const d = device.toLowerCase()
    if (d.includes('phone') || d.includes('mobile')) return <Smartphone size={20} />
    if (d.includes('tablet') || d.includes('ipad')) return <Tablet size={20} />
    if (d.includes('laptop') || d.includes('macbook')) return <Laptop size={20} />
    return <Monitor size={20} />
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        {sessions?.map((session) => (
          <div 
            key={session.id}
            className={`shadow-brutal-sm flex items-center justify-between border border-black p-4 transition-all ${session.isCurrent ? 'bg-accent/10' : 'bg-white'}`}
          >
            <div className="flex items-center gap-4">
              <div className="shadow-brutal-xs flex size-10 items-center justify-center border border-black bg-white">
                {getDeviceIcon(session.device)}
              </div>
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-bold text-black">{session.browser} on {session.device}</span>
                  {session.isCurrent && (
                    <span className="bg-accent border border-black px-1.5 py-0.5 text-[8px] font-black tracking-widest text-black uppercase">
                      Current
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-[10px] font-bold tracking-wider text-gray-500 uppercase">
                  <span>{session.ipAddress || 'Unknown IP'}</span>
                  <span>•</span>
                  <span>Active {formatDistanceToNow(new Date(session.createdAt))} ago</span>
                </div>
              </div>
            </div>

            {!session.isCurrent && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setRevokingId(session.id)}
                className="hover:bg-error hover:text-white"
              >
                Revoke
              </Button>
            )}
          </div>
        ))}
      </div>

      {sessions && sessions.length > 1 && (
        <div className="mt-2 flex justify-start">
          <Button 
            variant="danger" 
            size="sm" 
            onClick={() => setShowRevokeAll(true)}
            className="gap-2"
          >
            <LogOut size={14} />
            Log out everywhere else
          </Button>
        </div>
      )}

      {revokingId && (
        <ConfirmModal
          title="Revoke Session"
          message="Are you sure you want to revoke this session? The device will be logged out immediately."
          confirmText="Revoke"
          variant="danger"
          onConfirm={() => revokeSession.mutate(revokingId)}
          onCancel={() => setRevokingId(null)}
        />
      )}

      {showRevokeAll && (
        <ConfirmModal
          title="Log out everywhere else"
          message="Are you sure you want to log out of all other devices? This will invalidate all sessions except your current one."
          confirmText="Log out everywhere"
          variant="danger"
          onConfirm={() => revokeAllSessions.mutate()}
          onCancel={() => setShowRevokeAll(false)}
        >
          <div className="bg-error/10 border-error border-l-4 p-4">
            <div className="flex gap-3">
              <ShieldAlert className="text-error" size={18} />
              <p className="text-[12px] font-bold text-black uppercase">This action cannot be undone.</p>
            </div>
          </div>
        </ConfirmModal>
      )}
    </div>
  )
}
