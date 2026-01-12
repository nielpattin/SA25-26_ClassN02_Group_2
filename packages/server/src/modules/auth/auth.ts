import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from '../../db'
import * as schema from '../../db/schema'

export const auth = betterAuth({
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
    process.env.WEB_URL || 'http://localhost:5173',
  ],
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          // Create personal workspace for new user
          const slug = `personal-${user.id.slice(0, 8)}`
          const [org] = await db.insert(schema.organizations).values({
            name: 'Personal',
            slug,
            personal: true,
          }).returning()

          // Add user as owner
          await db.insert(schema.members).values({
            organizationId: org.id,
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
