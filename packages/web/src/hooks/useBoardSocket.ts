import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'

type WsMessage = {
  type: 'board:created' | 'board:updated' | 'board:deleted' | 'columns:updated' | 'cards:updated'
  data?: unknown
  boardId?: string
  columnId?: string
}

export function useBoardSocket(boardId: string) {
  const queryClient = useQueryClient()
  const wsRef = useRef<WebSocket | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    
    const ws = new WebSocket('ws://localhost:3000/ws')
    wsRef.current = ws

    ws.onopen = () => {
      if (mountedRef.current) {
        ws.send(JSON.stringify({ type: 'subscribe', boardId }))
      }
    }

    ws.onmessage = (event) => {
      if (!mountedRef.current) return
      try {
        const message: WsMessage = JSON.parse(event.data)

        switch (message.type) {
          case 'board:updated':
          case 'board:deleted':
            queryClient.invalidateQueries({ queryKey: ['board', boardId] })
            break
          case 'columns:updated':
            queryClient.invalidateQueries({ queryKey: ['columns', boardId] })
            break
          case 'cards:updated':
            if (message.columnId) {
              queryClient.invalidateQueries({ queryKey: ['cards', message.columnId] })
            }
            break
        }
      } catch {
        // ignore parse errors
      }
    }

    ws.onerror = () => {}

    return () => {
      mountedRef.current = false
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close()
      }
    }
  }, [boardId, queryClient])

  return wsRef
}
