import { Elysia } from 'elysia'
import { idempotencyRepository } from '../idempotency.repository'
import { BadRequestError, ConflictError } from '../errors'

async function generateRequestHash(method: string, path: string, body: unknown): Promise<string> {
  const hasher = new Bun.CryptoHasher('sha256')
  hasher.update(method)
  hasher.update(path)
  if (body && typeof body === 'object') {
    hasher.update(JSON.stringify(body))
  }
  return hasher.digest('hex')
}

export const idempotencyPlugin = new Elysia({ name: 'idempotency' })
  .onBeforeHandle({ as: 'global' }, async (context: any) => {
    const { request, session, set, path } = context
    if (!path.startsWith('/v1')) return
    if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(request.method)) return

    const key = request.headers.get('Idempotency-Key')
    if (!key || !session?.user) return

    let body: unknown = context.body
    if (!body) {
      try {
        const cloned = request.clone()
        body = await cloned.json()
      } catch {
        // Body might be empty
      }
    }

    const userId = session.user.id
    const requestHash = await generateRequestHash(request.method, path, body)

    const existing = await idempotencyRepository.find(userId, key)

    if (existing) {
      if (existing.status === 'completed') {
        if (existing.requestHash !== requestHash) {
          throw new BadRequestError('Idempotency Key reuse detected with different request parameters')
        }
        set.status = existing.responseStatus || 200
        return existing.responseBody
      }

      if (existing.status === 'pending') {
        throw new ConflictError('A request with this Idempotency-Key is already in progress')
      }
    }

    const locked = await idempotencyRepository.create(userId, key, requestHash)
    if (!locked) {
      throw new ConflictError('A request with this Idempotency-Key is already in progress')
    }
  })
  .onAfterHandle({ as: 'global' }, async (context: any) => {
    const { request, response, session, path } = context
    if (!path.startsWith('/v1')) return
    const key = request.headers.get('Idempotency-Key')
    if (!key || !session?.user) return

    const status = response?.status || 200
    if (status >= 500) {
      await idempotencyRepository.purge(session.user.id, key)
      return
    }

    await idempotencyRepository.resolve(session.user.id, key, status, response)
  })
  .onError({ as: 'global' }, async (context: any) => {
     const { request, session, code, path } = context
     if (!path.startsWith('/v1')) return
     
     const key = request.headers.get('Idempotency-Key')
     if (key && session?.user && code === 'INTERNAL_SERVER_ERROR') {
       await idempotencyRepository.purge(session.user.id, key)
     }
  })
