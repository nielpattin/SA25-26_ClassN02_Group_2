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
      className={`flex cursor-pointer items-center justify-center border-none bg-transparent p-0 text-black transition-all active:scale-110 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      onClick={() => !disabled && onChange?.(!checked)}
      disabled={disabled}
    >
      {checked ? <CheckSquare size={size} /> : <Square size={size} />}
    </button>
  )
}
