import { InputHTMLAttributes, forwardRef } from 'react'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  brutal?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', brutal = true, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`font-body disabled:bg-disabled disabled:text-disabled-text focus:ring-focus-ring w-full rounded-none border border-black bg-white px-3 py-2.5 text-[13px] font-semibold text-black transition-all outline-none placeholder:font-normal placeholder:text-gray-400 focus:ring-2 disabled:cursor-not-allowed ${brutal ? 'shadow-brutal-sm hover:shadow-brutal-md focus:shadow-brutal-md hover:-translate-0.5 focus:-translate-0.5' : ''} ${className}`}
        {...props}
      />
    )
  }
)

Input.displayName = 'Input'
