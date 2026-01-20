import { AtSign, UserPlus, Clock, MessageSquare, LayoutDashboard, AlertTriangle, AlertCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useNavigate } from '@tanstack/react-router'
import type { Notification, NotificationType } from './types'

interface NotificationItemProps {
  notification: Notification
  onRead: (id: string) => void
  onClose: () => void
}

const typeConfig: Record<NotificationType, { icon: React.ComponentType<{ size?: number }>; color: string }> = {
  mention: { icon: AtSign, color: 'text-blue-500' },
  assignment: { icon: UserPlus, color: 'text-green-500' },
  due_soon: { icon: Clock, color: 'text-yellow-500' },
  due_urgent: { icon: AlertTriangle, color: 'text-orange-500' },
  overdue: { icon: AlertCircle, color: 'text-red-500' },
  comment: { icon: MessageSquare, color: 'text-purple-500' },
  board_invite: { icon: LayoutDashboard, color: 'text-black' },
}

export function NotificationItem({ notification, onRead, onClose }: NotificationItemProps) {
  const navigate = useNavigate()
  const { icon: Icon, color } = typeConfig[notification.type] || { icon: MessageSquare, color: 'text-gray-500' }

  const handleClick = () => {
    if (!notification.read) {
      onRead(notification.id)
    }
    
    onClose()

    if (notification.boardId && notification.taskId) {
      navigate({ 
        to: `/board/$boardId`, 
        params: { boardId: notification.boardId },
        search: { cardId: notification.taskId }
      })
    } else if (notification.boardId) {
      navigate({ 
        to: `/board/$boardId`, 
        params: { boardId: notification.boardId } 
      })
    }
  }

  return (
    <button
      onClick={handleClick}
      className={`group flex w-full items-start gap-3 border-l-4 p-3 text-left transition-all hover:bg-gray-50 ${
        notification.read ? 'border-transparent opacity-60' : 'border-[#E74C3C] bg-[#E74C3C]/5 shadow-sm'
      }`}
    >
      <div className={`mt-0.5 shrink-0 ${color}`}>
        <Icon size={16} />
      </div>
      <div className="flex-1 overflow-hidden">
        <div className="flex items-center justify-between gap-2">
          <p className={`truncate text-[11px] font-extrabold tracking-tight uppercase ${notification.read ? 'text-gray-600' : 'text-black'}`}>
            {notification.title}
          </p>
          <span className="shrink-0 text-[9px] font-bold text-gray-400 uppercase">
            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
          </span>
        </div>
        {notification.body && (
          <p className="mt-0.5 line-clamp-2 text-[10px] leading-tight font-medium text-gray-500">
            {notification.body}
          </p>
        )}
      </div>
    </button>
  )
}
