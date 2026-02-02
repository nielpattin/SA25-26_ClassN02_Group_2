import { useState } from 'react'
import { Button } from './Button'
import { Input } from './Input'

interface DatePickerProps {
  label?: string
  initialDate?: Date | string | null
  onSave: (date: string | null) => void
}

export function DatePicker({ label = 'Date', initialDate, onSave }: DatePickerProps) {
  const formattedInitial = initialDate 
    ? new Date(initialDate).toISOString().split('T')[0] 
    : ''
  const [date, setDate] = useState(formattedInitial)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label className="font-heading text-[11px] font-extrabold tracking-widest text-black/60 uppercase">{label}</label>
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="cursor-pointer"
        />
      </div>
      
      <div className="flex flex-col gap-2">
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
