import { treaty } from '@elysiajs/eden'
import type { App } from '@kyte/server/src'

export const api = treaty<App>('http://localhost:3000')
