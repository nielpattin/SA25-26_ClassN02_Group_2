import { InputHTMLAttributes, forwardRef } from 'react'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  brutal?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', brutal = true, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`w-full bg-white border-2 border-black px-3 py-2.5 font-body text-[13px] font-semibold text-black outline-none transition-all rounded-none placeholder:text-gray-400 placeholder:font-normal ${brutal ? 'shadow-brutal-sm hover:shadow-brutal-md hover:-translate-x-0.5 hover:-translate-y-0.5 focus:shadow-brutal-md focus:-translate-x-0.5 focus:-translate-y-0.5' : ''} ${className}`}
        {...props}
      />
    )
  }
)

Input.displayName = 'Input'
