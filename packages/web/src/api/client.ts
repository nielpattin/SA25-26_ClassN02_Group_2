import { treaty } from '@elysiajs/eden'
import type { App } from '@kyte/server/src'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export const api = treaty<App>(API_URL, {
  fetch: {
    credentials: 'include', // Send cookies with requests
  },
})
