import { Resend } from 'resend'
import { emailConfig } from './email.config'
import { logger } from '../../shared/logger'

const resend = new Resend(emailConfig.apiKey)
const log = logger.child({ service: 'email' })

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
        log.error('Failed to send email', { to, subject, error: error.message })
        return { success: false, error }
      }

      log.debug('Email sent', { to, subject })
      return { success: true, data }
    } catch (error) {
      log.error('Email service error', { to, subject, error: error instanceof Error ? error.message : String(error) })
      return { success: false, error }
    }
  }
}
