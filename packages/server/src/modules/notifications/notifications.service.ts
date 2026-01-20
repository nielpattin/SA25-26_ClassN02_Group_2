import { notificationRepository } from './notifications.repository'
import type { CreateNotificationInputType } from './notifications.model'
import { eventBus } from '../../events/bus'
import { ForbiddenError, NotFoundError } from '../../shared/errors'

export const notificationService = {
  getById: (id: string) => notificationRepository.findById(id),

  getByUserId: (userId: string, limit?: number) => notificationRepository.findByUserId(userId, limit),

  getUnread: (userId: string) => notificationRepository.findUnreadByUserId(userId),

  countUnread: (userId: string) => notificationRepository.countUnread(userId),

  create: async (data: CreateNotificationInputType) => {
    const notification = await notificationRepository.create(data)
    
    eventBus.emitDomain('notification.created', {
      notification,
      userId: data.userId
    })
    
    return notification
  },

  markAsRead: async (id: string, requestingUserId: string) => {
    const notification = await notificationRepository.findById(id)
    if (!notification) throw new NotFoundError('Notification not found')
    if (notification.userId !== requestingUserId) throw new ForbiddenError()
    return notificationRepository.markAsRead(id)
  },

  markAllAsRead: (userId: string) => notificationRepository.markAllAsRead(userId),

  delete: async (id: string, requestingUserId: string) => {
    const notification = await notificationRepository.findById(id)
    if (!notification) throw new NotFoundError('Notification not found')
    if (notification.userId !== requestingUserId) throw new ForbiddenError()
    return notificationRepository.delete(id)
  },
}
