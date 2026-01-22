import { useState } from 'react'
import { X, Plus } from 'lucide-react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'

interface LabelsProps {
  cardLabels?: string[]
  allLabels: { id: string; name: string; color: string }[]
  onToggle: (labelId: string) => void
  onAdd: (name: string, color: string) => void
  onDelete: (labelId: string) => void
}

const getContrastColor = (hexColor: string) => {
  if (!hexColor) return 'text-black'
  const hex = hexColor.replace('#', '')
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000
  return (yiq >= 128) ? 'text-black' : 'text-white'
}

export function LabelSection({ cardLabels = [], allLabels, onToggle, onAdd, onDelete }: LabelsProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [newLabelName, setNewLabelName] = useState('')
  const [selectedColor, setSelectedColor] = useState('#3498DB')

  const colors = [
    '#3498DB', '#2ECC71', '#F1C40F', '#E67E22', '#E74C3C', 
    '#9B59B6', '#1ABC9C', '#34495E', '#95A5A6', '#D35400'
  ]

  const labelPillBase = "px-2 py-0.5 border border-black bg-(--label-color,#FFFFFF) font-body text-[10px] font-extrabold uppercase tracking-wider cursor-pointer transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal-sm"

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {(allLabels || []).map((label) => {
          const isActive = (cardLabels || []).includes(label.id)
          const textColor = getContrastColor(label.color)
          return (
            <div key={label.id} className="group relative flex">
              <button
                className={`${labelPillBase} ${isActive ? 'shadow-brutal-sm opacity-100' : 'opacity-60 shadow-none hover:opacity-100'} ${textColor}`}
                style={{ '--label-color': label.color } as React.CSSProperties}
                onClick={() => onToggle(label.id)}
              >
                {label.name}
              </button>
              <button 
                className="absolute -top-1 -right-1 z-2 flex h-3.5 w-3.5 cursor-pointer items-center justify-center border border-black bg-black p-0 text-white opacity-0 transition-opacity group-hover:opacity-100" 
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(label.id)
                }}
              >
                <X size={10} />
              </button>
            </div>
          )
        })}
        
        <Button variant="secondary" size="sm" onClick={() => setIsCreating(true)} className="h-6.5">
          <Plus size={14} />
        </Button>
      </div>

      {isCreating && (
        <div className="shadow-brutal-xl mt-2 flex flex-col gap-4 border border-black bg-white p-5">
          <Input
            value={newLabelName}
            onChange={(e) => setNewLabelName(e.target.value)}
            placeholder="Label name..."
            autoFocus
          />
          <div className="flex flex-wrap gap-2.5">
            {colors.map(color => (
              <div
                key={color}
                className={`h-7 w-7 cursor-pointer border border-black transition-all ${selectedColor === color ? '-translate-x-0.5 -translate-y-0.5 shadow-[3px_3px_0px_rgba(0,0,0,0.5)]' : ''}`}
                style={{ backgroundColor: color }}
                onClick={() => setSelectedColor(color)}
              />
            ))}
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => {
                if (newLabelName) {
                  onAdd(newLabelName, selectedColor)
                  setNewLabelName('')
                  setIsCreating(false)
                }
              }}
              disabled={!newLabelName}
            >
              Create
            </Button>
            <Button variant="secondary" onClick={() => setIsCreating(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
