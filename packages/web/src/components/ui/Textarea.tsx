import { TextareaHTMLAttributes, forwardRef } from 'react'

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  brutal?: boolean
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = '', brutal = true, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={`min-height-[80px] resize-vertical w-full rounded-none border border-black bg-white px-[12px] py-[10px] font-body text-[13px] font-semibold text-black transition-all outline-none placeholder:font-normal placeholder:text-gray-400 focus:ring-2 focus:ring-focus-ring disabled:cursor-not-allowed disabled:bg-disabled disabled:text-disabled-text ${brutal ? 'shadow-brutal-sm hover:-translate-0.5 hover:shadow-brutal-md focus:-translate-0.5 focus:shadow-brutal-md' : ''} ${className}`}
        {...props}
      />
    )
  }
)

Textarea.displayName = 'Textarea'
