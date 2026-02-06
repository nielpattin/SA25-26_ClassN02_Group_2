import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { api } from '../api/client'
import { useSession } from '../api/auth'

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3000/ws'

export function useNotifications() {
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isCleaningUpRef = useRef(false)

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data } = await api.v1.notifications.get()
      return data ?? []
    },
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    enabled: !!session?.user?.id,
  })

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications', 'unread', 'count'],
    queryFn: async () => {
      const { data } = await api.v1.notifications.unread.count.get()
      return data?.count ?? 0
    },
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
    enabled: !!session?.user?.id,
  })

  useEffect(() => {
    if (!session?.user?.id) return
    isCleaningUpRef.current = false

    function connect() {
      if (isCleaningUpRef.current) return
      if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) {
        return
      }

      const ws = new WebSocket(WS_URL)
      wsRef.current = ws

      ws.onopen = () => {
        if (!isCleaningUpRef.current) {
          ws.send(JSON.stringify({ 
            type: 'subscribe', 
            userId: session?.user?.id 
          }))
        }
      }

      ws.onmessage = (event) => {
        if (isCleaningUpRef.current) return
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

      ws.onerror = () => {}

      ws.onclose = () => {
        if (!isCleaningUpRef.current) {
          reconnectTimeoutRef.current = setTimeout(connect, 2000)
        }
      }
    }

    connect()

    return () => {
      isCleaningUpRef.current = true
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
      if (wsRef.current) {
        wsRef.current.onclose = null
        wsRef.current.onerror = null
        wsRef.current.onmessage = null
        wsRef.current.onopen = null
        if (wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.close()
        }
        wsRef.current = null
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
