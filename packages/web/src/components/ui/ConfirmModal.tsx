import { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Button } from './Button'

interface ConfirmModalProps {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
  variant?: 'primary' | 'danger'
  children?: ReactNode
}

export function ConfirmModal({
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'primary',
  children
}: ConfirmModalProps) {
  return createPortal(
    <div className="fixed inset-0 z-11000 flex items-center justify-center bg-black/80" onClick={onCancel}>
      <div className="shadow-brutal-xl flex w-[90%] max-w-112.5 flex-col rounded-none border border-black bg-white" onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-col gap-6 p-8">
          <h2 className="font-heading m-0 text-[20px] font-extrabold text-black uppercase">{title}</h2>
          <p className="m-0 text-[14px] leading-relaxed font-semibold text-black">{message}</p>
          {children}
          <div className="flex justify-end gap-4">
            <Button variant="secondary" onClick={onCancel}>
              {cancelText}
            </Button>
            <Button variant={variant === 'danger' ? 'danger' : 'primary'} onClick={onConfirm}>
              {confirmText}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
