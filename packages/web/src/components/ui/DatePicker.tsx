import { useState } from 'react'
import { Button } from './Button'
import { Input } from './Input'
import './DatePicker.css'

interface DatePickerProps {
  initialDate?: Date | string | null
  onSave: (date: string | null) => void
}

export function DatePicker({ initialDate, onSave }: DatePickerProps) {
  const formattedInitial = initialDate 
    ? new Date(initialDate).toISOString().split('T')[0] 
    : ''
  const [date, setDate] = useState(formattedInitial)

  return (
    <div className="date-picker-container">
      <div className="date-picker-field">
        <label className="date-picker-label">Due Date</label>
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="brutal-date-input"
        />
      </div>
      
      <div className="date-picker-actions">
        <Button 
          fullWidth 
          onClick={() => onSave(date || null)}
        >
          Save
        </Button>
        <Button 
          variant="secondary" 
          fullWidth 
          onClick={() => onSave(null)}
        >
          Remove
        </Button>
      </div>
    </div>
  )
}
