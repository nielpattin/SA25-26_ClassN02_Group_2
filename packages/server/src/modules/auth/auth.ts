import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from '../../db'
import * as schema from '../../db/schema'
import { emailService, verifyEmailTemplate } from '../email'
import { checkRateLimit } from '../../shared/middleware/rate-limit'
import { logger } from '../../shared/logger'

const webUrl = process.env.WEB_URL || 'http://localhost:5173'
const apiUrl = process.env.API_URL || 'http://localhost:3000'

export const auth = betterAuth({
  baseURL: apiUrl,
  basePath: '/api/auth',
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  }),
  user: {
    additionalFields: {
      deletedAt: {
        type: 'date',
        required: false,
        input: false,
      },
      adminRole: {
        type: 'string',
        required: false,
        input: false,
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    async sendResetPassword({ user, url }) {
      await emailService.sendEmail({
        to: user.email,
        subject: 'Reset your Kyte password',
        html: `Click the link to reset your password: <a href="${url}">${url}</a>`,
      })
    },
    resetPasswordTokenExpiresIn: 900,
  },
  emailVerification: {
    sendOnSignUp: true,
    async sendVerificationEmail({ user, url }) {
      await checkRateLimit(`email-verify:${user.email}`, 3, 60 * 60 * 1000)
      const token = new URL(url, webUrl).searchParams.get('token')
      const verificationUrl = `${webUrl}/verify-email?token=${token}`

      await emailService.sendEmail({
        to: user.email,
        subject: 'Verify your Kyte email',
        html: verifyEmailTemplate({
          name: user.name,
          url: verificationUrl,
        }),
      })
    },
    verificationTokenExpiresIn: 86400,
  },
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID ?? '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET ?? '',
    },
  },
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ['github'],
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
    },
  },
  trustedOrigins: [webUrl, 'http://127.0.0.1:5173', apiUrl, ...(process.env.CORS_ORIGINS?.split(',') || [])],
  advanced: {
    crossSubDomainCookies: {
      enabled: false,
    }
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          const slug = `personal-${user.id.slice(0, 8)}`
          const [workspace] = await db.insert(schema.workspaces).values({
            name: 'Personal',
            slug,
            personal: true,
          }).returning()

          await db.insert(schema.members).values({
            workspaceId: workspace.id,
            userId: user.id,
            role: 'owner',
          })

          logger.info('Created personal workspace for user', { userId: user.id })
        },
      },
    },
  },
})

export type Session = typeof auth.$Infer.Session
