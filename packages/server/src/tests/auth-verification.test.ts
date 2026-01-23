import { describe, test, expect, spyOn, beforeAll, afterAll } from 'bun:test'
import { auth } from '../modules/auth/auth'
import { emailService } from '../modules/email/email.service'
import { db } from '../db'
import { users } from '../db/schema'
import { eq } from 'drizzle-orm'

describe('Auth Email Verification', () => {
  let sendEmailSpy: any

  beforeAll(() => {
    sendEmailSpy = spyOn(emailService, 'sendEmail').mockImplementation(() => 
      Promise.resolve({ success: true, data: { id: 'test-id' } } as any)
    )
  })

  afterAll(() => {
    sendEmailSpy.mockRestore()
  })

  test('signUpEmail should send verification email and create user with emailVerified: false', async () => {
    const email = `verify-test-${Date.now()}@example.com`
    const password = 'Password123!'
    const name = 'Verify Test User'

    const result = await auth.api.signUpEmail({
      body: {
        email,
        password,
        name,
      }
    })

    if (!result || !('user' in result)) {
      throw new Error('Sign up failed')
    }

    expect(result.user.email).toBe(email)
    
    // Verify user in DB has emailVerified: false
    const [user] = await db.select().from(users).where(eq(users.id, result.user.id))
    expect(user.emailVerified).toBe(false)

    // Verify email was sent
    expect(sendEmailSpy).toHaveBeenCalled()
    const callArgs = sendEmailSpy.mock.calls[0][0]
    expect(callArgs.to).toBe(email)
    expect(callArgs.subject).toBe('Verify your Kyte email')
    expect(callArgs.html).toContain('verify')
  })
})
