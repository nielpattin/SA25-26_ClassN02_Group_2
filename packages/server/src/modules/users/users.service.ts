import { userRepository } from './users.repository'
import type { CreateUserInput, UpdateUserInput, UpdateUserPreferencesInput, UpdateNotificationPreferencesInput, SessionResponse } from './users.model'
import { getStorageProvider } from '../../lib/storage'
import { NotFoundError, ForbiddenError } from '../../shared/errors'
import { UAParser } from 'ua-parser-js'
import { verifyPassword } from 'better-auth/crypto'

function getExtensionFromMimeType(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
  }
  return mimeToExt[mimeType] ?? 'bin'
}

export const userService = {
  async getAll() {
    return userRepository.getAll()
  },

  async getById(id: string) {
    return userRepository.getById(id)
  },

  async getByEmail(email: string) {
    return userRepository.getByEmail(email)
  },

  async create(data: CreateUserInput) {
    return userRepository.create(data)
  },

  async update(id: string, data: UpdateUserInput) {
    return userRepository.update(id, data)
  },

  async uploadAvatar(id: string, file: File) {
    const user = await userRepository.getById(id)
    if (!user) {
      throw new NotFoundError('User not found')
    }

    const mimeType = file.type
    const extension = getExtensionFromMimeType(mimeType)
    const storageKey = `avatars/${id}.${extension}`

    const buffer = Buffer.from(await file.arrayBuffer())
    const storage = getStorageProvider()
    
    try {
      await storage.upload(storageKey, buffer, mimeType)
    } catch (error) {
      console.error('[Avatar Upload] Storage upload failed:', error)
      throw new Error('Failed to upload avatar to storage')
    }

    let imageUrl: string
    try {
      imageUrl = await storage.getSignedUrl(storageKey, 604800) 
    } catch (error) {
       console.error('[Avatar Upload] Signing URL failed:', error)
       const endpoint = process.env.SEAWEEDFS_ENDPOINT ?? 'http://localhost:8333'
       const bucket = process.env.SEAWEEDFS_BUCKET ?? 'kyte'
       const cleanEndpoint = endpoint.replace(/\/$/, '')
       imageUrl = `${cleanEndpoint}/${bucket}/${storageKey}`
    }

    return userRepository.update(id, { image: imageUrl })
  },

  async deleteAvatar(id: string) {
    const user = await userRepository.getById(id)
    if (!user) {
      throw new NotFoundError('User not found')
    }

    return userRepository.update(id, { image: null })
  },

  async updatePreferences(id: string, data: UpdateUserPreferencesInput) {
    return userRepository.updatePreferences(id, data)
  },

  async updateNotificationPreferences(id: string, data: UpdateNotificationPreferencesInput) {
    return userRepository.updateNotificationPreferences(id, data)
  },

  async getPasswordHash(id: string) {
    return userRepository.getPasswordHash(id)
  },

  async delete(id: string) {
    return userRepository.delete(id)
  },

  async restore(id: string) {
    const user = await userRepository.getById(id)
    if (!user) {
      throw new NotFoundError('User not found')
    }
    return userRepository.restore(id)
  },

  async exportData(id: string) {
    const data = await userRepository.getExportData(id)
    if (!data) {
      throw new NotFoundError('User not found')
    }
    return data
  },

  async deleteAccount(id: string, password?: string) {
    const user = await userRepository.getById(id)
    if (!user) {
      throw new NotFoundError('User not found')
    }

    const hash = await userRepository.getPasswordHash(id)
    if (hash) {
      if (!password) {
        throw new ForbiddenError('Password is required for this account')
      }
      const isValid = await verifyPassword({ hash, password })
      if (!isValid) {
        throw new ForbiddenError('Incorrect password')
      }
    }

    await userRepository.delete(id)
    await userRepository.deleteAllSessions(id)

    return {
      message: 'Account scheduled for deletion. You have 30 days to recover your account before permanent removal.',
      deletedAt: new Date()
    }
  },

  async getSessions(userId: string, currentSessionId?: string): Promise<SessionResponse[]> {
    const sessions = await userRepository.getSessions(userId)
    
    return sessions.map(session => {
      const parser = new UAParser(session.userAgent || '')
      const browser = parser.getBrowser()
      const device = parser.getDevice()
      const os = parser.getOS()

      const browserName = browser.name ? `${browser.name} ${browser.version || ''}`.trim() : 'Unknown Browser'
      const deviceName = device.model ? `${device.vendor || ''} ${device.model}`.trim() : 
                        os.name ? `${os.name} ${os.version || ''}`.trim() : 'Unknown Device'

      return {
        id: session.id,
        device: deviceName,
        browser: browserName,
        ipAddress: session.ipAddress,
        isCurrent: session.id === currentSessionId,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
      }
    })
  },

  async revokeSession(userId: string, sessionId: string, currentSessionId: string) {
    if (sessionId === currentSessionId) {
      throw new Error('Cannot revoke current session')
    }
    return userRepository.deleteSession(userId, sessionId)
  },

  async revokeAllSessions(userId: string, currentSessionId: string) {
    return userRepository.deleteAllSessionsExcept(userId, currentSessionId)
  }
}
