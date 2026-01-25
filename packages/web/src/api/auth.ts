import { createAuthClient } from 'better-auth/react'
import { inferAdditionalFields } from 'better-auth/client/plugins'

export const authClient = createAuthClient({
  baseURL: 'http://localhost:3000',
  fetchOptions: {
    credentials: 'include',
  },
  plugins: [
    inferAdditionalFields({
      user: {
        deletedAt: {
          type: 'date',
          required: false,
        },
      },
    }),
  ],
})

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  changePassword,
  requestPasswordReset: forgetPassword,
  resetPassword,
  sendVerificationEmail,
  verifyEmail,
  listAccounts,
  unlinkAccount,
  updateUser,
} = authClient


