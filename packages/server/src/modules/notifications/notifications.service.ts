import { notificationRepository } from './notifications.repository'
import type { CreateNotificationInputType } from './notifications.model'

export const notificationService = {
  getByUserId: (userId: string, limit?: number) => notificationRepository.findByUserId(userId, limit),

  getUnread: (userId: string) => notificationRepository.findUnreadByUserId(userId),

  countUnread: (userId: string) => notificationRepository.countUnread(userId),

  create: (data: CreateNotificationInputType) => notificationRepository.create(data),

  markAsRead: (id: string) => notificationRepository.markAsRead(id),

  markAllAsRead: (userId: string) => notificationRepository.markAllAsRead(userId),

  delete: (id: string) => notificationRepository.delete(id),
}
