import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useSession } from '../api/auth'
import { useDragStore } from '../store/dragStore'

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3000/ws'

export type PresenceUser = {
  id: string
  name: string
}

type WsMessage = {
  type:
    | 'board:updated'
    | 'board:restored'
    | 'board:deleted'
    | 'column:created'
    | 'column:updated'
    | 'column:moved'
    | 'column:archived'
    | 'column:restored'
    | 'column:deleted'
    | 'task:created'
    | 'task:updated'
    | 'task:moved'
    | 'task:deleted'
    | 'task:archived'
    | 'task:restored'
    | 'dependency:created'
    | 'dependency:deleted'
    | 'presence:updated'
  data?: unknown

  boardId?: string
  columnId?: string
}

export function setDragging(value: boolean) {
  useDragStore.getState().setDragging(value)
}

export function useBoardSocket(boardId: string) {
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isCleaningUpRef = useRef(false)
  const boardIdRef = useRef(boardId)
  const [presence, setPresence] = useState<PresenceUser[]>([])
  const lastActivityRef = useRef(0)
  const needsInvalidateRef = useRef(false)
  const isDragging = useDragStore((state) => state.isDragging)

  useEffect(() => {
    boardIdRef.current = boardId
  }, [boardId])

  useEffect(() => {
    if (!isDragging && needsInvalidateRef.current) {
      queryClient.invalidateQueries({ queryKey: ['columns', boardId] })
      queryClient.invalidateQueries({ queryKey: ['cards', 'list', boardId] })
      needsInvalidateRef.current = false
    }
  }, [isDragging, boardId, queryClient])

  useEffect(() => {
    let lastCheck = 0
    const THROTTLE_MS = 1000

    const handleActivity = () => {
      const now = Date.now()
      if (now - lastCheck < THROTTLE_MS) return
      lastCheck = now

      if (now - lastActivityRef.current > 30000) {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'presence:activity' }))
          lastActivityRef.current = now
        }
      }
    }

    window.addEventListener('mousemove', handleActivity, { passive: true })
    window.addEventListener('keydown', handleActivity, { passive: true })
    window.addEventListener('mousedown', handleActivity, { passive: true })

    return () => {
      window.removeEventListener('mousemove', handleActivity)
      window.removeEventListener('keydown', handleActivity)
      window.removeEventListener('mousedown', handleActivity)
    }
  }, [boardId])

  useEffect(() => {
    isCleaningUpRef.current = false
    let reconnectAttempts = 0

    function connect() {
      if (isCleaningUpRef.current) return
      if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) {
        return
      }

      const ws = new WebSocket(WS_URL)
      wsRef.current = ws

      ws.onopen = () => {
        if (!isCleaningUpRef.current) {
          reconnectAttempts = 0
          ws.send(JSON.stringify({ type: 'subscribe', boardId: boardIdRef.current }))
        }
      }

      ws.onmessage = (event) => {
        if (isCleaningUpRef.current) return
        try {
          const message: WsMessage = JSON.parse(event.data)

          if (message.type === 'presence:updated') {
            setPresence(message.data as PresenceUser[])
            return
          }

          // Optimization: Skip refetching if the event was triggered by the current user
          // as we already have optimistic updates and local state updates.
          const data = message.data as Record<string, unknown> | undefined
          const initiatorId = data?.userId as string | undefined
          if (initiatorId && initiatorId === session?.user?.id) {
            return
          }

          if (useDragStore.getState().isDragging) {
            needsInvalidateRef.current = true
            return
          }

          switch (message.type) {
            case 'board:updated':
            case 'board:restored':
            case 'board:deleted':
              queryClient.invalidateQueries({ queryKey: ['board', boardIdRef.current] })
              queryClient.invalidateQueries({ queryKey: ['archive', 'items', boardIdRef.current] })
              break
            case 'column:created':
            case 'column:updated':
            case 'column:moved':
              queryClient.invalidateQueries({ queryKey: ['columns', boardIdRef.current] })
              break
            case 'column:archived':
            case 'column:restored':
            case 'column:deleted':
              queryClient.invalidateQueries({ queryKey: ['columns', boardIdRef.current] })
              queryClient.invalidateQueries({ queryKey: ['archive', 'items', boardIdRef.current] })
              break
            case 'task:updated':
              queryClient.invalidateQueries({ queryKey: ['cards', 'list', boardIdRef.current] })
              if (data && typeof data === 'object' && 'id' in data) {
                queryClient.invalidateQueries({ queryKey: ['cards', 'detail', data.id as string] })
              }
              break
            case 'task:created':
            case 'task:moved':
              queryClient.invalidateQueries({ queryKey: ['cards', 'list', boardIdRef.current] })
              break
            case 'task:deleted':
            case 'task:archived':
            case 'task:restored':
              queryClient.invalidateQueries({ queryKey: ['cards', 'list', boardIdRef.current] })
              queryClient.invalidateQueries({ queryKey: ['archive', 'items', boardIdRef.current] })
              break
            case 'dependency:created':
            case 'dependency:deleted':
              queryClient.invalidateQueries({ queryKey: ['dependencies', 'list', boardIdRef.current] })
              break
          }
        } catch {
          // ignore parse errors
        }
      }

      ws.onerror = () => {}

      ws.onclose = () => {
        if (!isCleaningUpRef.current) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000)
          reconnectAttempts++
          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, delay)
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
  }, [boardId, queryClient, session?.user?.id])

  return { wsRef, presence }
}
