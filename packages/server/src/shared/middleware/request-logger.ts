import { Elysia } from 'elysia'
import { logger } from '../logger'

export const requestLogger = new Elysia({ name: 'request-logger' })
  .onRequest(({ request, store }) => {
    const s = store as { startTime?: number; requestId?: string }
    s.startTime = performance.now()
    s.requestId = crypto.randomUUID().slice(0, 8)
  })
  .onAfterResponse(({ request, set, store }) => {
    const s = store as { startTime?: number; requestId?: string }
    const duration = s.startTime ? Math.round(performance.now() - s.startTime) : 0
    const url = new URL(request.url)

    if (url.pathname === '/health') return

    const status = typeof set.status === 'number' ? set.status : 200

    logger.info('request', {
      method: request.method,
      path: url.pathname,
      status,
      duration: `${duration}ms`,
      requestId: s.requestId,
    })
  })
  .onError(({ request, error, set, store }) => {
    const s = store as { startTime?: number; requestId?: string }
    const duration = s.startTime ? Math.round(performance.now() - s.startTime) : 0
    const url = new URL(request.url)
    const status = typeof set.status === 'number' ? set.status : 500

    logger.error('request failed', {
      method: request.method,
      path: url.pathname,
      status,
      duration: `${duration}ms`,
      requestId: s.requestId,
      error: error instanceof Error ? error.message : String(error),
    })
  })
