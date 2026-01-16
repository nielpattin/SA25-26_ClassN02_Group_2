import { useState } from 'react'
import { X, Plus } from 'lucide-react'
import { Button } from './ui/Button'
import { Input } from './ui/Input'

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
            <div key={label.id} className="relative flex group">
              <button
                className={`${labelPillBase} ${isActive ? 'shadow-brutal-sm opacity-100' : 'opacity-60 hover:opacity-100 shadow-none'} ${textColor}`}
                style={{ '--label-color': label.color } as React.CSSProperties}
                onClick={() => onToggle(label.id)}
              >
                {label.name}
              </button>
              <button 
                className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-black text-white border border-black flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 z-2 p-0 transition-opacity" 
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
        <div className="flex flex-col gap-4 p-5 border border-black bg-white shadow-brutal-xl mt-2">
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
                className={`w-7 h-7 border border-black cursor-pointer transition-all ${selectedColor === color ? 'shadow-[3px_3px_0px_rgba(0,0,0,0.5)] -translate-x-0.5 -translate-y-0.5' : ''}`}
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
