import { TextareaHTMLAttributes, forwardRef } from 'react'

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  brutal?: boolean
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = '', brutal = true, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={`w-full bg-white border-2 border-black px-[12px] py-[10px] font-body text-[13px] font-semibold text-black outline-none transition-all rounded-none min-height-[80px] resize-vertical placeholder:text-gray-400 placeholder:font-normal ${brutal ? 'shadow-brutal-sm hover:shadow-brutal-md hover:-translate-x-0.5 hover:-translate-y-0.5 focus:shadow-brutal-md focus:-translate-x-0.5 focus:-translate-y-0.5' : ''} ${className}`}
        {...props}
      />
    )
  }
)

Textarea.displayName = 'Textarea'
