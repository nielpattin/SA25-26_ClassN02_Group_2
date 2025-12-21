import type { Server } from 'bun'

let server: Server | null = null

export const wsManager = {
  setServer(s: Server) {
    server = s
  },
  broadcast(topic: string, data: object) {
    if (server) {
      server.publish(topic, JSON.stringify(data))
    }
  }
}
