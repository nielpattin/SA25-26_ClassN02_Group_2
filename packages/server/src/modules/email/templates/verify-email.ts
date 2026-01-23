import { baseTemplate } from './base'

interface VerifyEmailProps {
  name: string
  url: string
}

export const verifyEmailTemplate = ({
  name,
  url,
}: VerifyEmailProps) => baseTemplate(`
  <div style="padding: 24px 0;">
    <h2 style="margin-top: 0; font-size: 20px; text-transform: uppercase; letter-spacing: -0.02em;">Verify your email</h2>
    <p>Hello <strong>${name}</strong>,</p>
    <p>Thank you for joining Kyte! Please click the button below to verify your email address. This link will expire in 24 hours.</p>
    
    <div style="margin: 32px 0;">
      <a href="${url}" class="button" style="padding: 16px 32px; font-size: 16px; letter-spacing: 0.05em;">VERIFY EMAIL</a>
    </div>

    <p style="font-size: 14px; color: #666666; margin-top: 32px; border-top: 1px solid #eeeeee; padding-top: 16px;">
      <strong>Note:</strong> If you didn't create an account with Kyte, you can safely ignore this email.
    </p>
    
    <p style="font-size: 12px; color: #999999; margin-top: 16px;">
      If the button doesn't work, copy and paste this link into your browser:<br>
      <a href="${url}" style="color: #000000; word-break: break-all;">${url}</a>
    </p>
  </div>
`)
