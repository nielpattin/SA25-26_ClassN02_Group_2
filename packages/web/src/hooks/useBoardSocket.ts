import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3000/ws'

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
  data?: unknown
  boardId?: string
  columnId?: string
}

// Global flag to pause invalidation during drag operations
let isDragging = false

export function setDragging(value: boolean) {
  isDragging = value
}

export function useBoardSocket(boardId: string) {
  const queryClient = useQueryClient()
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isCleaningUpRef = useRef(false)
  const boardIdRef = useRef(boardId)

  // Keep boardId ref up to date
  useEffect(() => {
    boardIdRef.current = boardId
  }, [boardId])

  useEffect(() => {
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
          ws.send(JSON.stringify({ type: 'subscribe', boardId: boardIdRef.current }))
        }
      }

      ws.onmessage = (event) => {
        if (isCleaningUpRef.current || isDragging) return
        try {
          const message: WsMessage = JSON.parse(event.data)

          switch (message.type) {
            case 'board:updated':
            case 'board:restored':
            case 'board:deleted':
              queryClient.invalidateQueries({ queryKey: ['board', boardIdRef.current] })
              queryClient.invalidateQueries({ queryKey: ['archive'] })
              break
            case 'column:created':
            case 'column:updated':
            case 'column:moved':
            case 'column:archived':
            case 'column:restored':
            case 'column:deleted':
              queryClient.invalidateQueries({ queryKey: ['columns', boardIdRef.current] })
              queryClient.invalidateQueries({ queryKey: ['archive'] })
              break
            case 'task:updated':
              queryClient.invalidateQueries({ queryKey: ['cards', boardIdRef.current] })
              if (message.data && typeof message.data === 'object' && 'id' in message.data) {
                queryClient.invalidateQueries({ queryKey: ['card', message.data.id] })
              }
              break
            case 'task:created':
            case 'task:moved':
            case 'task:deleted':
            case 'task:archived':
            case 'task:restored':
              queryClient.invalidateQueries({ queryKey: ['cards', boardIdRef.current] })
              queryClient.invalidateQueries({ queryKey: ['archive'] })
              break
          }
        } catch {
          // ignore parse errors
        }
      }

      ws.onerror = () => {}

      ws.onclose = () => {
        if (!isCleaningUpRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, 2000)
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
  }, [boardId, queryClient])

  return wsRef
}
