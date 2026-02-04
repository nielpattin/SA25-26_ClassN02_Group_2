import { InputHTMLAttributes, forwardRef } from 'react'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  brutal?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', brutal = true, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`w-full rounded-none border border-black bg-white px-3 py-2.5 font-body text-[13px] font-semibold text-black transition-all outline-none placeholder:font-normal placeholder:text-gray-400 focus:ring-2 focus:ring-focus-ring disabled:cursor-not-allowed disabled:bg-disabled disabled:text-disabled-text ${brutal ? 'shadow-brutal-sm hover:-translate-0.5 hover:shadow-brutal-md focus:-translate-0.5 focus:shadow-brutal-md' : ''} ${className}`}
        {...props}
      />
    )
  }
)

Input.displayName = 'Input'
