import type { Server, WebSocketHandler } from 'bun'

let server: Server<unknown> | null = null

export const wsManager = {
  setServer(s: Server<unknown>) {
    server = s
  },
  broadcast(topic: string, data: object) {
    if (server) {
      server.publish(topic, JSON.stringify(data))
    }
  }
}
