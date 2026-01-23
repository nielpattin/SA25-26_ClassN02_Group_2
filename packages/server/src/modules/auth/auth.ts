import { betterAuth, APIError } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from '../../db'
import * as schema from '../../db/schema'
import { eq } from 'drizzle-orm'
import { emailService } from '../email/email.service'

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
    requireEmailVerification: false, // TODO: Enable when email service is configured
    async sendResetPassword({ user, url }) {
      await emailService.sendEmail({
        to: user.email,
        subject: 'Reset your Kyte password',
        html: `Click the link to reset your password: <a href="${url}">${url}</a>`,
      })
    },
    resetPasswordTokenExpiresIn: 900, // 15 minutes
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
    session: {
      create: {
        before: async (session) => {
          const user = await db.query.users.findFirst({
            where: eq(schema.users.id, session.userId)
          })
          if (user?.deletedAt) {
            throw new APIError("FORBIDDEN", { message: "Account is scheduled for deletion. Contact support@kyte.dev to recover your account." })
          }
        }
      }
    }
  },
})

export type Session = typeof auth.$Infer.Session
