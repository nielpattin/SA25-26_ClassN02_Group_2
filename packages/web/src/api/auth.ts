import { createAuthClient } from 'better-auth/react'
import { inferAdditionalFields } from 'better-auth/client/plugins'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export const authClient = createAuthClient({
  baseURL: API_URL,
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
        adminRole: {
          type: 'string',
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


