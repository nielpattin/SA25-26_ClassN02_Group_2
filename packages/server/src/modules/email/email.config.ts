const RESEND_API_KEY = process.env.RESEND_API_KEY
const EMAIL_FROM = process.env.EMAIL_FROM

if (!RESEND_API_KEY) {
  throw new Error('Missing environment variable: RESEND_API_KEY')
}

if (!EMAIL_FROM) {
  throw new Error('Missing environment variable: EMAIL_FROM')
}

export const emailConfig = {
  apiKey: RESEND_API_KEY,
  from: EMAIL_FROM
}
