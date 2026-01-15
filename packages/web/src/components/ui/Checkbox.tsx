import { CheckSquare, Square } from 'lucide-react'
import './Checkbox.css'

type CheckboxProps = {
  checked?: boolean
  onChange?: (checked: boolean) => void
  disabled?: boolean
  className?: string
  size?: number
}

export function Checkbox({ checked, onChange, disabled, className = '', size = 18 }: CheckboxProps) {
  return (
    <button
      type="button"
      className={`brutal-checkbox ${checked ? 'checked' : ''} ${className}`}
      onClick={() => !disabled && onChange?.(!checked)}
      disabled={disabled}
    >
      {checked ? <CheckSquare size={size} /> : <Square size={size} />}
    </button>
  )
}
