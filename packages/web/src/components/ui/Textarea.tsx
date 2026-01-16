import { TextareaHTMLAttributes, forwardRef } from 'react'

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  brutal?: boolean
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = '', brutal = true, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={`font-body min-height-[80px] resize-vertical w-full rounded-none border border-black bg-white px-[12px] py-[10px] text-[13px] font-semibold text-black transition-all outline-none placeholder:font-normal placeholder:text-gray-400 ${brutal ? 'shadow-brutal-sm hover:shadow-brutal-md focus:shadow-brutal-md hover:-translate-x-0.5 hover:-translate-y-0.5 focus:-translate-x-0.5 focus:-translate-y-0.5' : ''} ${className}`}
        {...props}
      />
    )
  }
)

Textarea.displayName = 'Textarea'
