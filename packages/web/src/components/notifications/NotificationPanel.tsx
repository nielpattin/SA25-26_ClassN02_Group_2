import { NotificationItem } from './NotificationItem'
import { CheckCheck, BellOff } from 'lucide-react'
import { Popover } from '../ui/Popover'
import type { Notification } from './types'

interface NotificationPanelProps {
  isOpen: boolean
  onClose: () => void
  triggerRef: React.RefObject<HTMLElement | null>
  notifications: Notification[]
  unreadCount: number
  onMarkAsRead: (id: string) => void
  onMarkAllAsRead: () => void
}

export function NotificationPanel({
  isOpen,
  onClose,
  triggerRef,
  notifications,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
}: NotificationPanelProps) {
  return (
    <Popover
      isOpen={isOpen}
      onClose={onClose}
      triggerRef={triggerRef}
      title="Notifications"
    >
      <div className="-m-4 flex flex-col bg-white">
        {unreadCount > 0 && (
          <div className="flex items-center justify-between border-b border-black bg-[#F8F9FA] px-4 py-2">
            <span className="text-[10px] font-extrabold text-black uppercase italic">
              {unreadCount} UNREAD
            </span>
            <button
              onClick={() => onMarkAllAsRead()}
              className="flex items-center gap-1.5 text-[10px] font-extrabold text-[#E74C3C] uppercase transition-colors hover:text-[#C0392B]"
            >
              <CheckCheck size={12} />
              Mark all as read
            </button>
          </div>
        )}

        <div className="max-h-[400px] min-w-[320px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center border-2 border-dashed border-gray-200 text-gray-300">
                <BellOff size={24} />
              </div>
              <p className="text-[11px] font-extrabold tracking-widest text-gray-400 uppercase">
                No notifications yet
              </p>
              <p className="mt-1 text-[9px] font-bold text-gray-300 uppercase">
                We'll let you know when things happen
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {notifications.map((n) => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  onRead={onMarkAsRead}
                  onClose={onClose}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </Popover>
  )
}
