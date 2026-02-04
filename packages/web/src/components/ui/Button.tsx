import { ButtonHTMLAttributes, forwardRef } from 'react'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', fullWidth, ...props }, ref) => {
    const variants = {
      primary: 'bg-black text-white hover:bg-accent hover:text-black shadow-brutal-sm',
      secondary: 'bg-white text-black hover:bg-hover shadow-brutal-sm',
      danger: 'bg-error text-white hover:bg-error-border shadow-brutal-sm',
      ghost: 'bg-transparent border-transparent text-black hover:bg-hover',
    }

    const sizes = {
      sm: 'px-[10px] py-[4px] text-[10px]',
      md: 'px-[16px] py-[8px] text-[11px]',
      lg: 'px-[24px] py-[12px] text-[13px]',
    }

    const classes = [
      'inline-flex items-center justify-center gap-2 rounded-none border border-black font-extrabold uppercase transition-all outline-none whitespace-nowrap cursor-pointer disabled:bg-disabled disabled:text-disabled-text disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none',
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
