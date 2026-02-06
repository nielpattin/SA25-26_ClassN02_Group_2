import { Bell } from 'lucide-react'
import { useState, useRef } from 'react'
import { useNotifications } from '../../hooks/useNotifications'
import { NotificationPanel } from './NotificationPanel'

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications()

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className="group relative flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center border border-black bg-white transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0 active:translate-y-0 active:shadow-none"
      >
        <Bell size={18} className={unreadCount > 0 ? 'animate-ring text-black' : 'text-black/60'} />
        
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-4.5 min-w-[18px] items-center justify-center border border-black bg-[#E74C3C] px-1 text-[9px] font-black text-white shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <NotificationPanel
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        triggerRef={triggerRef}
        notifications={notifications}
        unreadCount={unreadCount}
        onMarkAsRead={markAsRead}
        onMarkAllAsRead={markAllAsRead}
      />
    </>
  )
}
