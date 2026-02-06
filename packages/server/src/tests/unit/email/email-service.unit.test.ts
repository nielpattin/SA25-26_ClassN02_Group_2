import { describe, test, expect, spyOn, mock } from 'bun:test'

mock.module('resend', () => {
  return {
    Resend: class {
      emails = {
        send: mock(() => Promise.resolve({ data: { id: 'test-id' }, error: null }))
      }
    }
  }
})

import { emailService } from '../../../modules/email/email.service'

describe('Email Service Unit Tests', () => {
  test('sendEmail accepts and passes correct parameters', async () => {
    const spy = spyOn(emailService, 'sendEmail')
    
    const params = {
      to: 'test@example.com',
      subject: 'Test Subject',
      html: '<p>Test</p>'
    }

    await emailService.sendEmail(params)

    expect(spy).toHaveBeenCalledWith(params)
    spy.mockRestore()
  })

  test('sendEmail handles response correctly', async () => {
    const result = await emailService.sendEmail({
      to: 'test@example.com',
      subject: 'Test Subject',
      html: '<p>Test</p>'
    })

    expect(result).toHaveProperty('success')
  })
})
