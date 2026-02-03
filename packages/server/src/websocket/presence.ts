import { wsManager } from './manager'

export type PresenceUser = {
  id: string
  name: string
}

const boardPresence = new Map<string, Map<string, { user: PresenceUser; count: number; lastSeen: number }>>()
const broadcastTimers = new Map<string, NodeJS.Timeout>()

export const presenceManager = {
  join(boardId: string, user: PresenceUser) {
    if (!boardPresence.has(boardId)) {
      boardPresence.set(boardId, new Map())
    }
    const users = boardPresence.get(boardId)!
    const existing = users.get(user.id)
    if (existing) {
      existing.count++
      existing.lastSeen = Date.now()
    } else {
      users.set(user.id, { user, count: 1, lastSeen: Date.now() })
      this.broadcast(boardId)
    }
  },

  updateActivity(boardId: string, user: PresenceUser) {
    const users = boardPresence.get(boardId)
    const existing = users?.get(user.id)
    if (existing) {
      existing.lastSeen = Date.now()
    } else {
      this.join(boardId, user)
    }
  },

  leave(boardId: string, userId: string) {
    const users = boardPresence.get(boardId)
    if (!users) return
    const existing = users.get(userId)
    if (existing) {
      existing.count--
      if (existing.count <= 0) {
        users.delete(userId)
        if (users.size === 0) {
          boardPresence.delete(boardId)
        }
        this.broadcast(boardId)
      }
    }
  },

  broadcast(boardId: string) {
    if (broadcastTimers.has(boardId)) return

    // Throttle presence updates to once per second to prevent socket flooding
    broadcastTimers.set(boardId, setTimeout(() => {
      broadcastTimers.delete(boardId)
      const users = boardPresence.get(boardId)
      const data = users ? Array.from(users.values()).map((u) => u.user) : []
      wsManager.broadcast(`board:${boardId}`, {
        type: 'presence:updated',
        data,
      })
    }, 1000))
  },

  janitor() {
    const now = Date.now()
    const timeout = 60000 // 60 seconds

    for (const [boardId, users] of boardPresence.entries()) {
      let changed = false
      for (const [userId, state] of users.entries()) {
        if (now - state.lastSeen > timeout) {
          users.delete(userId)
          changed = true
        }
      }
      if (changed) {
        if (users.size === 0) {
          boardPresence.delete(boardId)
        }
        this.broadcast(boardId)
      }
    }
  }
}

// Run janitor every 10 seconds
setInterval(() => presenceManager.janitor(), 10000)
