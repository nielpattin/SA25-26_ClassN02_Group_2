import { InputHTMLAttributes, forwardRef } from 'react'
import './Input.css'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  brutal?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', brutal = true, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`brutal-input ${brutal ? 'brutal' : ''} ${className}`}
        {...props}
      />
    )
  }
)

Input.displayName = 'Input'
