import { ButtonHTMLAttributes, forwardRef } from 'react'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', fullWidth, ...props }, ref) => {
    const variants = {
      primary: 'bg-black text-white hover:bg-accent hover:text-black hover:shadow-brutal-md hover:-translate-x-0.5 hover:-translate-y-0.5 shadow-brutal-sm',
      secondary: 'bg-white text-black hover:bg-gray-200 hover:shadow-brutal-md hover:-translate-x-0.5 hover:-translate-y-0.5 shadow-brutal-sm',
      danger: 'bg-[#E74C3C] text-white hover:bg-[#C0392B] hover:shadow-brutal-md hover:-translate-x-0.5 hover:-translate-y-0.5 shadow-brutal-sm',
      ghost: 'bg-transparent border-transparent text-black hover:bg-canvas',
    }

    const sizes = {
      sm: 'px-[10px] py-[4px] text-[10px]',
      md: 'px-[16px] py-[8px] text-[11px]',
      lg: 'px-[24px] py-[12px] text-[13px]',
    }

    const classes = [
      'inline-flex items-center justify-center gap-2 rounded-none border border-black font-extrabold uppercase transition-all outline-none whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none active:translate-x-0 active:translate-y-0 active:shadow-none',
      variants[variant],
      sizes[size],
      fullWidth ? 'w-full' : '',
      className
    ].filter(Boolean).join(' ')

    return (
      <button
        ref={ref}
        className={classes}
        {...props}
      />
    )
  }
)

Button.displayName = 'Button'
