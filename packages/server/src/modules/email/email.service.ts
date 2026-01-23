import { Resend } from 'resend'
import { emailConfig } from './email.config'

const resend = new Resend(emailConfig.apiKey)

export const emailService = {
  async sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
    try {
      const { data, error } = await resend.emails.send({
        from: emailConfig.from,
        to,
        subject,
        html
      })

      if (error) {
        console.error('Failed to send email:', error)
        return { success: false, error }
      }

      return { success: true, data }
    } catch (error) {
      console.error('Error in emailService.sendEmail:', error)
      return { success: false, error }
    }
  }
}
