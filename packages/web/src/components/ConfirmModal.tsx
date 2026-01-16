import { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Button } from './ui/Button'

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
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-11000" onClick={onCancel}>
      <div className="max-w-112.5 w-[90%] bg-white border border-black shadow-brutal-xl flex flex-col rounded-none" onClick={(e) => e.stopPropagation()}>
        <div className="p-8 flex flex-col gap-6">
          <h2 className="m-0 font-heading text-[20px] font-extrabold uppercase text-black">{title}</h2>
          <p className="m-0 text-[14px] font-semibold leading-relaxed text-black">{message}</p>
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
