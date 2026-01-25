import { betterAuth, APIError } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from '../../db'
import * as schema from '../../db/schema'
import { eq } from 'drizzle-orm'
import { emailService, verifyEmailTemplate } from '../email'
import { checkRateLimit } from '../../shared/middleware/rate-limit'

const webUrl = process.env.WEB_URL || 'http://localhost:5173'

export const auth = betterAuth({
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
    resetPasswordTokenExpiresIn: 900, // 15 minutes
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
    verificationTokenExpiresIn: 86400, // 24 hours
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
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // Update session every 24 hours
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
  },
  trustedOrigins: [
    'http://localhost:5173',
  ],
  advanced: {
    crossSubDomainCookies: {
      enabled: false, // Not using subdomains
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          // Create personal workspace for new user
          const slug = `personal-${user.id.slice(0, 8)}`
          const [workspace] = await db.insert(schema.workspaces).values({
            name: 'Personal',
            slug,
            personal: true,
          }).returning()

          // Add user as owner
          await db.insert(schema.members).values({
            workspaceId: workspace.id,
            userId: user.id,
            role: 'owner',
          })

          console.log(`Created personal workspace for user ${user.id}`)
        },
      },
    },
  },
})

export type Session = typeof auth.$Infer.Session
