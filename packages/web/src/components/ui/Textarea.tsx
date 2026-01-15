import { TextareaHTMLAttributes, forwardRef } from 'react'
import './Input.css'

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  brutal?: boolean
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = '', brutal = true, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={`brutal-textarea ${brutal ? 'brutal' : ''} ${className}`}
        {...props}
      />
    )
  }
)

Textarea.displayName = 'Textarea'
