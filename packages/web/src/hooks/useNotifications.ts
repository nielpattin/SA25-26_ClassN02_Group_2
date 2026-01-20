import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { api } from '../api/client'
import { useSession } from '../api/auth'

export function useNotifications() {
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const wsRef = useRef<WebSocket | null>(null)

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data } = await api.v1.notifications.get()
      return data ?? []
    },
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  })

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications', 'unread', 'count'],
    queryFn: async () => {
      const { data } = await api.v1.notifications.unread.count.get()
      return data?.count ?? 0
    },
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  })

  useEffect(() => {
    if (!session?.user?.id) return

    function connect() {
      const ws = new WebSocket('ws://localhost:3000/ws')
      wsRef.current = ws

      ws.onopen = () => {
        ws.send(JSON.stringify({ 
          type: 'subscribe', 
          userId: session?.user?.id 
        }))
      }

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          if (message.type === 'notification:created') {
            queryClient.invalidateQueries({ queryKey: ['notifications'] })
            queryClient.invalidateQueries({ queryKey: ['notifications', 'unread', 'count'] })
          }
        } catch {
          // ignore parse errors
        }
      }

      ws.onclose = () => {
        setTimeout(connect, 2000)
      }
    }

    connect()

    return () => {
      if (wsRef.current) {
        wsRef.current.onclose = null
        wsRef.current.close()
      }
    }
  }, [session?.user?.id, queryClient])

  const markAsRead = useMutation({
    mutationFn: (id: string) => api.v1.notifications({ id }).read.post(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread', 'count'] })
    }
  })

  const markAllAsRead = useMutation({
    mutationFn: () => api.v1.notifications['read-all'].post(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread', 'count'] })
    }
  })

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead: markAsRead.mutate,
    markAllAsRead: markAllAsRead.mutate,
  }
}
