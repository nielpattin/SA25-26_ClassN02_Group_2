import { Elysia } from 'elysia'
import { timezones, languages } from './index'

export const configController = new Elysia({ prefix: '/config' })
  .get('/', () => {
    return {
      timezones,
      languages
    }
  })
