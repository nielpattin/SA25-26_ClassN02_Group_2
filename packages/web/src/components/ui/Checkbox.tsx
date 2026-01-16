import { CheckSquare, Square } from 'lucide-react'

type CheckboxProps = {
  checked?: boolean
  onChange?: (checked: boolean) => void
  disabled?: boolean
  className?: string
  size?: number
}

export function Checkbox({ checked, onChange, disabled, className = '', size = 20 }: CheckboxProps) {
  return (
    <button
      type="button"
      className={`bg-transparent border-none p-0 cursor-pointer flex items-center justify-center text-black transition-all active:scale-110 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      onClick={() => !disabled && onChange?.(!checked)}
      disabled={disabled}
    >
      {checked ? <CheckSquare size={size} /> : <Square size={size} />}
    </button>
  )
}
